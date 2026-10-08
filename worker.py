# =====================================================================
# Background Worker Entrypoint (Backward Compatible Shim)
# =====================================================================
# Delegates execution to app.worker.consumer:main
# =====================================================================

from app.worker.consumer import main

if __name__ == "__main__":
    main()
