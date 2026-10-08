# Architecture & Low-Level Design (LLD) Patterns

> **Document:** `docs/02_ARCHITECTURE_AND_LLD_PATTERNS.md`

---

## 1. Modular Package Architecture

The codebase follows a clean, decoupled layer structure:

```
Distributed_Media_Processing/
├── app/
│   ├── api/                     # Ingress presentation layer
│   │   ├── routes/              # Sub-routers (/health, /jobs)
│   │   ├── main.py              # FastAPI app factory & lifespan
│   │   └── schemas.py           # Pydantic validation schemas
│   ├── core/                    # Core configuration & settings
│   │   └── config.py            # Typed settings & environment bindings
│   ├── domain/                  # Domain entities & business invariants
│   │   └── models.py            # SQLAlchemy Job schema & JobStatus
│   ├── infrastructure/          # External adapters & system drivers
│   │   ├── database.py          # PostgreSQL sessionmaker & pool engine
│   │   ├── storage.py           # MinIO / S3 wrapper (stream I/O, presigned URLs)
│   │   └── rabbitmq.py          # AMQP connection factory & task publisher
│   └── worker/                  # Background execution layer
│       └── consumer.py          # RabbitMQ consumer & Pillow resizing engine
├── docs/                        # Complete technical documentation suite
├── tests/                       # Integration & unit test suites
└── scripts/                     # Operational automation scripts
```

---

## 2. Low-Level Design (LLD) Patterns Applied

### Pattern 1: Storage Gateway Pattern (`storage.py`)
* **Problem:** Direct calls to `boto3` inside API routes or worker routines couple business logic to specific SDK quirks and endpoint configurations.
* **Solution:** An abstraction layer encapsulates MinIO/S3 operations behind simple signatures:
  - `upload_file_bytes(data: io.BytesIO, key: str)`
  - `download_file_bytes(key: str) -> io.BytesIO`
  - `get_presigned_download_url(key: str) -> str`
* **Dual Client Strategy:** Configures `s3_client` (targeting internal container DNS `http://minio:9000`) for data transfers and `s3_public_client` (targeting `http://localhost:9000`) so generated browser links resolve correctly on host machines.

---

### Pattern 2: Competing Consumers with Fair Dispatch (`consumer.py`)
* **Problem:** High-volume ingress can starve worker processes if messages are distributed unevenly via round-robin.
* **Solution:** Workers bind to the shared queue `media_processing_jobs` using `channel.basic_qos(prefetch_count=1)`. RabbitMQ treats workers as competing consumers, allocating a new message to a worker only after it has acknowledged its active job. This allows horizontal worker scaling without code changes.

---

### Pattern 3: Poison-Pill Isolation Boundary (`process_message`)
* **Problem:** Corrupt or non-image files can throw unhandled runtime exceptions inside worker threads.
* **Solution:** The consumer implements a dual-layer isolation boundary:
  ```python
  try:
      # Media manipulation
      image = Image.open(raw_buffer)
      ...
  except Exception as e:
      # Isolate failure, update database record
      job.status = "FAILED"
      job.error = str(e)
      db.commit()
  finally:
      db.close()
      ch.basic_ack(delivery_tag=method.delivery_tag)
  ```
  Acknowledging the message even on failure prevents poisonous payloads from bouncing indefinitely across the cluster.

---

### Pattern 4: Lifespan Application State Manager (`main.py`)
* **Problem:** Serving traffic before database migrations have executed or S3 buckets are provisioned leads to runtime errors on early requests.
* **Solution:** FastAPI's modern `@asynccontextmanager` `lifespan` hook executes prerequisite infrastructure setup before yielding control to incoming HTTP traffic:
  1. `Base.metadata.create_all(bind=engine)`
  2. `init_storage()`
