# =====================================================================
# API Transfer Schemas (Pydantic Models)
# =====================================================================
# Enforces contract validation for HTTP requests and responses.
# =====================================================================

from datetime import datetime
from typing import Optional
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

    model_config = ConfigDict(from_attributes=True)


class JobDetailResponse(BaseModel):
    """Full status payload returned when polling a job's execution state."""
    id: UUID
    status: str
    original_filename: str
    original_key: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    output_key: Optional[str] = None
    error: Optional[str] = None
    download_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
