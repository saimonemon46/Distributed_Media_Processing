# =====================================================================
# Automated Integration Test Script (Multi-Modal Verification)
# =====================================================================
# This script performs end-to-end testing of the distributed media
# processing system. It verifies:
# 1. API Health Check liveness.
# 2. Uploading a valid image file, polling for COMPLETED state,
#    and validating S3 presigned URL accessibility.
# 3. Uploading a valid CSV tabular file, verifying schema profiling.
# 4. Uploading a valid PDF document, verifying poster-frame rendering.
# 5. Uploading a corrupt file, polling for FAILED state, and
#    validating error message persistence.
# =====================================================================

import json
import os
import time
import urllib.request
import urllib.error

API_URL = os.getenv("API_URL", "http://localhost:8000")

# Valid test asset byte payloads
VALID_GIF_BYTES = b"GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
VALID_CSV_BYTES = b"id,product,price,units\n101,Widget,19.99,50\n102,Gadget,49.50,20\n103,Sensor,12.00,100"
VALID_MINIMAL_PDF = (
    b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/MediaBox[0 0 300 144]/Parent 2 0 R/Resources<<>>>>endobj\n"
    b"xref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000057 00000 n\n0000000115 00000 n\n"
    b"trailer<</Size 4/Root 1 0 R>>\nstartxref\n190\n%%EOF\n"
)
CORRUPT_BYTES = b"invalid mock image content"


def send_multipart_file(endpoint: str, filename: str, file_bytes: bytes, content_type: str = "application/octet-stream") -> dict:
    """Sends file bytes as a multipart/form-data POST request using standard urllib."""
    boundary = "----TestMultipartBoundaryPostReq"
    headers = {
        "Content-Disposition": f'form-data; name="file"; filename="{filename}"',
        "Content-Type": content_type
    }
    
    body = (
        f"--{boundary}\r\n"
        f"Content-Disposition: {headers['Content-Disposition']}\r\n"
        f"Content-Type: {headers['Content-Type']}\r\n\r\n"
    ).encode("utf-8")
    body += file_bytes
    body += f"\r\n--{boundary}--\r\n".encode("utf-8")
    
    req = urllib.request.Request(
        f"{API_URL}{endpoint}",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST"
    )
    
    with urllib.request.urlopen(req) as response:
        assert response.status == 202, f"Expected HTTP 202 Accepted, got: {response.status}"
        return json.loads(response.read().decode("utf-8"))


def get_json(endpoint: str) -> dict:
    """Performs HTTP GET request and deserializes the JSON response."""
    req = urllib.request.Request(f"{API_URL}{endpoint}", method="GET")
    with urllib.request.urlopen(req) as response:
        assert response.status == 200, f"Expected HTTP 200 OK, got: {response.status}"
        return json.loads(response.read().decode("utf-8"))


def test_health():
    print("[*] 1/5 Verifying API server liveness (/health)...")
    data = get_json("/health")
    assert data.get("status") == "Healthy", f"Unexpected health status: {data}"
    print("[+] Liveness probe verified.\n")


def test_successful_image_pipeline():
    print("[*] 2/5 Testing image processing pipeline (Pillow thumbnail)...")
    job = send_multipart_file("/jobs", "avatar.gif", VALID_GIF_BYTES, "image/gif")
    job_id = job.get("id")
    assert job_id is not None, "Failed to obtain job ID from submission"
    print(f"    - Job created: {job_id}")

    max_retries = 15
    poll_interval = 1.0
    status = "PENDING"
    job_details = {}
    
    for attempt in range(max_retries):
        job_details = get_json(f"/jobs/{job_id}")
        status = job_details.get("status")
        print(f"      [Attempt {attempt+1}/{max_retries}] Status is currently: {status}")
        if status in ("COMPLETED", "FAILED"):
            break
        time.sleep(poll_interval)
        
    assert status == "COMPLETED", f"Expected COMPLETED, got: {status}. Error: {job_details.get('error')}"
    assert job_details.get("output_key") is not None, "Expected output_key"
    assert job_details.get("media_type") == "IMAGE", f"Expected IMAGE, got {job_details.get('media_type')}"
    
    download_url = job_details.get("download_url")
    assert download_url is not None, "Expected presigned download_url"
    with urllib.request.urlopen(download_url) as dl_res:
        assert dl_res.status == 200
        
    print("[+] Image processing pipeline passed.\n")


def test_successful_csv_pipeline():
    print("[*] 3/5 Testing tabular data pipeline (Pandas profiling)...")
    job = send_multipart_file("/jobs", "inventory.csv", VALID_CSV_BYTES, "text/csv")
    job_id = job.get("id")
    print(f"    - Job created: {job_id}")

    max_retries = 15
    poll_interval = 1.0
    status = "PENDING"
    job_details = {}

    for attempt in range(max_retries):
        job_details = get_json(f"/jobs/{job_id}")
        status = job_details.get("status")
        print(f"      [Attempt {attempt+1}/{max_retries}] Status is currently: {status}")
        if status in ("COMPLETED", "FAILED"):
            break
        time.sleep(poll_interval)

    assert status == "COMPLETED", f"Expected COMPLETED, got: {status}. Error: {job_details.get('error')}"
    assert job_details.get("media_type") == "TABULAR"
    assert job_details.get("meta") is not None
    meta = job_details.get("meta")
    assert meta.get("rows") == 3, f"Expected 3 rows, got {meta.get('rows')}"
    assert "product" in meta.get("columns", [])

    print("[+] Tabular data processing pipeline passed.\n")


def test_successful_pdf_pipeline():
    print("[*] 4/5 Testing document pipeline (PyMuPDF poster)...")
    job = send_multipart_file("/jobs", "document.pdf", VALID_MINIMAL_PDF, "application/pdf")
    job_id = job.get("id")
    print(f"    - Job created: {job_id}")

    max_retries = 15
    poll_interval = 1.0
    status = "PENDING"
    job_details = {}

    for attempt in range(max_retries):
        job_details = get_json(f"/jobs/{job_id}")
        status = job_details.get("status")
        print(f"      [Attempt {attempt+1}/{max_retries}] Status is currently: {status}")
        if status in ("COMPLETED", "FAILED"):
            break
        time.sleep(poll_interval)

    assert status == "COMPLETED", f"Expected COMPLETED, got: {status}. Error: {job_details.get('error')}"
    assert job_details.get("media_type") == "DOCUMENT"
    assert job_details.get("preview_key") is not None or job_details.get("output_key") is not None
    print("[+] PDF document processing pipeline passed.\n")


def test_failure_image_pipeline():
    print("[*] 5/5 Testing image processing failure pipeline...")
    job = send_multipart_file("/jobs", "corrupt_test.png", CORRUPT_BYTES, "image/png")
    job_id = job.get("id")
    print(f"    - Job created: {job_id}")

    max_retries = 15
    poll_interval = 1.0
    status = "PENDING"
    job_details = {}
    
    for attempt in range(max_retries):
        job_details = get_json(f"/jobs/{job_id}")
        status = job_details.get("status")
        print(f"      [Attempt {attempt+1}/{max_retries}] Status is currently: {status}")
        if status in ("COMPLETED", "FAILED"):
            break
        time.sleep(poll_interval)
        
    assert status == "FAILED", f"Expected job status FAILED, got: {status}"
    error_msg = job_details.get("error")
    assert error_msg is not None, "Expected error description, found None"
    print(f"    - Verified error details correctly captured: '{error_msg}'")
    print("[+] Failure image pipeline test passed.\n")


def main():
    print("=====================================================================")
    print("      Starting Distributed Multi-Modal Media Processing Tests")
    print("=====================================================================")
    start_time = time.time()
    try:
        test_health()
        test_successful_image_pipeline()
        test_successful_csv_pipeline()
        test_successful_pdf_pipeline()
        test_failure_image_pipeline()
        duration = time.time() - start_time
        print("=====================================================================")
        print(f" SUCCESS: All 5 integration tests passed! (Duration: {duration:.2f}s)")
        print("=====================================================================")
    except AssertionError as ae:
        print("\n=====================================================================")
        print(f" FAILURE: Assertion error encountered: {ae}")
        print("=====================================================================")
    except Exception as e:
        print("\n=====================================================================")
        print(f" ERROR: Unexpected error occurred during tests: {e}")
        print("=====================================================================")


if __name__ == "__main__":
    main()
