"""
Enriches IMF crisis periods with real equity market returns via yfinance.
"""

import logging
from functools import lru_cache

logger = logging.getLogger(__name__)

try:
    import yfinance as yf
    YFINANCE_AVAILABLE = True
except ImportError:
    YFINANCE_AVAILABLE = False
    logger.warning("yfinance not installed — market_impact will use IMF data only")

# Country ISO3 → primary equity index ticker
EQUITY_TICKERS = {
    "USA": ("^GSPC",    "S&P 500"),
    "GBR": ("^FTSE",    "FTSE 100"),
    "DEU": ("^GDAXI",   "DAX"),
    "JPN": ("^N225",    "Nikkei 225"),
    "CHN": ("000001.SS","Shanghai Composite"),
    "FRA": ("^FCHI",    "CAC 40"),
    "IND": ("^BSESN",   "BSE Sensex"),
    "BRA": ("^BVSP",    "Bovespa"),
    "KOR": ("^KS11",    "KOSPI"),
    "AUS": ("^AXJO",    "ASX 200"),
    "CAN": ("^GSPTSE",  "TSX Composite"),
    "MEX": ("^MXX",     "IPC Mexico"),
    "IDN": ("^JKSE",    "Jakarta Composite"),
    "TUR": ("XU100.IS", "BIST 100"),
    "ARG": ("^MERV",    "MERVAL"),
    "SAU": ("^TASI.SR", "Tadawul"),
    "SGP": ("^STI",     "Straits Times Index"),
    "CHE": ("^SSMI",    "Swiss Market Index"),
    "HKG": ("^HSI",     "Hang Seng"),
    "ITA": ("FTSEMIB.MI","FTSE MIB"),
    "ESP": ("^IBEX",    "IBEX 35"),
    "THA": ("^SET.BK",  "SET Index"),
}


@lru_cache(maxsize=200)
def _annual_return(ticker: str, year: int) -> float | None:
    """Returns the annual % price return for a ticker in a given calendar year."""
    if not YFINANCE_AVAILABLE:
        return None
    try:
        data = yf.download(
            ticker,
            start=f"{year}-01-01",
            end=f"{year}-12-31",
            progress=False,
            auto_adjust=True,
        )
        if data.empty or len(data) < 20:
            return None
        pct = (data["Close"].iloc[-1] / data["Close"].iloc[0] - 1) * 100
        # yfinance may return a DataFrame column — flatten to scalar
        if hasattr(pct, "iloc"):
            pct = float(pct.iloc[0])
        return round(float(pct), 1)
    except Exception as e:
        logger.warning(f"yfinance failed for {ticker} ({year}): {e}")
        return None


def enrich_with_market_data(crisis_periods: list[dict]) -> list[dict]:
    """
    Takes IMF crisis periods and adds a real market_impact string computed
    from Yahoo Finance annual equity returns.
    """
    enriched = []
    for period in crisis_periods:
        iso3 = period.get("country_iso3", "")
        year = period.get("year")
        imf_context = period.get("imf_context", "")

        market_impact = imf_context  # fallback — IMF data alone
        ticker_info = EQUITY_TICKERS.get(iso3)

        if ticker_info and year:
            ticker, index_name = ticker_info
            ret = _annual_return(ticker, year)
            if ret is not None:
                direction = "rose" if ret > 0 else "fell"
                equity_str = f"{index_name} {direction} {abs(ret):.1f}% in {year}"
                market_impact = (
                    f"{equity_str}; {imf_context}" if imf_context else equity_str
                )

        enriched.append({**period, "market_impact": market_impact})
    return enriched


def build_grounding_context(enriched_periods: list[dict]) -> str:
    """
    Builds the grounding block injected into the LLM system prompt.
    Contains real IMF economic indicators + Yahoo Finance equity returns.
    """
    if not enriched_periods:
        return ""

    lines = [
        "GROUNDED HISTORICAL CONTEXT (real IMF economic data + Yahoo Finance market data):",
    ]
    for p in enriched_periods:
        lines.append(
            f"\n[{p['year']}] {p['title']}"
            f"\n  IMF Economic Data: {p.get('imf_context', 'N/A')}"
            f"\n  Market Impact (real data): {p.get('market_impact', 'N/A')}"
        )
    lines.append(
        "\nFor historical_precedents: use the real events above as your primary reference. "
        "Use the EXACT figures from IMF and Yahoo Finance for market_impact. "
        "Write firm_action and firm_result as expert narrative based on the real outcomes shown."
    )
    return "\n".join(lines)
