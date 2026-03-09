"use client";

import { useMemo } from "react";
import type { EventListItem, ThemeOverview } from "@/lib/types";

// ── Heat styling ────────────────────────────────────────────────────────────
const HEAT_IDLE: Record<string, string> = {
  Hot:     "border-red-500/30 hover:border-red-500/50",
  Warming: "border-amber-500/30 hover:border-amber-500/50",
  Cooling: "border-blue-400/30 hover:border-blue-400/50",
  Cold:    "border-slate-500/30 hover:border-slate-500/50",
};
const HEAT_ACTIVE: Record<string, string> = {
  Hot:     "border-red-400 ring-1 ring-red-400/50 bg-red-500/10",
  Warming: "border-amber-400 ring-1 ring-amber-400/50 bg-amber-500/10",
  Cooling: "border-blue-400 ring-1 ring-blue-400/50 bg-blue-500/10",
  Cold:    "border-slate-400 ring-1 ring-slate-400/50 bg-slate-500/10",
};
const HEAT_DOT: Record<string, string> = {
  Hot: "bg-red-400", Warming: "bg-amber-400", Cooling: "bg-blue-400", Cold: "bg-slate-400",
};
const HEAT_TEXT: Record<string, string> = {
  Hot: "text-red-400", Warming: "text-amber-400", Cooling: "text-blue-400", Cold: "text-slate-400",
};

// ── Sparkline helpers ────────────────────────────────────────────────────────
const HEAT_SCORE: Record<string, number> = {
  hot: 4, high: 4, critical: 4,
  warming: 3, moderate: 3, medium: 3,
  cooling: 2,
  cold: 1, low: 1,
};
const THEME_LINE: Record<string, string> = {
  "Monetary Policy": "#818cf8",
  "Trade":           "#fb923c",
  "Fiscal":          "#34d399",
  "Geopolitical":    "#f87171",
  "Growth":          "#60a5fa",
  "Inflation":       "#fbbf24",
};

const THEME_BG: Record<string, { idle: string; active: string }> = {
  "Monetary Policy": { idle: "bg-indigo-950/40",  active: "bg-indigo-900/50"  },
  "Trade":           { idle: "bg-orange-950/40",  active: "bg-orange-900/50"  },
  "Fiscal":          { idle: "bg-emerald-950/40", active: "bg-emerald-900/50" },
  "Geopolitical":    { idle: "bg-red-950/40",     active: "bg-red-900/50"     },
  "Growth":          { idle: "bg-blue-950/40",    active: "bg-blue-900/50"    },
  "Inflation":       { idle: "bg-amber-950/40",   active: "bg-amber-900/50"   },
};

function Sparkline({ scores, color }: { scores: number[]; color: string }) {
  const W = 160;
  const H = 32;
  const pad = 3;

  if (scores.length < 2) {
    return (
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <line x1={pad} y1={H / 2} x2={W - pad} y2={H / 2}
          stroke={color} strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.4" />
      </svg>
    );
  }

  const xStep = (W - pad * 2) / (scores.length - 1);
  const pts = scores.map((s, i) => ({
    x: pad + i * xStep,
    y: pad + ((4 - s) / 3) * (H - pad * 2),
  }));

  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const fillD = `M ${pts[0].x},${pts[0].y} ` +
    pts.slice(1).map((p) => `L ${p.x},${p.y}`).join(" ") +
    ` L ${pts[pts.length - 1].x},${H} L ${pts[0].x},${H} Z`;

  const gradId = `sg-${color.replace("#", "")}`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#${gradId})`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="2.5" fill={color} />
    </svg>
  );
}

function momentumArrow(scores: number[]): { arrow: string; cls: string } {
  if (scores.length < 2) return { arrow: "→", cls: "text-muted-foreground" };
  const mid = Math.floor(scores.length / 2);
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const delta = avg(scores.slice(mid)) - avg(scores.slice(0, mid));
  if (delta > 0.4) return { arrow: "↑", cls: "text-red-400" };
  if (delta < -0.4) return { arrow: "↓", cls: "text-blue-400" };
  return { arrow: "→", cls: "text-muted-foreground" };
}

// ── Component ────────────────────────────────────────────────────────────────
export function ThemeCloud({
  themes,
  events,
  selectedTheme,
  onSelect,
}: {
  themes: ThemeOverview[];
  events: EventListItem[];
  selectedTheme: string | null;
  onSelect: (theme: string) => void;
}) {
  // Sort: Hot first, then by event_count
  const sorted = useMemo(() => {
    const order: Record<string, number> = { Hot: 0, Warming: 1, Cooling: 2, Cold: 3 };
    return [...themes].sort(
      (a, b) =>
        (order[a.heat] ?? 4) - (order[b.heat] ?? 4) || b.event_count - a.event_count
    );
  }, [themes]);

  // Pre-compute sparkline scores per theme
  const sparklineMap = useMemo(() => {
    const map: Record<string, number[]> = {};
    for (const t of themes) map[t.theme] = [];
    for (const e of [...events].sort((a, b) => a.published_date.localeCompare(b.published_date))) {
      const score = HEAT_SCORE[e.heat?.toLowerCase()] ?? 2;
      if (map[e.theme]) map[e.theme].push(score);
    }
    return map;
  }, [themes, events]);

  return (
    <div className="mb-8 rounded-xl border border-border/40 bg-card/30 p-5 backdrop-blur-sm">
      {/* Section header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Theme Pulse</h2>
          <p className="text-xs text-muted-foreground">Heat trend per theme · click to filter events</p>
        </div>
        {selectedTheme && (
          <button
            onClick={() => onSelect(selectedTheme)}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            ✕ Clear filter
          </button>
        )}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {sorted.map((t) => {
          const isActive = selectedTheme === t.theme;
          const scores = sparklineMap[t.theme] ?? [];
          const { arrow, cls: arrowCls } = momentumArrow(scores);
          const lineColor = THEME_LINE[t.theme] ?? "#94a3b8";
          const dot = HEAT_DOT[t.heat] ?? "bg-slate-400";
          const heatText = HEAT_TEXT[t.heat] ?? "text-slate-400";
          const borderCls = isActive
            ? (HEAT_ACTIVE[t.heat] ?? HEAT_ACTIVE.Cold)
            : (HEAT_IDLE[t.heat] ?? HEAT_IDLE.Cold);
          const themeBg = THEME_BG[t.theme] ?? { idle: "bg-zinc-900/40", active: "bg-zinc-800/50" };

          return (
            <button
              key={t.theme}
              onClick={() => onSelect(t.theme)}
              className={`flex flex-col gap-2 rounded-xl border px-4 py-3 text-left transition-all duration-150 ${borderCls} ${isActive ? themeBg.active : themeBg.idle}`}
            >
              {/* Row 1: theme name + momentum arrow */}
              <div className="flex items-start justify-between gap-1">
                <span className="text-sm font-semibold leading-tight">{t.theme}</span>
                <span className={`text-base font-bold leading-none ${arrowCls}`}>{arrow}</span>
              </div>

              {/* Row 2: sparkline */}
              <Sparkline scores={scores} color={lineColor} />

              {/* Row 3: heat badge + event count */}
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                <span className={`text-[10px] font-semibold uppercase tracking-wide ${heatText}`}>
                  {t.heat}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  · {t.event_count} ev
                </span>
              </div>

              {/* Row 4: avg impacts */}
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>Opp <span className="text-foreground">{t.avg_opportunity_impact.toFixed(1)}</span></span>
                <span>·</span>
                <span>Port <span className="text-foreground">{t.avg_portfolio_impact.toFixed(1)}</span></span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedTheme && (
        <p className="mt-2 text-xs text-muted-foreground">
          Filtered to{" "}
          <span className="font-medium text-foreground">{selectedTheme}</span>.
          Click again or &ldquo;Clear filter&rdquo; to reset.
        </p>
      )}
    </div>
  );
}
