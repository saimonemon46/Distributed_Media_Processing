# =====================================================================
# Models Compatibility Shim
# =====================================================================
# Re-exports models from app.domain.models.
# =====================================================================

from app.domain.models import Job, JobStatus

__all__ = ["Job", "JobStatus"]