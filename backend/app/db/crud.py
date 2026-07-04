import logging
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from app.db import models, schemas
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# ------------------------------------------------------------------
# SCHOOL CRUD
# ------------------------------------------------------------------
def create_school(db: Session, school: schemas.SchoolCreate):
    db_school = models.School(**school.model_dump())
    db.add(db_school)
    db.commit()
    db.refresh(db_school)
    return db_school

def get_schools(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.School).offset(skip).limit(limit).all()

def get_school(db: Session, school_id: int):
    return db.query(models.School).filter(models.School.id == school_id).first()

def update_school(db: Session, school_id: int, school: schemas.SchoolUpdate):
    db_school = db.query(models.School).filter(models.School.id == school_id).first()
    if db_school:
        update_data = school.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_school, key, value)
        db.commit()
        db.refresh(db_school)
    return db_school

def delete_school(db: Session, school_id: int):
    db_school = db.query(models.School).filter(models.School.id == school_id).first()
    if db_school:
        db.delete(db_school)
        db.commit()
    return db_school

# ------------------------------------------------------------------
# STUDENT CRUD
# ------------------------------------------------------------------
def create_student(db: Session, student: schemas.StudentCreate):
    db_student = models.Student(**student.model_dump())
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return db_student

def get_students_by_school(db: Session, school_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Student).filter(models.Student.school_id == school_id).offset(skip).limit(limit).all()

# ------------------------------------------------------------------
# TEST CRUD
# ------------------------------------------------------------------
def create_test(db: Session, test: schemas.TestCreate):
    db_test = models.Test(**test.model_dump())
    db.add(db_test)
    db.commit()
    db.refresh(db_test)
    return db_test

def get_tests_by_school(db: Session, school_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Test).filter(models.Test.school_id == school_id).order_by(models.Test.id.desc()).offset(skip).limit(limit).all()

def get_test(db: Session, test_id: int):
    return db.query(models.Test).filter(models.Test.id == test_id).first()

def update_test_status(db: Session, test_id: int, status: str):
    db_test = get_test(db, test_id)
    if db_test:
        db_test.status = status
        db.commit()
        db.refresh(db_test)
    return db_test

# ------------------------------------------------------------------
# UPLOAD CRUD
# ------------------------------------------------------------------
def create_upload(db: Session, upload: schemas.UploadCreate):
    db_upload = models.Upload(**upload.model_dump())
    db.add(db_upload)
    db.commit()
    db.refresh(db_upload)
    return db_upload

def get_uploads_by_test(db: Session, test_id: int):
    return db.query(models.Upload).filter(models.Upload.test_id == test_id).all()

# ------------------------------------------------------------------
# ANALYTICS ENGINE HOOK
# ------------------------------------------------------------------
def save_analytics_session_data(
    db: Session,
    school_id: int,
    test_id: int,
    performance_rows: List[Dict[str, Any]],
    subject_rows: List[Dict[str, Any]],
    subtopic_rows: List[Dict[str, Any]],
    report_name: str,
    report_file_path: str,
) -> Dict[str, Any]:
    """
    Saves the processed analytics data directly into the analytics_results table.
    Matches students using roll_no within the specified school_id.
    Also saves per-subject correct/wrong counts and subtopic mastery data.
    """
    try:
        # Clear existing analytics for this test (cascades to subtopic_mastery)
        deleted = db.query(models.AnalyticsResult).filter(models.AnalyticsResult.test_id == test_id).delete()
        if deleted > 0:
            logger.info(f"Cleared {deleted} old analytics records for test_id={test_id}")

        # Also clear subtopic mastery for this test
        db.query(models.SubtopicMastery).filter(models.SubtopicMastery.test_id == test_id).delete()

        results_inserted = 0
        students_not_found = []

        # Find students in the school
        school_students = db.query(models.Student).filter(models.Student.school_id == school_id).all()
        student_roll_map = {str(s.roll_no).strip(): s.id for s in school_students}

        # Build a lookup: roll_no -> {subject -> {correct, wrong}} from subject_rows
        # subject_rows each have: roll_no, subject, correct, wrong, ...
        subject_lookup: Dict[str, Dict[str, Dict[str, int]]] = {}
        for sr in subject_rows:
            roll = str(sr.get("roll_no", "")).strip()
            subj = str(sr.get("subject", "")).strip()  # "Physics" / "Chemistry" / "Mathematics"
            if roll and subj:
                if roll not in subject_lookup:
                    subject_lookup[roll] = {}
                subject_lookup[roll][subj] = {
                    "correct": int(sr.get("correct", 0)),
                    "wrong": int(sr.get("wrong", 0)),
                }

        print("\n========== DB DEBUG ==========")
        print("school_id =", school_id)
        print("test_id =", test_id)
        print("students in DB =", len(school_students))
        print("roll numbers in DB =", list(student_roll_map.keys())[:10])
        print("==============================\n")

        for row in performance_rows:
            print("Excel Roll No =", row.get("roll_no"))
            roll_no = str(row.get("roll_no", "")).strip()
            student_id = student_roll_map.get(roll_no)

            if not student_id:
                print("NOT FOUND IN DB:", roll_no)
                students_not_found.append(roll_no)
                continue

            # Per-subject correct/wrong from subject breakdown
            subj_data = subject_lookup.get(roll_no, {})
            phy = subj_data.get("Physics", {})
            che = subj_data.get("Chemistry", {})
            mat = subj_data.get("Mathematics", {})

            db_result = models.AnalyticsResult(
                school_id=school_id,
                test_id=test_id,
                student_id=student_id,
                physics=float(row.get("phy", 0.0)),
                chemistry=float(row.get("che", 0.0)),
                maths=float(row.get("mat", 0.0)),
                total_score=float(row.get("total", 0.0)),
                percentage=float(row.get("percentage", 0.0)),
                accuracy=float(row.get("accuracy", 0.0)),
                attempted=int(row.get("attempted", 0)),
                correct=int(row.get("correct", 0)),
                wrong=int(row.get("wrong", 0)),
                negative_marks=int(row.get("negative_marks", 0)),
                rank=int(row.get("rank", 0) if row.get("rank") else 0),
                band=str(row.get("band", "")),
                risk_exp_best=str(row.get("risk_exp_best", "")),
                # Per-subject breakdown
                physics_correct=int(phy.get("correct", 0)),
                physics_wrong=int(phy.get("wrong", 0)),
                chemistry_correct=int(che.get("correct", 0)),
                chemistry_wrong=int(che.get("wrong", 0)),
                maths_correct=int(mat.get("correct", 0)),
                maths_wrong=int(mat.get("wrong", 0)),
            )
            db.add(db_result)
            results_inserted += 1

        print("\nRESULTS INSERTED =", results_inserted)
        print("STUDENTS NOT FOUND =", len(students_not_found))

        # Insert subtopic rows
        subtopics_inserted = 0
        if subtopic_rows:
            for sr in subtopic_rows:
                roll_no = str(sr.get("roll_no", "")).strip()
                student_id = student_roll_map.get(roll_no)
                if not student_id:
                    continue
                    
                subtopic_model = models.SubtopicMastery(
                    student_id=student_id,
                    test_id=test_id,
                    subject=str(sr.get("subject", "")),
                    subtopic_name=str(sr.get("subtopic_name", "")),
                    correct=int(sr.get("correct", 0)),
                    wrong=int(sr.get("wrong", 0)),
                    attempted=int(sr.get("attempted", 0)),
                    accuracy=sr.get("accuracy") # Keep it as Float or None
                )
                db.add(subtopic_model)
                subtopics_inserted += 1

        print("SUBTOPICS INSERTED =", subtopics_inserted)

        db.commit()

        return {
            "status": "success",
            "results_inserted": results_inserted,
            "students_not_found": students_not_found,
            "total_processed": len(performance_rows)
        }

    except Exception as error:
        db.rollback()
        logger.error(f"Database transaction failed: {error}")
        raise RuntimeError(f"Analytics save failed: {str(error)}")
