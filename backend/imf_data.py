"""
Queries the IMF Data Mapper API to find historical crisis periods for a given
country and macro theme. Free, no API key required.

API docs: https://www.imf.org/external/datamapper/api/v1/
"""

import logging
import requests
from functools import lru_cache

logger = logging.getLogger(__name__)

IMF_API = "https://www.imf.org/external/datamapper/api/v1"

# 2-letter ISO (used in article data) → 3-letter ISO (used by IMF API)
ISO2_TO_ISO3 = {
    "US": "USA", "GB": "GBR", "DE": "DEU", "JP": "JPN", "CN": "CHN",
    "FR": "FRA", "IN": "IND", "BR": "BRA", "KR": "KOR", "AU": "AUS",
    "CA": "CAN", "MX": "MEX", "ID": "IDN", "TR": "TUR", "AR": "ARG",
    "SA": "SAU", "SG": "SGP", "CH": "CHE", "NG": "NGA", "VN": "VNM",
    "ZA": "ZAF", "RU": "RUS", "IT": "ITA", "ES": "ESP", "NL": "NLD",
    "SE": "SWE", "NO": "NOR", "HK": "HKG", "TH": "THA", "MY": "MYS",
}

ISO3_TO_NAME = {
    "USA": "United States", "GBR": "United Kingdom", "DEU": "Germany",
    "JPN": "Japan", "CHN": "China", "FRA": "France", "IND": "India",
    "BRA": "Brazil", "KOR": "South Korea", "AUS": "Australia",
    "CAN": "Canada", "MEX": "Mexico", "IDN": "Indonesia", "TUR": "Turkey",
    "ARG": "Argentina", "SAU": "Saudi Arabia", "SGP": "Singapore",
    "CHE": "Switzerland", "NGA": "Nigeria", "VNM": "Vietnam",
    "ZAF": "South Africa", "RUS": "Russia", "ITA": "Italy", "ESP": "Spain",
    "HKG": "Hong Kong", "THA": "Thailand", "MYS": "Malaysia",
}

COUNTRY_COORDS = {
    "USA": (40.7128, -74.0060), "GBR": (51.5074, -0.1278),
    "DEU": (50.1109, 8.6821),  "JPN": (35.6762, 139.6503),
    "CHN": (39.9042, 116.4074), "FRA": (48.8566, 2.3522),
    "IND": (19.0760, 72.8777), "BRA": (-23.5505, -46.6333),
    "KOR": (37.5665, 126.9780), "AUS": (-33.8688, 151.2093),
    "CAN": (43.6532, -79.3832), "MEX": (19.4326, -99.1332),
    "IDN": (-6.2088, 106.8456), "TUR": (39.9334, 32.8597),
    "ARG": (-34.6037, -58.3816), "SAU": (24.7136, 46.6753),
    "SGP": (1.3521, 103.8198), "CHE": (47.3769, 8.5417),
    "NGA": (9.0579, 7.4951),   "VNM": (21.0285, 105.8542),
    "ITA": (45.4642, 9.1900),  "ESP": (40.4168, -3.7038),
    "HKG": (22.3193, 114.1694), "THA": (13.7563, 100.5018),
}

# Theme → list of (IMF indicator code, crisis condition fn, label template)
THEME_CRISIS_MAP = {
    "Inflation": [
        ("PCPIPCH", lambda v: v > 10, "Inflation {:.1f}%"),
    ],
    "Monetary Policy": [
        ("PCPIPCH", lambda v: v > 5,  "Inflation {:.1f}%"),
        ("NGDP_RPCH", lambda v: v < -1, "GDP growth {:.1f}%"),
    ],
    "Growth": [
        ("NGDP_RPCH", lambda v: v < -2, "GDP contracted {:.1f}%"),
    ],
    "Fiscal": [
        ("GGXWDG_NGDP", lambda v: v > 90, "Govt debt {:.0f}% of GDP"),
        ("NGDP_RPCH",   lambda v: v < -1,  "GDP growth {:.1f}%"),
    ],
    "Trade": [
        ("BCA_NGDPD",  lambda v: v < -4, "Current account deficit {:.1f}% of GDP"),
        ("NGDP_RPCH",  lambda v: v < -1, "GDP growth {:.1f}%"),
    ],
    "Geopolitical": [
        ("NGDP_RPCH", lambda v: v < -3, "Severe GDP contraction {:.1f}%"),
        ("PCPIPCH",   lambda v: v > 8,  "Inflation spike {:.1f}%"),
    ],
}

CRISIS_LABELS = {
    "Inflation":       "Inflation Crisis",
    "Monetary Policy": "Monetary Stress Period",
    "Growth":          "Economic Contraction",
    "Fiscal":          "Fiscal Stress",
    "Trade":           "External Imbalance",
    "Geopolitical":    "Economic Shock",
}


@lru_cache(maxsize=20)
def _fetch_indicator(indicator_code: str) -> dict:
    """
    Fetch all country/year values for one IMF indicator.
    Returns {iso3: {year_str: value}} — cached per process.
    """
    try:
        resp = requests.get(
            f"{IMF_API}/{indicator_code}",
            timeout=20,
            headers={"Accept": "application/json"},
        )
        resp.raise_for_status()
        data = resp.json()
        return data.get("values", {}).get(indicator_code, {})
    except Exception as e:
        logger.warning(f"IMF API fetch failed for {indicator_code}: {e}")
        return {}


def get_crisis_periods(country_iso2: str, theme: str, n: int = 3) -> list[dict]:
    """
    Query the IMF Data Mapper API for a country's historical economic data
    and return the n most severe crisis periods relevant to the given theme.

    Returns a list of dicts with year, country metadata, and imf_context fields.
    """
    iso3 = ISO2_TO_ISO3.get(country_iso2.upper())
    if not iso3:
        logger.warning(f"No ISO3 mapping for: {country_iso2}")
        return []

    indicators = THEME_CRISIS_MAP.get(theme, THEME_CRISIS_MAP["Growth"])
    crisis_years: dict[int, dict] = {}

    for indicator_code, is_crisis, label_tpl in indicators:
        country_data = _fetch_indicator(indicator_code).get(iso3, {})
        for year_str, raw_value in country_data.items():
            try:
                year = int(year_str)
                value = float(raw_value)
                # Restrict to years with likely yfinance coverage, exclude forecasts
                if 1990 <= year <= 2023 and is_crisis(value):
                    crisis_years.setdefault(year, {})[indicator_code] = (value, label_tpl)
            except (ValueError, TypeError):
                continue

    if not crisis_years:
        logger.info(f"No IMF crisis periods found for {iso3} / {theme}")
        return []

    # Sort: most indicators triggered first, then most recent
    ranked = sorted(
        crisis_years.items(),
        key=lambda x: (len(x[1]), x[0]),
        reverse=True,
    )[:n]

    lat, lng = COUNTRY_COORDS.get(iso3, (0.0, 0.0))
    country_name = ISO3_TO_NAME.get(iso3, iso3)
    crisis_label = CRISIS_LABELS.get(theme, "Economic Crisis")

    result = []
    for year, indicators_hit in ranked:
        imf_lines = [tpl.format(val) for (val, tpl) in indicators_hit.values()]
        imf_context = "; ".join(imf_lines)
        result.append({
            "year": year,
            "country": country_name,
            "country_iso3": iso3,
            "lat": lat,
            "lng": lng,
            "title": f"{country_name} {crisis_label} ({year})",
            "description": f"IMF data: {imf_context}.",
            "imf_context": imf_context,
        })

    return result
