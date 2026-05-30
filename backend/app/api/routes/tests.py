from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import shutil
import os
from pathlib import Path

from app.db import crud, schemas, models
from app.db.database import get_db
from app.core.config import UPLOAD_DIR, ALLOWED_EXTENSIONS

router = APIRouter(tags=["Tests"])

@router.post("/schools/{school_id}/tests")
def create_test(school_id: int, test: schemas.TestCreate, db: Session = Depends(get_db)):
    school = crud.get_school(db, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
        
    test_name = f"{test.test_type}-{test.test_number}"
    
    # Enforce unique constraint checking for duplicate test_name in the same school
    existing = db.query(models.Test).filter(
        models.Test.school_id == school_id,
        models.Test.test_name == test_name
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Test already exists")
        
    # Insert new test
    db_test = models.Test(
        school_id=school_id,
        test_type=test.test_type,
        test_number=test.test_number,
        test_name=test_name,
        status="Pending"
    )
    db.add(db_test)
    db.commit()
    db.refresh(db_test)
    
    return {
        "success": True,
        "test_id": db_test.id,
        "test_name": db_test.test_name
    }

@router.get("/schools/{school_id}/tests", response_model=List[schemas.TestResponse])
def get_tests(school_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_tests_by_school(db, school_id=school_id, skip=skip, limit=limit)

@router.get("/tests/{test_id}", response_model=schemas.TestResponse)
def get_test(test_id: int, db: Session = Depends(get_db)):
    test = crud.get_test(db, test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
    return test

# ----------------------------------------------------
# UPLOADS
# ----------------------------------------------------
def get_extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return filename.rsplit(".", 1)[-1].lower()

async def save_test_file(file: UploadFile, test_id: int, file_type: str) -> str:
    ext = get_extension(file.filename or "")
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file extension. Allowed: {ALLOWED_EXTENSIONS}")
        
    safe_name = f"test_{test_id}_{file_type}.{ext}"
    file_path = UPLOAD_DIR / safe_name
    
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return str(file_path)

@router.post("/tests/{test_id}/upload/{file_type}")
async def upload_test_file(test_id: int, file_type: str, file: UploadFile = File(...), db: Session = Depends(get_db)):
    if file_type not in ["error-report", "mark-list", "blueprint"]:
        raise HTTPException(status_code=400, detail="Invalid file type")
        
    test = crud.get_test(db, test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
        
    file_path = await save_test_file(file, test_id, file_type.replace("-", "_"))
    
    # Check if already exists and update, or create
    existing_upload = db.query(models.Upload).filter(
        models.Upload.test_id == test_id,
        models.Upload.file_type == file_type.replace("-", "_")
    ).first()
    
    if existing_upload:
        existing_upload.file_name = file.filename
        existing_upload.file_path = file_path
        db.commit()
        db.refresh(existing_upload)
        upload_record = existing_upload
    else:
        upload_record = crud.create_upload(db, schemas.UploadCreate(
            test_id=test_id,
            file_type=file_type.replace("-", "_"),
            file_name=file.filename,
            file_path=file_path
        ))
        
    return {"message": "File uploaded successfully", "upload": upload_record}

@router.get("/tests/{test_id}/uploads", response_model=List[schemas.UploadResponse])
def get_test_uploads(test_id: int, db: Session = Depends(get_db)):
    return crud.get_uploads_by_test(db, test_id=test_id)
