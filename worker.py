# =====================================================================
# Distributed Media Processing Worker
# =====================================================================
# This worker process runs asynchronously in the background. It consumes
# jobs from RabbitMQ, retrieves original files from MinIO, processes them
# (resizing/generating thumbnails via Pillow), uploads the processed files
# back to MinIO, and updates job metadata in PostgreSQL.
# =====================================================================

import io
import json
import os
import sys
import traceback
from datetime import datetime, timezone
import pika
from PIL import Image

# Import shared modules
from database import SessionLocal
from models import Job
from storage import download_file_bytes, upload_file_bytes
from rabbitmq import get_connection_channel, RABBITMQ_QUEUE


def process_message(ch, method, properties, body):
    """
    Callback executed whenever a new job task is consumed from RabbitMQ.
    It encapsulates the core business logic of media processing.
    """
    # 1. Initialize a new DB session for this job scope
    db = SessionLocal()
    job_id = None
    
    try:
        # 2. Parse the queue task message body
        payload = json.loads(body.decode())
        job_id = payload.get("job_id")
        original_key = payload.get("original_key")
        
        print(f"[*] Worker received Job ID: {job_id}")
        
        # 3. Retrieve Job record from database
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            print(f"[!] Job ID {job_id} not found in database. Discarding task.")
            # Acknowledge to remove it from the queue
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        # 4. Transition Job state to PROCESSING
        job.status = "PROCESSING"
        job.started_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(job)
        print(f"[*] Updated Job {job_id} status to PROCESSING.")

        # 5. Fetch raw media bytes from MinIO
        print(f"[*] Downloading original file using key: {original_key}")
        raw_buffer = download_file_bytes(original_key)

        # 6. Perform image processing (resizing)
        print(f"[*] Resizing image with Pillow...")
        image = Image.open(raw_buffer)
        
        # PIL thumbnail() maintains the aspect ratio while fitting inside specified boundaries
        image.thumbnail((500, 500))

        # Save processed image to an in-memory buffer
        output_buffer = io.BytesIO()
        image.convert("RGB").save(output_buffer, format="JPEG")

        # 7. Upload the processed thumbnail back to MinIO
        processed_key = f"processed/{job.id}.jpg"
        print(f"[*] Uploading processed image as: {processed_key}")
        upload_file_bytes(output_buffer, processed_key, content_type="image/jpeg")

        # 8. Complete the job record in PostgreSQL
        job.status = "COMPLETED"
        job.completed_at = datetime.now(timezone.utc)
        job.output_key = processed_key
        db.commit()
        print(f"[+] Job {job_id} successfully marked as COMPLETED.")

    except Exception as e:
        print(f"[!] Exception encountered while processing Job ID: {job_id}")
        traceback.print_exc()
        
        # Attempt to log error state in database for visibility
        try:
            if job_id:
                # Re-query/re-fetch since SQLAlchemy object state might be detached/dirty
                failed_job = db.query(Job).filter(Job.id == job_id).first()
                if failed_job:
                    failed_job.status = "FAILED"
                    failed_job.completed_at = datetime.now(timezone.utc)
                    failed_job.error = str(e)
                    db.commit()
                    print(f"[*] Marked Job {job_id} as FAILED in database.")
        except Exception as db_err:
            print(f"[!] Could not update failure metadata in DB: {db_err}")
            
    finally:
        # 9. Clean up database session to prevent connection pools exhaustion
        db.close()
        
        # 10. Acknowledge message delivery to RabbitMQ (ack).
        # We acknowledge even on failure. In a production pipeline, malformed inputs
        # or processing bugs should not keep retrying indefinitely, as it clogs the queue.
        # For transient infra errors (e.g. rabbitmq/minio disconnects), standard behavior is
        # handled by connection drop re-queueing.
        ch.basic_ack(delivery_tag=method.delivery_tag)
        print(f"[*] Acknowledged task for Job ID: {job_id}")


def main():
    """
    Main loop establishing broker connection and starting queue consumption.
    """
    print("[*] Starting Media Processing Worker...")
    
    # Establish connection with retry resilience
    try:
        connection, channel = get_connection_channel()
    except Exception as e:
        print(f"[!] Fatal: Worker failed to connect to RabbitMQ broker: {e}")
        sys.exit(1)
        
    # Set prefetch limit. Fair-dispatch tells RabbitMQ not to give more than
    # one message to a worker at a time until they have acknowledged the previous.
    channel.basic_qos(prefetch_count=1)
    
    # Register callback consumer
    channel.basic_consume(
        queue=RABBITMQ_QUEUE,
        on_message_callback=process_message
    )
    
    print(f"[*] Worker is listening to queue '{RABBITMQ_QUEUE}'...")
    try:
        channel.start_consuming()
    except KeyboardInterrupt:
        print("\n[*] Gracefully stopping Worker consumer...")
        channel.stop_consuming()
    finally:
        if connection and not connection.is_closed:
            connection.close()
            print("[*] Broker connection closed.")

if __name__ == "__main__":
    main()
