# Real-World Human Scenario: The Artisan Gallery & High-Res Ingestion Pipeline

> **Document:** `docs/08_HUMAN_SCENARIO_WALKTHROUGH.md`  
> 👉 For the complete narrative version, see [**HUMAN_SCENARIO.md**](file:///home/saimon/Emon_work/project/Distributed_Media_Processing/HUMAN_SCENARIO.md).

---

## 1. Executive Summary

This scenario illustrates how our distributed, asynchronous media architecture transforms the real-world experience of **Sarah Rahman**, an artisan jewelry designer uploading 45MB DSLR macro photographs to an online storefront (*ArtisanHub*).

Instead of browser freezes and gateway timeouts (`504 Gateway Timeout`), Sarah experiences:
1. **Sub-50ms HTTP Ingress:** An immediate `202 Accepted` acknowledgement.
2. **Instant Visual Feedback:** The UI confirms upload and indicates background optimization is running.
3. **Decoupled Asynchronous Processing:** A cluster of background workers handles image resizing without degrading API server throughput.
4. **Secure Direct S3 Delivery:** Browser fetches processed thumbnails straight from MinIO using an expiring presigned URL.
5. **Resilient Poison Pill Isolation:** Corrupted files fail cleanly with permanent audit logging while keeping other workers running.

---

## 2. Ingress & Egress Metric Timeline

| Timestamp | Component | Action | Latency / Duration |
| :--- | :--- | :--- | :--- |
| **10:00:00.000** | Client Browser | User selects 45MB raw image and submits `POST /jobs`. | Network upload time |
| **10:00:01.010** | FastAPI Ingress | Ingests file stream, inserts `PENDING` job into PostgreSQL. | 6 ms |
| **10:00:01.025** | MinIO Storage | Streams raw file into `media-bucket/uploads/...`. | 15 ms |
| **10:00:01.034** | RabbitMQ | Enqueues AMQP task and returns HTTP 202 Accepted to user. | 9 ms (Total: 30 ms) |
| **10:00:01.050** | Worker Node | Picks up message (Prefetch=1), updates status to `PROCESSING`. | 5 ms |
| **10:00:02.100** | Worker Node | Streams raw image from MinIO into in-memory buffer. | 1050 ms |
| **10:00:02.650** | Worker Node | Pillow decodes image and generates 500x500 JPEG thumbnail. | 550 ms |
| **10:00:02.720** | MinIO Storage | Worker uploads processed thumbnail to `media-bucket/processed/...`. | 70 ms |
| **10:00:02.730** | PostgreSQL | Worker updates job to `COMPLETED`, records timestamps. | 10 ms |
| **10:00:02.735** | RabbitMQ | Worker sends `basic_ack`, clearing queue. | 5 ms |
| **10:00:03.000** | Client Browser | Polls `GET /jobs/{id}`, receives `COMPLETED` + Presigned URL. | 8 ms |
| **10:00:03.150** | MinIO Storage | Browser downloads 85KB thumbnail directly from S3. | 150 ms |

**Total End-to-End Elapsed Time:** ~3.15 seconds  
**API Blocking Time:** Under 35 milliseconds
