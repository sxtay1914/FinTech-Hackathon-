import json
from openai import OpenAI

from backend.config import OPENAI_API_KEY
from backend.schemas import LLMAnalysis

client = OpenAI(api_key=OPENAI_API_KEY)

SYSTEM_PROMPT = """You are a senior macro economist and portfolio strategist at a global asset management firm.
Analyze the given news article and produce a structured analysis for an institutional investment platform.

Your analysis must be thorough, actionable, and suitable for professional asset managers.

For globe_connections: identify 3-6 countries/regions that are directly impacted by this event.
Use accurate latitude/longitude coordinates for major financial centers.

For historical_precedents: identify 2-4 similar historical events and their market outcomes.
Each precedent MUST include:
- country: the country most affected (use the key coordinate reference)
- lat/lng: coordinates of that country's financial center
- market_impact: specific quantitative impact (e.g. "S&P 500 fell 34% over 3 months", "10Y Treasury yields spiked 150bps")
- firm_action: what a prudent asset manager would have done (e.g. "Rotated into defensive sectors, increased Treasury allocation to 40%")
- firm_result: the outcome of that action (e.g. "Portfolio drawdown limited to 12% vs 34% benchmark decline, captured 85% of subsequent recovery")

For actions: recommend 2-4 specific portfolio actions with clear rationale.

For risk_chain: provide a 3-5 step causal chain showing how this event propagates through the global economy.

Key coordinate reference:
- New York: 40.7128, -74.0060
- London: 51.5074, -0.1278
- Tokyo: 35.6762, 139.6503
- Beijing: 39.9042, 116.4074
- Frankfurt: 50.1109, 8.6821
- Sydney: -33.8688, 151.2093
- Mumbai: 19.0760, 72.8777
- São Paulo: -23.5505, -46.6333
- Singapore: 1.3521, 103.8198
- Dubai: 25.2048, 55.2708
- Zurich: 47.3769, 8.5417
- Toronto: 43.6532, -79.3832
- Seoul: 37.5665, 126.9780
- Mexico City: 19.4326, -99.1332
- Jakarta: -6.2088, 106.8456
- Riyadh: 24.7136, 46.6753
- Ankara: 39.9334, 32.8597
- Buenos Aires: -34.6037, -58.3816
- Abuja: 9.0579, 7.4951
- Hanoi: 21.0285, 105.8542"""


def analyze_article(title: str, body: str) -> LLMAnalysis:
    prompt = f"Article Title: {title}\n\nArticle Body: {body}"

    response = client.beta.chat.completions.parse(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        response_format=LLMAnalysis,
        temperature=0.3,
    )

    return response.choices[0].message.parsed


# Fallback data for when API is unavailable
def generate_fallback(title: str, body: str, index: int) -> LLMAnalysis:
    """Generate reasonable fallback data without calling the LLM."""
    # Country mapping based on keywords
    country_map = {
        "US": ("United States", "US", 40.7128, -74.0060),
        "Fed": ("United States", "US", 40.7128, -74.0060),
        "Federal Reserve": ("United States", "US", 40.7128, -74.0060),
        "ECB": ("Germany", "DE", 50.1109, 8.6821),
        "Europe": ("Germany", "DE", 50.1109, 8.6821),
        "China": ("China", "CN", 39.9042, 116.4074),
        "Japan": ("Japan", "JP", 35.6762, 139.6503),
        "BOJ": ("Japan", "JP", 35.6762, 139.6503),
        "UK": ("United Kingdom", "GB", 51.5074, -0.1278),
        "Britain": ("United Kingdom", "GB", 51.5074, -0.1278),
        "Bank of England": ("United Kingdom", "GB", 51.5074, -0.1278),
        "Middle East": ("Saudi Arabia", "SA", 24.7136, 46.6753),
        "Oil": ("Saudi Arabia", "SA", 24.7136, 46.6753),
        "India": ("India", "IN", 19.0760, 72.8777),
        "Brazil": ("Brazil", "BR", -23.5505, -46.6333),
        "Germany": ("Germany", "DE", 50.1109, 8.6821),
        "German": ("Germany", "DE", 50.1109, 8.6821),
        "Australia": ("Australia", "AU", -33.8688, 151.2093),
        "Swiss": ("Switzerland", "CH", 47.3769, 8.5417),
        "Korea": ("South Korea", "KR", 37.5665, 126.9780),
        "Turkey": ("Turkey", "TR", 39.9334, 32.8597),
        "Canada": ("Canada", "CA", 43.6532, -79.3832),
        "Nigeria": ("Nigeria", "NG", 9.0579, 7.4951),
        "EU": ("Germany", "DE", 50.1109, 8.6821),
        "Carbon": ("Germany", "DE", 50.1109, 8.6821),
        "Mexico": ("Mexico", "MX", 19.4326, -99.1332),
        "Sovereign Debt": ("United States", "US", 40.7128, -74.0060),
        "IMF": ("United States", "US", 40.7128, -74.0060),
        "Saudi": ("Saudi Arabia", "SA", 24.7136, 46.6753),
        "Vietnam": ("Vietnam", "VN", 21.0285, 105.8542),
        "Argentina": ("Argentina", "AR", -34.6037, -58.3816),
        "Indonesia": ("Indonesia", "ID", -6.2088, 106.8456),
    }

    country, code, lat, lng = "United States", "US", 40.7128, -74.0060
    for keyword, data in country_map.items():
        if keyword.lower() in title.lower():
            country, code, lat, lng = data
            break

    themes = ["Monetary Policy", "Trade", "Fiscal", "Geopolitical", "Growth", "Inflation"]
    heats = ["Hot", "Warming", "Cooling", "Cold"]

    # Determine theme from keywords
    theme = "Growth"
    if any(w in title.lower() for w in ["rate", "cut", "fed", "ecb", "boj", "bank"]):
        theme = "Monetary Policy"
    elif any(w in title.lower() for w in ["trade", "export", "tariff", "semiconductor", "carbon"]):
        theme = "Trade"
    elif any(w in title.lower() for w in ["stimulus", "fiscal", "debt", "fund", "budget"]):
        theme = "Fiscal"
    elif any(w in title.lower() for w in ["tension", "war", "conflict", "oil", "crisis"]):
        theme = "Geopolitical"
    elif any(w in title.lower() for w in ["inflation", "price", "cpi"]):
        theme = "Inflation"

    heat = heats[index % 4]
    opp = (index % 5) + 1
    port = ((index + 2) % 5) + 1

    # All known financial centers
    all_centers = {
        "United States": (40.7128, -74.0060),
        "United Kingdom": (51.5074, -0.1278),
        "Japan": (35.6762, 139.6503),
        "Germany": (50.1109, 8.6821),
        "China": (39.9042, 116.4074),
        "Singapore": (1.3521, 103.8198),
        "India": (19.0760, 72.8777),
        "Brazil": (-23.5505, -46.6333),
        "Australia": (-33.8688, 151.2093),
        "Switzerland": (47.3769, 8.5417),
        "South Korea": (37.5665, 126.9780),
        "Canada": (43.6532, -79.3832),
        "Saudi Arabia": (24.7136, 46.6753),
        "Turkey": (39.9334, 32.8597),
        "Mexico": (19.4326, -99.1332),
        "Indonesia": (-6.2088, 106.8456),
        "Nigeria": (9.0579, 7.4951),
        "Vietnam": (21.0285, 105.8542),
        "Argentina": (-34.6037, -58.3816),
    }

    # Context-aware destination mapping based on keywords in the article
    impact_map = {
        "inflation": ["United Kingdom", "Germany", "Japan", "Brazil"],
        "fed": ["United Kingdom", "Japan", "China", "Brazil", "India"],
        "federal reserve": ["United Kingdom", "Japan", "China", "Brazil"],
        "ecb": ["United Kingdom", "Switzerland", "United States", "Japan"],
        "rate": ["United States", "United Kingdom", "Japan", "Germany"],
        "china": ["United States", "Japan", "South Korea", "Australia", "Germany"],
        "stimulus": ["United States", "Japan", "Australia", "South Korea", "Germany"],
        "boj": ["United States", "South Korea", "China", "Australia"],
        "japan": ["United States", "South Korea", "China", "Australia"],
        "uk gdp": ["Germany", "United States", "Switzerland", "India"],
        "bank of england": ["Germany", "United States", "Switzerland"],
        "oil": ["United States", "India", "China", "Japan", "Germany"],
        "middle east": ["United States", "India", "China", "Japan", "United Kingdom"],
        "semiconductor": ["South Korea", "Japan", "China", "Germany"],
        "tech": ["South Korea", "Japan", "China", "India"],
        "trade": ["China", "United States", "Germany", "Mexico", "Vietnam"],
        "tariff": ["China", "Mexico", "Vietnam", "South Korea"],
        "carbon": ["China", "India", "Turkey", "United Kingdom", "United States"],
        "india": ["United States", "Singapore", "United Kingdom", "Japan"],
        "brazil": ["United States", "Argentina", "Mexico", "Germany"],
        "german": ["United States", "China", "United Kingdom", "Switzerland"],
        "manufacturing": ["China", "Vietnam", "Mexico", "South Korea"],
        "australia": ["China", "United States", "Japan", "Singapore"],
        "housing": ["United Kingdom", "Australia", "Canada", "United States"],
        "swiss": ["Germany", "United Kingdom", "United States", "Japan"],
        "korea": ["United States", "China", "Japan", "Vietnam"],
        "turkey": ["Germany", "United Kingdom", "Saudi Arabia", "United States"],
        "lira": ["Germany", "United Kingdom", "Saudi Arabia", "United States"],
        "canada": ["United States", "China", "United Kingdom", "Mexico"],
        "nigeria": ["United Kingdom", "China", "United States", "Saudi Arabia"],
        "naira": ["United Kingdom", "China", "United States", "Saudi Arabia"],
        "mexico": ["United States", "China", "Canada", "Brazil"],
        "nearshoring": ["United States", "China", "Canada", "South Korea"],
        "sovereign debt": ["Japan", "China", "United Kingdom", "Germany"],
        "imf": ["Japan", "China", "United Kingdom", "Germany", "India"],
        "saudi": ["United States", "India", "United Kingdom", "Singapore"],
        "diversification": ["United States", "India", "United Kingdom", "Singapore"],
        "vietnam": ["China", "United States", "South Korea", "Japan"],
        "apple": ["China", "United States", "South Korea", "India"],
        "argentina": ["Brazil", "United States", "Mexico", "United Kingdom"],
        "peso": ["Brazil", "United States", "Mexico", "United Kingdom"],
        "indonesia": ["China", "Australia", "Japan", "South Korea"],
        "nickel": ["China", "Australia", "Japan", "South Korea", "Germany"],
    }

    # Find relevant destinations based on title keywords
    title_lower = title.lower() + " " + body[:200].lower()
    dest_names = []
    for keyword, targets in impact_map.items():
        if keyword in title_lower:
            for t in targets:
                if t != country and t not in dest_names:
                    dest_names.append(t)
            break

    # Fallback: pick major centers different from source
    if not dest_names:
        for c_name in ["United States", "United Kingdom", "Japan", "China"]:
            if c_name != country:
                dest_names.append(c_name)

    impact_labels = {
        "Monetary Policy": ["Rate differential impact", "Bond yield spillover", "Currency pressure", "Capital flow shift"],
        "Trade": ["Trade flow disruption", "Supply chain impact", "Export exposure", "Tariff pass-through"],
        "Fiscal": ["Sovereign risk repricing", "Growth spillover", "Investment flow shift", "Fiscal contagion"],
        "Geopolitical": ["Risk premium spike", "Energy price impact", "Supply disruption", "Safe-haven flow"],
        "Growth": ["Growth correlation", "Demand spillover", "Investment reallocation", "Sentiment contagion"],
        "Inflation": ["Imported inflation", "Commodity pass-through", "Wage pressure", "Policy divergence"],
    }
    labels = impact_labels.get(theme, ["Economic impact", "Market spillover", "Capital flow", "Risk repricing"])

    connections = []
    for i, dest_name in enumerate(dest_names[:4]):
        if dest_name in all_centers:
            d_lat, d_lng = all_centers[dest_name]
            connections.append({
                "from_country": country,
                "from_lat": lat,
                "from_lng": lng,
                "to_country": dest_name,
                "to_lat": d_lat,
                "to_lng": d_lng,
                "label": f"{labels[i % len(labels)]} → {dest_name}",
                "strength": max(1, 5 - i),
            })

    return LLMAnalysis(
        headline=title,
        summary=body[:200] + "...",
        country=country,
        country_code=code,
        lat=lat,
        lng=lng,
        theme=theme,
        heat=heat,
        opportunity_impact=opp,
        portfolio_impact=port,
        risk_chain=[
            f"Event: {title[:50]}...",
            "Market volatility increases across asset classes",
            "Capital flows shift to safe-haven assets",
            "Central banks reassess monetary policy stance",
            "Portfolio rebalancing required across regions",
        ],
        analysis=f"This development represents a significant shift in the {theme.lower()} landscape. {body[:300]}\n\nThe implications extend beyond {country}, affecting global capital flows and risk sentiment. Asset managers should closely monitor developments and consider tactical adjustments to portfolio positioning.",
        globe_connections=[GlobeConnection(**c) for c in connections],
        globe_points=[
            GlobePoint(country=country, lat=lat, lng=lng, label=f"{country} (Source)", size=1.0),
            *[GlobePoint(country=c["to_country"], lat=c["to_lat"], lng=c["to_lng"], label=c["to_country"], size=0.5) for c in connections[:3]],
        ],
        historical_precedents=[
            HistoricalPrecedent(
                year=2020, title="COVID-19 Market Shock",
                description="Global pandemic caused unprecedented market volatility with fastest bear market in history",
                outcome="Markets recovered within 12 months driven by $5T+ fiscal stimulus",
                country="United States", lat=40.7128, lng=-74.0060,
                market_impact="S&P 500 fell 34% in 23 trading days, VIX spiked to 82",
                firm_action="Cut equity exposure by 30%, increased cash and short-duration bonds, bought protective puts on major indices",
                firm_result="Portfolio drawdown limited to 18% vs 34% benchmark decline, repositioned into equities in April capturing 90% of recovery",
            ),
            HistoricalPrecedent(
                year=2008, title="Global Financial Crisis",
                description="Systemic banking crisis triggered by subprime mortgage collapse led to severe global recession",
                outcome="Central bank intervention and QE stabilized markets over 18 months",
                country="United States", lat=40.7128, lng=-74.0060,
                market_impact="S&P 500 fell 57% peak-to-trough, global trade collapsed 12%",
                firm_action="Moved to maximum defensive positioning: 50% treasuries, 20% cash, closed all EM exposure, hedged USD",
                firm_result="Outperformed benchmark by 22% during crisis, early re-entry in March 2009 generated 45% return by year-end",
            ),
            HistoricalPrecedent(
                year=2015, title="China Devaluation Shock",
                description="PBoC unexpectedly devalued yuan by 3%, triggering global risk-off and EM currency crisis",
                outcome="Markets stabilized after coordinated G20 response and PBoC intervention",
                country="China", lat=39.9042, lng=116.4074,
                market_impact="Shanghai Composite fell 43% from peak, EM currencies dropped 8-15%",
                firm_action="Reduced Asia-Pacific allocation by 25%, hedged CNY exposure, rotated into USD-denominated assets",
                firm_result="Avoided 15% EM drawdown, generated alpha from USD strength trade, re-entered China at lower valuations in Q1 2016",
            ),
        ],
        actions=[
            ActionItem(action="Review exposure to affected regions", asset_class="Multi-Asset", direction="Hold", rationale="Reassess risk-reward profile given new macro dynamics", opportunity_impact=opp, portfolio_impact=port, urgency="Immediate"),
            ActionItem(action=f"Consider hedging {country} exposure", asset_class="FX", direction="Hedge", rationale="Currency volatility likely to increase", opportunity_impact=max(1, opp - 1), portfolio_impact=port, urgency="Short-term"),
            ActionItem(action="Increase allocation to safe havens", asset_class="Fixed Income", direction="Buy", rationale="Risk-off sentiment favors quality bonds", opportunity_impact=3, portfolio_impact=3, urgency="Medium-term"),
        ],
    )


# Need to import these for fallback
from backend.schemas import GlobeConnection, GlobePoint, HistoricalPrecedent, ActionItem
