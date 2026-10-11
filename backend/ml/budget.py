"""Real capital funding figures for the Town of Chapel Hill.

Source: https://www.chapelhillnc.gov/Town-Government/Financials/Capital-Improvements-Program
(read 11 October 2026). The Capital Improvements Program is a 15-year plan, usually funded
by annual transfers from the General Fund; the page gives no annual total. The figures it
does give are the voter-approved bonds below, so the budget slider is scaled to them.
"""

BONDS_2024 = {
    "approved": "November 2024",
    "authorised_usd": 44_000_000,
    "by_category_usd": {
        "Affordable Housing": 15_000_000,
        "Public Facilities": 15_000_000,
        "Streets & Sidewalks": 7_500_000,
        "Parks & Recreation": 4_500_000,
        "Open Space & Greenways": 2_000_000,
    },
    "issued": {
        "date": "June 2025",
        "total_usd": 10_630_000,
        "by_category_usd": {
            "Affordable Housing": 3_500_000,
            "Public Facilities": 1_230_000,
            "Streets & Sidewalks": 5_400_000,
            "Parks & Recreation": 500_000,
        },
    },
}

# The 2015 bond authority has lapsed; the last issue under it was for stormwater.
STORMWATER_2015_BOND_ISSUED_JUNE_2025_USD = 2_700_000

SOURCE_URL = "https://www.chapelhillnc.gov/Town-Government/Financials/Capital-Improvements-Program"
