from typing import Any, Dict, Optional
import os
from sqlalchemy.orm import Session

from app.features.performance_summary.reader import read_uploaded_file
from app.features.performance_summary.parser import (
    analyze_error_report,
    analyze_mark_list,
    analyze_blueprint,
)
from app.features.performance_summary.merger import merge_error_and_mark_list
from app.features.performance_summary.report import generate_performance_report
from app.features.subject_summary import process_subject_summary
from app.db.crud import save_analytics_session_data


def process_performance_summary(
    error_report_path: str,
    mark_list_path: str,
    blueprint_path: str,
    output_path: str,
    school_id: Optional[int] = None,
    test_id: Optional[int] = None,
    db: Optional[Session] = None,
) -> Dict[str, Any]:
    """
    Orchestrate the end-to-end pipeline:
    - Read the three uploaded files
    - Parse their contents into DataFrames and capture their analysis
    - Merge error report with student mark list
    - Save structured student results, subject performances, exam summary, and report to PostgreSQL
    - Generate the final Excel report
    """
    # 1. Read files
    error_report_data = read_uploaded_file(error_report_path)
    mark_list_data = read_uploaded_file(mark_list_path)
    blueprint_data = read_uploaded_file(blueprint_path)

    # 2. Parse & Analyze
    error_df, error_report_analysis = analyze_error_report(error_report_data)
    mark_df, mark_list_analysis = analyze_mark_list(mark_list_data)
    _, blueprint_analysis = analyze_blueprint(blueprint_data)

    # 3. Merge error report and mark list data
    merged_analysis = merge_error_and_mark_list(error_df, mark_df)

    # 4. Generate subject summary data
    subject_result = process_subject_summary(
        error_report_path=error_report_path,
        mark_list_path=mark_list_path,
        blueprint_path=blueprint_path,
    )
    subject_rows = subject_result.get("subject_rows", [])

    # 5. Generate final report
    performance_rows = merged_analysis.get("performance_rows", [])
    report_path = generate_performance_report(
        output_path=output_path,
        performance_rows=performance_rows,
        subject_rows=subject_rows,
    )

    # 6. Save structured student records and exam metrics to PostgreSQL Database
    db_sync_result = None
    if db is not None and school_id is not None and test_id is not None:
        report_name = os.path.basename(output_path)
        # Slices database insertion into an isolated atomic transaction.
        # This prevents duplicate students, resolves foreign keys, and logs metadata.
        db_sync_result = save_analytics_session_data(
            db=db,
            school_id=school_id,
            test_id=test_id,
            performance_rows=performance_rows,
            subject_rows=subject_rows,
            report_name=report_name,
            report_file_path=output_path,
        )

    return {
        "error_report_analysis": error_report_analysis,
        "mark_list_analysis": mark_list_analysis,
        "blueprint_analysis": blueprint_analysis,
        "merged_analysis": merged_analysis,
        "subject_summary_analysis": subject_result,
        "report_path": report_path,
        "db_sync": db_sync_result,
    }
