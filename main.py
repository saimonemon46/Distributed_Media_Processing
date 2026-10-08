# =====================================================================
# REST API Server Entrypoint (Backward Compatible Shim)
# =====================================================================
# Exposes FastAPI app from the modular package: app.api.main:app
# =====================================================================

import uvicorn
from app.api.main import app

if __name__ == "__main__":
    uvicorn.run("app.api.main:app", host="0.0.0.0", port=8000, reload=True)