import math
from typing import Any
import pandas as pd


def sanitize_json(value: Any) -> Any:
    """
    Recursively convert NaN / inf / pd.NA into JSON-safe values.
    """
    if isinstance(value, dict):
        return {k: sanitize_json(v) for k, v in value.items()}

    if isinstance(value, list):
        return [sanitize_json(v) for v in value]

    if isinstance(value, tuple):
        return [sanitize_json(v) for v in value]

    if value is pd.NA:
        return None

    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None

    return value