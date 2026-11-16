# AGENTS.md - Distributed Media Processing Engine

## 1. Architecture Overview
This project implements a decoupled, distributed asynchronous media processing system designed to handle CPU-intensive asset transformations without blocking HTTP ingress.

```
[Client / Browser]
    │ (1) POST /jobs (multipart)
    ▼
[FastAPI Ingress (main.py)] ──── (2) Upload Raw ───► [MinIO S3 Storage (storage.py)]
    │                                                   ▲               │
    ├── (3) Record PENDING                              │               │ (5) Download Raw
    ▼                                                   │               ▼
[PostgreSQL (models.py)]                                │       [Worker (worker.py)]
    ▲                                                   │       - Pillow resize
    │ (4) Publish Task                                  │       - Aspect preservation
    ▼                                                   │               │
[RabbitMQ Broker (rabbitmq.py)] ────────────────────────┼───────────────┘
  (media_processing_jobs)                               │ (6) Upload Result
                                                        │
[Client / Browser] ◄─── (7) GET /jobs/{id} ─────────────┴─ Presigned Download URL
```

## 2. Key File Directory
- [`main.py`](file:///home/saimon/Emon_work/project/Distributed_Media_Processing/main.py): FastAPI application routes (`POST /jobs`, `GET /jobs/{job_id}`, `GET /health`) and lifespan hook.
- [`worker.py`](file:///home/saimon/Emon_work/project/Distributed_Media_Processing/worker.py): Asynchronous background worker consuming tasks, resizing images via Pillow, and updating job status.
- [`storage.py`](file:///home/saimon/Emon_work/project/Distributed_Media_Processing/storage.py): MinIO/S3 object storage interface with dual endpoints (internal network and external presigned URLs).
- [`rabbitmq.py`](file:///home/saimon/Emon_work/project/Distributed_Media_Processing/rabbitmq.py): AMQP connection management, retries, and persistent message publishing.
- [`database.py`](file:///home/saimon/Emon_work/project/Distributed_Media_Processing/database.py): SQLAlchemy engine, session factory, and dependency injection provider.
- [`models.py`](file:///home/saimon/Emon_work/project/Distributed_Media_Processing/models.py): SQLAlchemy `Job` ORM model tracking lifecycle metadata (`PENDING` -> `PROCESSING` -> `COMPLETED`/`FAILED`).
- [`test_app.py`](file:///home/saimon/Emon_work/project/Distributed_Media_Processing/test_app.py): End-to-end integration test runner validating health checks, valid image processing, and corrupt payload failure handling.
- [`docker-compose.yml`](file:///home/saimon/Emon_work/project/Distributed_Media_Processing/docker-compose.yml): Orchestrates API, Worker, PostgreSQL 17, MinIO, and RabbitMQ.
- [`Dockerfile`](file:///home/saimon/Emon_work/project/Distributed_Media_Processing/Dockerfile): Python 3.12 slim container definition.
- [`SYSTEM_EXPLAINER.md`](file:///home/saimon/Emon_work/project/Distributed_Media_Processing/SYSTEM_EXPLAINER.md): Deep-dive documentation on architecture, real-world industry patterns, and core CS fundamentals.

## 3. Development Commands
- **Start All Services (Docker)**:
  ```bash
  docker compose up --build -d
  ```
- **Stop All Services**:
  ```bash
  docker compose down
  ```
- **Run Integration Tests**:
  ```bash
  python test_app.py
  ```
- **Run FastAPI Locally**:
  ```bash
  uvicorn main:app --reload --host 0.0.0.0 --port 8000
  ```
- **Run Background Worker Locally**:
  ```bash
  python worker.py
  ```

## 4. Coding & Operating Conventions
- **Asynchronous Ingress**: Ingress endpoints must return `HTTP 202 Accepted` within `<50ms` and delegate heavy computation to the background worker.
- **Fair Dispatch**: Worker must maintain `prefetch_count=1` (`basic_qos`) to ensure balanced distribution across worker instances.
- **Stateless Storage**: Local disk writes are prohibited in production pipelines; all original and processed assets must stream directly through MinIO.
- **Reliable Acknowledgements**: Explicit `basic_ack` must be executed to remove messages from RabbitMQ once handled (even on non-transient processing failure).
