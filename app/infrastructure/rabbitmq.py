# =====================================================================
# RabbitMQ Message Broker Interface
# =====================================================================
# Provides connection management, retries, and task publishing routines.
# =====================================================================

import json
import time
from typing import Tuple
import pika
from app.core.config import settings


def get_connection_channel(
    retries: int = 5,
    delay: int = 2
) -> Tuple[pika.BlockingConnection, pika.adapters.blocking_connection.BlockingChannel]:
    """
    Establishes a connection to RabbitMQ with retry resilience against slow startup.
    Declares the queue as durable so messages survive broker restarts.
    """
    credentials = pika.PlainCredentials(settings.RABBITMQ_USER, settings.RABBITMQ_PASSWORD)
    parameters = pika.ConnectionParameters(
        host=settings.RABBITMQ_HOST,
        port=settings.RABBITMQ_PORT,
        credentials=credentials,
        heartbeat=600,
        blocked_connection_timeout=300
    )

    for attempt in range(1, retries + 1):
        try:
            print(f"[RabbitMQ] Connecting to {settings.RABBITMQ_HOST}:{settings.RABBITMQ_PORT} (attempt {attempt}/{retries})...")
            connection = pika.BlockingConnection(parameters)
            channel = connection.channel()

            # Declare durable queue
            channel.queue_declare(queue=settings.RABBITMQ_QUEUE, durable=True)
            print("[RabbitMQ] Successfully connected and declared queue.")
            return connection, channel
        except pika.exceptions.AMQPConnectionError as e:
            if attempt == retries:
                print("[RabbitMQ] Failed all attempts to connect to broker.")
                raise e
            print(f"[RabbitMQ] Connection attempt failed. Retrying in {delay}s...")
            time.sleep(delay)


def publish_job(job_id: str, original_key: str) -> None:
    """
    Publishes a persistent media processing task message to the RabbitMQ queue.
    """
    connection, channel = get_connection_channel()
    try:
        payload = {
            "job_id": job_id,
            "original_key": original_key
        }
        message_body = json.dumps(payload)

        # delivery_mode=2 marks the message as persistent
        channel.basic_publish(
            exchange="",
            routing_key=settings.RABBITMQ_QUEUE,
            body=message_body,
            properties=pika.BasicProperties(
                delivery_mode=pika.DeliveryMode.Persistent
            )
        )
        print(f"[RabbitMQ] Enqueued task for Job ID: {job_id}")
    finally:
        connection.close()
