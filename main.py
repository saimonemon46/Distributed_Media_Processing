# =====================================================================
# REST API Server Entrypoint & Backward Compatibility Interface
# =====================================================================
# Re-exports the modular FastAPI application from app.api.main
# along with domain models and infrastructure utilities.
# =====================================================================

from app.api.main import app
from app.infrastructure.database import Base, engine, get_db, SessionLocal
from app.domain.models import Job, JobStatus, MediaType
from app.infrastructure.storage import (
    init_storage,
    upload_file_bytes,
    download_file_bytes,
    get_presigned_download_url,
    s3_client,
    s3_public_client,
)
from app.infrastructure.rabbitmq import (
    publish_job,
    get_connection_channel,
)
from app.core.config import settings

RABBITMQ_QUEUE = settings.RABBITMQ_QUEUE
BUCKET_NAME = settings.MINIO_BUCKET_NAME

__all__ = [
    "app",
    "Base",
    "engine",
    "get_db",
    "SessionLocal",
    "Job",
    "JobStatus",
    "MediaType",
    "init_storage",
    "upload_file_bytes",
    "download_file_bytes",
    "get_presigned_download_url",
    "s3_client",
    "s3_public_client",
    "publish_job",
    "get_connection_channel",
    "RABBITMQ_QUEUE",
    "BUCKET_NAME",
    "settings",
]
