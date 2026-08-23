# =====================================================================
# Automated Integration Test Script
# =====================================================================
# This script performs end-to-end testing of the distributed media
# processing system. It verifies:
# 1. API Health Check liveness.
# 2. Uploading a valid image file, polling for COMPLETED state,
#    and validating S3 presigned URL accessibility.
# 3. Uploading a corrupt file, polling for FAILED state, and
#    validating error message persistence.
# =====================================================================

import json
import time
import urllib.request
import urllib.error

API_URL = "http://localhost:8000"

# A valid 1x1 transparent GIF file bytes representation
VALID_GIF_BYTES = b"GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
CORRUPT_BYTES = b"invalid mock image content"


def send_multipart_file(endpoint: str, filename: str, file_bytes: bytes) -> dict:
    """
    Sends file bytes as a multipart/form-data POST request using standard urllib.
    """
    boundary = "----TestMultipartBoundaryPostReq"
    
    # Construct multipart request payload
    headers = {
        "Content-Disposition": f'form-data; name="file"; filename="{filename}"',
        "Content-Type": "image/gif" if filename.endswith(".gif") else "image/png"
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
    """
    Performs a standard GET request and returns JSON parsed response.
    """
    with urllib.request.urlopen(f"{API_URL}{endpoint}") as res:
        return json.loads(res.read().decode("utf-8"))


def test_health():
    print("[*] 1/3 Testing health endpoint...")
    data = get_json("/health")
    assert data.get("status") == "Healthy", f"Unexpected health status: {data}"
    print("[+] Health check passed successfully.\n")


def test_successful_image_pipeline():
    print("[*] 2/3 Testing valid image processing pipeline...")
    
    # 1. Submit a valid GIF
    print("    - Uploading valid image...")
    job = send_multipart_file("/jobs", "valid_test.gif", VALID_GIF_BYTES)
    job_id = job.get("id")
    assert job_id is not None, "Failed to obtain job ID from upload response"
    assert job.get("status") == "PENDING", f"Job status should be PENDING initially, got: {job.get('status')}"
    print(f"    - Job created: {job_id} (PENDING)")

    # 2. Poll the status until completed
    max_retries = 10
    poll_interval = 1.0
    status = "PENDING"
    job_details = {}
    
    print("    - Polling status endpoint...")
    for attempt in range(max_retries):
        job_details = get_json(f"/jobs/{job_id}")
        status = job_details.get("status")
        print(f"      [Attempt {attempt+1}/{max_retries}] Status is currently: {status}")
        
        if status in ("COMPLETED", "FAILED"):
            break
        time.sleep(poll_interval)
        
    assert status == "COMPLETED", f"Expected job status COMPLETED, got: {status}. Error details: {job_details.get('error')}"
    
    # 3. Verify output properties and presigned download URL
    assert job_details.get("output_key") is not None, "Expected output_key to be populated"
    download_url = job_details.get("download_url")
    assert download_url is not None, "Expected presigned download_url to be returned"
    
    # 4. Verify presigned URL download accessibility
    print("    - Validating presigned download URL access...")
    with urllib.request.urlopen(download_url) as dl_res:
        assert dl_res.status == 200, f"Expected S3 presigned URL HTTP status 200, got: {dl_res.status}"
        
    print("[+] Successful image pipeline test passed.\n")


def test_failure_image_pipeline():
    print("[*] 3/3 Testing image processing failure pipeline...")
    
    # 1. Submit a corrupt mock file
    print("    - Uploading corrupt file data...")
    job = send_multipart_file("/jobs", "corrupt_test.png", CORRUPT_BYTES)
    job_id = job.get("id")
    assert job_id is not None, "Failed to obtain job ID from corrupt upload"
    print(f"    - Job created: {job_id}")

    # 2. Poll the status until completed/failed
    max_retries = 10
    poll_interval = 1.0
    status = "PENDING"
    job_details = {}
    
    print("    - Polling status endpoint...")
    for attempt in range(max_retries):
        job_details = get_json(f"/jobs/{job_id}")
        status = job_details.get("status")
        print(f"      [Attempt {attempt+1}/{max_retries}] Status is currently: {status}")
        
        if status in ("COMPLETED", "FAILED"):
            break
        time.sleep(poll_interval)
        
    assert status == "FAILED", f"Expected job status FAILED for corrupt media, got: {status}"
    
    # 3. Verify error messages are captured
    error_msg = job_details.get("error")
    assert error_msg is not None, "Expected error description, found None"
    assert "cannot identify image file" in error_msg.lower(), f"Unexpected error message: '{error_msg}'"
    print(f"    - Verified error details correctly captured: '{error_msg}'")
    
    print("[+] Failure image pipeline test passed.\n")


def main():
    print("=====================================================================")
    print("            Starting Distributed Media Processing Test Suite")
    print("=====================================================================")
    
    start_time = time.time()
    try:
        test_health()
        test_successful_image_pipeline()
        test_failure_image_pipeline()
        duration = time.time() - start_time
        print("=====================================================================")
        print(f" SUCCESS: All integration tests passed! (Duration: {duration:.2f}s)")
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
