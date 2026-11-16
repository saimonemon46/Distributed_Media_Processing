# =====================================================================
# Distributed Media Processing API Application Entrypoint
# =====================================================================

from contextlib import asynccontextmanager
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.core.config import settings
from app.infrastructure.database import Base, engine
from app.infrastructure.storage import init_storage
from app.api.routes import health, jobs


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Manages API lifecycle events.
    Verifies database tables exist, executes non-destructive migrations,
    and ensures the storage bucket is ready before accepting traffic.
    """
    # 1. Initialize PostgreSQL schemas
    Base.metadata.create_all(bind=engine)

    # 2. Non-destructive column auto-migration for multi-modal metadata
    try:
        with engine.connect() as conn:
            for col, typ in [
                ("media_type", "VARCHAR"),
                ("mime_type", "VARCHAR"),
                ("preview_key", "VARCHAR"),
                ("meta", "JSON"),
            ]:
                try:
                    conn.execute(text(f"ALTER TABLE jobs ADD COLUMN IF NOT EXISTS {col} {typ}"))
                except Exception:
                    pass
            conn.commit()
    except Exception as e:
        print(f"[Database] Notice: Schema auto-migration check: {e}")

    # 3. Ensure MinIO S3 bucket exists
    init_storage()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    description="High-throughput asynchronous multi-modal media processing engine using RabbitMQ, MinIO, and PostgreSQL.",
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# CORS Configuration for local Next.js and deployed frontend
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
custom_origins = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]

default_local_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://[::1]:3000",
    "http://[::1]:3001"
]
allowed_origins = list(set(custom_origins + default_local_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if "*" not in allowed_origins else ["*"],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|\[::1\])(:[0-9]+)?$|^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register sub-routers
app.include_router(health.router)
app.include_router(jobs.router)
