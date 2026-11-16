# =====================================================================
# Health & Liveness Route
# =====================================================================

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.schemas import HealthResponse, StatsResponse
from app.core.config import settings
from app.domain.models import Job, JobStatus
from app.infrastructure.database import get_db
from app.infrastructure.storage import s3_client
from app.infrastructure.rabbitmq import get_connection_channel

router = APIRouter(tags=["Health"])


@router.api_route("/health", methods=["GET", "HEAD"], response_model=HealthResponse, status_code=status.HTTP_200_OK)
def check_health():
    """
    Liveness probe endpoint to verify API server availability.
    Supports both GET and HEAD methods for Docker and Next.js ping checks.
    """
    return HealthResponse(status="Healthy")


@router.get("/stats", response_model=StatsResponse, status_code=status.HTTP_200_OK)
def get_system_stats(db: Session = Depends(get_db)):
    """
    Returns actual infrastructure metrics: queue depth, consumer count,
    S3 storage status, and database job counts. All metrics originate directly from live backends.
    """
    total_jobs = db.query(Job).count()
    pending_jobs = db.query(Job).filter(Job.status == JobStatus.PENDING.value).count()
    processing_jobs = db.query(Job).filter(Job.status == JobStatus.PROCESSING.value).count()
    completed_jobs = db.query(Job).filter(Job.status == JobStatus.COMPLETED.value).count()
    failed_jobs = db.query(Job).filter(Job.status == JobStatus.FAILED.value).count()

    # Media type distribution
    type_counts = dict(
        db.query(Job.media_type, func.count(Job.id))
        .filter(Job.media_type.isnot(None))
        .group_by(Job.media_type)
        .all()
    )

    # RabbitMQ broker queue & consumer depth
    queue_depth = 0
    consumer_count = 0
    broker_connected = False
    try:
        conn, ch = get_connection_channel(retries=1, delay=0.5)
        res = ch.queue_declare(queue=settings.RABBITMQ_QUEUE, passive=True)
        queue_depth = res.method.message_count
        consumer_count = res.method.consumer_count
        conn.close()
        broker_connected = True
    except Exception:
        broker_connected = False

    # Object storage connectivity check
    storage_connected = False
    try:
        s3_client.head_bucket(Bucket=settings.MINIO_BUCKET_NAME)
        storage_connected = True
    except Exception:
        storage_connected = False

    return {
        "status": "Healthy",
        "queue": {
            "name": settings.RABBITMQ_QUEUE,
            "depth": queue_depth,
            "consumer_count": consumer_count,
            "broker_connected": broker_connected
        },
        "database": {
            "status": "connected",
            "total_jobs": total_jobs,
            "pending_jobs": pending_jobs,
            "processing_jobs": processing_jobs,
            "completed_jobs": completed_jobs,
            "failed_jobs": failed_jobs,
            "media_types": type_counts
        },
        "storage": {
            "bucket": settings.MINIO_BUCKET_NAME,
            "status": "connected" if storage_connected else "disconnected"
        }
    }
