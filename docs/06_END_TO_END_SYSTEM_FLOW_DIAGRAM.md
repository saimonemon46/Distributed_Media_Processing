# End-to-End System Flow & Architecture Diagrams

> **Document:** `docs/06_END_TO_END_SYSTEM_FLOW_DIAGRAM.md`

---

## 1. Complete End-to-End Execution Flow

```mermaid
sequenceDiagram
    autonumber
    actor Client as Web Client / Browser
    participant API as FastAPI Ingress (app.api)
    participant DB as PostgreSQL 17 (jobs table)
    participant MinIO as MinIO S3 (media-bucket)
    participant RMQ as RabbitMQ Broker (media_processing_jobs)
    participant Worker as Background Worker (app.worker)

    Note over Client,API: Phase 1: Ingress & Task Scheduling
    Client->>API: POST /jobs (multipart/form-data)
    API->>DB: INSERT Job (status='PENDING', filename='image.jpg')
    DB-->>API: Persisted Job Record with UUID
    API->>MinIO: PUT uploads/{job_id}/image.jpg (raw bytes stream)
    API->>DB: UPDATE Job SET original_key='uploads/...'
    API->>RMQ: basic_publish {job_id, original_key} (Persistent)
    API-->>Client: HTTP 202 Accepted {id: UUID, status: "PENDING"}

    Note over RMQ,Worker: Phase 2: Decoupled Processing
    RMQ->>Worker: basic_deliver task payload (Prefetch=1)
    Worker->>DB: UPDATE Job SET status='PROCESSING', started_at=NOW()
    Worker->>MinIO: GET uploads/{job_id}/image.jpg
    MinIO-->>Worker: Raw image byte buffer
    Worker->>Worker: Pillow image.thumbnail((500, 500)) -> JPEG buffer
    Worker->>MinIO: PUT processed/{job_id}.jpg
    Worker->>DB: UPDATE Job SET status='COMPLETED', completed_at=NOW()
    Worker->>RMQ: basic_ack (Delivery tag cleared)

    Note over Client,API: Phase 3: Status Polling & Secure Egress
    loop Polling Status
        Client->>API: GET /jobs/{job_id}
        API->>DB: SELECT * FROM jobs WHERE id=UUID
        DB-->>API: Job row (status='COMPLETED')
        API->>API: Generate Presigned URL (HMAC-SHA256 signature)
        API-->>Client: HTTP 200 {status: "COMPLETED", download_url: "http://..."}
    end

    Client->>MinIO: GET /media-bucket/processed/... (Direct Download)
    MinIO-->>Client: 200 OK (Processed thumbnail JPEG)
```

---

## 2. Component Responsibility Matrix

| Component | Responsibility | Tech Stack |
| :--- | :--- | :--- |
| **API Ingress** | Multipart file streaming, validation, job orchestration, polling. | FastAPI, Uvicorn, Pydantic |
| **Relational Store** | State tracking, audit history, timestamps, error records. | PostgreSQL 17, SQLAlchemy |
| **Object Store** | Raw image storage, processed thumbnail storage, direct URL streaming. | MinIO, Boto3 S3 API |
| **Message Broker** | Asynchronous queuing, durable message buffering, fair dispatch. | RabbitMQ 3, Pika AMQP |
| **Worker Engine** | Image resampling, format conversion, thumbnail generation, graceful signal draining. | Pillow (PIL), Python 3.12 |
