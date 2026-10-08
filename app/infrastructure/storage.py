# =====================================================================
# Object Storage Interface (MinIO / S3 API Wrapper)
# =====================================================================
# Manages file buffer streaming and temporary presigned URL generation.
# =====================================================================

import io
import boto3
from botocore.exceptions import ClientError
from app.core.config import settings

# -------------------------------------------------------------------
# S3 Client Setup
# -------------------------------------------------------------------
# 1. s3_client: Internal communication within Docker network (e.g. http://minio:9000)
# 2. s3_public_client: External communication for browser links (e.g. http://localhost:9000)
# -------------------------------------------------------------------

s3_client = boto3.client(
    "s3",
    endpoint_url=settings.MINIO_ENDPOINT,
    aws_access_key_id=settings.MINIO_ACCESS_KEY,
    aws_secret_access_key=settings.MINIO_SECRET_KEY,
    region_name="us-east-1"
)

s3_public_client = boto3.client(
    "s3",
    endpoint_url=settings.MINIO_PUBLIC_ENDPOINT,
    aws_access_key_id=settings.MINIO_ACCESS_KEY,
    aws_secret_access_key=settings.MINIO_SECRET_KEY,
    region_name="us-east-1"
)


def init_storage() -> None:
    """
    Ensure the target S3/MinIO bucket exists on startup.
    Creates the bucket if head_bucket raises an error.
    """
    try:
        s3_client.head_bucket(Bucket=settings.MINIO_BUCKET_NAME)
    except ClientError:
        try:
            s3_client.create_bucket(Bucket=settings.MINIO_BUCKET_NAME)
            print(f"[Storage] Created S3 bucket '{settings.MINIO_BUCKET_NAME}'.")
        except Exception as e:
            print(f"[Storage] Warning: Failed to create bucket '{settings.MINIO_BUCKET_NAME}': {e}")


def upload_file_bytes(data: io.BytesIO, object_key: str, content_type: str = "image/jpeg") -> str:
    """
    Uploads an in-memory byte buffer directly to the MinIO bucket.
    Resets the stream head back to index 0 before upload.
    """
    data.seek(0)
    s3_client.upload_fileobj(
        data,
        settings.MINIO_BUCKET_NAME,
        object_key,
        ExtraArgs={"ContentType": content_type}
    )
    return object_key


def download_file_bytes(object_key: str) -> io.BytesIO:
    """
    Downloads an object from the MinIO bucket as an in-memory byte buffer.
    """
    buffer = io.BytesIO()
    s3_client.download_fileobj(settings.MINIO_BUCKET_NAME, object_key, buffer)
    buffer.seek(0)
    return buffer


def get_presigned_download_url(object_key: str, expiration: int = None) -> str:
    """
    Generates a cryptographically signed download URL accessible by external web clients.
    """
    expires_in = expiration or settings.PRESIGNED_EXPIRATION
    return s3_public_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.MINIO_BUCKET_NAME, "Key": object_key},
        ExpiresIn=expires_in
    )
