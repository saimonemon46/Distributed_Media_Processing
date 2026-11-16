# =====================================================================
# API Transfer Schemas (Pydantic Models)
# =====================================================================
# Enforces contract validation for HTTP requests and responses.
# =====================================================================

from datetime import datetime
from typing import Optional, Any, Dict, List
from uuid import UUID
from pydantic import BaseModel, ConfigDict


class HealthResponse(BaseModel):
    """Liveness probe response model."""
    status: str = "Healthy"


class JobCreateResponse(BaseModel):
    """Immediate response payload returned upon HTTP 202 Accepted task submission."""
    id: UUID
    status: str
    original_filename: str
    original_key: Optional[str] = None
    media_type: Optional[str] = None
    mime_type: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class JobDetailResponse(BaseModel):
    """Full status payload returned when polling a job's execution state."""
    id: UUID
    status: str
    original_filename: str
    original_key: Optional[str] = None
    media_type: Optional[str] = None
    mime_type: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_seconds: Optional[float] = None
    output_key: Optional[str] = None
    preview_key: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    download_url: Optional[str] = None
    original_url: Optional[str] = None
    preview_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class JobListResponse(BaseModel):
    """Paginated collection of job records."""
    total: int
    limit: int
    offset: int
    items: List[JobDetailResponse]


class StatsResponse(BaseModel):
    """System health and operational telemetry metrics."""
    status: str
    queue: Dict[str, Any]
    database: Dict[str, Any]
    storage: Dict[str, Any]
