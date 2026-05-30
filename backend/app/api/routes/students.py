from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import io

from app.db import crud, schemas, models
from app.db.database import get_db

router = APIRouter(prefix="/schools", tags=["Students"])

@router.post("/{school_id}/students/upload")
async def upload_students(school_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    # Verify school exists
    school = crud.get_school(db, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
        
    filename = file.filename or ""
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ["xls", "xlsx"]:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only Excel files (.xls, .xlsx) are allowed."
        )

    try:
        contents = await file.read()
        
        # Parse based on file extension
        if ext == "xlsx":
            df = pd.read_excel(io.BytesIO(contents), engine="openpyxl")
        else:
            df = pd.read_excel(io.BytesIO(contents), engine="xlrd")

        # Validate required columns
        required_columns = ["Roll No", "Student Name", "Class", "Section"]
        missing_columns = [col for col in required_columns if col not in df.columns]
        if missing_columns:
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {', '.join(missing_columns)}"
            )
            
        # Fetch existing students for this school for fast in-memory conflict detection
        existing_students = db.query(models.Student).filter(models.Student.school_id == school_id).all()
        student_map = {str(s.roll_no).strip(): s for s in existing_students}
        
        students_imported = 0
        
        for _, row in df.iterrows():
            # Get Roll No
            raw_roll = row.get("Roll No")
            if pd.isna(raw_roll) or str(raw_roll).strip() == "":
                continue
                
            # Sanitize numeric Roll No (e.g. 1217.0 -> "1217")
            if isinstance(raw_roll, float):
                if raw_roll.is_integer():
                    roll_no = str(int(raw_roll))
                else:
                    roll_no = str(raw_roll)
            else:
                roll_no = str(raw_roll).strip()
                
            # Get Student Name
            raw_name = row.get("Student Name")
            student_name = str(raw_name).strip() if not pd.isna(raw_name) else ""
            if not student_name:
                continue
                
            # Get Class
            raw_class = row.get("Class")
            if pd.isna(raw_class):
                class_name = ""
            elif isinstance(raw_class, float):
                if raw_class.is_integer():
                    class_name = str(int(raw_class))
                else:
                    class_name = str(raw_class)
            else:
                class_name = str(raw_class).strip()
                
            # Get Section
            raw_section = row.get("Section")
            section = str(raw_section).strip() if not pd.isna(raw_section) else ""
            
            if roll_no in student_map:
                # Update existing student
                db_student = student_map[roll_no]
                db_student.student_name = student_name
                db_student.class_name = class_name
                db_student.section = section
            else:
                # Create new student
                db_student = models.Student(
                    school_id=school_id,
                    roll_no=roll_no,
                    student_name=student_name,
                    class_name=class_name,
                    section=section
                )
                db.add(db_student)
                student_map[roll_no] = db_student
                
            students_imported += 1
            
        db.commit()
        return {
            "success": True,
            "students_imported": students_imported
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error processing and importing Excel file: {str(e)}"
        )

@router.get("/{school_id}/students")
def get_students(school_id: int, db: Session = Depends(get_db)):
    school = crud.get_school(db, school_id)
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
        
    students = db.query(models.Student).filter(models.Student.school_id == school_id).all()
    analytics = db.query(models.AnalyticsResult).filter(models.AnalyticsResult.school_id == school_id).all()
    
    analytics_map = {a.student_id: a for a in analytics}
    
    result = []
    for s in students:
        a = analytics_map.get(s.id)
        if a:
            s_dict = {
                "id": s.id,
                "student_name": s.student_name,
                "roll_no": s.roll_no,
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
                "roll_no": s.roll_no,
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
    return result


@router.get("/students/{student_id}/analytics")
def get_individual_student_analytics(student_id: int, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    school = db.query(models.School).filter(models.School.id == student.school_id).first()
    school_name = school.school_name if school else "Unknown School"
    
    # Query all analytics results for this student
    results = db.query(models.AnalyticsResult).filter(models.AnalyticsResult.student_id == student_id).all()
    
    # Base response dictionary
    profile = {
        "student_name": student.student_name,
        "roll_no": student.roll_no,
        "class_name": student.class_name,
        "section": student.section,
        "school_name": school_name
    }
    
    if not results:
        return {
            "profile": profile,
            "overall": {
                "total_tests": 0,
                "average_score": 0.0,
                "average_accuracy": 0.0,
                "attempted": 0,
                "correct": 0,
                "wrong": 0,
                "negative_marks": 0,
                "band": "N/A",
                "risk_exp_best": "Normal"
            },
            "subjects": [],
            "history": []
        }
        
    # Aggregate summaries
    total_tests = len(results)
    total_score = sum(r.total_score for r in results if r.total_score is not None)
    total_accuracy = sum(r.accuracy for r in results if r.accuracy is not None)
    
    attempted = sum(r.attempted for r in results if r.attempted is not None)
    correct = sum(r.correct for r in results if r.correct is not None)
    wrong = sum(r.wrong for r in results if r.wrong is not None)
    negative_marks = sum(r.negative_marks for r in results if r.negative_marks is not None)
    
    average_score = total_score / total_tests
    average_accuracy = total_accuracy / total_tests
    
    # Get latest result (by id)
    latest_result = max(results, key=lambda x: x.id)
    band = latest_result.band or "N/A"
    risk_exp_best = latest_result.risk_exp_best or "Normal"
    
    # Subject breakdown
    phy_scores = [r.physics for r in results if r.physics is not None]
    che_scores = [r.chemistry for r in results if r.chemistry is not None]
    mat_scores = [r.maths for r in results if r.maths is not None]
    
    avg_phy = sum(phy_scores) / len(phy_scores) if phy_scores else 0.0
    avg_che = sum(che_scores) / len(che_scores) if che_scores else 0.0
    avg_mat = sum(mat_scores) / len(mat_scores) if mat_scores else 0.0
    
    subjects = [
        {
            "subject_name": "Physics",
            "marks": round(avg_phy, 2),
            "attempted": attempted // 3,
            "correct": correct // 3,
            "errors": wrong // 3,
            "unattempted": (attempted // 3) - (correct // 3),
            "accuracy": round(average_accuracy, 2),
            "negative_marks": negative_marks // 3,
            "risk_level": risk_exp_best,
            "remarks": "Strong conceptual understanding" if avg_phy > 75 else "Needs improvement"
        },
        {
            "subject_name": "Chemistry",
            "marks": round(avg_che, 2),
            "attempted": attempted // 3,
            "correct": correct // 3,
            "errors": wrong // 3,
            "unattempted": (attempted // 3) - (correct // 3),
            "accuracy": round(average_accuracy, 2),
            "negative_marks": negative_marks // 3,
            "risk_level": risk_exp_best,
            "remarks": "Solid performance" if avg_che > 75 else "Needs practice"
        },
        {
            "subject_name": "Maths",
            "marks": round(avg_mat, 2),
            "attempted": attempted // 3,
            "correct": correct // 3,
            "errors": wrong // 3,
            "unattempted": (attempted // 3) - (correct // 3),
            "accuracy": round(average_accuracy, 2),
            "negative_marks": negative_marks // 3,
            "risk_level": risk_exp_best,
            "remarks": "Excellent analysis" if avg_mat > 75 else "Requires guidance"
        }
    ]
    
    # Sort history list by test id or test date
    history = []
    for r in results:
        test = db.query(models.Test).filter(models.Test.id == r.test_id).first()
        history.append({
            "test_name": test.test_name if test else f"Test #{r.test_id}",
            "test_date": test.test_date.isoformat() if test and test.test_date else None,
            "total_score": r.total_score,
            "accuracy": r.accuracy,
            "physics": r.physics,
            "chemistry": r.chemistry,
            "maths": r.maths
        })
        
    return {
        "profile": profile,
        "overall": {
            "total_tests": total_tests,
            "average_score": round(average_score, 2),
            "average_accuracy": round(average_accuracy, 2),
            "attempted": attempted,
            "correct": correct,
            "wrong": wrong,
            "negative_marks": negative_marks,
            "band": band,
            "risk_exp_best": risk_exp_best
        },
        "subjects": subjects,
        "history": history
    }
