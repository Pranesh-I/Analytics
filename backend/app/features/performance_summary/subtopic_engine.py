import pandas as pd
import re
from typing import List, Dict, Any

def _parse_q_list(q_str: str) -> set:
    if pd.isna(q_str) or not str(q_str).strip():
        return set()
    parts = re.split(r"[,\n;|]+", str(q_str))
    res = set()
    for p in parts:
        p = p.strip()
        if p.isdigit():
            res.add(int(p))
    return res

def compute_subtopic_performance(error_df: pd.DataFrame, blueprint_df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Cross-reference student right/wrong question lists with the blueprint
    to calculate mastery at the subtopic level.
    """
    if blueprint_df.empty or error_df.empty:
        return []

    # Prepare Blueprint Mapping
    # Create a mapping of Question Number -> Subtopic Details
    q_mapping = {}
    
    # We will also keep track of total questions per subtopic
    subtopic_totals = {}

    for _, row in blueprint_df.iterrows():
        keys = list(row.index)
        vals = list(row.values)
        
        q_no = 0
        subject = ""
        chapter = ""
        topic = ""
        subtopic = ""
        
        chapter_count = 0
        
        for k, v in zip(keys, vals):
            if pd.isna(v):
                continue
            v_str = str(v).strip()
            if not v_str or v_str.lower() in ["nan", "none"]:
                continue
                
            if k in ["q_no", "Q. No.", "qno"]:
                try:
                    q_no = int(float(v_str))
                except ValueError:
                    pass
            elif k in ["subject", "Subject"]:
                subject = v_str
            elif k in ["chapter", "Chapter"]:
                if chapter_count == 0:
                    chapter = v_str
                elif chapter_count == 1:
                    topic = v_str
                chapter_count += 1
            elif k in ["topic", "Topic"]:
                topic = v_str
            elif k in ["subtopicname", "subtopic", "Subtopic Name", "subtopic_name"]:
                subtopic = v_str
            
        if q_no == 0:
            continue
            
        # Avoid counting duplicate question numbers which artificially inflate the total
        if q_no in q_mapping:
            continue
            
        if not subtopic:
            subtopic = "Uncategorized"
            
        subtopic_key = (subject, chapter, topic, subtopic)
        
        q_mapping[q_no] = subtopic_key
        subtopic_totals[subtopic_key] = subtopic_totals.get(subtopic_key, 0) + 1

    subtopic_rows = []

    for _, row in error_df.iterrows():
        roll_no = str(row.get("roll_no", "")).strip()
        if not roll_no:
            continue

        right_qs = _parse_q_list(row.get("total_r", ""))
        wrong_qs = _parse_q_list(row.get("total_w", ""))
        blank_qs = _parse_q_list(row.get("total_b", ""))

        # Track per-student stats per subtopic key
        student_stats = {}
        for k in subtopic_totals.keys():
            student_stats[k] = {"correct": 0, "wrong": 0, "unattempted": 0, "total": subtopic_totals[k]}

        # Map right questions
        for q in right_qs:
            if q in q_mapping:
                student_stats[q_mapping[q]]["correct"] += 1
                
        # Map wrong questions
        for q in wrong_qs:
            if q in q_mapping:
                student_stats[q_mapping[q]]["wrong"] += 1
                
        # Map blank questions
        for q in blank_qs:
            if q in q_mapping:
                student_stats[q_mapping[q]]["unattempted"] += 1

        # Flatten into dicts
        for (subject, chapter, topic, subtopic), stats in student_stats.items():
            total = stats["total"]
            if total == 0:
                continue
                
            correct = stats["correct"]
            wrong = stats["wrong"]
            unattempted = stats["unattempted"]
            
            # Recalculate unattempted if the counts don't add up correctly to the blueprint total
            # Some questions might not have been recorded properly in right/wrong/blank
            recorded = correct + wrong + unattempted
            if recorded < total:
                unattempted += (total - recorded)
            
            accuracy = round((correct / total) * 100, 1)
            
            # Determine Mastery Level
            if accuracy >= 90:
                mastery = "EXCELLENT"
            elif accuracy >= 50:
                mastery = "GOOD"
            else:
                mastery = "NEEDS IMPROVEMENT"
                
            subtopic_rows.append({
                "roll_no": roll_no,
                "subject": subject,
                "chapter": chapter,
                "topic": topic,
                "subtopic": subtopic,
                "total_questions": total,
                "correct_questions": correct,
                "wrong_questions": wrong,
                "unattempted_questions": unattempted,
                "accuracy": accuracy,
                "mastery_level": mastery
            })

    return subtopic_rows
