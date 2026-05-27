from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class PerformanceRow(BaseModel):
    rank: int
    roll_no: str
    name: str
    phy: float
    che: float
    mat: float
    total: float
    percentage: float
    accuracy: float
    attempted: int
    correct: int
    wrong: int
    negative_marks: int
    risk_exp_best: str
    band: str


class FileAnalysisSummary(BaseModel):
    valid: bool
    file_type: str
    header_row: Optional[int] = None
    columns: List[str] = []
    row_count: int = 0
    preview_rows: List[Dict[str, Any]] = []


class PerformanceSummaryResponse(BaseModel):
    message: str
    files: Dict[str, Any]
    merged: Dict[str, Any]
    generated_report: Dict[str, str]
