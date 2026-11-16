"""
Backward-compatibility worker entrypoint delegating to app.worker.consumer
"""
from app.worker.consumer import main

if __name__ == "__main__":
    main()
