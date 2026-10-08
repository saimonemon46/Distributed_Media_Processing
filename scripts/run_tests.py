#!/usr/bin/env python3
# =====================================================================
# Automated Integration Test Suite Runner
# =====================================================================

import os
import sys
import time

# Ensure repository root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

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
        sys.exit(0)
    except AssertionError as ae:
        print(f"\n[!] FAILURE: Assertion failed: {ae}")
        sys.exit(1)
    except Exception as e:
        print(f"\n[!] ERROR: Unexpected failure: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
