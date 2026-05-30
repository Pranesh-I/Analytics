from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db import crud, schemas, models
from app.db.database import get_db

router = APIRouter(prefix="/schools", tags=["Schools"])

@router.post("", response_model=schemas.SchoolResponse)
def create_school(school: schemas.SchoolCreate, db: Session = Depends(get_db)):
    # Check if school code exists
    existing = db.query(models.School).filter(models.School.school_code == school.school_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="School code already registered")
    return crud.create_school(db=db, school=school)

@router.get("", response_model=List[schemas.SchoolWithCounts])
def read_schools(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    schools = crud.get_schools(db, skip=skip, limit=limit)
    result = []
    for s in schools:
        student_count = db.query(models.Student).filter(models.Student.school_id == s.id).count()
        test_count = db.query(models.Test).filter(models.Test.school_id == s.id).count()
        s_dict = s.__dict__.copy()
        s_dict['student_count'] = student_count
        s_dict['test_count'] = test_count
        result.append(s_dict)
    return result

@router.get("/{id}", response_model=schemas.SchoolWithCounts)
def read_school(id: int, db: Session = Depends(get_db)):
    school = crud.get_school(db, school_id=id)
    if school is None:
        raise HTTPException(status_code=404, detail="School not found")
    student_count = db.query(models.Student).filter(models.Student.school_id == id).count()
    test_count = db.query(models.Test).filter(models.Test.school_id == id).count()
    s_dict = school.__dict__.copy()
    s_dict['student_count'] = student_count
    s_dict['test_count'] = test_count
    return s_dict

@router.put("/{id}", response_model=schemas.SchoolResponse)
def update_school(id: int, school: schemas.SchoolUpdate, db: Session = Depends(get_db)):
    db_school = crud.update_school(db, school_id=id, school=school)
    if db_school is None:
        raise HTTPException(status_code=404, detail="School not found")
    return db_school

@router.delete("/{id}")
def delete_school(id: int, db: Session = Depends(get_db)):
    db_school = crud.delete_school(db, school_id=id)
    if db_school is None:
        raise HTTPException(status_code=404, detail="School not found")
    return {"message": "School deleted successfully"}
