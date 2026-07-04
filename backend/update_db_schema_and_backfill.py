import os
from sqlalchemy import text
from app.db.database import SessionLocal, engine
from app.db import models
from app.features.performance_summary.service import process_performance_summary
from app.core.config import REPORT_FILE

def run_migration_and_backfill():
    # 1. Alter table to add attempted column if not exists
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE subtopic_mastery ADD COLUMN IF NOT EXISTS attempted INTEGER DEFAULT 0;"))
        print("Database schema updated: attempted column added to subtopic_mastery (if not existed).")

    db = SessionLocal()
    try:
        # 2. Find completed tests
        tests = db.query(models.Test).filter(models.Test.status == "Completed").all()
        print(f"Found {len(tests)} completed tests to backfill.")

        for test in tests:
            print(f"\nBackfilling test {test.id}: '{test.test_name}'...")
            
            # Find upload files
            uploads = db.query(models.Upload).filter(models.Upload.test_id == test.id).all()
            error_report_path = None
            mark_list_path = None
            blueprint_path = None
            
            for up in uploads:
                if "error_report" in up.file_type:
                    error_report_path = up.file_path
                elif "mark_list" in up.file_type:
                    mark_list_path = up.file_path
                elif "blueprint" in up.file_type:
                    blueprint_path = up.file_path
            
            # Fallback check
            if not error_report_path or not mark_list_path or not blueprint_path:
                from pathlib import Path
                from app.core.config import UPLOAD_DIR
                
                # Scan directory for files matching prefixes
                for f_name in os.listdir(UPLOAD_DIR):
                    f_path = str(UPLOAD_DIR / f_name)
                    if f_name.startswith(f"test_{test.id}_error_report."):
                        error_report_path = f_path
                    elif f_name.startswith(f"test_{test.id}_mark_list."):
                        mark_list_path = f_path
                    elif f_name.startswith(f"test_{test.id}_blueprint."):
                        # Prefer xlsx/xls over pdf for blueprint if both exist
                        if not blueprint_path or f_name.endswith(".xlsx") or f_name.endswith(".xls"):
                            blueprint_path = f_path

                if not (error_report_path and mark_list_path and blueprint_path):
                    print(f"  [Warning] Missing upload files for test {test.id}. Skipping.")
                    continue
                
            print(f"  Files: error={error_report_path}, mark_list={mark_list_path}, blueprint={blueprint_path}")
            
            # Run the process performance summary pipeline to recalculate and save analytics
            result = process_performance_summary(
                error_report_path=error_report_path,
                mark_list_path=mark_list_path,
                blueprint_path=blueprint_path,
                output_path=str(REPORT_FILE),
                school_id=test.school_id,
                test_id=test.id,
                db=db
            )
            print(f"  Successfully regenerated and saved analytics for test {test.id}.")
            
        print("\nBackfill completed successfully.")
        
    except Exception as e:
        print(f"An error occurred: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    run_migration_and_backfill()
