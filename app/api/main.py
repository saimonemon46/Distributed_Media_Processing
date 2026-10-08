# =====================================================================
# Distributed Media Processing API Application Entrypoint
# =====================================================================

from contextlib import asynccontextmanager
from fastapi import FastAPI

from app.core.config import settings
from app.infrastructure.database import Base, engine
from app.infrastructure.storage import init_storage
from app.api.routes import health, jobs


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages API lifecycle events.
    Verifies database tables exist and storage bucket is ready before accepting traffic.
    """
    # 1. Initialize PostgreSQL schemas
    Base.metadata.create_all(bind=engine)
    # 2. Ensure MinIO S3 bucket exists
    init_storage()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="High-throughput asynchronous media processing engine using RabbitMQ, MinIO, and PostgreSQL.",
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# Register sub-routers
app.include_router(health.router)
app.include_router(jobs.router)
