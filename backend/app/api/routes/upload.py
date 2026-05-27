from pathlib import Path
import shutil

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.core.config import ALLOWED_EXTENSIONS, UPLOAD_DIR, REPORT_FILE
from app.features.performance_summary.service import process_performance_summary
from app.utils.json_utils import sanitize_json

router = APIRouter(prefix="/upload", tags=["Upload"])


def get_extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return filename.rsplit(".", 1)[-1].lower()


def validate_file(file: UploadFile):
    ext = get_extension(file.filename or "")
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type for {file.filename}. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )


async def save_file(file: UploadFile, prefix: str) -> str:
    ext = get_extension(file.filename or "")
    safe_name = f"{prefix}.{ext}"
    file_path = UPLOAD_DIR / safe_name

    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return str(file_path)


@router.post("/files")
async def upload_files(
    error_report: UploadFile = File(...),
    mark_list: UploadFile = File(...),
    blueprint: UploadFile = File(...),
):
    validate_file(error_report)
    validate_file(mark_list)
    validate_file(blueprint)

    error_report_path = await save_file(error_report, "error_report")
    mark_list_path = await save_file(mark_list, "mark_list")
    blueprint_path = await save_file(blueprint, "blueprint")

    # Run the performance summary orchestration pipeline
    result = process_performance_summary(
        error_report_path=error_report_path,
        mark_list_path=mark_list_path,
        blueprint_path=blueprint_path,
        output_path=str(REPORT_FILE),
    )

    response = {
        "message": "Files received, saved, parsed, and report generated successfully",
        "files": {
            "errorReport": {
                "filename": error_report.filename,
                "saved_path": error_report_path,
                "content_type": error_report.content_type,
                "analysis": result["error_report_analysis"],
            },
            "markList": {
                "filename": mark_list.filename,
                "saved_path": mark_list_path,
                "content_type": mark_list.content_type,
                "analysis": result["mark_list_analysis"],
            },
            "blueprint": {
                "filename": blueprint.filename,
                "saved_path": blueprint_path,
                "content_type": blueprint.content_type,
                "analysis": result["blueprint_analysis"],
            },
        },
        "merged": result["merged_analysis"],
        "generated_report": {
            "filename": REPORT_FILE.name,
            "saved_path": result["report_path"],
        },
    }

    return sanitize_json(response)


@router.get("/download-report")
def download_report():
    if not REPORT_FILE.exists():
        raise HTTPException(status_code=404, detail="Report not found. Upload files first.")
    return FileResponse(
        path=str(REPORT_FILE),
        filename=REPORT_FILE.name,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
