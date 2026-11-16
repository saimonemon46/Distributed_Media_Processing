# MediaFlow - API Integration Specification

This document details the communication contract between the **MediaFlow** Next.js frontend and the FastAPI distributed processing backend.

---

## 1. API Architecture Overview

- **Protocol**: HTTP/1.1 REST + JSON (Multipart form data for uploads)
- **Base URL (Development)**: `http://localhost:8000` (or `http://localhost:8001` if port 8000 is occupied)
- **Base URL (Production)**: Configurable via `NEXT_PUBLIC_API_BASE_URL`
- **Security & Presigned URLs**: Files are stored in S3/MinIO. Uploads pass through FastAPI to ensure validation and persistence; downloads use temporary presigned URLs expiring in 3600 seconds, avoiding exposure of internal storage credentials.
- **CORS Support**: Handled via Starlette/FastAPI `CORSMiddleware` supporting configured frontend domains (`localhost:3000`, `localhost:3001`, and production Vercel domains).

---

## 2. API Endpoint Matrix

| Frontend Feature | Backend Endpoint | HTTP Method | Request Schema | Response Schema | Status Code |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **System Liveness** | `/health` | `GET` | *None* | `{"status": "Healthy"}` | `200 OK` |
| **Infrastructure & Worker Stats** | `/stats` | `GET` | *None* | System stats object (queue depth, workers, job totals, component status) | `200 OK` |
| **Job Submission (Upload)** | `/jobs` | `POST` | `multipart/form-data` with `file: UploadFile` | Job creation summary (`id`, `status`, `original_filename`, `original_key`) | `202 Accepted` |
| **Job Listing & Filter** | `/jobs` | `GET` | Query params: `limit` (int), `offset` (int), `status` (str), `search` (str) | `{ "total": int, "items": Job[] }` | `200 OK` |
| **Job Status & Details** | `/jobs/{job_id}` | `GET` | Path param: `job_id` (UUID) | Full Job detail object (timestamps, output key, error, presigned download URLs) | `200 OK` / `404 Not Found` |
| **Media Asset Retrieval** | `/jobs/{job_id}` | `GET` | Path param: `job_id` (UUID) | Contains `download_url` (processed asset) and `original_url` | `200 OK` |

---

## 3. Detailed Request and Response Schemas

### 3.1. System Health (`GET /health`)
- **Request**: None
- **Response** (`200 OK`):
```json
{
  "status": "Healthy"
}
```

### 3.2. Infrastructure & Worker Statistics (`GET /stats`)
- **Request**: None
- **Response** (`200 OK`):
```json
{
  "status": "Healthy",
  "queue": {
    "name": "media_processing_jobs",
    "depth": 0,
    "consumer_count": 1
  },
  "database": {
    "status": "connected",
    "total_jobs": 128,
    "pending_jobs": 0,
    "processing_jobs": 0,
    "completed_jobs": 124,
    "failed_jobs": 4,
    "avg_duration_seconds": 1.42
  },
  "storage": {
    "bucket": "media-bucket",
    "status": "connected"
  }
}
```

### 3.3. Submit Media Processing Job (`POST /jobs`)
- **Request**:
  - `Content-Type: multipart/form-data`
  - Body: `file: <Binary>` (valid image: JPG, PNG, GIF, WebP, etc.)
- **Response** (`202 Accepted`):
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "PENDING",
  "original_filename": "photo.jpg",
  "original_key": "uploads/3fa85f64-5717-4562-b3fc-2c963f66afa6/photo.jpg"
}
```

### 3.4. Query Job Details (`GET /jobs/{job_id}`)
- **Request**:
  - Path param: `job_id` (UUID string)
- **Response** (`200 OK`):
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "COMPLETED",
  "original_filename": "photo.jpg",
  "original_key": "uploads/3fa85f64-5717-4562-b3fc-2c963f66afa6/photo.jpg",
  "created_at": "2026-11-16T15:30:00Z",
  "started_at": "2026-11-16T15:30:01Z",
  "completed_at": "2026-11-16T15:30:02Z",
  "duration_seconds": 1.25,
  "output_key": "processed/3fa85f64-5717-4562-b3fc-2c963f66afa6.jpg",
  "error": null,
  "download_url": "http://localhost:9000/media-bucket/processed/3fa85f64-5717-4562-b3fc-2c963f66afa6.jpg?AWSAccessKeyId=...",
  "original_url": "http://localhost:9000/media-bucket/uploads/3fa85f64-5717-4562-b3fc-2c963f66afa6/photo.jpg?AWSAccessKeyId=..."
}
```

### 3.5. List Jobs (`GET /jobs`)
- **Request**:
  - `limit`: integer (default 20, max 100)
  - `offset`: integer (default 0)
  - `status`: optional string (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`)
  - `search`: optional string
- **Response** (`200 OK`):
```json
{
  "total": 42,
  "limit": 20,
  "offset": 0,
  "items": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "status": "COMPLETED",
      "original_filename": "photo.jpg",
      "original_key": "uploads/3fa85f64-5717-4562-b3fc-2c963f66afa6/photo.jpg",
      "created_at": "2026-11-16T15:30:00Z",
      "started_at": "2026-11-16T15:30:01Z",
      "completed_at": "2026-11-16T15:30:02Z",
      "duration_seconds": 1.25,
      "output_key": "processed/3fa85f64-5717-4562-b3fc-2c963f66afa6.jpg",
      "error": null,
      "download_url": "http://localhost:9000/media-bucket/processed/...",
      "original_url": "http://localhost:9000/media-bucket/uploads/..."
    }
  ]
}
```

---

## 4. Polling Lifecycle & State Machine

```
              ┌────────────────────────┐
              │ Client uploads file    │
              └───────────┬────────────┘
                          │ HTTP 202 Accepted
                          ▼
              ┌────────────────────────┐
              │        PENDING         │
              └───────────┬────────────┘
                          │ Worker picks up task from RabbitMQ
                          ▼
              ┌────────────────────────┐
              │       PROCESSING       │
              └───────────┬────────────┘
             ┌────────────┴────────────┐
             ▼                         ▼
   ┌───────────────────┐     ┌───────────────────┐
   │     COMPLETED     │     │      FAILED       │
   │ (Presigned URLs)  │     │  (Error details)  │
   └───────────────────┘     └───────────────────┘
```

Frontend polling operates with **TanStack Query** at 3-second intervals while `status === "PENDING" || status === "PROCESSING"`. Polling terminates automatically upon transitioning to `COMPLETED` or `FAILED`.
