# =====================================================================
# End-to-End Media Pipeline Integration Tests
# =====================================================================
# Validates:
# 1. Image upload, PENDING state, worker processing, COMPLETED transition.
# 2. S3 Presigned URL accessibility and HTTP 200 payload verification.
# 3. Poison pill isolation: Corrupted upload, FAILED transition, error tracking.
# =====================================================================

import json
import time
import urllib.request
from tests.conftest import API_URL, VALID_GIF_BYTES, CORRUPT_BYTES


def send_multipart_file(endpoint: str, filename: str, file_bytes: bytes) -> dict:
    """
    Submits raw file bytes as multipart/form-data POST payload via standard library.
    """
    boundary = "----TestBoundaryPipelineSuite"
    content_type = "image/gif" if filename.endswith(".gif") else "image/png"

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

    with urllib.request.urlopen(req) as res:
        return json.loads(res.read().decode("utf-8"))


def get_json(endpoint: str) -> dict:
    """Helper to perform HTTP GET and parse JSON response."""
    with urllib.request.urlopen(f"{API_URL}{endpoint}") as res:
        return json.loads(res.read().decode("utf-8"))


def test_successful_image_pipeline():
    """
    Validates complete happy path: Upload -> Enqueue -> Worker Resize -> Presigned URL.
    """
    print("[*] Testing successful image processing pipeline...")

    # 1. Upload valid image
    job = send_multipart_file("/jobs", "test_valid.gif", VALID_GIF_BYTES)
    job_id = job.get("id")
    assert job_id is not None, "Failed to get job ID from upload response"
    assert job.get("status") == "PENDING", f"Expected PENDING status, got {job.get('status')}"
    print(f"    - Job created: {job_id} (PENDING)")

    # 2. Poll until COMPLETED
    max_retries = 15
    poll_interval = 1.0
    status = "PENDING"
    job_details = {}

    for attempt in range(max_retries):
        job_details = get_json(f"/jobs/{job_id}")
        status = job_details.get("status")
        print(f"      [Poll {attempt + 1}/{max_retries}] Status: {status}")
        if status in ("COMPLETED", "FAILED"):
            break
        time.sleep(poll_interval)

    assert status == "COMPLETED", (
        f"Expected COMPLETED status, got: {status}. Error details: {job_details.get('error')}"
    )

    # 3. Verify output key and presigned download URL
    assert job_details.get("output_key") is not None, "Expected output_key"
    download_url = job_details.get("download_url")
    assert download_url is not None, "Expected presigned download_url"

    # 4. Verify presigned URL can download file
    with urllib.request.urlopen(download_url) as dl_res:
        assert dl_res.status == 200, f"Expected HTTP 200 from presigned URL, got {dl_res.status}"

    print("[+] Successful image pipeline: PASSED\n")


def test_failure_image_pipeline():
    """
    Validates poison pill resilience: Upload corrupt file -> Worker handles gracefully -> Job marked FAILED.
    """
    print("[*] Testing corrupt image failure pipeline...")

    job = send_multipart_file("/jobs", "corrupted.png", CORRUPT_BYTES)
    job_id = job.get("id")
    assert job_id is not None, "Failed to get job ID"
    print(f"    - Job created: {job_id}")

    max_retries = 15
    poll_interval = 1.0
    status = "PENDING"
    job_details = {}

    for attempt in range(max_retries):
        job_details = get_json(f"/jobs/{job_id}")
        status = job_details.get("status")
        print(f"      [Poll {attempt + 1}/{max_retries}] Status: {status}")
        if status in ("COMPLETED", "FAILED"):
            break
        time.sleep(poll_interval)

    assert status == "FAILED", f"Expected FAILED status, got: {status}"
    error_msg = job_details.get("error")
    assert error_msg is not None, "Expected error message in job details"
    assert "cannot identify image file" in error_msg.lower(), f"Unexpected error msg: {error_msg}"
    print(f"    - Correctly captured error: {error_msg}")

    print("[+] Corrupted image failure pipeline: PASSED\n")


if __name__ == "__main__":
    test_successful_image_pipeline()
    test_failure_image_pipeline()
