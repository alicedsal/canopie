"""Resident priorities from the 2026 Town of Chapel Hill Community Survey.

Source: ETC Institute, "2026 Town of Chapel Hill Community Survey: Findings Report",
June 2026 (2026chapelhill_findingsreport_062926.pdf in the repo root). 421 randomly
sampled households, +/-4.76% at 95% confidence. Figures are town-wide; the report has no
breakdown by district.

importance:   share of residents who chose the item as one that should get the most
              emphasis from Town leaders
satisfaction: share "very satisfied" or "satisfied", excluding "don't know"
is_score:     ETC's Importance-Satisfaction rating = importance x (1 - satisfaction).
              >= 0.20 is "Very High" priority, 0.10 to 0.20 "High", below that "Medium".

Each project category is matched to the closest survey item. Two matches are weaker than
the rest and are flagged in `note`.
"""

SOURCE = {
    "title": "2026 Town of Chapel Hill Community Survey: Findings Report",
    "author": "ETC Institute",
    "date": "June 2026",
    "sample_size": 421,
    "margin_of_error_pct": 4.76,
    "file": "2026chapelhill_findingsreport_062926.pdf",
}

# is_score values are the report's own (Section 4, pages 64-66) except where noted.
SURVEY: dict[str, dict] = {
    "stormwater": dict(
        item="Management of stormwater runoff",
        importance=34, satisfaction=30, is_score=0.2345, priority="Very High", page=64, note=None),
    "bike_ped": dict(
        item="Feeling of safety while traveling on Town roads, sidewalks, greenways and bike facilities",
        importance=50, satisfaction=71, is_score=0.1473, priority="High", page=65, note=None),
    "greenway": dict(
        item="Connectivity of greenways and multi-use paths",
        importance=23, satisfaction=53, is_score=0.1069, priority="High", page=66, note=None),
    "lighting": dict(
        item="Adequacy of street lighting",
        importance=11, satisfaction=64, is_score=0.0401, priority="Medium", page=66, note=None),
    "affordable_housing": dict(
        item="Various housing options available",
        importance=26, satisfaction=23, is_score=0.2002, priority="Very High", page=None,
        note="The report gives importance (Q16) and satisfaction (Q15a) for this item but no "
             "I-S rating; the score is computed here with the report's formula."),
    "tree_canopy": dict(
        item="Parks, greenways and recreation facilities",
        importance=29, satisfaction=78, is_score=0.0635, priority="Medium", page=64,
        note="Proxy: the survey has no question about tree canopy or shade."),
}

_MAX_IS = max(s["is_score"] for s in SURVEY.values())


def demand_weight(category: str) -> float:
    """Town-wide resident demand for a project category, 0..1 (1 = the top survey priority)."""
    return SURVEY[category]["is_score"] / _MAX_IS if category in SURVEY else 0.0
