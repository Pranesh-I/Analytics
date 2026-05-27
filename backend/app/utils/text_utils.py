import re
from typing import List, Tuple
import pandas as pd

from app.core.constants import (
    ROLL_ALIASES,
    NAME_ALIASES,
    QUESTION_ALIASES,
    MARK_ALIASES,
)


def normalize_text(value) -> str:
    if value is None:
        return ""
    text = str(value).strip().lower()
    if text in {"nan", "none"}:
        return ""
    return re.sub(r"[^a-z0-9%]+", "", text)


def is_blank(value) -> bool:
    if value is None:
        return True
    if pd.isna(value):
        return True
    return str(value).strip() == ""


def row_values(df: pd.DataFrame, row_idx: int) -> List[str]:
    row = []
    for v in df.iloc[row_idx].tolist():
        if is_blank(v):
            row.append("")
        else:
            row.append(str(v).strip())
    return row


def forward_fill(values: List[str]) -> List[str]:
    out: List[str] = []
    last = ""
    for v in values:
        if str(v).strip():
            last = str(v).strip()
        out.append(last)
    return out


def canonical_single_header(value: str) -> str:
    n = normalize_text(value)

    if n in ROLL_ALIASES:
        return "roll_no"
    if n in NAME_ALIASES:
        return "name"

    # handle PHY/100, CHE/100, MAT/100, etc.
    if n.startswith("phy"):
        return "phy"
    if n.startswith("che") or n.startswith("chem"):
        return "che"
    if n.startswith("mat") or n.startswith("math"):
        return "mat"

    if n in QUESTION_ALIASES:
        return QUESTION_ALIASES[n]

    if n in MARK_ALIASES:
        return MARK_ALIASES[n]

    if n in {"r", "w", "b"}:
        return n

    if n in {"marks", "mark"}:
        return "marks"

    return n


def canonical_subject_group_header(top: str, bottom: str) -> str:
    t = normalize_text(top)
    b = normalize_text(bottom)

    if t in ROLL_ALIASES:
        return "roll_no"
    if t in NAME_ALIASES:
        return "name"

    subject = None
    if t.startswith("phy"):
        subject = "phy"
    elif t.startswith("che"):
        subject = "che"
    elif t.startswith("mat") or t.startswith("math"):
        subject = "mat"
    elif t.startswith("tot"):
        subject = "total"

    if subject and b in {"r", "w", "b"}:
        return f"{subject}_{b}"

    if subject and b in {"mark", "marks"}:
        return "marks" if subject == "total" else subject

    if subject:
        return subject

    if b in {"r", "w", "b"} and t:
        return f"{t}_{b}"

    if b in {"mark", "marks"}:
        return "marks"

    return canonical_single_header(t or b or "col")
