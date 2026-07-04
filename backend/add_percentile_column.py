"""
Direct SQL migration: adds estimated_percentile column to analytics_results
and backfills existing rows by computing the interpolated percentile from total_score.
"""
from app.db.database import engine
from app.utils.percentile_utils import get_estimated_percentile
from sqlalchemy import text

with engine.connect() as conn:
    # 1. Add the column if it doesn't exist yet
    try:
        conn.execute(text(
            "ALTER TABLE analytics_results "
            "ADD COLUMN estimated_percentile DOUBLE PRECISION DEFAULT 0.0"
        ))
        conn.execute(text("COMMIT"))
        print("Column 'estimated_percentile' added successfully.")
    except Exception as e:
        conn.execute(text("ROLLBACK"))
        err_str = str(e)
        if "already exists" in err_str.lower() or "duplicate column" in err_str.lower():
            print("Column 'estimated_percentile' already exists — skipping ADD.")
        else:
            raise

    # 2. Backfill: read total_score for each row and compute estimated_percentile
    rows = conn.execute(text(
        "SELECT id, total_score FROM analytics_results WHERE estimated_percentile IS NULL OR estimated_percentile = 0.0"
    )).fetchall()

    print(f"Backfilling {len(rows)} rows...")
    for row_id, total_score in rows:
        pct = get_estimated_percentile(total_score or 0.0)
        conn.execute(
            text("UPDATE analytics_results SET estimated_percentile = :pct WHERE id = :id"),
            {"pct": pct, "id": row_id}
        )

    conn.execute(text("COMMIT"))
    print(f"Backfill complete. {len(rows)} rows updated.")

    # 3. Verify
    sample = conn.execute(text(
        "SELECT id, total_score, estimated_percentile FROM analytics_results ORDER BY id LIMIT 5"
    )).fetchall()
    print("\nSample rows after backfill:")
    print(f"  {'id':>6}  {'total_score':>12}  {'est_percentile':>14}")
    for r in sample:
        print(f"  {r[0]:>6}  {str(r[1]):>12}  {str(r[2]):>14}")

print("\nDone.")
