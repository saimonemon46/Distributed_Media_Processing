# =====================================================================
# Database Compatibility Shim
# =====================================================================
# Re-exports database infrastructure from app.infrastructure.database.
# =====================================================================

from app.infrastructure.database import (
    engine,
    SessionLocal,
    Base,
    get_db,
)

__all__ = ["engine", "SessionLocal", "Base", "get_db"]