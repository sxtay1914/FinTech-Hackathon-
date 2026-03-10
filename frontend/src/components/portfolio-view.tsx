"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import type { EventListItem } from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface ChartPoint { date: string; close: number }

interface ScreenerResult {
  ticker: string;
  name: string;
  price: number;
  sector: string | null;
  industry: string | null;
  market_cap: number | null;
  pe_ratio: number | null;
  beta: number | null;
  dividend_yield: number | null;
  avg_volume: number | null;
  week_52_high: number;
  week_52_low: number;
  ret_1d: number;
  ret_1w: number;
  ret_1m: number;
  ret_1y: number;
  chart: ChartPoint[];
}

interface CorrelationResult {
  tickers: string[];
  matrix: Record<string, Record<string, number>>;
}

interface SentimentItem {
  theme: string;
  sentiment: number;
  count: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Domino Simulator
// ─────────────────────────────────────────────────────────────────────────────

const PROFILES = [
  {
    id: "conservative",
    label: "Conservative",
    risk: "Low risk",
    desc: "20% Eq · 50% Bonds · 10% EM",
    alloc: { equities: 20, bonds: 50, em: 10, fx: 10, cash: 10 },
  },
  {
    id: "balanced",
    label: "Balanced",
    risk: "Medium risk",
    desc: "40% Eq · 30% Bonds · 15% EM",
    alloc: { equities: 40, bonds: 30, em: 15, fx: 10, cash: 5 },
  },
  {
    id: "aggressive",
    label: "Aggressive",
    risk: "High risk",
    desc: "65% Eq · 10% Bonds · 15% EM",
    alloc: { equities: 65, bonds: 10, em: 15, fx: 8, cash: 2 },
  },
] as const;

type AssetKey = "equities" | "bonds" | "em" | "fx" | "cash";

const SENSITIVITY: Record<string, Record<AssetKey, number>> = {
  "Monetary Policy": { equities: -0.6, bonds: -1.0, em: -0.5, fx: 0.3, cash: 0.1 },
  Trade:            { equities: -0.8, bonds:  0.2, em: -1.0, fx: -0.4, cash: 0.3 },
  Fiscal:           { equities:  0.4, bonds: -0.8, em:  0.2, fx: -0.2, cash: 0.0 },
  Geopolitical:     { equities: -1.0, bonds:  0.4, em: -1.2, fx: -0.6, cash: 0.5 },
  Growth:           { equities:  0.8, bonds:  0.2, em:  0.6, fx:  0.2, cash: -0.1 },
  Inflation:        { equities: -0.6, bonds: -1.0, em: -0.4, fx:  0.2, cash: 0.0 },
};

const HEAT_FACTOR: Record<string, number> = {
  hot: 1.0, high: 1.0, critical: 1.0,
  warming: 0.6, moderate: 0.6, medium: 0.6,
  cooling: 0.2,
  cold: 0.05, low: 0.05,
};

const THEME_COLOR: Record<string, string> = {
  "Monetary Policy": "#818cf8",
  Trade:             "#fb923c",
  Fiscal:            "#34d399",
  Geopolitical:      "#f87171",
  Growth:            "#60a5fa",
  Inflation:         "#fbbf24",
};

function computeContribs(events: EventListItem[], alloc: Record<AssetKey, number>) {
  const byTheme: Record<string, number> = {};
  for (const ev of events) {
    const factor = HEAT_FACTOR[ev.heat?.toLowerCase()] ?? 0.2;
    const scaled = (ev.portfolio_impact / 5) * factor;
    const sens = SENSITIVITY[ev.theme];
    if (!sens) continue;
    let contrib = 0;
    for (const a of Object.keys(alloc) as AssetKey[]) {
      contrib += sens[a] * scaled * (alloc[a] / 100);
    }
    byTheme[ev.theme] = (byTheme[ev.theme] ?? 0) + contrib;
  }
  return Object.entries(byTheme)
    .map(([theme, value]) => ({
      theme,
      value: Math.round(value * 100) / 100,
      color: THEME_COLOR[theme] ?? "#94a3b8",
    }))
    .sort((a, b) => a.value - b.value);
}

// ─────────────────────────────────────────────────────────────────────────────
// SVG Area Chart
// ─────────────────────────────────────────────────────────────────────────────

function PriceChart({ data, positive }: { data: ChartPoint[]; positive: boolean }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (data.length < 2) return null;

  const W = 600;
  const H = 140;
  const PAD = { top: 12, right: 16, bottom: 24, left: 52 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const closes = data.map((d) => d.close);
  const minV = Math.min(...closes);
  const maxV = Math.max(...closes);
  const range = maxV - minV || 1;

  const color = positive ? "#34d399" : "#f87171";

  function xOf(i: number) { return PAD.left + (i / (data.length - 1)) * innerW; }
  function yOf(v: number) { return PAD.top + innerH - ((v - minV) / range) * innerH; }

  const linePts = data.map((d, i) => `${xOf(i)},${yOf(d.close)}`).join(" ");
  const areaPath = [
    `M${xOf(0)},${PAD.top + innerH}`,
    ...data.map((d, i) => `L${xOf(i)},${yOf(d.close)}`),
    `L${xOf(data.length - 1)},${PAD.top + innerH}`,
    "Z",
  ].join(" ");

  const yTickValues = Array.from({ length: 5 }, (_, i) => minV + (range * i) / 4);
  const xLabelIdxs = [0, Math.floor(data.length / 3), Math.floor((2 * data.length) / 3), data.length - 1];

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    // map DOM x → viewBox x
    const svgX = ((e.clientX - rect.left) / rect.width) * W;
    const relX = svgX - PAD.left;
    const idx = Math.round((relX / innerW) * (data.length - 1));
    setHoveredIdx(Math.max(0, Math.min(data.length - 1, idx)));
  }

  const hovered = hoveredIdx !== null ? data[hoveredIdx] : null;

  return (
    // Container div drives the height; SVG fills it completely
    <div className="relative w-full" style={{ height: H }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ display: "block", width: "100%", height: "100%" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines + Y labels */}
        {yTickValues.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.left} y1={yOf(v)} x2={W - PAD.right} y2={yOf(v)}
              stroke="rgba(255,255,255,0.06)" strokeWidth="1"
            />
            <text x={PAD.left - 6} y={yOf(v) + 4} textAnchor="end" fontSize="9" fill="#64748b">
              {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(v < 10 ? 2 : 0)}
            </text>
          </g>
        ))}

        {/* X-axis date labels */}
        {xLabelIdxs.map((idx) => (
          <text key={idx} x={xOf(idx)} y={H - 4} textAnchor="middle" fontSize="9" fill="#64748b">
            {data[idx]?.date?.slice(5)}
          </text>
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGrad)" />

        {/* Price line */}
        <polyline points={linePts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />

        {/* Crosshair */}
        {hoveredIdx !== null && (
          <>
            <line
              x1={xOf(hoveredIdx)} y1={PAD.top}
              x2={xOf(hoveredIdx)} y2={PAD.top + innerH}
              stroke="rgba(255,255,255,0.25)" strokeWidth="1" strokeDasharray="3 3"
            />
            <circle
              cx={xOf(hoveredIdx)} cy={yOf(data[hoveredIdx].close)}
              r="3.5" fill={color} stroke="#0f172a" strokeWidth="1.5"
            />
          </>
        )}
      </svg>

      {/* Floating tooltip */}
      {hovered && (
        <div className="pointer-events-none absolute left-14 top-1 rounded border border-border/60 bg-card/95 px-2 py-1 text-xs shadow backdrop-blur-sm">
          <span className="text-muted-foreground">{hovered.date} · </span>
          <span className="font-mono font-semibold">${hovered.close.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inference engine — derives conclusions from screener data + live events
// ─────────────────────────────────────────────────────────────────────────────

const SECTOR_THEME_MAP: Record<string, string[]> = {
  Technology:           ["Trade", "Monetary Policy"],
  "Financial Services": ["Monetary Policy", "Inflation"],
  Energy:               ["Geopolitical", "Trade", "Inflation"],
  Healthcare:           ["Fiscal"],
  Industrials:          ["Trade", "Growth"],
  "Consumer Cyclical":  ["Inflation", "Monetary Policy"],
  "Consumer Defensive": ["Inflation"],
  "Basic Materials":    ["Trade", "Geopolitical"],
  "Real Estate":        ["Monetary Policy", "Inflation"],
  Utilities:            ["Inflation", "Monetary Policy"],
  "Communication Services": ["Trade", "Geopolitical"],
};

function inferConclusions(r: ScreenerResult, events: EventListItem[]): string[] {
  const insights: string[] = [];

  // 1. Trend
  if (r.ret_1y > 20) insights.push(`Strong uptrend (+${r.ret_1y}% YTD) — price momentum firmly bullish.`);
  else if (r.ret_1y > 0) insights.push(`Modest annual gain (+${r.ret_1y}%) — mild uptrend, watch for catalysts.`);
  else if (r.ret_1y > -20) insights.push(`Down ${Math.abs(r.ret_1y)}% over the past year — bearish trend, entry risk elevated.`);
  else insights.push(`Significant drawdown (${r.ret_1y}% YTD) — high caution warranted.`);

  // 2. Short-term momentum vs long-term
  const momentumAccel = r.ret_1m > 0 && r.ret_1y > 0 && r.ret_1m * 12 > r.ret_1y;
  const momentumDecel = r.ret_1m < 0 && r.ret_1y > 0;
  if (momentumAccel) insights.push(`1-month return (${r.ret_1m > 0 ? "+" : ""}${r.ret_1m}%) is outpacing the annual trend — momentum accelerating.`);
  else if (momentumDecel) insights.push(`Recent month underperforming despite positive YTD — momentum decelerating, potential reversal signal.`);

  // 3. 52W range position
  if (r.week_52_high && r.week_52_low) {
    const rangePos = ((r.price - r.week_52_low) / (r.week_52_high - r.week_52_low)) * 100;
    if (rangePos >= 85) insights.push(`Trading near 52-week high ($${r.week_52_high}) — ${rangePos.toFixed(0)}% of annual range. Overbought risk.`);
    else if (rangePos <= 15) insights.push(`Near 52-week low ($${r.week_52_low}) — ${rangePos.toFixed(0)}% of annual range. Potential value opportunity or further weakness.`);
    else insights.push(`Mid-range position at ${rangePos.toFixed(0)}% of 52W range ($${r.week_52_low} – $${r.week_52_high}).`);
  }

  // 4. Valuation
  if (r.pe_ratio) {
    if (r.pe_ratio > 40) insights.push(`High P/E of ${r.pe_ratio}x — growth expectations priced in; vulnerable to rate rises or earnings misses.`);
    else if (r.pe_ratio > 20) insights.push(`P/E of ${r.pe_ratio}x — fair to moderately expensive; in line with broad market.`);
    else insights.push(`Low P/E of ${r.pe_ratio}x — cheap relative to market, but may reflect structural concerns.`);
  }

  // 5. Beta / volatility
  if (r.beta) {
    if (r.beta > 1.4) insights.push(`High beta (${r.beta}) — amplifies market moves; expect larger swings during macro stress.`);
    else if (r.beta < 0.6) insights.push(`Low beta (${r.beta}) — defensive characteristic; less sensitive to macro shocks.`);
  }

  // 6. Macro event exposure
  const relevantThemes = r.sector ? (SECTOR_THEME_MAP[r.sector] ?? []) : [];
  if (relevantThemes.length > 0 && events.length > 0) {
    const hotEvents = events.filter(
      (ev) => relevantThemes.includes(ev.theme) && ["hot", "warming"].includes(ev.heat?.toLowerCase())
    );
    if (hotEvents.length > 0) {
      const names = hotEvents.slice(0, 2).map((e) => `"${e.headline.slice(0, 50)}…"`).join(", ");
      insights.push(`${hotEvents.length} live macro event${hotEvents.length > 1 ? "s" : ""} directly affecting ${r.sector}: ${names}`);
    } else {
      insights.push(`No hot macro events currently impacting ${r.sector} sector — relative insulation.`);
    }
  }

  // 7. Dividend
  if (r.dividend_yield && r.dividend_yield > 0) {
    insights.push(`Dividend yield of ${r.dividend_yield}% provides income cushion in risk-off environments.`);
  }

  return insights.slice(0, 5);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function fmtCap(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n}`;
}

function corrColor(v: number): string {
  if (v >= 0.7)  return "rgba(52,211,153,0.35)";
  if (v >= 0.3)  return "rgba(52,211,153,0.15)";
  if (v >= -0.3) return "rgba(148,163,184,0.1)";
  if (v >= -0.7) return "rgba(248,113,113,0.15)";
  return "rgba(248,113,113,0.35)";
}

function sentimentColor(v: number): string {
  if (v >= 0.2)  return "#34d399";
  if (v >= -0.2) return "#94a3b8";
  return "#f87171";
}

const DEFAULT_TICKERS = ["SPY", "GLD", "TLT", "USO", "EEM"];

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export function PortfolioView({ events }: { events: EventListItem[] }) {
  // Screener
  const [query, setQuery]                       = useState("");
  const [screenerResult, setScreenerResult]     = useState<ScreenerResult | null>(null);
  const [screenerLoading, setScreenerLoading]   = useState(false);
  const [screenerError, setScreenerError]       = useState<string | null>(null);

  // Correlation
  const [corrTickers, setCorrTickers] = useState<string[]>(DEFAULT_TICKERS);
  const [tickerInput, setTickerInput] = useState("");
  const [corrData, setCorrData]       = useState<CorrelationResult | null>(null);
  const [corrLoading, setCorrLoading] = useState(false);

  // Sentiment
  const [sentiment, setSentiment] = useState<SentimentItem[]>([]);

  // Domino
  const [activeProfile, setActiveProfile] = useState<string>("balanced");

  // ── Fetch correlation ────────────────────────────────────────────────────
  const fetchCorrelation = useCallback(async (tickers: string[]) => {
    if (tickers.length < 2) return;
    setCorrLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/correlation?tickers=${tickers.join(",")}`);
      setCorrData(await res.json());
    } catch { /* silent */ }
    finally { setCorrLoading(false); }
  }, []);

  useEffect(() => { fetchCorrelation(corrTickers); }, [corrTickers, fetchCorrelation]);

  // ── Fetch sentiment ──────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/api/sentiment`).then((r) => r.json()).then(setSentiment).catch(() => {});
  }, []);

  // ── Screener submit ──────────────────────────────────────────────────────
  async function handleScreener(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim().toUpperCase();
    if (!q) return;
    setScreenerLoading(true);
    setScreenerError(null);
    setScreenerResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/screener?q=${encodeURIComponent(q)}`);
      if (!res.ok) { const err = await res.json(); throw new Error(err.detail || "Not found"); }
      setScreenerResult(await res.json());
    } catch (err: unknown) {
      setScreenerError(err instanceof Error ? err.message : "Failed to fetch ticker");
    } finally {
      setScreenerLoading(false);
    }
  }

  // ── Correlation ticker management ────────────────────────────────────────
  function addTicker() {
    const t = tickerInput.trim().toUpperCase();
    if (!t || corrTickers.includes(t) || corrTickers.length >= 8) return;
    setCorrTickers([...corrTickers, t]);
    setTickerInput("");
  }
  function removeTicker(t: string) {
    if (corrTickers.length <= 2) return;
    setCorrTickers(corrTickers.filter((x) => x !== t));
  }

  // ── Domino simulator ─────────────────────────────────────────────────────
  const profile  = PROFILES.find((p) => p.id === activeProfile) ?? PROFILES[1];
  const contribs = useMemo(() => computeContribs(events, profile.alloc), [events, profile]);
  const total    = contribs.reduce((s, c) => s + c.value, 0);
  const maxAbs   = Math.max(...contribs.map((c) => Math.abs(c.value)), 0.01);
  const worstTheme = contribs.find((c) => c.value < 0);
  const insightText = worstTheme
    ? `${profile.label} portfolios are most exposed to ${worstTheme.theme} risk (${worstTheme.value.toFixed(2)}% drag) given current macro heat.`
    : `${profile.label} portfolios show net resilience across current macro events.`;

  // ── Screener inference ───────────────────────────────────────────────────
  const conclusions = useMemo(
    () => (screenerResult ? inferConclusions(screenerResult, events) : []),
    [screenerResult, events]
  );

  const isPositive = screenerResult ? screenerResult.ret_1y >= 0 : true;
  const priceColor = screenerResult
    ? (screenerResult.ret_1d >= 0 ? "#34d399" : "#f87171")
    : "#94a3b8";

  // 52W position %
  const rangePos = screenerResult
    ? Math.round(((screenerResult.price - screenerResult.week_52_low) /
        (screenerResult.week_52_high - screenerResult.week_52_low)) * 100)
    : null;

  return (
    <div className="flex flex-col gap-6">

      {/* ── SECTION 1: Fund Screener ─────────────────────────────────────── */}
      <div className="rounded-xl border border-border/60 bg-card/50 p-5 backdrop-blur-sm">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Fund Screener</h2>
          <p className="text-xs text-muted-foreground">Search any ticker — live price, 90-day chart, and macro inference</p>
        </div>

        <form onSubmit={handleScreener} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter ticker, e.g. AAPL, TSLA, GLD, SPY…"
            className="flex-1 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-white/20"
          />
          <button
            type="submit"
            disabled={screenerLoading}
            className="rounded-lg border border-border/60 bg-white/5 px-5 py-2 text-sm font-medium hover:bg-white/10 disabled:opacity-40 transition-colors"
          >
            {screenerLoading ? "Loading…" : "Search"}
          </button>
        </form>

        {screenerError && (
          <p className="mt-3 text-xs text-red-400">{screenerError}</p>
        )}

        {screenerResult && (
          <div className="mt-4 rounded-lg border border-border/40 bg-card/40 overflow-hidden">

            {/* Top strip: name + price + metadata */}
            <div className="flex flex-wrap items-start gap-6 p-4 border-b border-border/30">
              {/* Name + price */}
              <div className="flex-1 min-w-48">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-lg font-bold">{screenerResult.ticker}</span>
                  {screenerResult.sector && (
                    <span className="rounded-full border border-border/50 bg-white/5 px-2 py-0.5 text-[10px] text-muted-foreground">
                      {screenerResult.sector}
                    </span>
                  )}
                  {screenerResult.industry && (
                    <span className="text-[10px] text-muted-foreground">{screenerResult.industry}</span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-xs">{screenerResult.name}</p>
                <div className="mt-2 flex items-baseline gap-3">
                  <span className="text-3xl font-bold tabular-nums">
                    ${screenerResult.price.toLocaleString()}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: priceColor }}>
                    {screenerResult.ret_1d >= 0 ? "▲" : "▼"} {Math.abs(screenerResult.ret_1d)}% today
                  </span>
                </div>
                {/* Return pills */}
                <div className="mt-3 flex flex-wrap gap-2">
                  {[
                    { label: "1W", v: screenerResult.ret_1w },
                    { label: "1M", v: screenerResult.ret_1m },
                    { label: "1Y", v: screenerResult.ret_1y },
                  ].map(({ label, v }) => (
                    <span
                      key={label}
                      className="rounded px-2 py-0.5 text-xs font-mono"
                      style={{
                        background: v >= 0 ? "rgba(52,211,153,0.12)" : "rgba(248,113,113,0.12)",
                        color: v >= 0 ? "#34d399" : "#f87171",
                      }}
                    >
                      {label}: {v >= 0 ? "+" : ""}{v}%
                    </span>
                  ))}
                </div>
              </div>

              {/* Metadata grid */}
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs self-start">
                {[
                  ["Market Cap",    fmtCap(screenerResult.market_cap)],
                  ["P/E Ratio",     screenerResult.pe_ratio ? `${screenerResult.pe_ratio}x` : "—"],
                  ["Beta",          screenerResult.beta ?? "—"],
                  ["Dividend Yield",screenerResult.dividend_yield ? `${screenerResult.dividend_yield}%` : "—"],
                  ["52W High",      `$${screenerResult.week_52_high}`],
                  ["52W Low",       `$${screenerResult.week_52_low}`],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-mono">{val}</span>
                  </div>
                ))}
              </div>

              {/* 52W range bar */}
              {rangePos !== null && (
                <div className="min-w-40 flex flex-col gap-1.5">
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>52W Low</span>
                    <span>52W High</span>
                  </div>
                  <div className="relative h-2 rounded-full bg-white/10">
                    <div
                      className="absolute h-2 rounded-full"
                      style={{
                        width: `${rangePos}%`,
                        background: isPositive ? "#34d399" : "#f87171",
                        minWidth: 4,
                      }}
                    />
                    <div
                      className="absolute top-1/2 -translate-y-1/2 h-3.5 w-1 rounded-full bg-white"
                      style={{ left: `calc(${rangePos}% - 2px)` }}
                    />
                  </div>
                  <p className="text-center text-[10px] text-muted-foreground">
                    At {rangePos}% of 52-week range
                  </p>
                </div>
              )}
            </div>

            {/* Price chart */}
            <div className="px-4 pt-4 pb-2">
              <p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                90-Day Price Chart
              </p>
              <PriceChart data={screenerResult.chart} positive={isPositive} />
            </div>

            {/* Macro inference */}
            {conclusions.length > 0 && (
              <div className="border-t border-border/30 px-4 py-3">
                <p className="mb-2 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Macro Inference
                </p>
                <ul className="flex flex-col gap-1.5">
                  {conclusions.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs leading-relaxed">
                      <span className="mt-0.5 shrink-0 text-blue-400">›</span>
                      <span className="text-foreground/80">{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── SECTIONS 2 + 3: Two columns ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* ── Asset Correlation + VADER Sentiment ─────────────────────── */}
        <div className="rounded-xl border border-border/60 bg-card/50 p-5 backdrop-blur-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Asset Correlation</h2>
            <p className="text-xs text-muted-foreground">3-month rolling returns · green = positive · red = inverse</p>
          </div>

          {/* Ticker chips */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            {corrTickers.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 rounded-full border border-border/50 bg-white/5 px-2.5 py-0.5 text-xs font-medium"
              >
                {t}
                <button onClick={() => removeTicker(t)} className="ml-0.5 text-muted-foreground hover:text-foreground">×</button>
              </span>
            ))}
            <form onSubmit={(e) => { e.preventDefault(); addTicker(); }} className="flex gap-1">
              <input
                type="text"
                value={tickerInput}
                onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                placeholder="+ ticker"
                maxLength={6}
                className="w-20 rounded border border-border/40 bg-background/40 px-2 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </form>
          </div>

          {/* Correlation matrix */}
          {corrLoading ? (
            <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
              Fetching 3-month returns…
            </div>
          ) : corrData && corrData.tickers.length >= 2 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>
                    <th className="pb-1 pr-2 text-left font-normal"></th>
                    {corrData.tickers.map((t) => (
                      <th key={t} className="pb-1 px-1 text-center font-mono font-semibold">{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {corrData.tickers.map((row) => (
                    <tr key={row}>
                      <td className="pr-2 py-0.5 font-mono font-semibold text-right text-muted-foreground">{row}</td>
                      {corrData.tickers.map((col) => {
                        const v = corrData.matrix[row]?.[col] ?? 0;
                        const isDiag = row === col;
                        return (
                          <td
                            key={col}
                            className="px-1 py-0.5 text-center font-mono tabular-nums rounded"
                            style={{
                              background: isDiag ? "rgba(255,255,255,0.04)" : corrColor(v),
                              color: isDiag ? "#94a3b8" : undefined,
                            }}
                          >
                            {v.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Add at least 2 tickers to compute correlation.</p>
          )}

          {/* VADER Sentiment */}
          {sentiment.length > 0 && (
            <div className="mt-5">
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-sm font-semibold">News Sentiment</h3>
                <span className="text-[10px] text-muted-foreground">VADER · live events</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {sentiment.map((s) => {
                  const pct = Math.abs(s.sentiment) * 100;
                  return (
                    <div key={s.theme} className="flex items-center gap-3">
                      <span className="w-32 shrink-0 text-right text-xs text-muted-foreground">{s.theme}</span>
                      <div className="relative flex h-4 flex-1 items-center rounded-sm bg-white/5">
                        <div
                          className="h-full rounded-sm transition-all duration-500"
                          style={{ width: `${pct}%`, background: sentimentColor(s.sentiment), opacity: 0.7, minWidth: 3 }}
                        />
                      </div>
                      <span className="w-12 shrink-0 text-right text-xs font-mono" style={{ color: sentimentColor(s.sentiment) }}>
                        {s.sentiment >= 0 ? "+" : ""}{s.sentiment.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">+1 = bullish · 0 = neutral · −1 = bearish</p>
            </div>
          )}
        </div>

        {/* ── Macro Domino Simulator ───────────────────────────────────── */}
        <div className="rounded-xl border border-border/60 bg-card/50 p-5 backdrop-blur-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Macro Domino Simulator</h2>
            <p className="text-xs text-muted-foreground">
              Estimated portfolio drawdown from {events.length} live macro events
            </p>
          </div>

          {/* Profile selector */}
          <div className="mb-4 flex gap-2">
            {PROFILES.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveProfile(p.id)}
                className={`flex flex-1 flex-col rounded-lg border px-3 py-2 text-left transition-all duration-150 ${
                  activeProfile === p.id
                    ? "border-white/20 bg-white/8 ring-1 ring-white/20"
                    : "border-border/40 bg-card/20 hover:border-border/70"
                }`}
              >
                <span className="text-xs font-semibold">{p.label}</span>
                <span className="text-[10px] text-muted-foreground">{p.risk}</span>
                <span className="text-[10px] text-muted-foreground">{p.desc}</span>
              </button>
            ))}
          </div>

          {/* Waterfall bars */}
          <div className="flex gap-4">
            <div className="flex flex-1 flex-col gap-2">
              {contribs.map((c) => {
                const isPos = c.value >= 0;
                const barPct = (Math.abs(c.value) / maxAbs) * 100;
                return (
                  <div key={c.theme} className="flex items-center gap-3">
                    <span className="w-32 shrink-0 text-right text-xs text-muted-foreground">{c.theme}</span>
                    <div className="relative flex h-6 flex-1 items-center rounded-sm bg-white/5">
                      <div
                        className="h-full rounded-sm transition-all duration-500"
                        style={{ width: `${barPct}%`, background: isPos ? "#34d399" : c.color, opacity: isPos ? 0.85 : 0.75, minWidth: 3 }}
                      />
                    </div>
                    <span className="w-14 shrink-0 text-right text-xs font-mono font-semibold" style={{ color: isPos ? "#34d399" : c.color }}>
                      {isPos ? "+" : ""}{c.value.toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div className="flex w-28 shrink-0 flex-col items-center justify-center rounded-lg border border-border/40 bg-card/50 px-3 py-3">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Est. Impact</span>
              <span className="mt-1 text-3xl font-bold tabular-nums" style={{ color: total < 0 ? "#f87171" : "#34d399" }}>
                {total >= 0 ? "+" : ""}{total.toFixed(2)}%
              </span>
              <span className="mt-1 text-[10px] text-muted-foreground text-center">{profile.label}</span>
            </div>
          </div>

          {/* Top event callout */}
          {events.length > 0 && (() => {
            const top = [...events].sort((a, b) => b.portfolio_impact - a.portfolio_impact)[0];
            return (
              <div className="mt-4 rounded-lg border border-white/10 bg-white/3 px-4 py-2.5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Highest impact event</p>
                <p className="text-xs font-medium truncate">{top.headline}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{top.theme} · {top.country} · Heat: {top.heat}</p>
              </div>
            );
          })()}

          {/* Insight bar */}
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5">
            <span className="mt-0.5 text-amber-400">⚠</span>
            <p className="text-xs leading-relaxed text-amber-200/80">{insightText}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
