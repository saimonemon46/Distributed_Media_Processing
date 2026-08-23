# =====================================================================
# REST API Server (FastAPI)
# =====================================================================
# This file defines the entry point and routes for the FastAPI app.
# It handles HTTP requests, files uploading, raw storage into MinIO,
# metadata persistence in PostgreSQL, and scheduling jobs via RabbitMQ.
# Clients can also query and poll job execution states from here.
# =====================================================================

import io
from datetime import datetime, timezone
from contextlib import asynccontextmanager
from uuid import UUID

from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import Job
from storage import init_storage, upload_file_bytes, get_presigned_download_url
from rabbitmq import publish_job

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages API startup and shutdown lifecycles.
    Ensures the PostgreSQL tables and MinIO buckets exist prior to serving traffic.
    """
    # Create PostgreSQL database tables if they do not exist
    Base.metadata.create_all(bind=engine)
    # Ensure S3 storage bucket is initialized
    init_storage()
    yield

app = FastAPI(
    title="Distributed Media Processing API",
    description="Scalable API demonstrating asynchronous media task handling using RabbitMQ.",
    version="1.0.0",
    lifespan=lifespan
)


@app.get("/health", status_code=status.HTTP_200_OK)
def health():
    """
    Simple health check endpoint to verify API server liveness.
    """
    return {"status": "Healthy"}


@app.post("/jobs", status_code=status.HTTP_202_ACCEPTED)
def create_job(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Uploads media files, records the metadata, and enqueues the processing job.
    Returns 202 Accepted with the job's ID and current PENDING status immediately,
    without waiting for CPU-intensive thumbnail generation.
    """
    # 1. Create a persistent job record in PostgreSQL in PENDING state
    job = Job(
        original_filename=file.filename,
        status="PENDING"
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    try:
        # 2. Upload the raw original file to MinIO
        original_key = f"uploads/{job.id}/{file.filename}"
        contents = file.file.read()
        raw_buffer = io.BytesIO(contents)
        content_type = file.content_type or "application/octet-stream"

        upload_file_bytes(raw_buffer, original_key, content_type=content_type)

        # 3. Update the job metadata with original S3 key
        job.original_key = original_key
        db.commit()
        db.refresh(job)

        # 4. Asynchronously enqueue the processing task to RabbitMQ
        publish_job(str(job.id), original_key)

        # 5. Return immediate acceptance to client
        return {
            "id": job.id,
            "status": job.status,
            "original_filename": job.original_filename,
            "original_key": job.original_key
        }

    except Exception as e:
        # Roll back and record failure metadata in database if file upload or enqueueing fails
        job.status = "FAILED"
        job.completed_at = datetime.now(timezone.utc)
        job.error = f"Submission failed: {str(e)}"
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit media processing task: {str(e)}"
        )


@app.get("/jobs/{job_id}", status_code=status.HTTP_200_OK)
def get_job(job_id: UUID, db: Session = Depends(get_db)):
    """
    Polls the current execution status of a media job.
    If the status is 'COMPLETED', it returns a temporary presigned URL
    to securely download the processed media file directly from S3/MinIO.
    """
    # 1. Query PostgreSQL for the target job
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID '{job_id}' not found."
        )

    # 2. Build the standard details payload
    response = {
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

    # 3. Generate a temporary download URL if processing succeeded
    if job.status == "COMPLETED" and job.output_key:
        response["download_url"] = get_presigned_download_url(job.output_key)

    return response