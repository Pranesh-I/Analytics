from app.db.database import SessionLocal
from app.db import models

db = SessionLocal()
try:
    uploads = db.query(models.Upload).filter(models.Upload.test_id == 1).all()
    print("Uploads for test 1:")
    for u in uploads:
        print(f"ID={u.id}, type={u.file_type}, name={u.file_name}, path={u.file_path}")
finally:
    db.close()
