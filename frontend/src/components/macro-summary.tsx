"use client";

import { useMemo } from "react";
import type { EventListItem, ThemeOverview } from "@/lib/types";

const HEAT_ORDER: Record<string, number> = {
  hot: 4, critical: 4, high: 4,
  warming: 3, moderate: 3, medium: 3,
  cooling: 2,
  cold: 1, low: 1,
};

const HEAT_LABEL: Record<string, { label: string; cls: string }> = {
  hot: { label: "Hot", cls: "text-red-400 bg-red-500/10 border-red-500/20" },
  critical: { label: "Critical", cls: "text-red-400 bg-red-500/10 border-red-500/20" },
  high: { label: "High", cls: "text-red-400 bg-red-500/10 border-red-500/20" },
  warming: { label: "Warming", cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  moderate: { label: "Moderate", cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  medium: { label: "Medium", cls: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  cooling: { label: "Cooling", cls: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  cold: { label: "Cold", cls: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
  low: { label: "Low", cls: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
};

export function MacroSummary({
  events,
  themes,
}: {
  events: EventListItem[];
  themes: ThemeOverview[];
}) {
  const stats = useMemo(() => {
    if (!events.length) return null;

    // Hottest theme
    const hottestTheme = [...themes].sort((a, b) => {
      const ha = HEAT_ORDER[a.heat?.toLowerCase()] ?? 0;
      const hb = HEAT_ORDER[b.heat?.toLowerCase()] ?? 0;
      return hb - ha || b.avg_portfolio_impact - a.avg_portfolio_impact;
    })[0];

    // Most active country
    const countryCounts: Record<string, number> = {};
    for (const e of events) countryCounts[e.country] = (countryCounts[e.country] ?? 0) + 1;
    const topCountry = Object.entries(countryCounts).sort((a, b) => b[1] - a[1])[0];

    // Highest portfolio risk event
    const riskiest = [...events].sort((a, b) => b.portfolio_impact - a.portfolio_impact)[0];

    // Count hot/critical events
    const hotCount = events.filter((e) => {
      const h = e.heat?.toLowerCase();
      return h === "hot" || h === "critical" || h === "high";
    }).length;

    // Auto-generated narrative
    const heatWord = HEAT_ORDER[hottestTheme?.heat?.toLowerCase()] >= 3 ? "elevated" : "moderate";
    const narrative = [
      `${hottestTheme ? `${hottestTheme.theme} risk is ${heatWord} and the most active macro theme right now.` : ""}`,
      hotCount > 0 ? `${hotCount} event${hotCount > 1 ? "s" : ""} are currently flagged at high or critical heat.` : "No critical-heat events detected.",
      topCountry ? `${topCountry[0]} has the highest event concentration with ${topCountry[1]} active signal${topCountry[1] > 1 ? "s" : ""}.` : "",
    ].filter(Boolean).join(" ");

    return { hottestTheme, topCountry, riskiest, hotCount, narrative };
  }, [events, themes]);

  if (!stats) return null;

  const { hottestTheme, topCountry, riskiest, hotCount, narrative } = stats;
  const heatStyle = hottestTheme
    ? (HEAT_LABEL[hottestTheme.heat?.toLowerCase()] ?? HEAT_LABEL.cold)
    : null;

  return (
    <div className="mb-6 rounded-xl border border-border/40 bg-card/30 p-5 backdrop-blur-sm">
      {/* KPI strip */}
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Total events */}
        <div className="rounded-lg border border-border/40 bg-background/40 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Active Events</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{events.length}</p>
          <p className="text-[10px] text-muted-foreground">across global markets</p>
        </div>

        {/* Hottest theme */}
        <div className="rounded-lg border border-border/40 bg-background/40 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Top Theme</p>
          <p className="mt-1 text-lg font-bold leading-tight">{hottestTheme?.theme ?? "—"}</p>
          {heatStyle && (
            <span className={`mt-1 inline-block rounded border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${heatStyle.cls}`}>
              {heatStyle.label}
            </span>
          )}
        </div>

        {/* Most active country */}
        <div className="rounded-lg border border-border/40 bg-background/40 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Most Active</p>
          <p className="mt-1 text-lg font-bold leading-tight">{topCountry?.[0] ?? "—"}</p>
          <p className="text-[10px] text-muted-foreground">{topCountry?.[1] ?? 0} events</p>
        </div>

        {/* High-heat count */}
        <div className="rounded-lg border border-border/40 bg-background/40 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">High Risk</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${hotCount > 0 ? "text-red-400" : "text-emerald-400"}`}>
            {hotCount}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {hotCount > 0 ? "critical / high-heat events" : "no critical events"}
          </p>
        </div>
      </div>

      {/* Narrative */}
      <div className="flex items-start gap-2 rounded-lg border border-border/30 bg-background/30 px-4 py-2.5">
        <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" viewBox="0 0 14 14" fill="none">
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.2" />
          <path d="M7 4v3.5l2 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <p className="text-xs leading-relaxed text-muted-foreground">{narrative}</p>
      </div>
    </div>
  );
}
