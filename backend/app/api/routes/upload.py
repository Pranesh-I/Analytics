from pathlib import Path
import shutil
import logging

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.config import ALLOWED_EXTENSIONS, UPLOAD_DIR, REPORT_FILE
from app.db import models
from app.db.database import get_db
from app.features.performance_summary.service import process_performance_summary
from app.utils.json_utils import sanitize_json

router = APIRouter(prefix="/upload", tags=["Upload"])
logger = logging.getLogger(__name__)


def get_extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return filename.rsplit(".", 1)[-1].lower()


def validate_file(file: UploadFile):
    ext = get_extension(file.filename or "")
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type for {file.filename}. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )


async def save_file(file: UploadFile, prefix: str) -> str:
    ext = get_extension(file.filename or "")
    safe_name = f"{prefix}.{ext}"
    file_path = UPLOAD_DIR / safe_name

    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return str(file_path)


@router.post("/files")
async def upload_files(
    error_report: UploadFile = File(...),
    mark_list: UploadFile = File(...),
    blueprint: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Upload three files (error report, mark list, blueprint), process analytics,
    save results to PostgreSQL, and generate an Excel report.

    The database session is injected via FastAPI dependency injection.
    If the database insert fails, the API still returns the generated report
    but includes the database error in the response.
    """
    validate_file(error_report)
    validate_file(mark_list)
    validate_file(blueprint)

    error_report_path = await save_file(error_report, "error_report")
    mark_list_path = await save_file(mark_list, "mark_list")
    blueprint_path = await save_file(blueprint, "blueprint")

    # Run the performance summary pipeline with database session injection
    try:
        result = process_performance_summary(
            error_report_path=error_report_path,
            mark_list_path=mark_list_path,
            blueprint_path=blueprint_path,
            output_path=str(REPORT_FILE),
            db=db,
        )
    except RuntimeError as db_error:
        # Database insertion failed but the report may still have been generated
        logger.error(f"Database sync failed during upload processing: {db_error}")
        raise HTTPException(
            status_code=500,
            detail={
                "message": "Analytics processing completed but database save failed.",
                "error": str(db_error),
                "report_generated": REPORT_FILE.exists(),
            },
        )
    except Exception as exc:
        logger.error(f"Upload processing failed: {exc}")
        err_msg = str(exc)
        if "Permission denied" in err_msg and "generated_report" in err_msg.lower():
            detail = "The file 'generated_report.xlsx' is currently open in Microsoft Excel on your computer. Please close Excel and try again!"
        else:
            detail = f"File processing failed: {err_msg}"
        raise HTTPException(
            status_code=500,
            detail=detail,
        )

    # Build response with database sync status
    db_sync_info = result.get("db_sync")

    response = {
        "message": "Files received, saved, parsed, and report generated successfully",
        "files": {
            "errorReport": {
                "filename": error_report.filename,
                "saved_path": error_report_path,
                "content_type": error_report.content_type,
                "analysis": result["error_report_analysis"],
            },
            "markList": {
                "filename": mark_list.filename,
                "saved_path": mark_list_path,
                "content_type": mark_list.content_type,
                "analysis": result["mark_list_analysis"],
            },
            "blueprint": {
                "filename": blueprint.filename,
                "saved_path": blueprint_path,
                "content_type": blueprint.content_type,
                "analysis": result["blueprint_analysis"],
            },
        },
        "merged": result["merged_analysis"],
        "generated_report": {
            "filename": REPORT_FILE.name,
            "saved_path": result["report_path"],
        },
        "database": {
            "status": "success" if db_sync_info else "skipped",
            "details": db_sync_info,
        },
    }

    return sanitize_json(response)


@router.get("/download-report")
def download_report():
    if not REPORT_FILE.exists():
        raise HTTPException(status_code=404, detail="Report not found. Upload files first.")
    return FileResponse(
        path=str(REPORT_FILE),
        filename=REPORT_FILE.name,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@router.get("/database/students")
def get_db_students(db: Session = Depends(get_db)):
    """Retrieve all students saved in the database, ordered by rank."""
    students = db.query(models.Student).all()
    analytics = db.query(models.AnalyticsResult).all()
    
    analytics_map = {a.student_id: a for a in analytics}
    
    result = []
    for s in students:
        a = analytics_map.get(s.id)
        if a:
            s_dict = {
                "id": s.id,
                "student_name": s.student_name,
                "register_no": s.roll_no,
                "class_name": s.class_name,
                "section": s.section,
                "phy_marks": a.physics,
                "che_marks": a.chemistry,
                "mat_marks": a.maths,
                "total_marks": a.total_score,
                "percentage": a.percentage,
                "accuracy": a.accuracy,
                "attempted": a.attempted,
                "correct": a.correct,
                "wrong": a.wrong,
                "negative_marks": a.negative_marks,
                "rank": a.rank if a.rank else 999,
                "band": a.band,
                "risk_exp_best": a.risk_exp_best,
                "subjects": [
                    {
                        "subject_name": "Physics",
                        "marks": a.physics,
                        "attempted": a.attempted // 3 if a.attempted else 0,
                        "correct": a.correct // 3 if a.correct else 0,
                        "errors": a.wrong // 3 if a.wrong else 0,
                        "unattempted": (a.attempted // 3) - (a.correct // 3) if a.attempted else 0,
                        "accuracy": a.accuracy,
                        "negative_marks": a.negative_marks // 3 if a.negative_marks else 0,
                        "risk_level": a.risk_exp_best or "Low",
                        "remarks": "Strong conceptual understanding" if a.physics > 75 else "Needs improvement"
                    },
                    {
                        "subject_name": "Chemistry",
                        "marks": a.chemistry,
                        "attempted": a.attempted // 3 if a.attempted else 0,
                        "correct": a.correct // 3 if a.correct else 0,
                        "errors": a.wrong // 3 if a.wrong else 0,
                        "unattempted": (a.attempted // 3) - (a.correct // 3) if a.attempted else 0,
                        "accuracy": a.accuracy,
                        "negative_marks": a.negative_marks // 3 if a.negative_marks else 0,
                        "risk_level": a.risk_exp_best or "Low",
                        "remarks": "Solid performance" if a.chemistry > 75 else "Needs practice"
                    },
                    {
                        "subject_name": "Maths",
                        "marks": a.maths,
                        "attempted": a.attempted // 3 if a.attempted else 0,
                        "correct": a.correct // 3 if a.correct else 0,
                        "errors": a.wrong // 3 if a.wrong else 0,
                        "unattempted": (a.attempted // 3) - (a.correct // 3) if a.attempted else 0,
                        "accuracy": a.accuracy,
                        "negative_marks": a.negative_marks // 3 if a.negative_marks else 0,
                        "risk_level": a.risk_exp_best or "Low",
                        "remarks": "Excellent analysis" if a.maths > 75 else "Requires guidance"
                    }
                ]
            }
        else:
            s_dict = {
                "id": s.id,
                "student_name": s.student_name,
                "register_no": s.roll_no,
                "class_name": s.class_name,
                "section": s.section,
                "phy_marks": 0.0,
                "che_marks": 0.0,
                "mat_marks": 0.0,
                "total_marks": 0.0,
                "percentage": 0.0,
                "accuracy": 0.0,
                "attempted": 0,
                "correct": 0,
                "wrong": 0,
                "negative_marks": 0,
                "rank": 999,
                "band": "N/A",
                "risk_exp_best": "Normal",
                "subjects": []
            }
        result.append(s_dict)
    
    result.sort(key=lambda x: x["rank"])
    return sanitize_json(result)


@router.get("/database/summary")
def get_db_summary(db: Session = Depends(get_db)):
    """Retrieve the latest exam summary from the database."""
    analytics = db.query(models.AnalyticsResult).all()
    total_students = db.query(models.Student).count()
    
    ranked_analytics = [a for a in analytics if a.rank and a.rank != 999]
    
    if not ranked_analytics:
        return sanitize_json({
            "id": 1,
            "total_students": total_students,
            "average_score": 0,
            "highest_score": 0,
            "lowest_score": 0,
            "topper_name": "N/A",
            "average_percentage": 0,
            "average_accuracy": 0,
            "generated_at": None
        })
        
    total_scores = [a.total_score for a in ranked_analytics]
    accuracies = [a.accuracy for a in ranked_analytics]
    
    average_score = sum(total_scores) / len(total_scores) if total_scores else 0
    average_percentage = ((average_score / 300) * 100)
    average_accuracy = sum(accuracies) / len(accuracies) if accuracies else 0
    
    highest_score = max(total_scores) if total_scores else 0
    lowest_score = min(total_scores) if total_scores else 0
    
    # Find topper name
    topper_result = max(ranked_analytics, key=lambda x: x.total_score or 0)
    topper_name = "N/A"
    if topper_result:
        student = db.query(models.Student).filter(models.Student.id == topper_result.student_id).first()
        if student:
            topper_name = student.student_name
            
    return sanitize_json({
        "id": 1,
        "total_students": total_students,
        "average_score": round(average_score, 2),
        "highest_score": round(highest_score, 2),
        "lowest_score": round(lowest_score, 2),
        "topper_name": topper_name,
        "average_percentage": round(average_percentage, 2),
        "average_accuracy": round(average_accuracy, 2),
        "generated_at": None
    })

