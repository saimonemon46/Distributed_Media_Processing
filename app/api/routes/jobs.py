# =====================================================================
# Media Jobs API Routes
# =====================================================================

import io
import os
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.domain.models import Job, JobStatus, MediaType
from app.api.schemas import JobCreateResponse, JobDetailResponse, JobListResponse
from app.infrastructure.database import get_db
from app.infrastructure.storage import upload_file_bytes, get_presigned_download_url
from app.infrastructure.rabbitmq import publish_job

router = APIRouter(prefix="/jobs", tags=["Jobs"])


def detect_media_type(filename: str, content_type: Optional[str] = None) -> tuple[str, str]:
    """Classifies an incoming asset by extension and content-type."""
    ext = os.path.splitext(filename)[1].lower() if filename else ""

    if ext in [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff", ".svg"]:
        return MediaType.IMAGE.value, content_type or f"image/{ext.lstrip('.') if ext else 'jpeg'}"
    if ext in [".mp4", ".mov", ".webm", ".avi", ".mkv", ".m4v"]:
        return MediaType.VIDEO.value, content_type or f"video/{ext.lstrip('.') if ext else 'mp4'}"
    if ext == ".pdf":
        return MediaType.DOCUMENT.value, content_type or "application/pdf"
    if ext == ".csv":
        return MediaType.TABULAR.value, content_type or "text/csv"
    if ext in [".xlsx", ".xls"]:
        return MediaType.TABULAR.value, content_type or "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    if content_type:
        if content_type.startswith("image/"):
            return MediaType.IMAGE.value, content_type
        if content_type.startswith("video/"):
            return MediaType.VIDEO.value, content_type
        if "pdf" in content_type:
            return MediaType.DOCUMENT.value, content_type
        if "csv" in content_type or "sheet" in content_type or "excel" in content_type:
            return MediaType.TABULAR.value, content_type

    return MediaType.OTHER.value, content_type or "application/octet-stream"


@router.post("", response_model=JobCreateResponse, status_code=status.HTTP_202_ACCEPTED)
def create_job(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Submits a new multi-modal media processing task.
    Uploads raw media to MinIO and enqueues task into RabbitMQ, returning 202 Accepted.
    """
    media_category, mime = detect_media_type(file.filename or "unknown", file.content_type)

    # 1. Create a persistent job record in PostgreSQL in PENDING state
    job = Job(
        original_filename=file.filename or "untitled",
        media_type=media_category,
        mime_type=mime,
        status=JobStatus.PENDING.value
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    try:
        # 2. Stream original raw media to MinIO object storage
        original_key = f"uploads/{job.id}/{file.filename}"
        contents = file.file.read()
        raw_buffer = io.BytesIO(contents)

        upload_file_bytes(raw_buffer, original_key, content_type=mime)

        # 3. Update job record with S3 key
        job.original_key = original_key
        db.commit()
        db.refresh(job)

        # 4. Asynchronously enqueue task into RabbitMQ
        publish_job(str(job.id), original_key)

        return job

    except Exception as e:
        job.status = JobStatus.FAILED.value
        job.completed_at = datetime.now(timezone.utc)
        job.error = f"Submission failed: {str(e)}"
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit media processing task: {str(e)}"
        )


@router.get("", response_model=JobListResponse, status_code=status.HTTP_200_OK)
def list_jobs(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status_filter: Optional[str] = Query(None, alias="status"),
    media_type: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """
    Lists media processing jobs with pagination, status filtering, category filtering, and search.
    """
    query = db.query(Job)
    if status_filter:
        query = query.filter(Job.status == status_filter.upper())
    if media_type:
        query = query.filter(Job.media_type == media_type.upper())
    if search:
        query = query.filter(Job.original_filename.ilike(f"%{search}%"))

    total = query.count()
    jobs = query.order_by(desc(Job.created_at)).offset(offset).limit(limit).all()

    items = []
    for job in jobs:
        duration = None
        if job.started_at and job.completed_at:
            duration = round((job.completed_at - job.started_at).total_seconds(), 2)

        download_url = None
        if job.status == JobStatus.COMPLETED.value and job.output_key:
            try:
                download_url = get_presigned_download_url(job.output_key)
            except Exception:
                download_url = None

        original_url = None
        if job.original_key:
            try:
                original_url = get_presigned_download_url(job.original_key)
            except Exception:
                original_url = None

        preview_url = None
        if job.preview_key:
            try:
                preview_url = get_presigned_download_url(job.preview_key)
            except Exception:
                preview_url = None
        elif job.status == JobStatus.COMPLETED.value and job.output_key and job.media_type == MediaType.IMAGE.value:
            # For images, output_key is the thumbnail
            preview_url = download_url

        items.append({
            "id": job.id,
            "status": job.status,
            "original_filename": job.original_filename,
            "original_key": job.original_key,
            "media_type": job.media_type or "OTHER",
            "mime_type": job.mime_type,
            "created_at": job.created_at,
            "started_at": job.started_at,
            "completed_at": job.completed_at,
            "duration_seconds": duration,
            "output_key": job.output_key,
            "preview_key": job.preview_key,
            "meta": job.meta,
            "error": job.error,
            "download_url": download_url,
            "original_url": original_url,
            "preview_url": preview_url
        })

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": items
    }


@router.get("/{job_id}", response_model=JobDetailResponse, status_code=status.HTTP_200_OK)
def get_job(job_id: UUID, db: Session = Depends(get_db)):
    """
    Polls the execution status of a media job.
    Includes temporary presigned download URLs for the output, preview, and original asset.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID '{job_id}' not found."
        )

    duration = None
    if job.started_at and job.completed_at:
        duration = round((job.completed_at - job.started_at).total_seconds(), 2)

    download_url = None
    if job.status == JobStatus.COMPLETED.value and job.output_key:
        try:
            download_url = get_presigned_download_url(job.output_key)
        except Exception:
            download_url = None

    original_url = None
    if job.original_key:
        try:
            original_url = get_presigned_download_url(job.original_key)
        except Exception:
            original_url = None

    preview_url = None
    if job.preview_key:
        try:
            preview_url = get_presigned_download_url(job.preview_key)
        except Exception:
            preview_url = None
    elif job.status == JobStatus.COMPLETED.value and job.output_key and job.media_type == MediaType.IMAGE.value:
        preview_url = download_url

    return {
        "id": job.id,
        "status": job.status,
        "original_filename": job.original_filename,
        "original_key": job.original_key,
        "media_type": job.media_type or "OTHER",
        "mime_type": job.mime_type,
        "created_at": job.created_at,
        "started_at": job.started_at,
        "completed_at": job.completed_at,
        "duration_seconds": duration,
        "output_key": job.output_key,
        "preview_key": job.preview_key,
        "meta": job.meta,
        "error": job.error,
        "download_url": download_url,
        "original_url": original_url,
        "preview_url": preview_url
    }
