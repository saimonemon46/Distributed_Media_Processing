# =====================================================================
# RabbitMQ Compatibility Shim
# =====================================================================
# Re-exports messaging functions from app.infrastructure.rabbitmq.
# =====================================================================

from app.infrastructure.rabbitmq import (
    get_connection_channel,
    publish_job,
)
from app.core.config import settings

RABBITMQ_QUEUE = settings.RABBITMQ_QUEUE

__all__ = ["get_connection_channel", "publish_job", "RABBITMQ_QUEUE"]
