from fastapi import FastAPI, UploadFile, File
from PIL import Image  

import io
import os
import uuid

import time

app = FastAPI()


OUTPUT_DIR = "output"

os.makedirs(OUTPUT_DIR, exist_ok=True)



@app.get("/health")
def health():
    return {"Status" : "Healthy"}


@app.post("/jobs")
def create_job(file : UploadFile = File(...)):
    
    # Simulate expensive processing
    time.sleep(5)
    
    
    
    # 1. Read Uploaded Files
    contents = file.file.read()
    
    # 2. Convert Bytes into image
    image = Image.open(io.BytesIO(contents))  # Open image with pillow
    
    # 3. Resize image
    image.thumbnail((500,500))
    
    # 4. Generate Unique File name
    filename = f"{uuid.uuid4()}.jpg"

    output_path = os.path.join(OUTPUT_DIR, filename)
    
    # 5. Convert RGB and Save
    image.convert("RGB").save(output_path)
    
    # 6. Return Result
    return {
        "status": "completed",
        "original_filename": file.filename,
        "output_file": output_path,
        "width": image.width,
        "height": image.height,
    }