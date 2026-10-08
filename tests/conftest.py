# =====================================================================
# Test Configuration & Shared Fixtures
# =====================================================================

import os

# Default local test ingress endpoint
API_URL = os.getenv("TEST_API_URL", "http://localhost:8000")

# 1x1 transparent GIF bytes for valid image payload verification
VALID_GIF_BYTES = (
    b"GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!"
    b"\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01"
    b"\x00\x00\x02\x02D\x01\x00;"
)

# Corrupted byte stream to verify poison pill isolation and error handling
CORRUPT_BYTES = b"invalid mock corrupted image binary sequence"
