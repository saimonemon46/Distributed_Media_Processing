# Distributed Media Processing: Implementation Phases & Engineering Roadmap

> **Author:** Md. Saimon Hasan Emon  
> **Status:** Fully Implemented & Documented  
> **Architecture:** Decoupled Event-Driven Microservices (FastAPI, RabbitMQ, MinIO, PostgreSQL, Pillow)

---

## Roadmap Overview

```mermaid
flowchart LR
    P0["Phase 0: Scaffolding"] --> P1["Phase 1: Human Scenario"]
    P1 --> P2["Phase 2: Domain & Config"]
    P2 --> P3["Phase 3: Infrastructure"]
    P3 --> P4["Phase 4: API Layer"]
    P4 --> P5["Phase 5: Worker Engine"]
    P5 --> P6["Phase 6: Testing & QA"]
    P6 --> P7["Phase 7: Master Docs"]
```

---

## Phase 0: Workspace Scaffolding & Git Tracking Setup
* **Objective:** Establish the modular, production-grade layout matching enterprise standards.
* **Deliverables:**
  - Create layered package architecture: `app/core/`, `app/domain/`, `app/infrastructure/`, `app/api/`, `app/worker/`.
  - Create dedicated directories: `docs/`, `tests/`, `scripts/`.
  - Configure `.gitignore` to maintain private/untracked dev logs (`WORK_TRACKER.md`).
  - Create documented `.env.example` mapping all environment variables across PostgreSQL, MinIO, and RabbitMQ.

---

## Phase 1: Real-World Human Scenario & Vision
* **Objective:** Anchor all architectural decisions in concrete human and business value.
* **Deliverables:**
  - Document `HUMAN_SCENARIO.md` and `docs/08_HUMAN_SCENARIO_WALKTHROUGH.md`.
  - Detailed actor profiles: Artisan seller Sarah Rahman uploading 4K uncompressed DSLR photographs.
  - End-to-end timeline: Sub-50ms HTTP 202 ingress, background queueing, non-blocking thumbnail synthesis, and direct-to-browser S3 presigned URL delivery.
  - Poison-pill failure recovery scenario with zero cluster downtime.

---

## Phase 2: Core Domain, Schemas & Configuration Layer
* **Objective:** Model the transaction entities and enforce strict contract validation.
* **Deliverables:**
  - `app/core/config.py`: Centralized typed settings (`Settings`) with environment variable parsing and fallback defaults.
  - `app/domain/models.py`: PostgreSQL [`Job`](file:///home/saimon/Emon_work/project/Distributed_Media_Processing/app/domain/models.py) entity mapping UUID primary keys, file names, status enums (`PENDING`, `PROCESSING`, `COMPLETED`, `FAILED`), timestamps, and error traces.
  - `app/api/schemas.py`: Pydantic validation schemas (`HealthResponse`, `JobCreateResponse`, `JobDetailResponse`).

---

## Phase 3: Infrastructure Layer (Storage, Database, RabbitMQ)
* **Objective:** Implement reliable, resilient third-party integrations.
* **Deliverables:**
  - `app/infrastructure/database.py`: SQLAlchemy connection pooling (`pool_pre_ping=True`), sessionmaker, and FastAPI dependency injection provider `get_db`.
  - `app/infrastructure/storage.py`: Boto3 S3 wrapper with dual client separation (internal container network vs. external browser host), stream upload/download, bucket auto-provisioning, and S3 Presigned URL generator.
  - `app/infrastructure/rabbitmq.py`: Pika AMQP connection factory with retry loop, durable queue declarations, and persistent message publishing.

---

## Phase 4: API Presentation Layer (FastAPI Routers)
* **Objective:** Deliver low-latency, non-blocking HTTP ingress.
* **Deliverables:**
  - `app/api/routes/health.py`: Liveness probe endpoint returning HTTP 200.
  - `app/api/routes/jobs.py`:
    - `POST /jobs`: Ingests multipart files, writes metadata to Postgres, uploads raw stream to MinIO, publishes task to RabbitMQ, and returns HTTP 202 Accepted in under 50ms.
    - `GET /jobs/{job_id}`: Polls execution state and dynamically generates temporary S3 presigned download URLs when completed.
  - `app/api/main.py`: FastAPI app initialization with `lifespan` hook ensuring DB tables and MinIO buckets exist on boot.

---

## Phase 5: Distributed Background Worker Layer
* **Objective:** Offload heavy CPU-bound image computations to isolated consumers.
* **Deliverables:**
  - `app/worker/consumer.py`: RabbitMQ event-loop consumer.
  - Fair dispatch: Enforces `prefetch_count=1` to balance cluster workload.
  - Image mutation: Pillow aspect-ratio thumbnail calculation (`500x500` max dimension) and optimized JPEG buffer generation.
  - Graceful Linux signal interception (`SIGINT`, `SIGTERM`) to drain in-flight jobs.
  - Backwards-compatible root shims (`main.py`, `worker.py`).

---

## Phase 6: Automated Testing & Container Orchestration
* **Objective:** Full verification of liveness, throughput, and fault isolation.
* **Deliverables:**
  - `tests/conftest.py`: Reusable fixtures and test byte sequences (1x1 GIF, corrupt bytes).
  - `tests/test_health.py`: Health endpoint integration check.
  - `tests/test_e2e_pipeline.py`: Comprehensive end-to-end integration suite verifying valid upload $\rightarrow$ thumbnail generation $\rightarrow$ presigned URL download, and corrupt payload $\rightarrow$ FAILED transition.
  - `Dockerfile` & `docker-compose.yml`: Modernized container orchestration.

---

## Phase 7: Master Documentation & Interview Defense Manual
* **Objective:** Professional technical documentation for architectural reviews and systems defense.
* **Deliverables:**
  - Comprehensive documentation suite (`docs/00` to `docs/08`).
  - Master `README.md` with system overview, architecture diagrams, engineering guarantees, and usage guides.
  - Root `PHASES.md` roadmap.
