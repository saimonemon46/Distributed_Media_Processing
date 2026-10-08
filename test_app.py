# =====================================================================
# Automated Integration Test Runner
# =====================================================================
# Executes the integration test suite in tests/
# =====================================================================

import time
from tests.test_health import test_health_endpoint
from tests.test_e2e_pipeline import test_successful_image_pipeline, test_failure_image_pipeline


def main():
    print("=====================================================================")
    print("      Distributed Media Processing - Automated Test Suite")
    print("=====================================================================")
    start_time = time.time()
    try:
        test_health_endpoint()
        test_successful_image_pipeline()
        test_failure_image_pipeline()
        duration = time.time() - start_time
        print("=====================================================================")
        print(f" SUCCESS: All integration tests passed! (Duration: {duration:.2f}s)")
        print("=====================================================================")
    except AssertionError as ae:
        print(f"\n[!] FAILURE: Assertion failed: {ae}")
        raise
    except Exception as e:
        print(f"\n[!] ERROR: Unexpected failure: {e}")
        raise


if __name__ == "__main__":
    main()
