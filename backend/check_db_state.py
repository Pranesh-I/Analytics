from app.db.database import engine
from sqlalchemy import text

with engine.connect() as conn:
    try:
        r2 = conn.execute(text(
            "SELECT column_name, data_type "
            "FROM information_schema.columns "
            "WHERE table_name = 'analytics_results' "
            "ORDER BY ordinal_position"
        ))
        cols = r2.fetchall()
        print("analytics_results columns:")
        for c in cols:
            print(" ", c)
    except Exception as e:
        print("Error checking columns:", e)
