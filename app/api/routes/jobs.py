# =====================================================================
# Media Jobs API Routes
# =====================================================================

import io
from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.domain.models import Job, JobStatus
from app.api.schemas import JobCreateResponse, JobDetailResponse
from app.infrastructure.database import get_db
from app.infrastructure.storage import upload_file_bytes, get_presigned_download_url
from app.infrastructure.rabbitmq import publish_job

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.post("", response_model=JobCreateResponse, status_code=status.HTTP_202_ACCEPTED)
def create_job(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Submits a new media processing task.
    Uploads raw media to MinIO and enqueues task into RabbitMQ, returning 202 Accepted.
    """
    # 1. Create a persistent job record in PostgreSQL in PENDING state
    job = Job(
        original_filename=file.filename,
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
        content_type = file.content_type or "application/octet-stream"

        upload_file_bytes(raw_buffer, original_key, content_type=content_type)

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


@router.get("/{job_id}", response_model=JobDetailResponse, status_code=status.HTTP_200_OK)
def get_job(job_id: UUID, db: Session = Depends(get_db)):
    """
    Polls the execution status of a media job.
    Includes a temporary presigned download URL when status is COMPLETED.
    """
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID '{job_id}' not found."
        )

    response_data = {
        "id": job.id,
        "status": job.status,
        "original_filename": job.original_filename,
        "original_key": job.original_key,
        "created_at": job.created_at,
        "started_at": job.started_at,
        "completed_at": job.completed_at,
        "output_key": job.output_key,
        "error": job.error,
        "download_url": None
    }

    if job.status == JobStatus.COMPLETED.value and job.output_key:
        response_data["download_url"] = get_presigned_download_url(job.output_key)

    return response_data
