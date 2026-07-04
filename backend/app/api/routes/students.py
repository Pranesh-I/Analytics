from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import io
import traceback


from app.db import crud, schemas, models
from app.db.database import get_db
from app.utils.percentile_utils import get_estimated_percentile, get_percentile_band_label

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
        print("\n===== FULL ERROR =====")
        traceback.print_exc()
        print("======================\n")

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
            # Per-subject attempted = correct + wrong for that subject
            phy_att = (a.physics_correct or 0) + (a.physics_wrong or 0)
            che_att = (a.chemistry_correct or 0) + (a.chemistry_wrong or 0)
            mat_att = (a.maths_correct or 0) + (a.maths_wrong or 0)

            def subj_accuracy(correct, attempted):
                return round((correct / attempted) * 100, 1) if attempted else 0.0

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
                        "attempted": phy_att,
                        "correct": a.physics_correct or 0,
                        "errors": a.physics_wrong or 0,
                        "unattempted": max(0, phy_att - (a.physics_correct or 0)),
                        "accuracy": subj_accuracy(a.physics_correct or 0, phy_att),
                        "negative_marks": a.physics_wrong or 0,
                        "risk_level": a.risk_exp_best or "Low",
                        "remarks": "Strong conceptual understanding" if a.physics > 75 else "Needs improvement"
                    },
                    {
                        "subject_name": "Chemistry",
                        "marks": a.chemistry,
                        "attempted": che_att,
                        "correct": a.chemistry_correct or 0,
                        "errors": a.chemistry_wrong or 0,
                        "unattempted": max(0, che_att - (a.chemistry_correct or 0)),
                        "accuracy": subj_accuracy(a.chemistry_correct or 0, che_att),
                        "negative_marks": a.chemistry_wrong or 0,
                        "risk_level": a.risk_exp_best or "Low",
                        "remarks": "Solid performance" if a.chemistry > 75 else "Needs practice"
                    },
                    {
                        "subject_name": "Maths",
                        "marks": a.maths,
                        "attempted": mat_att,
                        "correct": a.maths_correct or 0,
                        "errors": a.maths_wrong or 0,
                        "unattempted": max(0, mat_att - (a.maths_correct or 0)),
                        "accuracy": subj_accuracy(a.maths_correct or 0, mat_att),
                        "negative_marks": a.maths_wrong or 0,
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


def _build_subject_breakdown(a: models.AnalyticsResult) -> list:
    """
    Build per-subject breakdown from an AnalyticsResult row using the real
    per-subject correct/wrong counts (physics_correct, physics_wrong, etc.).
    Falls back to dividing overall totals equally only if per-subject data
    is all zero (e.g. for rows uploaded before the schema upgrade).
    """
    has_per_subject = (
        (a.physics_correct or 0) + (a.physics_wrong or 0) +
        (a.chemistry_correct or 0) + (a.chemistry_wrong or 0) +
        (a.maths_correct or 0) + (a.maths_wrong or 0)
    ) > 0

    def subj_accuracy(correct, attempted):
        return round((correct / attempted) * 100, 1) if attempted else 0.0

    if has_per_subject:
        phy_c = a.physics_correct or 0
        phy_w = a.physics_wrong or 0
        phy_att = phy_c + phy_w

        che_c = a.chemistry_correct or 0
        che_w = a.chemistry_wrong or 0
        che_att = che_c + che_w

        mat_c = a.maths_correct or 0
        mat_w = a.maths_wrong or 0
        mat_att = mat_c + mat_w
    else:
        # Legacy fallback: divide overall counts by 3
        phy_c = (a.correct or 0) // 3
        phy_w = (a.wrong or 0) // 3
        phy_att = (a.attempted or 0) // 3

        che_c = phy_c
        che_w = phy_w
        che_att = phy_att

        mat_c = phy_c
        mat_w = phy_w
        mat_att = phy_att

    return [
        {
            "subject_name": "Physics",
            "marks": a.physics,
            "attempted": phy_att,
            "correct": phy_c,
            "errors": phy_w,
            "unattempted": max(0, phy_att - phy_c),
            "accuracy": subj_accuracy(phy_c, phy_att),
            "negative_marks": phy_w,
            "risk_level": a.risk_exp_best or "Low",
            "remarks": "Strong conceptual understanding" if (a.physics or 0) > 75 else "Needs improvement"
        },
        {
            "subject_name": "Chemistry",
            "marks": a.chemistry,
            "attempted": che_att,
            "correct": che_c,
            "errors": che_w,
            "unattempted": max(0, che_att - che_c),
            "accuracy": subj_accuracy(che_c, che_att),
            "negative_marks": che_w,
            "risk_level": a.risk_exp_best or "Low",
            "remarks": "Solid performance" if (a.chemistry or 0) > 75 else "Needs practice"
        },
        {
            "subject_name": "Maths",
            "marks": a.maths,
            "attempted": mat_att,
            "correct": mat_c,
            "errors": mat_w,
            "unattempted": max(0, mat_att - mat_c),
            "accuracy": subj_accuracy(mat_c, mat_att),
            "negative_marks": mat_w,
            "risk_level": a.risk_exp_best or "Low",
            "remarks": "Excellent analysis" if (a.maths or 0) > 75 else "Requires guidance"
        }
    ]


@router.get("/students/{student_id}/analytics")
def get_individual_student_analytics(student_id: int, db: Session = Depends(get_db)):
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    school = db.query(models.School).filter(models.School.id == student.school_id).first()
    school_name = school.school_name if school else "Unknown School"
    
    # Query all analytics results for this student
    results = db.query(models.AnalyticsResult).filter(
        models.AnalyticsResult.student_id == student_id
    ).all()
    
    # Base response dictionary
    profile = {
        "student_name": student.student_name,
        "roll_no": student.roll_no,
        "class_name": student.class_name,
        "section": student.section,
        "school_name": school_name
    }
    
    empty_subjects = [
        {"subject_name": "Physics", "marks": 0, "attempted": 0, "correct": 0,
         "errors": 0, "unattempted": 0, "accuracy": 0.0, "negative_marks": 0,
         "risk_level": "Low", "remarks": "No data"},
        {"subject_name": "Chemistry", "marks": 0, "attempted": 0, "correct": 0,
         "errors": 0, "unattempted": 0, "accuracy": 0.0, "negative_marks": 0,
         "risk_level": "Low", "remarks": "No data"},
        {"subject_name": "Maths", "marks": 0, "attempted": 0, "correct": 0,
         "errors": 0, "unattempted": 0, "accuracy": 0.0, "negative_marks": 0,
         "risk_level": "Low", "remarks": "No data"},
    ]

    if not results:
        return {
            "profile": profile,
            "combined": {
                "total_tests": 0,
                "average_score": 0.0,
                "average_accuracy": 0.0,
                "attempted": 0,
                "correct": 0,
                "wrong": 0,
                "negative_marks": 0,
                "band": "N/A",
                "risk_exp_best": "Normal",
                "overall_estimated_percentile": 0.0,
                "overall_percentile_label": "0–5 Percentile",
                "overall_percentile_note": "Based on average score across 0 tests",
                "subjects": empty_subjects
            },
            "tests": [],
            # Legacy compat: keep 'overall' and 'subjects' at top level
            "overall": {
                "total_tests": 0,
                "average_score": 0.0,
                "average_accuracy": 0.0,
                "attempted": 0,
                "correct": 0,
                "wrong": 0,
                "negative_marks": 0,
                "band": "N/A",
                "risk_exp_best": "Normal",
                "overall_estimated_percentile": 0.0,
                "overall_percentile_label": "0–5 Percentile",
                "overall_percentile_note": "Based on average score across 0 tests",
            },
            "subjects": empty_subjects,
            "history": []
        }

    # ------------------------------------------------------------------
    # Build per-test list
    # ------------------------------------------------------------------
    tests_list = []
    for r in results:
        test = db.query(models.Test).filter(models.Test.id == r.test_id).first()
        test_subjects = _build_subject_breakdown(r)
        # Per-test estimated_percentile: read from DB (computed at insert time).
        # Fall back to computing from total_score if the stored value is missing/zero
        # (handles rows inserted before this feature was added).
        stored_pct = r.estimated_percentile
        if stored_pct is None or stored_pct == 0.0:
            stored_pct = get_estimated_percentile(r.total_score or 0.0)
        tests_list.append({
            "test_id": r.test_id,
            "test_name": test.test_name if test else f"Test #{r.test_id}",
            "test_date": test.test_date.isoformat() if test and test.test_date else None,
            "total_score": r.total_score,
            "accuracy": r.accuracy,
            "percentage": r.percentage,
            "physics": r.physics,
            "chemistry": r.chemistry,
            "maths": r.maths,
            "attempted": r.attempted,
            "correct": r.correct,
            "wrong": r.wrong,
            "negative_marks": r.negative_marks,
            "band": r.band or "N/A",
            "risk_exp_best": r.risk_exp_best or "Normal",
            "rank": r.rank or 999,
            "estimated_percentile": stored_pct,
            "percentile_label": get_percentile_band_label(r.total_score or 0.0),
            "subjects": test_subjects
        })

    # Sort by test_id ascending (chronological)
    tests_list.sort(key=lambda x: x["test_id"])

    # ------------------------------------------------------------------
    # Build combined / averaged view
    # ------------------------------------------------------------------
    total_tests = len(results)
    avg_score = round(sum(r.total_score or 0 for r in results) / total_tests, 2)
    avg_accuracy = round(sum(r.accuracy or 0 for r in results) / total_tests, 2)
    total_attempted = sum(r.attempted or 0 for r in results)
    total_correct = sum(r.correct or 0 for r in results)
    total_wrong = sum(r.wrong or 0 for r in results)
    total_negative = sum(r.negative_marks or 0 for r in results)

    # Latest result for band/risk
    latest = max(results, key=lambda x: x.id)
    band = latest.band or "N/A"
    risk = latest.risk_exp_best or "Normal"

    # Combined per-subject (sum all tests then compute accuracy)
    comb_phy_c = sum(r.physics_correct or 0 for r in results)
    comb_phy_w = sum(r.physics_wrong or 0 for r in results)
    comb_phy_att = comb_phy_c + comb_phy_w
    comb_phy_marks = round(sum(r.physics or 0 for r in results) / total_tests, 2)

    comb_che_c = sum(r.chemistry_correct or 0 for r in results)
    comb_che_w = sum(r.chemistry_wrong or 0 for r in results)
    comb_che_att = comb_che_c + comb_che_w
    comb_che_marks = round(sum(r.chemistry or 0 for r in results) / total_tests, 2)

    comb_mat_c = sum(r.maths_correct or 0 for r in results)
    comb_mat_w = sum(r.maths_wrong or 0 for r in results)
    comb_mat_att = comb_mat_c + comb_mat_w
    comb_mat_marks = round(sum(r.maths or 0 for r in results) / total_tests, 2)

    # If no per-subject data (legacy rows), fall back to dividing overall by 3
    has_per_subject_combined = (comb_phy_c + comb_phy_w + comb_che_c + comb_che_w + comb_mat_c + comb_mat_w) > 0
    if not has_per_subject_combined:
        comb_phy_c = total_correct // 3
        comb_phy_w = total_wrong // 3
        comb_phy_att = total_attempted // 3
        comb_che_c = comb_phy_c; comb_che_w = comb_phy_w; comb_che_att = comb_phy_att
        comb_mat_c = comb_phy_c; comb_mat_w = comb_phy_w; comb_mat_att = comb_phy_att

    def s_acc(c, a): return round((c / a) * 100, 1) if a else 0.0

    combined_subjects = [
        {
            "subject_name": "Physics",
            "marks": comb_phy_marks,
            "attempted": comb_phy_att,
            "correct": comb_phy_c,
            "errors": comb_phy_w,
            "unattempted": max(0, comb_phy_att - comb_phy_c),
            "accuracy": s_acc(comb_phy_c, comb_phy_att),
            "negative_marks": comb_phy_w,
            "risk_level": risk,
            "remarks": "Strong conceptual understanding" if comb_phy_marks > 75 else "Needs improvement"
        },
        {
            "subject_name": "Chemistry",
            "marks": comb_che_marks,
            "attempted": comb_che_att,
            "correct": comb_che_c,
            "errors": comb_che_w,
            "unattempted": max(0, comb_che_att - comb_che_c),
            "accuracy": s_acc(comb_che_c, comb_che_att),
            "negative_marks": comb_che_w,
            "risk_level": risk,
            "remarks": "Solid performance" if comb_che_marks > 75 else "Needs practice"
        },
        {
            "subject_name": "Maths",
            "marks": comb_mat_marks,
            "attempted": comb_mat_att,
            "correct": comb_mat_c,
            "errors": comb_mat_w,
            "unattempted": max(0, comb_mat_att - comb_mat_c),
            "accuracy": s_acc(comb_mat_c, comb_mat_att),
            "negative_marks": comb_mat_w,
            "risk_level": risk,
            "remarks": "Excellent analysis" if comb_mat_marks > 75 else "Requires guidance"
        }
    ]

    # ------------------------------------------------------------------
    # Compute overall_estimated_percentile (statistically correct):
    # Pass avg(total_score) through the interpolation function ONCE.
    # This avoids the statistical error of averaging per-test percentiles.
    # ------------------------------------------------------------------
    overall_estimated_percentile = get_estimated_percentile(avg_score)
    overall_percentile_label = get_percentile_band_label(avg_score)
    overall_percentile_note = f"Based on average score across {total_tests} test{'s' if total_tests != 1 else ''}"

    combined = {
        "total_tests": total_tests,
        "average_score": avg_score,
        "average_accuracy": avg_accuracy,
        "attempted": total_attempted,
        "correct": total_correct,
        "wrong": total_wrong,
        "negative_marks": total_negative,
        "band": band,
        "risk_exp_best": risk,
        "overall_estimated_percentile": overall_estimated_percentile,
        "overall_percentile_label": overall_percentile_label,
        "overall_percentile_note": overall_percentile_note,
        "subjects": combined_subjects
    }

    # Legacy history list (for the Performance Trend chart)
    history = [
        {
            "test_name": t["test_name"],
            "test_date": t["test_date"],
            "total_score": t["total_score"],
            "accuracy": t["accuracy"],
            "physics": t["physics"],
            "chemistry": t["chemistry"],
            "maths": t["maths"]
        }
        for t in tests_list
    ]

    return {
        "profile": profile,
        "combined": combined,
        "tests": tests_list,
        # Legacy compat keys so nothing else breaks
        "overall": {
            "total_tests": total_tests,
            "average_score": avg_score,
            "average_accuracy": avg_accuracy,
            "attempted": total_attempted,
            "correct": total_correct,
            "wrong": total_wrong,
            "negative_marks": total_negative,
            "band": band,
            "risk_exp_best": risk,
            "overall_estimated_percentile": overall_estimated_percentile,
            "overall_percentile_label": overall_percentile_label,
            "overall_percentile_note": overall_percentile_note,
        },
        "subjects": combined_subjects,
        "history": history
    }


@router.get("/students/{student_id}/subtopics")
def get_student_subtopics(student_id: int, test_id: int = None, db: Session = Depends(get_db)):
    """
    Returns subtopic mastery data for a student.
    Optionally filtered by test_id. If no test_id given, returns data for all tests.
    """
    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    query = db.query(models.SubtopicMastery).filter(
        models.SubtopicMastery.student_id == student_id
    )
    if test_id is not None:
        query = query.filter(models.SubtopicMastery.test_id == test_id)

    rows = query.order_by(
        models.SubtopicMastery.subject,
        models.SubtopicMastery.subtopic_name
    ).all()

    # Group by subject
    grouped: dict = {}
    for row in rows:
        subj = row.subject
        if subj not in grouped:
            grouped[subj] = []
        grouped[subj].append({
            "subtopic": row.subtopic_name,
            "correct": row.correct,
            "wrong": row.wrong,
            "attempted": row.attempted,
            "accuracy": row.accuracy,
        })

    return {
        "student_id": student_id,
        "test_id": test_id,
        "subtopics": grouped
    }
