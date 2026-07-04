from typing import Dict, List, Tuple
import pandas as pd

from app.utils.text_utils import (
    normalize_text,
    is_blank,
    row_values,
    forward_fill,
    canonical_single_header,
    canonical_subject_group_header,
)


def get_best_dataframe_from_uploaded_data(uploaded_data):
    if uploaded_data["type"] in {"excel", "csv"}:
        sheets = uploaded_data["sheets"]

        best_df = None
        best_score = -1

        for sheet_name, df in sheets.items():
            if df is None or df.empty:
                continue

            # score based on non-empty cells
            score = int(df.notna().sum().sum())

            if score > best_score:
                best_score = score
                best_df = df

        return best_df

    return None


def preview_records(df: pd.DataFrame, limit: int = 5) -> List[Dict[str, object]]:
    preview_df = df.head(limit)
    # Replace any NaN/pd.NA values with None for safe JSON serialization
    preview_df = preview_df.where(pd.notnull(preview_df), None)
    return preview_df.to_dict(orient="records")


def _build_analysis(df: pd.DataFrame, header_row: int, file_type: str) -> Dict:
    return {
        "valid": True,
        "file_type": file_type,
        "header_row": header_row + 1,  # human-friendly row number
        "columns": list(df.columns),
        "row_count": int(len(df)),
        "preview_rows": preview_records(df, 5),
    }


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    # Remove fully empty rows
    df = df.dropna(how="all")

    # Remove fully empty columns
    df = df.dropna(axis=1, how="all")

    # Remove unnamed/junk columns
    valid_cols = []

    for col in df.columns:
        c = str(col).strip().lower()

        if c.startswith("unnamed"):
            continue

        if c in {"", "nan", "none"}:
            continue

        valid_cols.append(col)

    df = df[valid_cols]

    # Reset index
    df = df.reset_index(drop=True)

    return df


def normalize_numeric_columns(df: pd.DataFrame, columns: List[str]) -> pd.DataFrame:
    df = df.copy()
    for col in columns:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")
    return df


def _score_row(row: List[str], keywords: set[str]) -> int:
    tokens = {normalize_text(v) for v in row if not is_blank(v)}
    return len(tokens.intersection(keywords))


def find_single_header_row(df: pd.DataFrame, keywords: set[str], search_rows: int = 10) -> int:
    best_idx = 0
    best_score = -1
    limit = min(len(df), search_rows)

    for i in range(limit):
        row = row_values(df, i)
        score = _score_row(row, keywords)
        if score > best_score:
            best_score = score
            best_idx = i

    return best_idx


def find_two_row_header(df: pd.DataFrame, top_keywords: set[str], bottom_keywords: set[str], search_rows: int = 10) -> Tuple[int, int]:
    limit = min(len(df) - 1, search_rows)
    best_pair = (0, 1)
    best_score = -1

    for i in range(limit):
        top = row_values(df, i)
        bottom = row_values(df, i + 1)
        score = _score_row(top, top_keywords) + _score_row(bottom, bottom_keywords)

        if score > best_score:
            best_score = score
            best_pair = (i, i + 1)

    return best_pair


def parse_subject_summary_sheet(df_raw: pd.DataFrame) -> Tuple[pd.DataFrame, int]:
    """
    Subject-wise / response summary table:
    Roll No, Name, PHY/CHE/MAT with R/W/B and Total.
    """
    top_keywords = {"rollno", "rollnumber", "roll", "name", "phy", "physics", "che", "chemistry", "mat", "maths", "total"}
    bottom_keywords = {"r", "w", "b", "marks"}

    hdr1, hdr2 = find_two_row_header(df_raw, top_keywords, bottom_keywords)

    top_row = forward_fill(
        [str(v).strip() if v is not None else "" for v in row_values(df_raw, hdr1)]
    )
    bottom_row = row_values(df_raw, hdr2)

    headers = []
    for top, bottom in zip(top_row, bottom_row):
        headers.append(canonical_subject_group_header(top, bottom))

    data = df_raw.iloc[hdr2 + 1 :].copy()
    data = data.iloc[:, : len(headers)]
    data.columns = headers
    data = clean_dataframe(data)

    # Remove rows where roll_no and name are both empty
    if "roll_no" in data.columns and "name" in data.columns:
        data = data[
            ~(
                data["roll_no"].isna()
                & data["name"].isna()
            )
        ]

    data = data.reset_index(drop=True)

    # Remove fully blank rows again after columns are assigned
    data = data.dropna(how="all").reset_index(drop=True)

    numeric_cols = [c for c in data.columns if c in {"roll_no", "marks"}]
    data = normalize_numeric_columns(data, numeric_cols)

    return data, hdr2


def parse_student_detail_sheet(df_raw: pd.DataFrame) -> Tuple[pd.DataFrame, int]:
    """
    Student detail table:
    Roll No, Name, PHY/100, CHE/100, MAT/100, Total, %, Rank
    """
    keywords = {
        "rollno", "rollnumber", "roll", "name",
        "phy", "physics",
        "che", "chemistry",
        "mat", "maths",
        "total", "percent", "%", "rank"
    }

    df_raw = clean_dataframe(df_raw)

    hdr = find_single_header_row(df_raw, keywords)

    headers = [canonical_single_header(v) for v in row_values(df_raw, hdr)]

    data = df_raw.iloc[hdr + 1:].copy()
    data = data.iloc[:, :len(headers)]
    data.columns = headers
    data = clean_dataframe(data)

    # Remove rows where all cells are empty
    data = data.dropna(how="all").reset_index(drop=True)

    # Keep only rows that look like real student rows
    if "roll_no" in data.columns:
        data["roll_no"] = data["roll_no"].astype(str).str.strip()
        data = data[data["roll_no"].notna()]
        data = data[data["roll_no"] != ""]
        data = data[data["roll_no"].str.lower() != "nan"]

    # Remove junk rows where name is missing too
    if "name" in data.columns:
        data["name"] = data["name"].astype(str).str.strip()
        data = data[~((data["roll_no"] == "") & (data["name"] == ""))]

    numeric_cols = [c for c in data.columns if c in {"phy", "che", "mat", "total", "percentage", "rank"}]
    data = normalize_numeric_columns(data, numeric_cols)

    data = data.reset_index(drop=True)
    return data, hdr


def parse_question_analysis_sheet(df_raw: pd.DataFrame) -> Tuple[pd.DataFrame, int]:
    """
    Question analysis table:
    Q.No, Subject, Chapter, Subtopic, Question Type, Skill focus, Difficulty
    """
    keywords = {"qno", "questionno", "questionnumber", "subject", "chapter", "topic", "subtopic", "questiontype", "skillfocus", "difficulty"}
    hdr = find_single_header_row(df_raw, keywords)

    headers = [canonical_single_header(v) for v in row_values(df_raw, hdr)]
    data = df_raw.iloc[hdr + 1 :].copy()
    data = data.iloc[:, : len(headers)]
    data.columns = headers
    data = clean_dataframe(data).dropna(how="all").reset_index(drop=True)

    return data, hdr


def analyze_error_report(uploaded_data) -> Tuple[pd.DataFrame, Dict]:
    df_raw = get_best_dataframe_from_uploaded_data(uploaded_data)
    if df_raw is None:
        return pd.DataFrame(), {
            "valid": False,
            "message": "Subject-wise file must be an Excel/CSV file.",
            "columns": [],
            "row_count": 0,
            "preview_rows": [],
        }

    df, hdr = parse_subject_summary_sheet(df_raw)
    return df, _build_analysis(df, hdr, "subject_summary")


def analyze_mark_list(uploaded_data) -> Tuple[pd.DataFrame, Dict]:
    df_raw = get_best_dataframe_from_uploaded_data(uploaded_data)
    if df_raw is None:
        return pd.DataFrame(), {
            "valid": False,
            "message": "Student detail file must be an Excel/CSV file.",
            "columns": [],
            "row_count": 0,
            "preview_rows": [],
        }

    df, hdr = parse_student_detail_sheet(df_raw)
    return df, _build_analysis(df, hdr, "student_detail")


def analyze_blueprint(uploaded_data) -> Tuple[pd.DataFrame, Dict]:
    if uploaded_data["type"] == "pdf":
        pages = uploaded_data["pages"]
        text_preview = []

        for page in pages[:3]:
            text_preview.append(
                {
                    "page": page["page"],
                    "text": (page["text"][:500] if page["text"] else ""),
                    "table_count": len(page["tables"]) if page["tables"] else 0,
                }
            )

        return pd.DataFrame(), {
            "valid": True,
            "file_type": "pdf",
            "note": "Blueprint PDF preview extracted successfully.",
            "pages": text_preview,
        }

    df_raw = get_best_dataframe_from_uploaded_data(uploaded_data)
    if df_raw is None:
        return pd.DataFrame(), {
            "valid": False,
            "message": "Question analysis file must be an Excel/CSV file.",
            "columns": [],
            "row_count": 0,
            "preview_rows": [],
        }

    df, hdr = parse_question_analysis_sheet(df_raw)
    return df, _build_analysis(df, hdr, "question_analysis")
