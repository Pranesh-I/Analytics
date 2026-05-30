import sys
from pathlib import Path

# Add the backend root directory to the python path
backend_dir = Path(__file__).resolve().parents[2]
if str(backend_dir) not in sys.path:
    sys.path.append(str(backend_dir))

from app.db.database import engine, Base
# Import models so that SQLAlchemy Base is aware of them before creating tables
from app.db import models  # noqa: F401


def init_database():
    """
    Initializes the database by creating all defined tables.
    Safe to run repeatedly; will not overwrite existing tables.
    """
    print("--------------------------------------------------")
    print(f"Connecting to database to initialize tables...")
    print("--------------------------------------------------")
    try:
        Base.metadata.create_all(bind=engine)
        print("SUCCESS: All PostgreSQL database tables created/verified successfully!")
        print("Tables: students, subject_performance, exam_summary, generated_reports")
        print("--------------------------------------------------")
    except Exception as error:
        print(f"ERROR: Failed to initialize PostgreSQL tables: {error}", file=sys.stderr)
        print("Please verify database credentials and ensure PostgreSQL server is active.", file=sys.stderr)
        print("--------------------------------------------------", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    init_database()
