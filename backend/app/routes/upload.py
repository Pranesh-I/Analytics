from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter(prefix="/upload", tags=["Upload"])

ALLOWED_EXTENSIONS = {"xls", "xlsx", "csv", "pdf", "doc", "docx"}


def get_extension(filename: str) -> str:
    if "." not in filename:
        return ""
    return filename.rsplit(".", 1)[-1].lower()


def validate_file(file: UploadFile):
    ext = get_extension(file.filename or "")
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type for {file.filename}. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )


@router.post("/files")
async def upload_files(
    error_report: UploadFile = File(...),
    mark_list: UploadFile = File(...),
    blueprint: UploadFile = File(...),
):
    validate_file(error_report)
    validate_file(mark_list)
    validate_file(blueprint)

    return {
        "message": "Files received successfully",
        "files": {
            "errorReport": {
                "filename": error_report.filename,
                "content_type": error_report.content_type,
            },
            "markList": {
                "filename": mark_list.filename,
                "content_type": mark_list.content_type,
            },
            "blueprint": {
                "filename": blueprint.filename,
                "content_type": blueprint.content_type,
            },
        },
    }