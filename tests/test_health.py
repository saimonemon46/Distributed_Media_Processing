# =====================================================================
# API Health Check Integration Test
# =====================================================================

import json
import urllib.request
from tests.conftest import API_URL


def test_health_endpoint():
    """
    Verifies that the API server liveness probe responds with HTTP 200 and 'Healthy'.
    """
    req = urllib.request.Request(f"{API_URL}/health", method="GET")
    with urllib.request.urlopen(req) as resp:
        assert resp.status == 200, f"Expected HTTP 200, got: {resp.status}"
        data = json.loads(resp.read().decode())
        assert data.get("status") == "Healthy", f"Unexpected status: {data}"
    print("[+] test_health_endpoint: PASSED")


if __name__ == "__main__":
    test_health_endpoint()
