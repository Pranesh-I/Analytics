import math
import os
from app.features.performance_summary.service import process_performance_summary

def find_nans(obj, path=""):
    nans = []
    if isinstance(obj, dict):
        for k, v in obj.items():
            nans.extend(find_nans(v, f"{path}.{k}" if path else k))
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            nans.extend(find_nans(v, f"{path}[{i}]"))
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            nans.append((path, obj))
    return nans

if __name__ == "__main__":
    error_path = r"c:\MEDJEE\website\Analytics\backend\uploads\test_5_error_report.xls"
    mark_path = r"c:\MEDJEE\website\Analytics\backend\uploads\test_5_mark_list.xls"
    blueprint_path = r"c:\MEDJEE\website\Analytics\backend\uploads\test_5_blueprint.xlsx"
    out_path = r"c:\MEDJEE\website\Analytics\backend\uploads\generated_report.xlsx"
    
    # We pass db=None to avoid committing to the db
    try:
        result = process_performance_summary(
            error_report_path=error_path,
            mark_list_path=mark_path,
            blueprint_path=blueprint_path,
            output_path=out_path,
            school_id=2,
            test_id=5,
            db=None
        )
        
        nans = find_nans(result)
        if not nans:
            print("No NaNs found!")
        else:
            print(f"Found {len(nans)} NaNs/Infs:")
            # Just print the first 20 to avoid huge output
            for path, val in nans[:20]:
                print(f"{path}: {val}")
                
            # Print specifically which student this corresponds to if possible
            # e.g., if path is 'subject_summary_analysis.subject_rows[10].accuracy'
            for path, val in nans[:5]:
                parts = path.split('[')
                if len(parts) > 1:
                    idx = int(parts[1].split(']')[0])
                    if parts[0] == 'subject_summary_analysis.subject_rows':
                        row = result['subject_summary_analysis']['subject_rows'][idx]
                        print(f"  -> Student Roll: {row.get('roll_no')}, Subject: {row.get('subject')}, Subtopic: {row.get('subtopic_name')}, Attempted: {row.get('attempted')}")
                    elif 'merged_analysis' in parts[0]:
                        print("  -> Merged analysis issue")
    except Exception as e:
        print("Error processing:", str(e))
