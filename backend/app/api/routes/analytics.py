from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any
import shutil

from app.db import crud, schemas, models
from app.db.database import get_db
from app.features.performance_summary.service import process_performance_summary
from app.core.config import REPORT_FILE, UPLOAD_DIR

router = APIRouter(tags=["Analytics"])

async def save_file(file: UploadFile, test_id: int, prefix: str) -> str:
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    safe_name = f"test_{test_id}_{prefix}.{ext}"
    file_path = UPLOAD_DIR / safe_name
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return str(file_path)

@router.post("/tests/{test_id}/generate")
async def generate_analytics(
    test_id: int, 
    error_report: UploadFile = File(...),
    mark_list: UploadFile = File(...),
    blueprint: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    test = crud.get_test(db, test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
        
    try:
        error_report_path = await save_file(error_report, test_id, "error_report")
        mark_list_path = await save_file(mark_list, test_id, "mark_list")
        blueprint_path = await save_file(blueprint, test_id, "blueprint")

        # Process the analytics using existing engine, and save to DB
        result = process_performance_summary(
            error_report_path=error_report_path,
            mark_list_path=mark_list_path,
            blueprint_path=blueprint_path,
            output_path=str(REPORT_FILE), 
            school_id=test.school_id,
            test_id=test_id,
            db=db
        )
        
        # Update test status
        crud.update_test_status(db, test_id, "Completed")
        
        return {
            "message": "Analytics generated successfully",
            "db_sync": result.get("db_sync"),
            "report_path": result.get("report_path"),
            "files": {
                "errorReport": { "analysis": result["error_report_analysis"] },
                "markList": { "analysis": result["mark_list_analysis"] },
                "blueprint": { "analysis": result["blueprint_analysis"] }
            },
            "merged": result["merged_analysis"],
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_schools = db.query(models.School).count()
    total_students = db.query(models.Student).count()
    total_tests = db.query(models.Test).count()
    total_analytics = db.query(models.AnalyticsResult).count()
    
    return {
        "total_schools": total_schools,
        "total_students": total_students,
        "total_tests": total_tests,
        "total_analytics_generated": total_analytics
    }

@router.get("/tests/{test_id}/analytics")
def get_test_analytics(test_id: int, db: Session = Depends(get_db)):
    test = crud.get_test(db, test_id)
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")
        
    results = db.query(models.AnalyticsResult).filter(models.AnalyticsResult.test_id == test_id).all()
    
    if not results:
        return {"message": "No analytics found for this test."}
        
    # Calculate test level metrics
    students_appeared = len(results)
    total_scores = [r.total_score for r in results if r.total_score is not None]
    
    average_score = sum(total_scores) / students_appeared if students_appeared > 0 else 0
    highest_score = max(total_scores) if total_scores else 0
    lowest_score = min(total_scores) if total_scores else 0
    
    # Find topper
    topper = None
    if results:
        topper_result = max(results, key=lambda x: x.total_score or 0)
        student = db.query(models.Student).filter(models.Student.id == topper_result.student_id).first()
        topper = student.student_name if student else "Unknown"
        
    # Retrieve school name
    school = db.query(models.School).filter(models.School.id == test.school_id).first()
    school_name = school.school_name if school else "Unknown School"
    
    # Build list of ranked results with student profiles joined
    results_list = []
    for r in results:
        student = db.query(models.Student).filter(models.Student.id == r.student_id).first()
        results_list.append({
            "id": r.id,
            "student_id": r.student_id,
            "student_name": student.student_name if student else "Unknown",
            "roll_no": student.roll_no if student else "N/A",
            "class_name": student.class_name if student else "",
            "section": student.section if student else "",
            "physics": r.physics,
            "chemistry": r.chemistry,
            "maths": r.maths,
            "total_score": r.total_score,
            "percentage": r.percentage,
            "accuracy": r.accuracy,
            "rank": r.rank if r.rank else 999
        })
        
    results_list.sort(key=lambda x: x["rank"])
        
    return {
        "test_name": test.test_name,
        "test_date": test.test_date.isoformat() if test.test_date else None,
        "school_name": school_name,
        "students_appeared": students_appeared,
        "average_score": round(average_score, 2),
        "highest_score": round(highest_score, 2),
        "lowest_score": round(lowest_score, 2),
        "topper": topper,
        "results": results_list
    }

@router.get("/schools/{school_id}/analytics")
def get_school_analytics(school_id: int, db: Session = Depends(get_db)):
    school = crud.get_school(db, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
        
    # Aggregate from tests and analytics
    total_students = db.query(models.Student).filter(models.Student.school_id == school_id).count()
    total_tests = db.query(models.Test).filter(models.Test.school_id == school_id).count()
    
    all_results = db.query(models.AnalyticsResult).filter(models.AnalyticsResult.school_id == school_id).all()
    
    if not all_results:
        return {
            "total_students": total_students,
            "total_tests": total_tests,
            "average_score": 0,
            "topper": "N/A",
            "accuracy": 0
        }
        
    total_scores = [r.total_score for r in all_results if r.total_score is not None]
    accuracies = [r.accuracy for r in all_results if r.accuracy is not None]
    
    average_score = sum(total_scores) / len(total_scores) if total_scores else 0
    average_accuracy = sum(accuracies) / len(accuracies) if accuracies else 0
    
    topper_result = max(all_results, key=lambda x: x.total_score or 0) if all_results else None
    topper = "N/A"
    if topper_result:
        student = db.query(models.Student).filter(models.Student.id == topper_result.student_id).first()
        if student:
            topper = student.student_name
            
    return {
        "total_students": total_students,
        "total_tests": total_tests,
        "average_score": round(average_score, 2),
        "topper": topper,
        "accuracy": round(average_accuracy, 2)
    }

@router.get("/dashboard/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_schools = db.query(models.School).count()
    total_students = db.query(models.Student).count()
    total_tests = db.query(models.Test).count()
    total_analytics = db.query(models.AnalyticsResult).count()
    
    return {
        "total_schools": total_schools,
        "total_students": total_students,
        "total_tests": total_tests,
        "total_analytics_generated": total_analytics
    }
