# =====================================================================
# Storage Compatibility Shim
# =====================================================================
# Re-exports storage utilities from app.infrastructure.storage.
# =====================================================================

from app.infrastructure.storage import (
    s3_client,
    s3_public_client,
    init_storage,
    upload_file_bytes,
    download_file_bytes,
    get_presigned_download_url,
)

__all__ = [
    "s3_client",
    "s3_public_client",
    "init_storage",
    "upload_file_bytes",
    "download_file_bytes",
    "get_presigned_download_url",
]