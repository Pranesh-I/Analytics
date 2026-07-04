from app.db.database import SessionLocal
from app.db.models import SubtopicMastery
db = SessionLocal()
nones = db.query(SubtopicMastery).filter(SubtopicMastery.accuracy == None).count()
print("ROWS WITH NULL ACCURACY:", nones)
