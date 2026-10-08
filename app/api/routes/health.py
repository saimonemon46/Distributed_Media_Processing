# =====================================================================
# Health & Liveness Route
# =====================================================================

from fastapi import APIRouter, status
from app.api.schemas import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse, status_code=status.HTTP_200_OK)
def check_health():
    """
    Liveness probe endpoint to verify API server availability.
    """
    return HealthResponse(status="Healthy")
