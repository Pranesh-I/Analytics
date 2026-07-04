"""
Percentile estimation utilities for JEE/NEET academic analysis.

NOTE: This is an interpolated estimate based on manually defined anchor points,
not a statistically derived percentile from actual JEE Mains score-frequency data.
Treat as directional, not exact.

The anchor table maps a raw total score (out of 300) to an estimated JEE-equivalent
percentile.  These anchor points were derived from the pre-existing band thresholds
in the codebase (Elite / Strong / Average / Below Average / Weak) and their
corresponding risk-band percentile ranges.  They are placeholder estimates; see
the NTA-interpolation note at the bottom of this file for a future upgrade path.
"""

from typing import Tuple

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

#: Maximum possible total score on the test this codebase targets.
MAX_SCORE: int = 300

#: Rounding precision for the interpolated percentile output.
#: 1   → round to nearest whole number (e.g. 84)
#: 0.5 → round to nearest 0.5        (e.g. 84.5)
#: 0.1 → round to one decimal place  (e.g. 84.3)
ROUNDING_PRECISION: float = 0.5

#: Width of display bands (in raw score marks) used by get_percentile_band_label().
BAND_DISPLAY_STEP_MARKS: int = 10


# ---------------------------------------------------------------------------
# Anchor table  (score_out_of_300 → estimated_percentile)
#
# These anchors are the EXACT thresholds already present in the codebase,
# translated from percentage-of-marks to raw score, and paired with the
# median of the percentile range stated in BAND_RANGES for that bucket.
#
# Pre-existing mapping (merger.py / constants.py):
#   pct >= 65% (score >= 195)  → Elite    → "93|95|97"  → median 95
#   pct >= 40% (score >= 120)  → Strong   → "70|75|80"  → median 75
#   pct >= 25% (score >=  75)  → Average  → "60|67|73"  → median 67
#   pct >= 18% (score >=  54)  → BelowAvg → "48|55|62"  → median 55
#   pct  < 18% (score  <  54)  → Weak     → "18|27|35"  → median 27
#
# Boundary anchors at score=0 (0th percentile) and score=300 (99.9th percentile)
# have been added so that no score is left without a containing interval.
# ---------------------------------------------------------------------------
_ANCHORS: Tuple[Tuple[int, float], ...] = (
    # (score_out_of_300,  estimated_jee_percentile)
    (  0,   0.0),   # Floor anchor — no student below 0 marks
    ( 54,  27.0),   # Bottom of "Below Average" band  (Weak  median = 27)
    ( 75,  55.0),   # Bottom of "Average" band        (BelowAvg median = 55)
    (120,  67.0),   # Bottom of "Strong" band         (Average  median = 67)
    (195,  75.0),   # Bottom of "Elite" band          (Strong   median = 75)
    (300,  99.9),   # Ceiling anchor — perfect score
)

# Pre-validate that anchors are monotonically increasing in both dimensions.
assert all(
    _ANCHORS[i][0] < _ANCHORS[i + 1][0] and _ANCHORS[i][1] < _ANCHORS[i + 1][1]
    for i in range(len(_ANCHORS) - 1)
), "Anchor table is not strictly monotone — fix before deploying."


def _round_to_precision(value: float, precision: float) -> float:
    """Round *value* to the nearest *precision* step (e.g. 0.5, 1, 0.1)."""
    if precision <= 0:
        return value
    return round(round(value / precision) * precision, 10)


# NOTE: This is an interpolated estimate based on manually defined anchor points,
# not a statistically derived percentile from actual JEE Mains score-frequency data.
# Treat as directional, not exact.
def get_estimated_percentile(score: float) -> float:
    """
    Return an interpolated JEE-equivalent percentile estimate for a given raw
    total score (out of MAX_SCORE).

    Algorithm
    ---------
    1. Clamp the score to [0, MAX_SCORE] to prevent nonsensical extrapolation.
    2. Find the two nearest anchor points that bracket the score.
    3. Linearly interpolate the percentile between the two anchors.
    4. Round the result according to ROUNDING_PRECISION.

    Parameters
    ----------
    score : float
        Raw total score (0 – MAX_SCORE).

    Returns
    -------
    float
        Estimated percentile, rounded to ROUNDING_PRECISION.
        Always in [0.0, 99.9].
    """
    # 1. Clamp
    score = max(0.0, min(float(score), float(MAX_SCORE)))

    # 2. Find the bracketing anchors
    upper_idx = None
    for i, (anchor_score, _) in enumerate(_ANCHORS):
        if anchor_score >= score:
            upper_idx = i
            break

    if upper_idx is None:
        # Score is above all anchors — clamp to ceiling anchor percentile.
        return _round_to_precision(_ANCHORS[-1][1], ROUNDING_PRECISION)

    if upper_idx == 0:
        # Score is at or below the floor anchor — return floor percentile.
        return _round_to_precision(_ANCHORS[0][1], ROUNDING_PRECISION)

    lower_idx = upper_idx - 1
    s0, p0 = _ANCHORS[lower_idx]
    s1, p1 = _ANCHORS[upper_idx]

    # 3. Linear interpolation
    t = (score - s0) / (s1 - s0)
    interpolated = p0 + t * (p1 - p0)

    # 4. Round and hard-cap at 99.9 (100.0 is semantically impossible in JEE percentile)
    return min(_round_to_precision(interpolated, ROUNDING_PRECISION), 99.9)


def get_percentile_band_label(score: float) -> str:
    """
    Return a narrow display-band label for the interpolated percentile that
    corresponds to *score*.

    Parameters
    ----------
    score : float
        Raw total score (0 – MAX_SCORE).

    Returns
    -------
    str
        A label such as "90–95 Percentile" or "50–55 Percentile".
    """
    pct = get_estimated_percentile(score)
    # Bucket the percentile into 5-point bands (0–5, 5–10, …, 95–100)
    bucket_width = 5
    low = int(pct // bucket_width) * bucket_width
    high = low + bucket_width
    # Cap display at 99
    high = min(high, 99)
    low = min(low, high)
    return f"{low}–{high} Percentile"
