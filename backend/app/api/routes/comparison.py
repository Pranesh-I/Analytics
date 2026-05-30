from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import date

from app.db import models
from app.db.database import get_db

router = APIRouter(prefix="/comparison", tags=["Comparison"])

@router.get("/schools")
def get_comparison_schools(
    test_type: Optional[str] = Query(None),
    test_number: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    # Fetch all schools first
    schools = db.query(models.School).all()
    
    result = []
    for school in schools:
        # Base query for analytics results for this school
        query = db.query(models.AnalyticsResult).filter(models.AnalyticsResult.school_id == school.id)
        
        # Apply filters
        # If test filters are active, we must join with the Test model
        if test_type or test_number or start_date or end_date:
            query = query.join(models.Test, models.AnalyticsResult.test_id == models.Test.id)
            if test_type:
                query = query.filter(models.Test.test_type == test_type)
            if test_number:
                query = query.filter(models.Test.test_number == test_number)
            if start_date:
                query = query.filter(models.Test.test_date >= start_date)
            if end_date:
                query = query.filter(models.Test.test_date <= end_date)
                
        analytics_results = query.all()
        
        # Unique students in these results
        student_ids = {r.student_id for r in analytics_results}
        total_students = len(student_ids)
        
        # Unique tests in these results
        test_ids = {r.test_id for r in analytics_results}
        total_tests = len(test_ids)
        
        # Score aggregates
        scores = [r.total_score for r in analytics_results if r.total_score is not None]
        
        # Calculate trend direction
        trend_direction = "stable"
        if len(test_ids) > 1:
            # Sort tests by date/id
            tests_sorted = db.query(models.Test).filter(models.Test.id.in_(list(test_ids))).order_by(models.Test.test_date.asc(), models.Test.id.asc()).all()
            if len(tests_sorted) > 1:
                latest_test = tests_sorted[-1]
                previous_test_ids = [t.id for t in tests_sorted[:-1]]
                
                latest_scores = [r.total_score for r in analytics_results if r.test_id == latest_test.id and r.total_score is not None]
                previous_scores = [r.total_score for r in analytics_results if r.test_id in previous_test_ids and r.total_score is not None]
                
                if latest_scores and previous_scores:
                    latest_avg = sum(latest_scores) / len(latest_scores)
                    previous_avg = sum(previous_scores) / len(previous_scores)
                    if latest_avg > previous_avg + 3.0:
                        trend_direction = "up"
                    elif latest_avg < previous_avg - 3.0:
                        trend_direction = "down"
        
        if scores:
            average_score = round(sum(scores) / len(scores), 2)
            highest_score = round(max(scores), 2)
            lowest_score = round(min(scores), 2)
            
            # pass is defined as percentage >= 50%
            passed_count = sum(1 for r in analytics_results if r.percentage is not None and r.percentage >= 50.0)
            pass_percentage = round((passed_count / len(analytics_results)) * 100, 2)
            
            # risk_percentage: percentage of results where percentage < 50.0 (Needs Improvement)
            risk_count = sum(1 for r in analytics_results if r.percentage is not None and r.percentage < 50.0)
            risk_percentage = round((risk_count / len(analytics_results)) * 100, 2)
        else:
            average_score = 0.0
            highest_score = 0.0
            lowest_score = 0.0
            pass_percentage = 0.0
            risk_percentage = 0.0
            
        result.append({
            "school_id": school.id,
            "school_name": school.school_name,
            "school_code": school.school_code,
            "total_students": total_students,
            "average_score": average_score,
            "highest_score": highest_score,
            "lowest_score": lowest_score,
            "pass_percentage": pass_percentage,
            "risk_percentage": risk_percentage,
            "total_tests": total_tests,
            "trend_direction": trend_direction
        })
        
    return result

@router.get("/schools/{school_id}/students")
def get_comparison_school_students(
    school_id: int,
    test_type: Optional[str] = Query(None),
    test_number: Optional[int] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    db: Session = Depends(get_db)
):
    school = db.query(models.School).filter(models.School.id == school_id).first()
    if not school:
        raise HTTPException(status_code=404, detail="School not found")
        
    # Get all students of this school
    students = db.query(models.Student).filter(models.Student.school_id == school_id).all()
    
    result = []
    for student in students:
        # Base query for analytics results for this student
        query = db.query(models.AnalyticsResult).filter(models.AnalyticsResult.student_id == student.id)
        
        # Apply filters
        if test_type or test_number or start_date or end_date:
            query = query.join(models.Test, models.AnalyticsResult.test_id == models.Test.id)
            if test_type:
                query = query.filter(models.Test.test_type == test_type)
            if test_number:
                query = query.filter(models.Test.test_number == test_number)
            if start_date:
                query = query.filter(models.Test.test_date >= start_date)
            if end_date:
                query = query.filter(models.Test.test_date <= end_date)
                
        analytics_results = query.all()
        
        scores = [r.total_score for r in analytics_results if r.total_score is not None]
        percentages = [r.percentage for r in analytics_results if r.percentage is not None]
        tests_attended = len(analytics_results)
        
        is_consistent = False
        if len(percentages) >= 2:
            avg_pct = sum(percentages) / len(percentages)
            variance = sum((x - avg_pct) ** 2 for x in percentages) / len(percentages)
            std_dev = variance ** 0.5
            if std_dev < 15.0:
                is_consistent = True
                
        if scores:
            average_score = round(sum(scores) / len(scores), 2)
            highest_score = round(max(scores), 2)
            lowest_score = round(min(scores), 2)
            
            # Pass percentage of the student
            passed_count = sum(1 for r in analytics_results if r.percentage is not None and r.percentage >= 50.0)
            pass_percentage = round((passed_count / tests_attended) * 100, 2)
            
            # Determine student risk level based on overall average percentage
            avg_percentage = (average_score / 300.0) * 100
            if avg_percentage >= 75.0:
                risk_level = "Low"
            elif avg_percentage >= 50.0:
                risk_level = "Medium"
            else:
                risk_level = "High"
        else:
            average_score = 0.0
            highest_score = 0.0
            lowest_score = 0.0
            pass_percentage = 0.0
            risk_level = "High"
            
        result.append({
            "student_id": student.id,
            "student_name": student.student_name,
            "roll_number": student.roll_no,
            "average_score": average_score,
            "highest_score": highest_score,
            "lowest_score": lowest_score,
            "tests_attended": tests_attended,
            "pass_percentage": pass_percentage,
            "risk_level": risk_level,
            "is_consistent": is_consistent
        })
        
    return result
