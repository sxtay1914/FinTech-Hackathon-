export interface GlobeConnection {
  from_country: string;
  from_lat: number;
  from_lng: number;
  to_country: string;
  to_lat: number;
  to_lng: number;
  label: string;
  strength: number;
}

export interface GlobePoint {
  country: string;
  lat: number;
  lng: number;
  label: string;
  size: number;
}

export interface HistoricalPrecedent {
  year: number;
  title: string;
  description: string;
  outcome: string;
  country: string;
  lat: number;
  lng: number;
  market_impact: string;
  firm_action: string;
  firm_result: string;
}

export interface ActionItem {
  id: number;
  event_id: number;
  event_headline: string;
  action: string;
  asset_class: string;
  direction: string;
  rationale: string;
  opportunity_impact: number;
  portfolio_impact: number;
  urgency: string;
}

export interface EventListItem {
  id: number;
  headline: string;
  summary: string;
  country: string;
  country_code: string;
  theme: string;
  heat: string;
  opportunity_impact: number;
  portfolio_impact: number;
  published_date: string;
}

export interface EventDetail {
  id: number;
  headline: string;
  summary: string;
  country: string;
  country_code: string;
  lat: number;
  lng: number;
  theme: string;
  heat: string;
  opportunity_impact: number;
  portfolio_impact: number;
  risk_chain: string[];
  analysis: string;
  globe_connections: GlobeConnection[];
  globe_points: GlobePoint[];
  historical_precedents: HistoricalPrecedent[];
  actions: ActionItem[];
  published_date: string;
  source: string;
}

export interface ThemeOverview {
  theme: string;
  heat: string;
  event_count: number;
  avg_opportunity_impact: number;
  avg_portfolio_impact: number;
}
