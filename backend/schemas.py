from __future__ import annotations
from pydantic import BaseModel


# --- Globe / geo ---

class GlobeConnection(BaseModel):
    from_country: str
    from_lat: float
    from_lng: float
    to_country: str
    to_lat: float
    to_lng: float
    label: str
    strength: int  # 1-5


class GlobePoint(BaseModel):
    country: str
    lat: float
    lng: float
    label: str
    size: float  # 0.0-1.0


# --- Historical precedent ---

class HistoricalPrecedent(BaseModel):
    year: int
    title: str
    description: str
    outcome: str
    country: str = ""
    lat: float = 0.0
    lng: float = 0.0
    market_impact: str = ""  # e.g. "S&P 500 fell 34% over 3 months"
    firm_action: str = ""    # what the firm did
    firm_result: str = ""    # result of the firm's action


# --- Actions ---

class ActionItem(BaseModel):
    action: str
    asset_class: str
    direction: str  # "Buy" | "Sell" | "Hold" | "Hedge"
    rationale: str
    opportunity_impact: int  # 1-5
    portfolio_impact: int  # 1-5
    urgency: str  # "Immediate" | "Short-term" | "Medium-term"


# --- LLM structured output schema ---

class LLMAnalysis(BaseModel):
    headline: str
    summary: str
    country: str
    country_code: str
    lat: float
    lng: float
    theme: str  # "Monetary Policy" | "Trade" | "Fiscal" | "Geopolitical" | "Growth" | "Inflation"
    heat: str  # "Hot" | "Warming" | "Cooling" | "Cold"
    opportunity_impact: int  # 1-5
    portfolio_impact: int  # 1-5
    risk_chain: list[str]  # 3-5 step causal chain
    analysis: str  # 2-3 paragraph deep analysis
    globe_connections: list[GlobeConnection]
    globe_points: list[GlobePoint]
    historical_precedents: list[HistoricalPrecedent]
    actions: list[ActionItem]


# --- API response schemas ---

class EventListItem(BaseModel):
    id: int
    headline: str
    summary: str
    country: str
    country_code: str
    theme: str
    heat: str
    opportunity_impact: int
    portfolio_impact: int
    published_date: str

    model_config = {"from_attributes": True}


class EventDetail(BaseModel):
    id: int
    headline: str
    summary: str
    country: str
    country_code: str
    lat: float
    lng: float
    theme: str
    heat: str
    opportunity_impact: int
    portfolio_impact: int
    risk_chain: list[str]
    analysis: str
    globe_connections: list[GlobeConnection]
    globe_points: list[GlobePoint]
    historical_precedents: list[HistoricalPrecedent]
    actions: list[ActionItem]
    published_date: str
    source: str

    model_config = {"from_attributes": True}


class ActionListItem(BaseModel):
    id: int
    event_id: int
    event_headline: str
    action: str
    asset_class: str
    direction: str
    rationale: str
    opportunity_impact: int
    portfolio_impact: int
    urgency: str

    model_config = {"from_attributes": True}


class ThemeOverview(BaseModel):
    theme: str
    heat: str
    event_count: int
    avg_opportunity_impact: float
    avg_portfolio_impact: float
