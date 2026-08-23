# =====================================================================
# Database Models Definition (SQLAlchemy ORM)
# =====================================================================
# This file defines the PostgreSQL schemas used throughout the app.
# The structures are shared by both the API server and background workers.
# =====================================================================

import uuid
from sqlalchemy import Column, String, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from database import Base

class Job(Base):
    """
    Represents a media processing task. Tracks metadata throughout the entire
    lifecycle: PENDING -> PROCESSING -> COMPLETED/FAILED.
    """
    __tablename__ = "jobs"

    # Unique identifier of the job
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Original client filename (e.g., "my_photo.png")
    original_filename = Column(String, nullable=False)
    
    # S3 Object Storage key for the uploaded original/raw file
    original_key = Column(String, nullable=True)
    
    # Execution state: PENDING, PROCESSING, COMPLETED, FAILED
    status = Column(String, nullable=False, default="PENDING")
    
    # Timestamps tracking job lifecycle
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # S3 Object Storage key for the processed resulting media
    output_key = Column(String, nullable=True)
    
    # Error message if status transitioned to FAILED
    error = Column(Text, nullable=True)