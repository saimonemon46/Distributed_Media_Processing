# =====================================================================
# Distributed Background Media Worker Consumer
# =====================================================================
# Consumes tasks from RabbitMQ, streams assets from MinIO, performs
# image mutations via Pillow, and synchronizes state in PostgreSQL.
# =====================================================================

import io
import json
import signal
import sys
import traceback
from datetime import datetime, timezone
import pika
from PIL import Image

from app.core.config import settings
from app.domain.models import Job, JobStatus
from app.infrastructure.database import SessionLocal
from app.infrastructure.storage import download_file_bytes, upload_file_bytes
from app.infrastructure.rabbitmq import get_connection_channel


class MediaProcessingWorker:
    """
    Encapsulates queue consumer loop, channel lifecycle, and message processing.
    """

    def __init__(self):
        self.connection = None
        self.channel = None
        self.running = False

    def handle_shutdown(self, signum, frame):
        """
        Gracefully intercepts Linux SIGINT and SIGTERM signals.
        Stops consuming to prevent interrupting active task execution.
        """
        print(f"\n[Worker] Received shutdown signal ({signum}). Initiating graceful drain...")
        self.running = False
        if self.channel and self.channel.is_open:
            self.channel.stop_consuming()

    def process_message(self, ch, method, properties, body):
        """
        Callback triggered on task delivery from RabbitMQ.
        """
        db = SessionLocal()
        job_id = None

        try:
            payload = json.loads(body.decode())
            job_id = payload.get("job_id")
            original_key = payload.get("original_key")

            print(f"[Worker] Processing Job ID: {job_id}")

            # 1. Fetch job record
            job = db.query(Job).filter(Job.id == job_id).first()
            if not job:
                print(f"[Worker] Warning: Job ID {job_id} not found in DB. Discarding message.")
                ch.basic_ack(delivery_tag=method.delivery_tag)
                return

            # 2. Update status to PROCESSING
            job.status = JobStatus.PROCESSING.value
            job.started_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(job)

            # 3. Download raw media from MinIO
            print(f"[Worker] Downloading from storage: {original_key}")
            raw_buffer = download_file_bytes(original_key)

            # 4. Perform image mutation (resizing)
            print("[Worker] Generating optimized thumbnail via Pillow...")
            image = Image.open(raw_buffer)
            image.thumbnail((settings.MAX_IMAGE_WIDTH, settings.MAX_IMAGE_HEIGHT))

            output_buffer = io.BytesIO()
            image.convert("RGB").save(output_buffer, format="JPEG", quality=85)

            # 5. Upload processed thumbnail back to MinIO
            processed_key = f"processed/{job.id}.jpg"
            print(f"[Worker] Uploading processed asset: {processed_key}")
            upload_file_bytes(output_buffer, processed_key, content_type="image/jpeg")

            # 6. Mark job COMPLETED in PostgreSQL
            job.status = JobStatus.COMPLETED.value
            job.completed_at = datetime.now(timezone.utc)
            job.output_key = processed_key
            db.commit()
            print(f"[Worker] Successfully completed Job ID: {job_id}")

        except Exception as e:
            print(f"[Worker] Error processing Job ID: {job_id}")
            traceback.print_exc()

            try:
                if job_id:
                    failed_job = db.query(Job).filter(Job.id == job_id).first()
                    if failed_job:
                        failed_job.status = JobStatus.FAILED.value
                        failed_job.completed_at = datetime.now(timezone.utc)
                        failed_job.error = str(e)
                        db.commit()
                        print(f"[Worker] Recorded FAILED status for Job ID: {job_id}")
            except Exception as db_err:
                print(f"[Worker] Critical: DB error update failed: {db_err}")

        finally:
            db.close()
            # Acknowledge message delivery to avoid broker starvation
            ch.basic_ack(delivery_tag=method.delivery_tag)

    def start(self):
        """
        Connects to RabbitMQ and starts consumer event loop.
        """
        signal.signal(signal.SIGINT, self.handle_shutdown)
        signal.signal(signal.SIGTERM, self.handle_shutdown)

        print("[Worker] Initializing Distributed Media Worker...")
        try:
            self.connection, self.channel = get_connection_channel()
        except Exception as e:
            print(f"[Worker] Fatal: Could not connect to message broker: {e}")
            sys.exit(1)

        # Fair dispatch: Only give 1 message per worker at a time
        self.channel.basic_qos(prefetch_count=settings.PREFETCH_COUNT)
        self.channel.basic_consume(
            queue=settings.RABBITMQ_QUEUE,
            on_message_callback=self.process_message
        )

        self.running = True
        print(f"[Worker] Listening on queue '{settings.RABBITMQ_QUEUE}' (Prefetch: {settings.PREFETCH_COUNT})...")

        try:
            self.channel.start_consuming()
        except KeyboardInterrupt:
            print("[Worker] Consumer interrupted by user.")
        finally:
            if self.connection and not self.connection.is_closed:
                self.connection.close()
                print("[Worker] Broker connection safely closed.")


def main():
    worker = MediaProcessingWorker()
    worker.start()


if __name__ == "__main__":
    main()
