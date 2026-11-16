import io
import uuid
from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.main import app
from app.infrastructure.database import Base, get_db
from app.domain.models import Job, JobStatus, MediaType

# Set up hermetic in-memory SQLite database for unit tests
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

Base.metadata.create_all(bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


def test_health_endpoint():
    """Verifies GET /health returns Healthy."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "Healthy"}


def test_stats_endpoint():
    """Verifies GET /stats returns database, queue, and storage stats."""
    response = client.get("/stats")
    assert response.status_code == 200
    data = response.json()
    assert "queue" in data
    assert "database" in data
    assert "storage" in data
    assert data["status"] == "Healthy"
    assert data["database"]["status"] == "connected"


def test_jobs_list_empty():
    """Verifies GET /jobs returns total, limit, offset, and items list."""
    response = client.get("/jobs?limit=10&offset=0")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "limit" in data
    assert "offset" in data
    assert "items" in data
    assert isinstance(data["items"], list)


def test_get_nonexistent_job():
    """Verifies querying a non-existent UUID returns 404."""
    random_uuid = str(uuid.uuid4())
    response = client.get(f"/jobs/{random_uuid}")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


@patch("app.api.routes.jobs.publish_job")
@patch("app.api.routes.jobs.upload_file_bytes")
def test_create_and_query_job_flow(mock_upload, mock_publish):
    """Verifies POST /jobs accepts upload, creates job, and GET /jobs retrieves it."""
    mock_upload.return_value = "uploads/test.jpg"
    mock_publish.return_value = None

    test_bytes = b"fake-image-bytes"
    files = {"file": ("test_pic.jpg", io.BytesIO(test_bytes), "image/jpeg")}

    response = client.post("/jobs", files=files)
    assert response.status_code == 202
    data = response.json()
    assert "id" in data
    assert data["status"] == "PENDING"
    assert data["original_filename"] == "test_pic.jpg"
    assert data["media_type"] == "IMAGE"

    # Verify query for created job returns valid structure
    created_id = data["id"]
    detail_res = client.get(f"/jobs/{created_id}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["id"] == created_id
    assert detail_data["status"] == "PENDING"
    assert detail_data["original_filename"] == "test_pic.jpg"
    assert detail_data["media_type"] == "IMAGE"

    # Verify list contains the created job
    list_res = client.get("/jobs")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    found = any(str(item["id"]) == created_id for item in list_data["items"])
    assert found is True


@patch("app.api.routes.jobs.publish_job")
@patch("app.api.routes.jobs.upload_file_bytes")
def test_multi_modal_detection(mock_upload, mock_publish):
    """Verifies that PDF, CSV, and MP4 uploads are classified into DOCUMENT, TABULAR, and VIDEO."""
    mock_upload.return_value = "uploads/test"
    mock_publish.return_value = None

    test_cases = [
        ("quarterly_report.pdf", b"%PDF-1.4...", "application/pdf", "DOCUMENT"),
        ("sales_data.csv", b"id,name,revenue\n1,Alpha,500", "text/csv", "TABULAR"),
        ("demo_reel.mp4", b"\x00\x00\x00\x18ftypmp42", "video/mp4", "VIDEO"),
    ]

    for filename, content, mime, expected_type in test_cases:
        files = {"file": (filename, io.BytesIO(content), mime)}
        res = client.post("/jobs", files=files)
        assert res.status_code == 202
        res_data = res.json()
        assert res_data["media_type"] == expected_type, f"Expected {expected_type} for {filename}, got {res_data['media_type']}"
