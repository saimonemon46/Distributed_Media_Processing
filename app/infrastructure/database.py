# =====================================================================
# Database Infrastructure Layer (SQLAlchemy ORM Engine & Session)
# =====================================================================
# Manages connection pooling, declarative base, and session lifecycle.
# =====================================================================

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    """
    FastAPI dependency that provides a transactional database session scope.
    Guarantees session cleanup upon completion or failure of the request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
