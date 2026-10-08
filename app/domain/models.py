# =====================================================================
# Domain Models (SQLAlchemy ORM Entity Schemas)
# =====================================================================
# Encapsulates core state, table definitions, and status lifecycle.
# =====================================================================

import uuid
from enum import Enum
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from app.infrastructure.database import Base


class JobStatus(str, Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Job(Base):
    """
    Represents an asynchronous media processing task.
    Tracks state across the lifecycle: PENDING -> PROCESSING -> COMPLETED | FAILED.
    """
    __tablename__ = "jobs"

    # Unique identifier of the job
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Original client filename (e.g., "camera_raw.jpg")
    original_filename = Column(String, nullable=False)

    # S3 Object Storage key for the uploaded original file
    original_key = Column(String, nullable=True)

    # Execution state: PENDING, PROCESSING, COMPLETED, FAILED
    status = Column(String, nullable=False, default=JobStatus.PENDING.value)

    # Timestamps tracking job lifecycle
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # S3 Object Storage key for the processed resulting media
    output_key = Column(String, nullable=True)

    # Error message if status transitioned to FAILED
    error = Column(Text, nullable=True)

    def __repr__(self) -> str:
        return f"<Job id={self.id} status={self.status} file={self.original_filename}>"
