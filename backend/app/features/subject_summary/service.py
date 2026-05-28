from __future__ import annotations

import re
from collections import Counter
from typing import Any, Dict, List, Tuple

import pandas as pd

from app.features.performance_summary.reader import read_uploaded_file
from app.features.performance_summary.parser import analyze_error_report, analyze_mark_list
from app.features.subject_summary.report import write_subject_summary_sheet


SUBJECTS = ["Physics", "Chemistry", "Mathematics"]
SUBJECT_PREFIX = {
    "Physics": "phy",
    "Chemistry": "che",
    "Mathematics": "mat",
}


def _to_num(value: Any) -> float:
    try:
        if pd.isna(value):
            return 0.0
    except Exception:
        pass
    try:
        return float(value)
    except Exception:
        return 0.0


def _clean_roll(value: Any) -> str:
    if value is None:
        return ""
    text = str(value).strip()
    if text.lower() in {"nan", "none", ""}:
        return ""
    if text.endswith(".0"):
        text = text[:-2]
    return text


def _count_items(value: Any) -> int:
    if value is None:
        return 0
    try:
        if pd.isna(value):
            return 0
    except Exception:
        pass

    text = str(value).strip()
    if not text or text.lower() in {"nan", "none"}:
        return 0

    parts = [p.strip() for p in re.split(r"[,\n;|]+", text) if p.strip()]
    return len(parts)


def _first_existing(df: pd.DataFrame, candidates: List[str]) -> str | None:
    lower_map = {str(c).strip().lower(): c for c in df.columns}
    for cand in candidates:
        if cand.lower() in lower_map:
            return lower_map[cand.lower()]
    return None


def _normalize_subject(raw: str) -> str | None:
    s = str(raw).strip().lower()
    if s.startswith("phys"):
        return "Physics"
    if s.startswith("chem"):
        return "Chemistry"
    if s.startswith("math"):
        return "Mathematics"
    return None


def extract_blueprint_subject_counts(blueprint_data: Dict[str, Any]) -> Tuple[Dict[str, int], Dict[str, Any]]:
    counts = Counter()
    q_to_subject: Dict[int, str] = {}

    if blueprint_data.get("type") != "pdf":
        return {"Physics": 0, "Chemistry": 0, "Mathematics": 0}, {
            "valid": False,
            "message": "Blueprint is not a PDF.",
            "question_count": 0,
            "subject_counts": {"Physics": 0, "Chemistry": 0, "Mathematics": 0},
        }

    for page in blueprint_data.get("pages", []):
        text = page.get("text") or ""
        if not text.strip():
            continue

        for m in re.finditer(
            r"\b(\d{1,3})\s+(Physics|Chemistry|Maths?|Mathematics)\b",
            text,
            flags=re.IGNORECASE,
        ):
            qno = int(m.group(1))
            subject = _normalize_subject(m.group(2))
            if subject:
                q_to_subject[qno] = subject

    for subject in q_to_subject.values():
        counts[subject] += 1

    subject_counts = {
        "Physics": int(counts.get("Physics", 0)),
        "Chemistry": int(counts.get("Chemistry", 0)),
        "Mathematics": int(counts.get("Mathematics", 0)),
    }

    return subject_counts, {
        "valid": True,
        "question_count": int(len(q_to_subject)),
        "subject_counts": subject_counts,
        "sample_question_map": dict(sorted(list(q_to_subject.items()))[:10]),
    }


def _merge_subject_sources(error_df: pd.DataFrame, mark_df: pd.DataFrame) -> pd.DataFrame:
    if error_df.empty or mark_df.empty:
        return pd.DataFrame()

    err = error_df.copy()
    mk = mark_df.copy()

    if "roll_no" not in err.columns or "roll_no" not in mk.columns:
        return pd.DataFrame()

    err["roll_no"] = err["roll_no"].apply(_clean_roll)
    mk["roll_no"] = mk["roll_no"].apply(_clean_roll)

    if "name" in err.columns:
        err["name"] = err["name"].astype(str).str.strip()
    if "name" in mk.columns:
        mk["name"] = mk["name"].astype(str).str.strip()

    phy_col = _first_existing(mk, ["phy", "phy_marks", "physics", "physics_marks"])
    che_col = _first_existing(mk, ["che", "che_marks", "chem", "chem_marks", "chemistry", "chemistry_marks"])
    mat_col = _first_existing(mk, ["mat", "mat_marks", "maths", "maths_marks", "math", "math_marks"])
    total_col = _first_existing(mk, ["total"])
    rank_col = _first_existing(mk, ["rank"])
    pct_col = _first_existing(mk, ["percentage"])

    merged = pd.merge(err, mk, on="roll_no", how="inner", suffixes=("_err", "_mark"))

    if "name_mark" in merged.columns and "name_err" in merged.columns:
        merged["name"] = merged["name_mark"].fillna(merged["name_err"])
    elif "name_mark" in merged.columns:
        merged["name"] = merged["name_mark"]
    elif "name_err" in merged.columns:
        merged["name"] = merged["name_err"]
    elif "name" not in merged.columns:
        merged["name"] = ""

    merged["phy"] = _to_num(merged[phy_col]) if phy_col and phy_col in merged.columns else 0
    merged["che"] = _to_num(merged[che_col]) if che_col and che_col in merged.columns else 0
    merged["mat"] = _to_num(merged[mat_col]) if mat_col and mat_col in merged.columns else 0

    if total_col and total_col in merged.columns:
        merged["total"] = _to_num(merged[total_col])
    else:
        merged["total"] = merged["phy"] + merged["che"] + merged["mat"]

    if pct_col and pct_col in merged.columns:
        merged["percentage"] = _to_num(merged[pct_col])
    else:
        merged["percentage"] = (merged["total"] / 300.0) * 100.0

    if rank_col and rank_col in merged.columns:
        merged["rank"] = pd.to_numeric(merged[rank_col], errors="coerce").fillna(0).astype(int)
    else:
        merged["rank"] = merged["total"].rank(method="dense", ascending=False).astype(int)

    for prefix in ["phy", "che", "mat"]:
        for suffix in ["r", "w", "b"]:
            col = f"{prefix}_{suffix}"
            if col not in merged.columns:
                merged[col] = ""

    return merged.reset_index(drop=True)


def _risk_level(neg_marks: int) -> str:
    if neg_marks >= 13:
        return "Critical"
    if neg_marks >= 8:
        return "High"
    if neg_marks >= 4:
        return "Moderate"
    return "Low"


def _remarks(acc: float, marks: float, neg_marks: int) -> str:
    if neg_marks >= 13:
        return f"High Neg ({neg_marks})"
    if acc >= 80 and marks >= 50 and neg_marks <= 5:
        return "Excellent"
    if acc >= 70 and marks >= 35:
        return "Good"
    if acc >= 50:
        return "Average"
    return "Needs Improvement"


def build_subjectwise_rows(merged: pd.DataFrame, blueprint_counts: Dict[str, int]) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []

    if merged.empty:
        return rows

    for _, r in merged.iterrows():
        rank = int(_to_num(r.get("rank", 0)))
        roll = _clean_roll(r.get("roll_no", ""))
        name = str(r.get("name", "")).strip()

        for subject in SUBJECTS:
            prefix = SUBJECT_PREFIX[subject]

            correct = _count_items(r.get(f"{prefix}_r"))
            wrong = _count_items(r.get(f"{prefix}_w"))
            blank_from_file = _count_items(r.get(f"{prefix}_b"))
            attempted = correct + wrong

            total_questions = int(blueprint_counts.get(subject, 0))
            if blank_from_file > 0:
                unattempted = blank_from_file
            elif total_questions > 0:
                unattempted = max(total_questions - attempted, 0)
            else:
                unattempted = 0

            marks = round(_to_num(r.get(prefix, 0)), 0)
            accuracy = round((correct / attempted) * 100.0, 1) if attempted else 0.0
            neg_marks = int(wrong)

            rows.append(
                {
                    "rank": rank,
                    "roll_no": roll,
                    "name": name,
                    "subject": subject,
                    "attempted": int(attempted),
                    "correct": int(correct),
                    "wrong": int(wrong),
                    "unattempted": int(unattempted),
                    "marks": int(marks) if float(marks).is_integer() else round(marks, 1),
                    "accuracy": accuracy,
                    "negative_marks": neg_marks,
                    "risk_level": _risk_level(neg_marks),
                    "remarks": _remarks(accuracy, marks, neg_marks),
                }
            )

    subject_order = {s: i for i, s in enumerate(SUBJECTS)}
    rows.sort(key=lambda x: (x["rank"], x["roll_no"], subject_order.get(x["subject"], 99)))
    return rows


def process_subject_summary(
    error_report_path: str,
    mark_list_path: str,
    blueprint_path: str,
) -> Dict[str, Any]:
    error_report_data = read_uploaded_file(error_report_path)
    mark_list_data = read_uploaded_file(mark_list_path)
    blueprint_data = read_uploaded_file(blueprint_path)

    error_df, error_analysis = analyze_error_report(error_report_data)
    mark_df, mark_analysis = analyze_mark_list(mark_list_data)
    blueprint_counts, blueprint_analysis = extract_blueprint_subject_counts(blueprint_data)

    merged_df = _merge_subject_sources(error_df, mark_df)
    subject_rows = build_subjectwise_rows(merged_df, blueprint_counts)

    return {
        "error_report_analysis": error_analysis,
        "mark_list_analysis": mark_analysis,
        "blueprint_analysis": blueprint_analysis,
        "merged_row_count": int(len(merged_df)),
        "subject_row_count": int(len(subject_rows)),
        "subject_rows": subject_rows,
    }