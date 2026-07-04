import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.upload import router as upload_router
from app.api.routes.schools import router as schools_router
from app.api.routes.students import router as students_router
from app.api.routes.tests import router as tests_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.comparison import router as comparison_router
from app.db.database import engine, Base
from app.db import models  # noqa: F401 — registers models with Base.metadata

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="School Analytics API")
app.include_router(upload_router, prefix="/api")
app.include_router(upload_router)
app.include_router(schools_router, prefix="/api")
app.include_router(students_router, prefix="/api")
app.include_router(students_router)  # Double-mounted to support direct /schools paths
app.include_router(tests_router, prefix="/api")
app.include_router(analytics_router, prefix="/api")
app.include_router(comparison_router, prefix="/api")
app.include_router(comparison_router)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    """
    Create all database tables on application startup.
    Safe to call repeatedly — will not overwrite existing tables.
    """
    logger.info("Initializing PostgreSQL database tables...")
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("PostgreSQL tables verified: students, subject_performance, exam_summary, generated_reports")
    except Exception as exc:
        logger.error(f"Failed to initialize database tables: {exc}")
        logger.warning("Application will continue but database operations may fail.")


@app.get("/")
def root():
    return {"message": "School Analytics API is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/db-health")
def db_health_check():
    """Check PostgreSQL database connectivity."""
    from sqlalchemy import text
    from app.db.database import SessionLocal
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "connected", "database": "analytics_db"}
    except Exception as exc:
        return {"status": "disconnected", "error": str(exc)}