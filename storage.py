# =====================================================================
# Object Storage Interface (MinIO / S3 API wrapper)
# =====================================================================
# This utility file abstracts interactions with our S3-compatible storage
# system. It is utilized by both the API server (for uploads and URLs)
# and background workers (for fetching original files and uploading results).
# =====================================================================

import io
import os
from botocore.exceptions import ClientError
from dotenv import load_dotenv
import boto3

# Load environment variables from .env file if present
load_dotenv()

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "http://localhost:9000")
MINIO_PUBLIC_ENDPOINT = os.getenv("MINIO_PUBLIC_ENDPOINT", "http://localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ROOT_USER", os.getenv("MINIO_ACCESS_KEY", "minioadmin"))
MINIO_SECRET_KEY = os.getenv("MINIO_ROOT_PASSWORD", os.getenv("MINIO_SECRET_KEY", "minioadminpassword"))
BUCKET_NAME = os.getenv("MINIO_BUCKET_NAME", "media-bucket")

# -------------------------------------------------------------------
# S3 Client Setup
# -------------------------------------------------------------------
# We configure two distinct S3 client instances:
# 1. s3_client: Internal communication within the Docker network
# 2. s3_public_client: External communication (browser presigned links)
# -------------------------------------------------------------------

# Internal client for API-to-MinIO communication
s3_client = boto3.client(
    "s3",
    endpoint_url=MINIO_ENDPOINT,
    aws_access_key_id=MINIO_ACCESS_KEY,
    aws_secret_access_key=MINIO_SECRET_KEY,
    region_name="us-east-1"
)

# External client used specifically to generate browser-accessible presigned URLs
s3_public_client = boto3.client(
    "s3",
    endpoint_url=MINIO_PUBLIC_ENDPOINT,
    aws_access_key_id=MINIO_ACCESS_KEY,
    aws_secret_access_key=MINIO_SECRET_KEY,
    region_name="us-east-1"
)


def init_storage():
    """
    Ensure the target S3/MinIO bucket exists on startup.
    Creates the bucket if head_bucket raises an error.
    """
    try:
        s3_client.head_bucket(Bucket=BUCKET_NAME)
    except ClientError:
        try:
            s3_client.create_bucket(Bucket=BUCKET_NAME)
        except Exception as e:
            print(f"Failed to create bucket '{BUCKET_NAME}': {e}")


def upload_file_bytes(data: io.BytesIO, object_key: str, content_type: str = "image/jpeg") -> str:
    """
    Uploads an in-memory byte buffer directly to the MinIO bucket.
    Automatically resets the stream head back to index 0 before upload.
    """
    data.seek(0)
    s3_client.upload_fileobj(
        data,
        BUCKET_NAME,
        object_key,
        ExtraArgs={"ContentType": content_type}
    )
    return object_key


def download_file_bytes(object_key: str) -> io.BytesIO:
    """
    Downloads an object from the MinIO bucket as an in-memory byte buffer.
    Used by workers to retrieve the raw file uploaded by the API.
    """
    buffer = io.BytesIO()
    s3_client.download_fileobj(BUCKET_NAME, object_key, buffer)
    buffer.seek(0)
    return buffer


def get_presigned_download_url(object_key: str, expiration: int = 3600) -> str:
    """
    Generates a secure, temporary download URL accessible by external clients (browsers).
    Uses the external endpoint (http://localhost:9000) so local host can connect.
    """
    return s3_public_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": BUCKET_NAME, "Key": object_key},
        ExpiresIn=expiration
    )