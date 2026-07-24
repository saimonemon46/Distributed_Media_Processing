


import io
import os
import uuid
import time


from datetime import datetime, timezone

from fastapi import FastAPI, UploadFile, File, Depends, HTTPException
from PIL import Image
from sqlalchemy.orm import Session

from database import Base, engine, get_db
from models import Job



app = FastAPI()


OUTPUT_DIR = "output"

os.makedirs(OUTPUT_DIR, exist_ok=True)

Base.metadata.create_all(bind=engine)

@app.get("/health")
def health():
    return {"Status" : "Healthy"}


@app.post("/jobs")
def create_job(file : UploadFile = File(...),
               db: Session = Depends(get_db)
            ):
    
    # Simulate expensive processing
    # time.sleep(5)
    
    
    # 1. Create persistent job
    job = Job(
        original_filename=file.filename,
        status="PENDING"
    )

    db.add(job)
    db.commit()
    db.refresh(job)
    
    
    try:
        
         # 2. Start processing

        job.status = "PROCESSING"
        job.started_at = datetime.now(timezone.utc)

        db.commit()
        
        # 3. Read Uploaded Files
        contents = file.file.read()
        
        # 4. Convert Bytes into image
        image = Image.open(io.BytesIO(contents))  # Open image with pillow
        
        # 5. Resize image
        image.thumbnail((500,500))
        
        # 6. Generate Unique File name
        # filename = f"{uuid.uuid4()}.jpg"

        # output_path = os.path.join(OUTPUT_DIR, filename)
        ## using job id from db ####
        output_path = os.path.join(
            OUTPUT_DIR,
            f"{job.id}.jpg"
        )
        
        # 7. Convert RGB and Save
        image.convert("RGB").save(output_path)
        
        # 8. Return Result
        # return {
        #     "status": "completed",
        #     "original_filename": file.filename,
        #     "output_file": output_path,
        #     "width": image.width,
        #     "height": image.height,
        # }
        
        return {
            "id": job.id,
            "status": job.status,
            "original_filename": job.original_filename,
            "output_path": job.output_path
        }
    except Exception as e:
        
        job.status = "FAILED"
        job.completed_at = datetime.now(timezone.utc)
        job.error = str(e)

        db.commit()

        raise HTTPException(
            status_code=500,
            detail="Image processing failed"
        )