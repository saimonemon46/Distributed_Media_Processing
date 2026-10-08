# Master Knowledge & System Design Interview Defense Manual

> **Document:** `docs/00_MASTER_KNOWLEDGE_AND_INTERVIEW_DEFENSE_MANUAL.md`  
> **Topic:** Technical Trade-offs, Architectural Invariants, and Interview Defense for Distributed Media Processing

---

## 1. Architectural Justifications & Trade-Offs

### Q1: Why decouple media processing asynchronously instead of synchronous processing in the API thread?
* **Synchronous Pitfall:** Image decoding and resizing is **CPU-bound** and can consume hundreds of megabytes of RAM and several seconds of CPU time per image. If done synchronously inside the HTTP request handler:
  1. The API worker thread is blocked for the entire duration of the computation.
  2. Under concurrent traffic, Python's ASGI/WSGI event loop threads become saturated, leading to thread starvation, request queue bloat, client timeouts (`504 Gateway Timeout`), and server crashes.
* **Asynchronous Solution:** Decoupling via a message broker allows the API to perform only lightweight I/O (streaming raw bytes directly to object storage and writing a metadata record to PostgreSQL). The API responds with `202 Accepted` in **$<50\text{ms}$**, keeping HTTP ingress fast and responsive while background workers process heavy media tasks independently.

---

### Q2: Why RabbitMQ instead of Redis Pub/Sub, Apache Kafka, or Celery?
* **vs. Redis Pub/Sub:** Redis Pub/Sub is "fire-and-forget" with no message durability, no acknowledgments, and no persistent queuing. If a worker is offline or crashes, messages are lost forever.
* **vs. Apache Kafka:** Kafka is a distributed append-only commit log optimized for real-time streaming analytics, replayability, and massive throughput of small events. For discrete task routing with worker-level acknowledgments (`basic_ack`), fair queue distribution, and dead-letter handling, an AMQP message broker like RabbitMQ is simpler, lighter, and purpose-built.
* **vs. Celery:** While Celery is a popular task runner, building a lightweight native Pika consumer provides transparent control over connection retries, channel prefetch limits, heartbeats, and Linux signal traps without the heavy overhead, complex result backends, or serialization baggage of Celery.

---

### Q3: Why MinIO (S3-Compatible Object Storage) instead of local disk or storing images directly in PostgreSQL (BYTEA)?
* **vs. Storing in Database (BLOB / BYTEA):** Databases are optimized for structured rows, indexing, and transactional ACID guarantees. Storing megabytes of binary image data inside PostgreSQL causes massive WAL bloat, exhausts buffer cache, slows down vacuuming, and inflates database backups.
* **vs. Local Server Filesystem:** Storing files on local disk tightly couples the application to a single server instance. If multiple API or worker containers run across different machines, local disks cannot be shared without fragile NFS mounts. MinIO provides an S3-compatible, horizontally scalable, stateless storage abstraction.

---

### Q4: Why use S3 Presigned URLs instead of proxying image downloads through the API server?
* If clients download 10MB–50MB processed images through FastAPI:
  1. The API server becomes a bandwidth bottleneck.
  2. Server memory is consumed buffering and proxying large binary streams.
  3. API network interfaces become saturated, degrading API responsiveness.
* **Presigned URL Architecture:** The API server generates a temporary, cryptographically signed URL pointing directly to MinIO. The client's browser downloads the asset directly from the storage layer, completely bypassing the API compute layer.

---

### Q5: What is "Fair Dispatch" and why is `prefetch_count=1` critical?
* By default, RabbitMQ dispatches messages to consumers in a simple round-robin fashion as soon as they arrive in the queue.
* In media processing, task execution times vary wildly (e.g. an 8K image takes 3 seconds, while a 200x200 icon takes 20ms).
* If RabbitMQ assigns 10 heavy tasks to Worker 1 and 10 light tasks to Worker 2, Worker 1 becomes overwhelmed while Worker 2 sits idle.
* Setting `channel.basic_qos(prefetch_count=1)` instructs RabbitMQ **never to give more than 1 unacknowledged message** to a worker at any given time. RabbitMQ will hold remaining tasks until a worker sends `basic_ack`, ensuring optimal load balancing across heterogeneous task sizes.

---

### Q6: How does the system handle "Poison Pill" messages (corrupted image files)?
* A "poison pill" is a malformed message or corrupted image that causes the worker to throw an unhandled exception.
* If the worker crashes without acknowledging the message, RabbitMQ re-queues it upon connection closure. Another worker picks it up, crashes again, creating a **catastrophic infinite crash loop** that halts the entire cluster.
* **Mitigation:**
  1. The worker wraps the parsing and Pillow image loading inside a resilient `try...except` boundary.
  2. When an `UnidentifiedImageError` occurs, the worker catches it, updates the PostgreSQL job status to `FAILED`, persists the error string, and explicitly executes `ch.basic_ack()`.
  3. This cleanly clears the toxic task from RabbitMQ, saves audit details for the user, and keeps the worker running.

---

### Q7: How does the worker handle graceful OS shutdown (SIGINT / SIGTERM)?
* When a Docker container stops or Kubernetes scales down a pod, it sends a Linux `SIGTERM` signal followed by `SIGKILL` after a grace period (e.g., 10–30 seconds).
* Without signal handling, an active image resize would be killed mid-flight, leaving an orphaned `PROCESSING` job in the database.
* **Implementation:** The worker registers signal handlers with `signal.signal(signal.SIGTERM, self.handle_shutdown)`. Upon signal receipt, it stops the consumer channel (`channel.stop_consuming()`), finishes processing the currently active image, acknowledges it, and cleanly closes the broker connection.

---

## 2. Invariants & Guarantees Table

| Layer | Invariant Guarantee | Failure Mode Prevented |
| :--- | :--- | :--- |
| **API Ingress** | Sub-50ms response time | API thread starvation and client gateway timeouts (`504`). |
| **Database** | Monotonic state transitions (`PENDING` $\rightarrow$ `PROCESSING` $\rightarrow$ `COMPLETED` \| `FAILED`) | Inconsistent job states and untracked processing failures. |
| **RabbitMQ** | Durable queues (`durable=True`) & persistent delivery (`delivery_mode=2`) | Message loss across broker restarts or hardware failures. |
| **Worker QoS** | `prefetch_count=1` (Fair Dispatch) | Uneven queue distribution and CPU core starvation. |
| **Storage** | Presigned URL direct delivery | API egress bandwidth saturation. |
