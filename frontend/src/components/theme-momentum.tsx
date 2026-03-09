"use client";

import { useMemo } from "react";
import type { EventListItem } from "@/lib/types";

const HEAT_SCORE: Record<string, number> = {
  hot: 4, high: 4, critical: 4,
  warming: 3, moderate: 3, medium: 3,
  cooling: 2,
  cold: 1, low: 1,
};

const THEME_COLOR: Record<string, { line: string; fill: string; label: string }> = {
  "Monetary Policy": { line: "#818cf8", fill: "#818cf820", label: "text-indigo-400" },
  "Trade":          { line: "#fb923c", fill: "#fb923c20", label: "text-orange-400" },
  "Fiscal":         { line: "#34d399", fill: "#34d39920", label: "text-emerald-400" },
  "Geopolitical":   { line: "#f87171", fill: "#f8717120", label: "text-red-400" },
  "Growth":         { line: "#60a5fa", fill: "#60a5fa20", label: "text-blue-400" },
  "Inflation":      { line: "#fbbf24", fill: "#fbbf2420", label: "text-amber-400" },
};

const FALLBACK = { line: "#94a3b8", fill: "#94a3b820", label: "text-slate-400" };

function Sparkline({ scores, color }: { scores: number[]; color: string }) {
  if (scores.length < 2) {
    return <div className="h-10 w-full opacity-30 text-center text-xs text-muted-foreground flex items-center justify-center">—</div>;
  }

  const W = 120;
  const H = 40;
  const pad = 4;

  const minS = 1;
  const maxS = 4;
  const xStep = (W - pad * 2) / (scores.length - 1);

  const points = scores.map((s, i) => {
    const x = pad + i * xStep;
    const y = pad + ((maxS - s) / (maxS - minS)) * (H - pad * 2);
    return `${x},${y}`;
  });

  const polyline = points.join(" ");
  // Close path for fill: go to bottom-right, bottom-left
  const last = points[points.length - 1];
  const first = points[0];
  const fillPath = `M ${first} L ${polyline.replace(`${first} `, "")} L ${last.split(",")[0]},${H - pad} L ${pad},${H - pad} Z`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="overflow-visible">
      <defs>
        <linearGradient id={`fill-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={fillPath}
        fill={`url(#fill-${color.replace("#", "")})`}
        strokeWidth="0"
      />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Latest dot */}
      <circle
        cx={points[points.length - 1].split(",")[0]}
        cy={points[points.length - 1].split(",")[1]}
        r="2.5"
        fill={color}
      />
    </svg>
  );
}

function momentumLabel(scores: number[]): { text: string; cls: string } {
  if (scores.length < 2) return { text: "Stable", cls: "text-muted-foreground" };
  const mid = Math.floor(scores.length / 2);
  const first = scores.slice(0, mid).reduce((a, b) => a + b, 0) / mid;
  const last = scores.slice(mid).reduce((a, b) => a + b, 0) / (scores.length - mid);
  const delta = last - first;
  if (delta > 0.5) return { text: "↑ Heating", cls: "text-red-400" };
  if (delta < -0.5) return { text: "↓ Cooling", cls: "text-blue-400" };
  return { text: "→ Stable", cls: "text-muted-foreground" };
}

export function ThemeMomentum({
  events,
  selectedTheme,
  onSelect,
}: {
  events: EventListItem[];
  selectedTheme: string | null;
  onSelect: (theme: string) => void;
}) {
  const byTheme = useMemo(() => {
    const map: Record<string, EventListItem[]> = {};
    for (const e of events) {
      if (!map[e.theme]) map[e.theme] = [];
      map[e.theme].push(e);
    }
    // Sort each theme's events by date ascending
    for (const t of Object.keys(map)) {
      map[t].sort((a, b) => a.published_date.localeCompare(b.published_date));
    }
    return map;
  }, [events]);

  const themes = Object.keys(byTheme).sort();

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Theme Momentum</h2>
        <span className="text-xs text-muted-foreground">· heat score over time per theme</span>
      </div>

      <div className="flex flex-wrap gap-3">
        {themes.map((theme) => {
          const themeEvents = byTheme[theme];
          const scores = themeEvents.map((e) => HEAT_SCORE[e.heat?.toLowerCase()] ?? 2);
          const { text, cls } = momentumLabel(scores);
          const { line, label } = THEME_COLOR[theme] ?? FALLBACK;
          const isActive = selectedTheme === theme;
          const latest = themeEvents[themeEvents.length - 1];

          return (
            <button
              key={theme}
              onClick={() => onSelect(theme)}
              className={`flex flex-col gap-1 rounded-xl border px-4 py-3 text-left transition-all duration-150 ${
                isActive
                  ? "border-white/20 bg-white/5 ring-1 ring-white/20"
                  : "border-border/40 bg-card/40 hover:border-border/70 hover:bg-card/70"
              }`}
            >
              <div className="flex items-center justify-between gap-6">
                <span className={`text-xs font-semibold ${label}`}>{theme}</span>
                <span className={`text-[10px] font-medium ${cls}`}>{text}</span>
              </div>

              <Sparkline scores={scores} color={line} />

              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{themeEvents.length} event{themeEvents.length !== 1 ? "s" : ""}</span>
                <span>Latest: {latest?.heat ?? "—"}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
