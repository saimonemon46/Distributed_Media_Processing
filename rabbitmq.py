# =====================================================================
# RabbitMQ Message Broker Interface
# =====================================================================
# This module provides connection utilities, retries, and publishing functions
# to communicate with the RabbitMQ broker. It is used by the API server
# to enqueue new tasks and can be referenced by the workers for connection setup.
# =====================================================================

import os
import json
import time
import pika
from dotenv import load_dotenv

# Load configuration values from environment variables
load_dotenv()

RABBITMQ_HOST = os.getenv("RABBITMQ_HOST", "localhost")
RABBITMQ_PORT = int(os.getenv("RABBITMQ_PORT", "5672"))
RABBITMQ_USER = os.getenv("RABBITMQ_USER", "guest")
RABBITMQ_PASSWORD = os.getenv("RABBITMQ_PASSWORD", "guest")
RABBITMQ_QUEUE = os.getenv("RABBITMQ_QUEUE", "media_processing_jobs")


def get_connection_channel(retries: int = 5, delay: int = 2):
    """
    Establishes a connection to the RabbitMQ broker and returns the connection and channel.
    Implements a basic retry mechanism to withstand containers boot latency (e.g. RabbitMQ
    starts slower than API/Worker containers).
    
    Args:
        retries: Number of connection attempts before failing.
        delay: Sleep duration (in seconds) between retry attempts.
        
    Returns:
        A tuple: (pika.BlockingConnection, pika.adapters.blocking_connection.BlockingChannel)
    """
    credentials = pika.PlainCredentials(RABBITMQ_USER, RABBITMQ_PASSWORD)
    parameters = pika.ConnectionParameters(
        host=RABBITMQ_HOST,
        port=RABBITMQ_PORT,
        credentials=credentials,
        heartbeat=600, # Heatbeat to keep connections alive during slow media processing
        blocked_connection_timeout=300
    )
    
    for attempt in range(1, retries + 1):
        try:
            print(f"Connecting to RabbitMQ at {RABBITMQ_HOST}:{RABBITMQ_PORT} (attempt {attempt}/{retries})...")
            connection = pika.BlockingConnection(parameters)
            channel = connection.channel()
            
            # Declare the processing queue. 
            # durable=True ensures tasks survive broker crashes/restarts.
            channel.queue_declare(queue=RABBITMQ_QUEUE, durable=True)
            print("Successfully connected to RabbitMQ.")
            return connection, channel
        except pika.exceptions.AMQPConnectionError as e:
            if attempt == retries:
                print("Failed all attempts to connect to RabbitMQ.")
                raise e
            print(f"AMQP connection failed. Retrying in {delay} seconds...")
            time.sleep(delay)


def publish_job(job_id: str, original_key: str):
    """
    Encapsulates creation of a media processing task payload and publishes
    it to RabbitMQ.
    
    Args:
        job_id: The UUID representing the job ID in PostgreSQL.
        original_key: The S3 object key pointing to the raw uploaded media in MinIO.
    """
    # 1. Establish short-lived connection to publish task
    connection, channel = get_connection_channel()
    try:
        # 2. Build JSON payload
        payload = {
            "job_id": job_id,
            "original_key": original_key
        }
        message_body = json.dumps(payload)
        
        # 3. Publish message as Persistent (delivery_mode=2)
        # exchange="" represents the default direct exchange which routes messages 
        # to the queue named identically to the routing_key.
        channel.basic_publish(
            exchange="",
            routing_key=RABBITMQ_QUEUE,
            body=message_body,
            properties=pika.BasicProperties(
                delivery_mode=pika.DeliveryMode.Persistent
            )
        )
        print(f"Published task for Job ID: {job_id} to queue: '{RABBITMQ_QUEUE}'")
    finally:
        # 4. Safely close connection
        connection.close()
