"""
Database package — PostgreSQL integration via SQLAlchemy ORM.

Exports:
    - database: Engine, SessionLocal, Base, get_db dependency
    - models: Student, SubjectPerformance, ExamSummary, GeneratedReport
    - schemas: Pydantic schemas for validation
    - crud: CRUD operations and analytics pipeline orchestrator
"""

from app.db.database import engine, SessionLocal, Base, get_db
from app.db import models, schemas, crud

__all__ = [
    "engine",
    "SessionLocal",
    "Base",
    "get_db",
    "models",
    "schemas",
    "crud",
]
