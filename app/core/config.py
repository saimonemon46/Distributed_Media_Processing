# =====================================================================
# Centralized System Configuration
# =====================================================================
# Defines application-wide settings, reading from environment variables
# or fallbacks with clear typing and production-ready defaults.
# =====================================================================

import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    # Application Info
    APP_NAME: str = "Distributed Media Processing API"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = os.getenv("APP_ENV", "development")
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))

    # PostgreSQL Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://postgres:postgres@localhost:5432/media_db"
    )

    # MinIO / S3 Storage
    MINIO_ENDPOINT: str = os.getenv("MINIO_ENDPOINT", "http://localhost:9000")
    MINIO_PUBLIC_ENDPOINT: str = os.getenv("MINIO_PUBLIC_ENDPOINT", "http://localhost:9000")
    MINIO_ACCESS_KEY: str = os.getenv("MINIO_ROOT_USER", os.getenv("MINIO_ACCESS_KEY", "minioadmin"))
    MINIO_SECRET_KEY: str = os.getenv("MINIO_ROOT_PASSWORD", os.getenv("MINIO_SECRET_KEY", "minioadminpassword"))
    MINIO_BUCKET_NAME: str = os.getenv("MINIO_BUCKET_NAME", "media-bucket")
    PRESIGNED_EXPIRATION: int = int(os.getenv("PRESIGNED_URL_EXPIRATION_SECONDS", "3600"))

    # RabbitMQ Message Broker
    RABBITMQ_HOST: str = os.getenv("RABBITMQ_HOST", "localhost")
    RABBITMQ_PORT: int = int(os.getenv("RABBITMQ_PORT", "5672"))
    RABBITMQ_USER: str = os.getenv("RABBITMQ_USER", "guest")
    RABBITMQ_PASSWORD: str = os.getenv("RABBITMQ_PASSWORD", "guest")
    RABBITMQ_QUEUE: str = os.getenv("RABBITMQ_QUEUE", "media_processing_jobs")
    PREFETCH_COUNT: int = int(os.getenv("PREFETCH_COUNT", "1"))

    # Processing Boundaries
    MAX_IMAGE_WIDTH: int = 500
    MAX_IMAGE_HEIGHT: int = 500


settings = Settings()
