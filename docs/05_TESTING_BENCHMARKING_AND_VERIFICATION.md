# Testing, Benchmarking & System Verification

> **Document:** `docs/05_TESTING_BENCHMARKING_AND_VERIFICATION.md`

---

## 1. Automated Testing Strategy

The test suite validates the system end-to-end against live container dependencies:

```mermaid
flowchart TD
    subgraph TestSuite ["Integration Test Suite (tests/)"]
        TH["1. test_health_endpoint()"]
        TP["2. test_successful_image_pipeline()"]
        TF["3. test_failure_image_pipeline()"]
    end

    TH -->|GET /health| API["FastAPI"]
    TP -->|POST /jobs (Valid GIF)| API
    TP -->|Poll GET /jobs/{id}| API
    TP -->|GET presigned_url| MinIO["MinIO"]
    TF -->|POST /jobs (Corrupt Bytes)| API
    TF -->|Verify FAILED status| API
```

---

## 2. Test Cases Overview

### 1. API Health Check (`tests/test_health.py`)
* Verifies that the API server liveness endpoint returns HTTP 200 with `{"status": "Healthy"}`.

### 2. End-to-End Image Processing Pipeline (`tests/test_e2e_pipeline.py`)
* **Step 1:** Uploads a valid 1x1 GIF byte sequence via multipart/form-data to `POST /jobs`.
* **Step 2:** Verifies response status code is `202 Accepted` and state is `PENDING`.
* **Step 3:** Polls `GET /jobs/{job_id}` at 1-second intervals until status transitions to `COMPLETED`.
* **Step 4:** Verifies `output_key` and `download_url` are present in the response.
* **Step 5:** Initiates an HTTP GET request directly to the `download_url` and asserts that MinIO returns `HTTP 200 OK`.

### 3. Fault Isolation & Poison Pill Test (`tests/test_e2e_pipeline.py`)
* **Step 1:** Uploads corrupt mock data (`b"invalid mock corrupted image binary sequence"`) disguised as an image.
* **Step 2:** Confirms HTTP 202 Accepted is returned (the ingress API must never crash on bad payloads).
* **Step 3:** Polls `GET /jobs/{job_id}` until status transitions to `FAILED`.
* **Step 4:** Verifies that `error` is populated and contains `"cannot identify image file"`.
* **Step 5:** Verifies that the worker remains alive and operational for subsequent requests.

---

## 3. Running the Test Suite

Ensure the Docker Compose stack is running:
```bash
docker compose up -d
```

Run the end-to-end test suite:
```bash
# Using standard Python
python test_app.py

# Or targeting modular tests directly
python tests/test_health.py
python tests/test_e2e_pipeline.py
```
