# Module & Component Specifications

> **Document:** `docs/04_MODULE_AND_COMPONENT_SPECIFICATIONS.md`

---

## 1. Domain & Persistence Entities (`app/domain/models.py`)

### `Job` Model Specification:
| Attribute | Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID (v4)` | False (PK) | Globally unique identifier generated via `uuid.uuid4()`. |
| `original_filename` | `VARCHAR` | False | Name of the file provided by client at ingress time. |
| `original_key` | `VARCHAR` | True | MinIO object key for the raw upload (`uploads/{job_id}/{filename}`). |
| `status` | `VARCHAR` | False | Current lifecycle state: `PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`. |
| `created_at` | `TIMESTAMPTZ` | False | UTC timestamp when job record was inserted. |
| `started_at` | `TIMESTAMPTZ` | True | UTC timestamp when background worker consumed the task. |
| `completed_at` | `TIMESTAMPTZ` | True | UTC timestamp when processing succeeded or failed. |
| `output_key` | `VARCHAR` | True | MinIO object key for the resulting thumbnail (`processed/{job_id}.jpg`). |
| `error` | `TEXT` | True | Detailed exception trace or error message if status is `FAILED`. |

---

## 2. API Contract Specifications (`app/api/schemas.py`)

### `JobCreateResponse`
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "PENDING",
  "original_filename": "ring.jpg",
  "original_key": "uploads/3fa85f64-5717-4562-b3fc-2c963f66afa6/ring.jpg"
}
```

### `JobDetailResponse`
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "COMPLETED",
  "original_filename": "ring.jpg",
  "original_key": "uploads/3fa85f64-5717-4562-b3fc-2c963f66afa6/ring.jpg",
  "created_at": "2026-10-08T10:00:01.000Z",
  "started_at": "2026-10-08T10:00:02.000Z",
  "completed_at": "2026-10-08T10:00:03.000Z",
  "output_key": "processed/3fa85f64-5717-4562-b3fc-2c963f66afa6.jpg",
  "error": null,
  "download_url": "http://localhost:9000/media-bucket/processed/3fa85f64-5717-4562-b3fc-2c963f66afa6.jpg?..."
}
```

---

## 3. Infrastructure Adapter Specifications

### Storage Adapter (`app/infrastructure/storage.py`)
- **`init_storage()`:** Calls `head_bucket`; executes `create_bucket` if non-existent.
- **`upload_file_bytes(data, object_key, content_type)`:** Streams byte buffer to S3 without writing to local filesystem.
- **`download_file_bytes(object_key) -> io.BytesIO`:** Pulls object bytes directly into an in-memory stream.
- **`get_presigned_download_url(object_key, expiration) -> str`:** Signs an S3 GET query valid for the specified duration (default: 3600 seconds).

### Messaging Adapter (`app/infrastructure/rabbitmq.py`)
- **`get_connection_channel(retries=5, delay=2)`:** Connects to RabbitMQ with exponential/linear retry handling to tolerate container boot delay.
- **`publish_job(job_id, original_key)`:** Publishes persistent JSON payload to default direct exchange with `delivery_mode=2`.
