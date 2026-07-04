from typing import Any, Dict
import re

import pandas as pd

from app.core.constants import BAND_RANGES


def _to_num(series) -> pd.Series:
    return pd.to_numeric(series, errors="coerce").fillna(0)


def _clean_roll(series) -> pd.Series:
    return series.astype(str).str.strip()


def band_from_percentage(pct: float) -> str:
    if pct >= 65:
        return "Elite"
    if pct >= 40:
        return "Strong"
    if pct >= 25:
        return "Average"
    if pct >= 18:
        return "Below Average"
    return "Weak"


def _first_existing(df: pd.DataFrame, candidates: list[str]) -> str | None:
    for c in candidates:
        if c in df.columns:
            return c
    return None


def count_comma_separated_items(value) -> int:
    """
    Counts items in values like:
    '1,22,44,66' -> 4
    '1, 2, 3'    -> 3
    '' / None    -> 0
    """
    if value is None or pd.isna(value):
        return 0

    text = str(value).strip()
    if not text or text.lower() in {"nan", "none"}:
        return 0

    parts = [p.strip() for p in re.split(r"[,\n;|]+", text) if p.strip()]
    return len(parts)


def merge_error_and_mark_list(error_df: pd.DataFrame, mark_df: pd.DataFrame) -> Dict[str, Any]:
    """
    error_df = subject-wise / response summary
    mark_df  = student detail
    """
    if error_df.empty or mark_df.empty:
        return {
            "valid": False,
            "message": "Both subject-wise and student-detail files are required.",
            "merged_row_count": 0,
            "performance_rows": [],
            "preview_rows": [],
        }

    err = error_df.copy()
    mk = mark_df.copy()

    if "roll_no" not in err.columns or "roll_no" not in mk.columns:
        return {
            "valid": False,
            "message": "roll_no column not found in one or both files.",
            "merged_row_count": 0,
            "performance_rows": [],
            "preview_rows": [],
        }

    err["roll_no"] = _clean_roll(err["roll_no"])
    mk["roll_no"] = _clean_roll(mk["roll_no"])

    if "name" in err.columns:
        err["name"] = err["name"].astype(str).str.strip()
    if "name" in mk.columns:
        mk["name"] = mk["name"].astype(str).str.strip()

    phy_col = _first_existing(mk, ["phy", "phy_marks", "physics", "physics_marks"])
    che_col = _first_existing(mk, ["che", "che_marks", "chem", "chem_marks", "chemistry", "chemistry_marks"])
    mat_col = _first_existing(mk, ["mat", "mat_marks", "maths", "maths_marks", "math", "math_marks"])
    total_col = _first_existing(mk, ["total"])
    pct_col = _first_existing(mk, ["percentage"])
    rank_col = _first_existing(mk, ["rank"])

    # Ensure these columns exist in error report
    for c in [
        "total_r", "total_w", "total_b",
        "phy_r", "phy_w", "phy_b",
        "che_r", "che_w", "che_b",
        "mat_r", "mat_w", "mat_b",
        "marks",
    ]:
        if c not in err.columns:
            err[c] = ""

    # Compute student marks if missing
    if total_col is None and phy_col and che_col and mat_col:
        mk["total"] = _to_num(mk[phy_col]) + _to_num(mk[che_col]) + _to_num(mk[mat_col])
        total_col = "total"

    if pct_col is None and total_col:
        mk["percentage"] = (_to_num(mk[total_col]) / 300.0) * 100.0
        pct_col = "percentage"

    if rank_col is None and total_col:
        mk["rank"] = _to_num(mk[total_col]).rank(method="dense", ascending=False).astype(int)
        rank_col = "rank"

    merged = pd.merge(
        err,
        mk,
        on="roll_no",
        how="inner",
        suffixes=("_err", "_mark"),
    )

    # Choose display name
    if "name_mark" in merged.columns and "name_err" in merged.columns:
        merged["name"] = merged["name_mark"].fillna(merged["name_err"])
    elif "name_mark" in merged.columns:
        merged["name"] = merged["name_mark"]
    elif "name_err" in merged.columns:
        merged["name"] = merged["name_err"]

    # Marks from student-detail file
    merged["phy"] = _to_num(merged[phy_col]) if phy_col else 0
    merged["che"] = _to_num(merged[che_col]) if che_col else 0
    merged["mat"] = _to_num(merged[mat_col]) if mat_col else 0

    if total_col and total_col in merged.columns:
        merged["total"] = _to_num(merged[total_col])
    else:
        merged["total"] = merged["phy"] + merged["che"] + merged["mat"]

    if pct_col and pct_col in merged.columns:
        merged["percentage"] = _to_num(merged[pct_col])
    else:
        merged["percentage"] = (merged["total"] / 300.0) * 100.0

    # IMPORTANT:
    # total_r / total_w are comma-separated question lists.
    # Count items, do not convert to numeric.
    merged["correct"] = merged["total_r"].apply(count_comma_separated_items)
    merged["wrong"] = merged["total_w"].apply(count_comma_separated_items)
    merged["attempted"] = merged["correct"] + merged["wrong"]
    merged["negative_marks"] = merged["wrong"]

    merged["accuracy"] = merged.apply(
        lambda r: round((r["correct"] / r["attempted"]) * 100, 1) if r["attempted"] else None,
        axis=1,
    )

    merged["band"] = merged["percentage"].apply(band_from_percentage)
    merged["risk_exp_best"] = merged["band"].map(BAND_RANGES)

    if rank_col and rank_col in merged.columns:
        merged["rank"] = _to_num(merged[rank_col]).astype(int)
    else:
        merged["rank"] = merged["total"].rank(method="dense", ascending=False).astype(int)

    merged = merged.sort_values(["rank", "roll_no"], ascending=[True, True]).reset_index(drop=True)

    performance_rows = merged[
        [
            "rank",
            "roll_no",
            "name",
            "phy",
            "che",
            "mat",
            "total",
            "percentage",
            "accuracy",
            "attempted",
            "correct",
            "wrong",
            "negative_marks",
            "risk_exp_best",
            "band",
        ]
    ].to_dict(orient="records")

    preview_rows = performance_rows[:10]

    batch_avg = {
        "phy": round(float(merged["phy"].mean()), 1) if len(merged) else 0,
        "che": round(float(merged["che"].mean()), 1) if len(merged) else 0,
        "mat": round(float(merged["mat"].mean()), 1) if len(merged) else 0,
        "total": round(float(merged["total"].mean()), 1) if len(merged) else 0,
        "percentage": round(float(merged["percentage"].mean()), 1) if len(merged) else 0,
        "accuracy": round(float(merged["accuracy"].mean()), 1) if len(merged) else 0,
        "attempted": round(float(merged["attempted"].mean()), 1) if len(merged) else 0,
        "correct": round(float(merged["correct"].mean()), 1) if len(merged) else 0,
        "wrong": round(float(merged["wrong"].mean()), 1) if len(merged) else 0,
    }

    return {
        "valid": True,
        "merged_row_count": int(len(merged)),
        "batch_average": batch_avg,
        "performance_rows": performance_rows,
        "preview_rows": preview_rows,
    }


def build_subtopic_mastery(error_df: pd.DataFrame, blueprint_df: pd.DataFrame) -> list:
    subtopic_rows = []
    
    if blueprint_df.empty or error_df.empty:
        return subtopic_rows
        
    bp_lookup = {}
    for _, row in blueprint_df.iterrows():
        subj = str(row.get("subject", "")).lower().strip()
        if "phy" in subj: subj = "phy"
        elif "che" in subj: subj = "che"
        elif "mat" in subj: subj = "mat"
        else: continue
        
        qno = str(row.get("q_no", row.get("qno", ""))).strip()
        # Some Q.No might be floats like 1.0 from pandas
        if qno.endswith(".0"):
            qno = qno[:-2]
            
        subtopic = str(row.get("subtopicname", row.get("subtopic", ""))).strip()
        if qno and subtopic:
            if subj not in bp_lookup:
                bp_lookup[subj] = {}
            bp_lookup[subj][qno] = subtopic

    for _, row in error_df.iterrows():
        roll_no = str(row.get("roll_no", "")).strip()
        # In Pandas, empty roll_no might be nan
        if not roll_no or roll_no.lower() == "nan":
            continue
            
        for subj in ["phy", "che", "mat"]:
            if subj not in bp_lookup:
                continue
                
            student_subtopics = {}
            for subtopic in set(bp_lookup[subj].values()):
                student_subtopics[subtopic] = {"correct": 0, "wrong": 0}
            
            r_str = str(row.get(f"{subj}_r", ""))
            w_str = str(row.get(f"{subj}_w", ""))
            if r_str.lower() == "nan": r_str = ""
            if w_str.lower() == "nan": w_str = ""
            
            def parse_qnos(s):
                return [x.strip() for x in s.split(",") if x.strip()]
                
            for qno in parse_qnos(r_str):
                if qno.endswith(".0"): qno = qno[:-2]
                st = bp_lookup[subj].get(qno)
                if st:
                    student_subtopics[st]["correct"] += 1
                    
            for qno in parse_qnos(w_str):
                if qno.endswith(".0"): qno = qno[:-2]
                st = bp_lookup[subj].get(qno)
                if st:
                    student_subtopics[st]["wrong"] += 1
                    
            # Calculate blueprint totals for this subject
            bp_totals = {}
            for qno, subtopic in bp_lookup[subj].items():
                bp_totals[subtopic] = bp_totals.get(subtopic, 0) + 1

            for st, counts in student_subtopics.items():
                c = counts["correct"]
                attempted_w = counts["wrong"]
                tot = bp_totals.get(st, 0)
                attempted = c + attempted_w
                unatt = max(0, tot - attempted)
                w = attempted_w + unatt
                acc = round((c / tot) * 100.0, 2) if tot > 0 else None
                
                subtopic_rows.append({
                    "roll_no": roll_no,
                    "subject": "Physics" if subj == "phy" else ("Chemistry" if subj == "che" else "Maths"),
                    "subtopic_name": st,
                    "correct": c,
                    "wrong": w,
                    "attempted": attempted,
                    "accuracy": acc
                })
                
    return subtopic_rows
