from pathlib import Path
from typing import Any, Dict, List

from openpyxl import Workbook

from app.utils.excel_utils import write_standard_sheet


def generate_performance_report(
    output_path: str,
    performance_rows: List[Dict[str, Any]],
) -> str:
    wb = Workbook()

    # Remove default sheet
    wb.remove(wb.active)

    # Performance Summary sheet
    ws = wb.create_sheet("Performance Summary")
    perf_headers = [
        "Rank", "Roll", "Student Name", "PHY/100", "CHE/100", "MAT/100",
        "Total/300", "%", "Accuracy %", "Attempted", "Correct", "Wrong",
        "Neg.Mark", "Perc.(Risk|Exp|Best)", "Band"
    ]

    perf_rows = [
        [
            r.get("rank", ""),
            r.get("roll_no", ""),
            r.get("name", ""),
            r.get("phy", ""),
            r.get("che", ""),
            r.get("mat", ""),
            r.get("total", ""),
            r.get("percentage", ""),
            r.get("accuracy", ""),
            r.get("attempted", ""),
            r.get("correct", ""),
            r.get("wrong", ""),
            r.get("negative_marks", ""),
            r.get("risk_exp_best", ""),
            r.get("band", ""),
        ]
        for r in performance_rows
    ]
    write_standard_sheet(ws, "PERFORMANCE SUMMARY", perf_headers, perf_rows)

    out = Path(output_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    wb.save(out)
    return str(out)
