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
from app.features.performance_summary.subtopic_engine import compute_subtopic_performance
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

    # ----------------------------------------------------
    # 1. Read files
    # ----------------------------------------------------
    error_report_data = read_uploaded_file(error_report_path)
    mark_list_data = read_uploaded_file(mark_list_path)
    blueprint_data = read_uploaded_file(blueprint_path)

    # ----------------------------------------------------
    # 2. Parse & Analyze
    # ----------------------------------------------------
    error_df, error_report_analysis = analyze_error_report(error_report_data)

    print("\n===== ERROR DF =====")
    print("Columns:")
    print(error_df.columns.tolist())
    print("\nSample Data:")
    print(error_df.head(10))
    print("====================\n")

    mark_df, mark_list_analysis = analyze_mark_list(mark_list_data)

    print("\n===== MARK DF =====")
    print("Columns:")
    print(mark_df.columns.tolist())
    print("\nSample Data:")
    print(mark_df.head(10))
    print("====================\n")

    blueprint_df, blueprint_analysis = analyze_blueprint(blueprint_data)

    print("\n===== BLUEPRINT DF =====")
    print("Columns:")
    print(blueprint_df.columns.tolist())
    print("\nSample Data:")
    print(blueprint_df.head())
    print("========================\n")

    # ----------------------------------------------------
    # 3. Merge error report and mark list
    # ----------------------------------------------------
    print("\nSTEP 1")

    merged_analysis = merge_error_and_mark_list(
        error_df,
        mark_df
    )

    print("STEP 1 DONE")

    # ----------------------------------------------------
    # 3.5. Subtopic Mastery Engine
    # ----------------------------------------------------
    print("\nSTEP 1.5 - Subtopic Mastery")
    
    subtopic_mastery_rows = compute_subtopic_performance(error_df, blueprint_df)
    
    print("STEP 1.5 DONE")

    # ----------------------------------------------------
    # 4. Subject Summary
    # ----------------------------------------------------
    print("\nSTEP 2")

    subject_result = process_subject_summary(
        error_report_path=error_report_path,
        mark_list_path=mark_list_path,
        blueprint_path=blueprint_path,
    )

    print("STEP 2 DONE")

    subject_rows = subject_result.get("subject_rows", [])

    # ----------------------------------------------------
    # 5. Generate Excel Report
    # ----------------------------------------------------
    performance_rows = merged_analysis.get(
        "performance_rows",
        []
    )

    print("\nSTEP 3")

    report_path = generate_performance_report(
        output_path=output_path,
        performance_rows=performance_rows,
        subject_rows=subject_rows,
    )

    print("STEP 3 DONE")

    # ----------------------------------------------------
    # 6. Save Analytics To PostgreSQL
    # ----------------------------------------------------
    db_sync_result = None

    if (
        db is not None
        and school_id is not None
        and test_id is not None
    ):

        report_name = os.path.basename(output_path)

        print("\nSTEP 4")

        db_sync_result = save_analytics_session_data(
            db=db,
            school_id=school_id,
            test_id=test_id,
            performance_rows=performance_rows,
            subject_rows=subject_rows,
            subtopic_mastery_rows=subtopic_mastery_rows,
            report_name=report_name,
            report_file_path=output_path,
        )

        print("STEP 4 DONE")

    return {
        "error_report_analysis": error_report_analysis,
        "mark_list_analysis": mark_list_analysis,
        "blueprint_analysis": blueprint_analysis,
        "merged_analysis": merged_analysis,
        "subject_summary_analysis": subject_result,
        "report_path": report_path,
        "db_sync": db_sync_result,
    }