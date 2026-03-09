"use client";

import { useMemo, useState } from "react";
import type { EventListItem } from "@/lib/types";

// ── Portfolio profiles ────────────────────────────────────────────────────────
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

// Sensitivity: how much each theme stresses each asset class (% per unit scaled impact)
const SENSITIVITY: Record<string, Record<AssetKey, number>> = {
  "Monetary Policy": { equities: -0.6, bonds: -1.0, em: -0.5, fx:  0.3, cash:  0.1 },
  "Trade":           { equities: -0.8, bonds:  0.2, em: -1.0, fx: -0.4, cash:  0.3 },
  "Fiscal":          { equities:  0.4, bonds: -0.8, em:  0.2, fx: -0.2, cash:  0.0 },
  "Geopolitical":    { equities: -1.0, bonds:  0.4, em: -1.2, fx: -0.6, cash:  0.5 },
  "Growth":          { equities:  0.8, bonds:  0.2, em:  0.6, fx:  0.2, cash: -0.1 },
  "Inflation":       { equities: -0.6, bonds: -1.0, em: -0.4, fx:  0.2, cash:  0.0 },
};

const HEAT_FACTOR: Record<string, number> = {
  hot: 1.0, high: 1.0, critical: 1.0,
  warming: 0.6, moderate: 0.6, medium: 0.6,
  cooling: 0.2,
  cold: 0.05, low: 0.05,
};

const THEME_COLOR: Record<string, string> = {
  "Monetary Policy": "#818cf8",
  "Trade":           "#fb923c",
  "Fiscal":          "#34d399",
  "Geopolitical":    "#f87171",
  "Growth":          "#60a5fa",
  "Inflation":       "#fbbf24",
};

type Contrib = { theme: string; value: number; color: string };

function computeContribs(
  events: EventListItem[],
  alloc: Record<AssetKey, number>
): Contrib[] {
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
    .sort((a, b) => a.value - b.value); // worst first
}

function insight(contribs: Contrib[], profileLabel: string): string {
  const worst = contribs.find((c) => c.value < 0);
  if (!worst) return `${profileLabel} portfolios show resilience across current macro events.`;
  const pct = contribs.reduce((s, c) => s + (c.value < 0 ? c.value : 0), 0);
  const share = pct !== 0 ? Math.round((worst.value / pct) * 100) : 0;
  return `${profileLabel} portfolios are most exposed to ${worst.theme} risk, accounting for ${share}% of estimated drawdown.`;
}

export function PortfolioStressTester({ events }: { events: EventListItem[] }) {
  const [activeProfile, setActiveProfile] = useState<string>("balanced");

  const profile = PROFILES.find((p) => p.id === activeProfile) ?? PROFILES[1];
  const contribs = useMemo(
    () => computeContribs(events, profile.alloc),
    [events, profile]
  );
  const total = contribs.reduce((s, c) => s + c.value, 0);
  const maxAbs = Math.max(...contribs.map((c) => Math.abs(c.value)), 0.01);
  const insightText = useMemo(() => insight(contribs, profile.label), [contribs, profile.label]);

  return (
    <div className="mb-8 rounded-xl border border-border/60 bg-card/50 p-5 backdrop-blur-sm">
      {/* Header row */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Portfolio Stress Test</h2>
          <p className="text-xs text-muted-foreground">
            Estimated drawdown from active macro events
          </p>
        </div>

        {/* Profile selector */}
        <div className="flex gap-2">
          {PROFILES.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveProfile(p.id)}
              className={`flex flex-col rounded-lg border px-3 py-2 text-left transition-all duration-150 ${
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
      </div>

      {/* Main body: waterfall bars + total */}
      <div className="flex gap-6">
        {/* Bars */}
        <div className="flex flex-1 flex-col gap-2">
          {contribs.map((c) => {
            const isPos = c.value >= 0;
            const barPct = (Math.abs(c.value) / maxAbs) * 100;
            return (
              <div key={c.theme} className="flex items-center gap-3">
                {/* Theme label */}
                <span className="w-32 shrink-0 text-right text-xs text-muted-foreground">
                  {c.theme}
                </span>

                {/* Bar track */}
                <div className="relative flex h-6 flex-1 items-center rounded-sm bg-white/5">
                  <div
                    className="h-full rounded-sm transition-all duration-500"
                    style={{
                      width: `${barPct}%`,
                      background: isPos ? "#34d399" : c.color,
                      opacity: isPos ? 0.85 : 0.75,
                      minWidth: 3,
                    }}
                  />
                </div>

                {/* Value */}
                <span
                  className="w-14 shrink-0 text-right text-xs font-mono font-semibold"
                  style={{ color: isPos ? "#34d399" : c.color }}
                >
                  {isPos ? "+" : ""}
                  {c.value.toFixed(2)}%
                </span>
              </div>
            );
          })}
        </div>

        {/* Total panel */}
        <div className="flex w-36 shrink-0 flex-col items-center justify-center rounded-lg border border-border/40 bg-card/50 px-4 py-3">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Est. Impact
          </span>
          <span
            className="mt-1 text-3xl font-bold tabular-nums"
            style={{ color: total < 0 ? "#f87171" : "#34d399" }}
          >
            {total >= 0 ? "+" : ""}
            {total.toFixed(2)}%
          </span>
          <span className="mt-1 text-[10px] text-muted-foreground">{profile.label} mandate</span>
        </div>
      </div>

      {/* Insight bar */}
      <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-2.5">
        <span className="mt-0.5 text-amber-400">⚠</span>
        <p className="text-xs leading-relaxed text-amber-200/80">{insightText}</p>
      </div>
    </div>
  );
}
