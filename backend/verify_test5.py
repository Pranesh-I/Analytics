import os
import json
from app.db.database import SessionLocal
from app.db.models import AnalyticsResult, SubtopicMastery
from app.features.performance_summary.service import process_performance_summary

def main():
    error_path = r"c:\MEDJEE\website\Analytics\backend\uploads\test_5_error_report.xls"
    mark_path = r"c:\MEDJEE\website\Analytics\backend\uploads\test_5_mark_list.xls"
    blueprint_path = r"c:\MEDJEE\website\Analytics\backend\uploads\test_5_blueprint.xlsx"
    out_path = r"c:\MEDJEE\website\Analytics\backend\uploads\generated_report.xlsx"
    
    db = SessionLocal()
    from app.features.performance_summary.reader import read_uploaded_file
    from app.features.performance_summary.parser import analyze_error_report, analyze_blueprint
    error_df, _ = analyze_error_report(read_uploaded_file(error_path))
    blueprint_df, _ = analyze_blueprint(read_uploaded_file(blueprint_path))
    
    print("Blueprint cols:", blueprint_df.columns)
    print("Blueprint sample:")
    print(blueprint_df[['subject', 'qno', 'subtopic']].head() if 'qno' in blueprint_df.columns else "No Qno col")
    print("Error cols:", error_df.columns)
    
    try:
        result = process_performance_summary(
            error_report_path=error_path,
            mark_list_path=mark_path,
            blueprint_path=blueprint_path,
            output_path=out_path,
            school_id=2,
            test_id=5,
            db=db
        )
        
        # Test JSON serialization
        import math
        try:
            # json.dumps without allow_nan=True (default is True in python, but Starlette uses False logic)
            # Actually fastapi json.dumps raises error if out of range float
            import json
            # To simulate Starlette's strictness we can check for nan explicitly
            def check_nan(obj):
                if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
                    raise ValueError("Out of range float values are not JSON compliant")
                elif isinstance(obj, dict):
                    for v in obj.values(): check_nan(v)
                elif isinstance(obj, list):
                    for v in obj: check_nan(v)
            
            check_nan(result)
            print("JSON Serialization Test: PASS")
        except Exception as e:
            print("JSON Serialization Test: FAIL", str(e))
            
        # Check DB
        analytics_count = db.query(AnalyticsResult).filter(AnalyticsResult.test_id == 5).count()
        subtopic_count = db.query(SubtopicMastery).filter(SubtopicMastery.test_id == 5).count()
        
        print(f"DB Analytics Rows: {analytics_count}")
        print(f"DB Subtopic Rows: {subtopic_count}")
        
        if subtopic_count > 0:
            sample = db.query(SubtopicMastery).filter(SubtopicMastery.test_id == 5).first()
            print("Sample Subtopic Row:")
            print(f"  Student ID: {sample.student_id}")
            print(f"  Subject: {sample.subject}")
            print(f"  Subtopic: {sample.subtopic_name}")
            print(f"  Correct: {sample.correct}")
            print(f"  Wrong: {sample.wrong}")
            print(f"  Accuracy: {sample.accuracy}")
            
            nans = db.query(SubtopicMastery).filter(SubtopicMastery.test_id == 5, SubtopicMastery.accuracy == float('nan')).count()
            print(f"Subtopic rows with NaN accuracy in DB (should be 0): {nans}")

    except Exception as e:
        print("Error:", str(e))
    finally:
        db.close()

if __name__ == "__main__":
    main()
