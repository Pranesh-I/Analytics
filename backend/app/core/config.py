from pathlib import Path

ALLOWED_EXTENSIONS = {"xls", "xlsx", "csv", "pdf", "doc", "docx"}
UPLOAD_DIR = Path("uploads")
# Ensure upload directory exists
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

REPORT_FILE = UPLOAD_DIR / "generated_report.xlsx"
