from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
import pandas as pd
import io

from app.db import models
from app.db.database import get_db

router = APIRouter(tags=["Blueprints"])


@router.post("/tests/{test_id}/blueprint/upload")
async def upload_blueprint(
    test_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    test = (
        db.query(models.Test)
        .filter(models.Test.id == test_id)
        .first()
    )

    if not test:
        raise HTTPException(
            status_code=404,
            detail="Test not found"
        )

    try:
        contents = await file.read()

        df = pd.read_excel(
            io.BytesIO(contents),
            engine="openpyxl"
        )

        # Delete old blueprint for this test
        old_blueprints = (
            db.query(models.TestBlueprint)
            .filter(models.TestBlueprint.test_id == test_id)
            .all()
        )

        for bp in old_blueprints:
            db.delete(bp)

        db.commit()

        # Create new blueprint
        blueprint = models.TestBlueprint(
            test_id=test_id,
            version=1,
            is_active=True
        )

        db.add(blueprint)
        db.commit()
        db.refresh(blueprint)

        # Insert questions
        for _, row in df.iterrows():

            question = models.BlueprintQuestion(
                blueprint_id=blueprint.id,

                question_no=int(row.get("Q. No.", 0)),

                subject=str(row.get("Subject", "")).strip(),
                chapter=str(row.get("Chapter", "")).strip(),
                topic=str(row.get("Topic", "")).strip(),

                subtopic=str(
                    row.get("Subtopic Name", "")
                ).strip(),

                question_type=str(
                    row.get("Question Type", "")
                ).strip(),

                marks=float(
                    row.get("Marks", 0)
                ),

                difficulty_level=str(
                    row.get("Level", "")
                ).strip(),

                difficulty_reason=str(
                    row.get("Reason for Level", "")
                ).strip(),

                issue_note=str(
                    row.get("Error/Issue if any", "")
                ).strip(),
            )

            db.add(question)

        db.commit()

        return {
            "success": True,
            "message": "Blueprint uploaded successfully",
            "blueprint_id": blueprint.id,
            "questions_saved": len(df)
        }

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=f"Blueprint processing failed: {str(e)}"
        )