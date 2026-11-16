# =====================================================================
# Distributed Background Media Worker Consumer
# =====================================================================
# Consumes tasks from RabbitMQ, streams assets from MinIO, executes
# multi-modal asset transformations (Images, Documents, Tabular Data,
# and Video), and synchronizes state in PostgreSQL.
# =====================================================================

import io
import json
import os
import signal
import sys
import tempfile
import traceback
from datetime import datetime, timezone
import pika
from PIL import Image

import fitz  # PyMuPDF
import pandas as pd
import ffmpeg

from app.core.config import settings
from app.domain.models import Job, JobStatus, MediaType
from app.infrastructure.database import SessionLocal
from app.infrastructure.storage import download_file_bytes, upload_file_bytes
from app.infrastructure.rabbitmq import get_connection_channel


def detect_media_type(filename: str, mime_type: str = None) -> str:
    """Fallback classifier matching app.api.routes.jobs"""
    ext = os.path.splitext(filename)[1].lower() if filename else ""
    if ext in [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".tiff", ".svg"]:
        return MediaType.IMAGE.value
    if ext in [".mp4", ".mov", ".webm", ".avi", ".mkv", ".m4v"]:
        return MediaType.VIDEO.value
    if ext == ".pdf":
        return MediaType.DOCUMENT.value
    if ext in [".csv", ".xlsx", ".xls"]:
        return MediaType.TABULAR.value

    if mime_type:
        if mime_type.startswith("image/"):
            return MediaType.IMAGE.value
        if mime_type.startswith("video/"):
            return MediaType.VIDEO.value
        if "pdf" in mime_type:
            return MediaType.DOCUMENT.value
        if "csv" in mime_type or "sheet" in mime_type or "excel" in mime_type:
            return MediaType.TABULAR.value

    return MediaType.OTHER.value


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

    def process_image(self, job: Job, raw_buffer: io.BytesIO) -> None:
        """Generates an aspect-ratio-preserved thumbnail via Pillow."""
        print(f"[Worker] Processing IMAGE for Job {job.id}...")
        image = Image.open(raw_buffer)
        orig_w, orig_h = image.size
        orig_format = image.format or "JPEG"

        # Preserve aspect ratio thumbnail
        image.thumbnail((settings.MAX_IMAGE_WIDTH, settings.MAX_IMAGE_HEIGHT))

        output_buffer = io.BytesIO()
        image.convert("RGB").save(output_buffer, format="JPEG", quality=85)

        processed_key = f"processed/{job.id}.jpg"
        upload_file_bytes(output_buffer, processed_key, content_type="image/jpeg")

        job.output_key = processed_key
        job.preview_key = processed_key
        job.meta = {
            "width": image.width,
            "height": image.height,
            "original_width": orig_w,
            "original_height": orig_h,
            "format": orig_format,
            "mode": image.mode
        }

    def process_document(self, job: Job, raw_buffer: io.BytesIO) -> None:
        """Extracts PDF metadata and renders page 1 as high-res poster preview."""
        print(f"[Worker] Processing DOCUMENT (PDF) for Job {job.id}...")
        raw_bytes = raw_buffer.getvalue()
        doc = fitz.open(stream=raw_bytes, filetype="pdf")

        page_count = len(doc)
        title = doc.metadata.get("title") or ""
        author = doc.metadata.get("author") or ""
        creator = doc.metadata.get("creator") or ""

        preview_key = None
        if page_count > 0:
            page = doc[0]
            # Render page 1 at 150 DPI for crisp preview
            pix = page.get_pixmap(dpi=150)
            preview_buffer = io.BytesIO(pix.tobytes("jpeg"))
            preview_key = f"processed/{job.id}_preview.jpg"
            upload_file_bytes(preview_buffer, preview_key, content_type="image/jpeg")

        doc.close()

        job.output_key = preview_key or job.original_key
        job.preview_key = preview_key
        job.meta = {
            "page_count": page_count,
            "title": title,
            "author": author,
            "creator": creator,
            "format": "PDF"
        }

    def process_tabular(self, job: Job, raw_buffer: io.BytesIO) -> None:
        """Profiles tabular CSV/Excel data: schema, dtypes, nulls, and preview rows."""
        print(f"[Worker] Processing TABULAR data for Job {job.id}...")
        filename = (job.original_filename or "").lower()
        if filename.endswith(".xlsx") or filename.endswith(".xls"):
            df = pd.read_excel(raw_buffer)
        else:
            df = pd.read_csv(raw_buffer)

        rows = int(len(df))
        cols = int(len(df.columns))
        columns = [str(c) for c in df.columns.tolist()]
        dtypes = {str(k): str(v) for k, v in df.dtypes.items()}
        null_counts = {str(k): int(v) for k, v in df.isnull().sum().items()}

        # Extract top 10 preview rows, sanitizing NaN/Inf for JSON compliance
        preview_rows = df.head(10).fillna("").to_dict(orient="records")

        summary = {
            "rows": rows,
            "columns_count": cols,
            "columns": columns,
            "dtypes": dtypes,
            "null_counts": null_counts,
            "preview_rows": preview_rows,
            "format": "EXCEL" if filename.endswith((".xlsx", ".xls")) else "CSV"
        }

        # Save summary JSON as processed output artifact
        summary_buffer = io.BytesIO(json.dumps(summary, indent=2, default=str).encode("utf-8"))
        output_key = f"processed/{job.id}_summary.json"
        upload_file_bytes(summary_buffer, output_key, content_type="application/json")

        job.output_key = output_key
        job.preview_key = None
        job.meta = summary

    def process_video(self, job: Job, raw_buffer: io.BytesIO) -> None:
        """Probes video metadata and extracts 1s poster frame via FFmpeg."""
        print(f"[Worker] Processing VIDEO for Job {job.id}...")
        ext = os.path.splitext(job.original_filename or "")[1] or ".mp4"

        temp_in = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
        temp_out = tempfile.NamedTemporaryFile(suffix=".jpg", delete=False)
        temp_in_path = temp_in.name
        temp_out_path = temp_out.name

        try:
            temp_in.write(raw_buffer.getvalue())
            temp_in.flush()
            temp_in.close()
            temp_out.close()

            # Probe video metadata
            probe = ffmpeg.probe(temp_in_path)
            video_stream = next(
                (s for s in probe.get("streams", []) if s.get("codec_type") == "video"),
                None
            )
            format_info = probe.get("format", {})

            duration = float(format_info.get("duration", 0.0))
            width = int(video_stream.get("width", 0)) if video_stream else 0
            height = int(video_stream.get("height", 0)) if video_stream else 0
            codec = video_stream.get("codec_name", "unknown") if video_stream else "unknown"
            fps = video_stream.get("r_frame_rate", "unknown") if video_stream else "unknown"

            # Frame extraction at 1s or midpoint
            time_offset = min(1.0, duration / 2.0) if duration > 0 else 0.0

            (
                ffmpeg
                .input(temp_in_path, ss=time_offset)
                .output(temp_out_path, vframes=1)
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True)
            )

            with open(temp_out_path, "rb") as f:
                poster_buffer = io.BytesIO(f.read())

            poster_key = f"processed/{job.id}_poster.jpg"
            upload_file_bytes(poster_buffer, poster_key, content_type="image/jpeg")

            job.preview_key = poster_key
            job.output_key = poster_key
            job.meta = {
                "duration_seconds": round(duration, 2),
                "width": width,
                "height": height,
                "codec": codec,
                "fps": fps,
                "format": "VIDEO"
            }

        except FileNotFoundError:
            # When FFmpeg binary is not installed on host machine
            print("[Worker] Warning: FFmpeg binary not found on host. Completing with video metadata note.")
            job.output_key = job.original_key
            job.meta = {
                "format": "VIDEO",
                "note": "FFmpeg binary unavailable on host. Install ffmpeg to enable poster-frame extraction."
            }
        finally:
            if os.path.exists(temp_in_path):
                os.remove(temp_in_path)
            if os.path.exists(temp_out_path):
                os.remove(temp_out_path)

    def process_message(self, ch, method, properties, body):
        """Callback triggered on task delivery from RabbitMQ."""
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

            # 4. Resolve media category
            media_type = job.media_type or detect_media_type(job.original_filename, job.mime_type)
            job.media_type = media_type

            # 5. Dispatch to appropriate multi-modal pipeline
            if media_type == MediaType.DOCUMENT.value:
                self.process_document(job, raw_buffer)
            elif media_type == MediaType.TABULAR.value:
                self.process_tabular(job, raw_buffer)
            elif media_type == MediaType.VIDEO.value:
                self.process_video(job, raw_buffer)
            else:
                # Default to image pipeline
                self.process_image(job, raw_buffer)

            # 6. Mark job COMPLETED in PostgreSQL
            job.status = JobStatus.COMPLETED.value
            job.completed_at = datetime.now(timezone.utc)
            db.commit()
            print(f"[Worker] Successfully completed {media_type} Job ID: {job_id}")

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
        """Connects to RabbitMQ and starts consumer event loop."""
        signal.signal(signal.SIGINT, self.handle_shutdown)
        signal.signal(signal.SIGTERM, self.handle_shutdown)

        print("[Worker] Initializing Distributed Multi-Modal Media Worker...")
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
