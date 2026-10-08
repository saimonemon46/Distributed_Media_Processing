# Core Computer Science Deep Dive: Protocols, Memory & Cryptography

> **Document:** `docs/03_CORE_CS_DEEP_DIVE.md`

---

## 1. AMQP 0-9-1 Protocol Internals & RabbitMQ Mechanics

The system utilizes the Advanced Message Queuing Protocol (AMQP 0-9-1) through Pika. Understanding its internal mechanics is essential for high-reliability systems:

```
+-------------------------------------------------------------+
|                     TCP Connection                          |
|  +--------------------+  +--------------------+             |
|  |     Channel 1      |  |     Channel 2      |   ...       |
|  +--------------------+  +--------------------+             |
+-------------------------------------------------------------+
```

### 1.1 Channels vs. TCP Connections
* Creating and tearing down TCP connections is expensive due to the 3-way handshake and TLS negotiation.
* AMQP solves this by multiplexing lightweight **channels** over a single long-lived TCP connection. All command frames (`Basic.Publish`, `Basic.Deliver`, `Basic.Ack`) travel over these virtual channels.

### 1.2 Message Durability vs. Persistence
* **Queue Durability (`durable=True`):** The broker writes the queue definition to its Mnesia/Khepri metadata store. If RabbitMQ restarts, the queue continues to exist.
* **Message Persistence (`delivery_mode=2`):** The message body and metadata are written to RabbitMQ's disk-backed storage engine. If both the queue is durable and the message is persistent, the message will survive a complete broker restart or power failure.

### 1.3 Heartbeats & Slow Processing (`heartbeat=600`)
* When an operating system or firewall detects an idle TCP connection, it may drop it silently.
* AMQP heartbeats send periodic control frames (every $N/2$ seconds) to verify peer liveness.
* Because CPU-intensive image resizing can temporarily consume processing time, setting `heartbeat=600` ensures RabbitMQ does not falsely assume the worker process has hung or died during heavy image operations.

---

## 2. In-Memory Streaming & Memory Footprint Optimization

### 2.1 The Danger of Disk I/O in Containerized Workloads
Traditional media processing pipelines write incoming uploads to a `/tmp` directory, process them, write the output to another disk path, and then upload it.
* **Pitfalls:** Disk writes inside container overlays are slow, wear down storage drives, and risk out-of-disk errors (`ENOSPC`) if cleanup cronjobs fail.

### 2.2 Pure Byte-Stream Processing (`io.BytesIO`)
This engine uses in-memory byte streams end-to-end:
```python
contents = file.file.read()
raw_buffer = io.BytesIO(contents)
s3_client.upload_fileobj(raw_buffer, ...)
```
* **Pointer Management (`seek(0)`):** After reading from or writing to an `io.BytesIO` stream, the internal cursor is positioned at EOF. Calling `data.seek(0)` rewinds the cursor back to byte offset 0 before streaming to the S3 client.
* **Garbage Collection:** Once the local scope of `process_message` or `create_job` terminates, the Python reference count of the byte buffer drops to 0, allowing the memory to be reclaimed without OS filesystem operations.

---

## 3. Cryptography Behind S3 Presigned URLs

A presigned URL enables a client without AWS/MinIO credentials to download an object directly. The URL contains cryptographic query parameters:

$$\text{Presigned URL} = \text{Base URL} + \text{Query Parameters} + \text{Signature}$$

### HMAC-SHA256 Derivation:
1. **Canonical Request Construction:**
   ```
   GET\n
   /media-bucket/processed/job_id.jpg\n
   AWSAccessKeyId=minioadmin&Expires=1791444003\n
   ```
2. **String to Sign:** The canonical request is hashed using SHA256 and combined with date and scope metadata.
3. **Key Derivation:** The S3 secret key is used in a series of HMAC-SHA256 operations to derive a signing key.
4. **Signature:** The string to sign is hashed with the signing key:
   $$\text{Signature} = \text{HMAC-SHA256}(\text{SigningKey}, \text{StringToSign})$$
5. **Validation at MinIO:** When Sarah's browser requests the URL, MinIO recalculates the signature using its copy of the secret key. If the signature matches and current time is $< \text{Expires}$, MinIO streams the file directly to Sarah.
