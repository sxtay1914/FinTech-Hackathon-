"use client";

import { useMemo } from "react";
import type { ThemeOverview } from "@/lib/types";

const HEAT_IDLE: Record<string, string> = {
  Hot: "bg-red-500/15 text-red-300 border-red-500/25 hover:bg-red-500/25",
  Warming: "bg-amber-500/15 text-amber-300 border-amber-500/25 hover:bg-amber-500/25",
  Cooling: "bg-blue-400/15 text-blue-300 border-blue-400/25 hover:bg-blue-400/25",
  Cold: "bg-slate-500/15 text-slate-400 border-slate-500/25 hover:bg-slate-500/25",
};

const HEAT_ACTIVE: Record<string, string> = {
  Hot: "bg-red-500/35 text-red-200 border-red-400 ring-1 ring-red-400/60",
  Warming: "bg-amber-500/35 text-amber-200 border-amber-400 ring-1 ring-amber-400/60",
  Cooling: "bg-blue-400/35 text-blue-200 border-blue-400 ring-1 ring-blue-400/60",
  Cold: "bg-slate-500/35 text-slate-200 border-slate-400 ring-1 ring-slate-400/60",
};

const HEAT_DOT: Record<string, string> = {
  Hot: "bg-red-400",
  Warming: "bg-amber-400",
  Cooling: "bg-blue-400",
  Cold: "bg-slate-400",
};

const HEAT_LABEL: Record<string, string> = {
  Hot: "text-red-400",
  Warming: "text-amber-400",
  Cooling: "text-blue-400",
  Cold: "text-slate-400",
};

function scaleText(count: number, max: number): string {
  const r = max > 1 ? count / max : 1;
  if (r >= 0.8) return "text-2xl font-semibold";
  if (r >= 0.6) return "text-xl font-semibold";
  if (r >= 0.4) return "text-lg font-medium";
  if (r >= 0.2) return "text-base font-medium";
  return "text-sm font-medium";
}

export function ThemeCloud({
  themes,
  selectedTheme,
  onSelect,
}: {
  themes: ThemeOverview[];
  selectedTheme: string | null;
  onSelect: (theme: string) => void;
}) {
  const maxCount = useMemo(() => Math.max(...themes.map((t) => t.event_count), 1), [themes]);

  // Sort: Hot first, then by event_count desc
  const sorted = useMemo(() => {
    const order = { Hot: 0, Warming: 1, Cooling: 2, Cold: 3 };
    return [...themes].sort(
      (a, b) =>
        (order[a.heat as keyof typeof order] ?? 4) -
          (order[b.heat as keyof typeof order] ?? 4) ||
        b.event_count - a.event_count
    );
  }, [themes]);

  return (
    <div className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Theme Pulse</h2>
        {selectedTheme && (
          <button
            onClick={() => onSelect(selectedTheme)}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            ✕ Clear filter
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border/40 bg-card/40 px-6 py-5">
        {sorted.map((t) => {
          const isActive = selectedTheme === t.theme;
          const idle = HEAT_IDLE[t.heat] ?? HEAT_IDLE.Warming;
          const active = HEAT_ACTIVE[t.heat] ?? HEAT_ACTIVE.Warming;

          return (
            <button
              key={t.theme}
              onClick={() => onSelect(t.theme)}
              className={`group flex flex-col items-center gap-1 rounded-xl border px-4 py-3 transition-all duration-150 ${
                isActive ? active : idle
              }`}
            >
              {/* Theme name — scaled by event count */}
              <span className={scaleText(t.event_count, maxCount)}>{t.theme}</span>

              {/* Heat + event count row */}
              <div className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-1.5 w-1.5 rounded-full ${HEAT_DOT[t.heat] ?? "bg-muted"}`}
                />
                <span className={`text-[10px] font-medium uppercase tracking-wide ${HEAT_LABEL[t.heat] ?? "text-muted-foreground"}`}>
                  {t.heat}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  · {t.event_count} event{t.event_count !== 1 ? "s" : ""}
                </span>
              </div>

              {/* Avg impact */}
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span>Opp {t.avg_opportunity_impact.toFixed(1)}</span>
                <span>·</span>
                <span>Port {t.avg_portfolio_impact.toFixed(1)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {selectedTheme && (
        <p className="mt-2 text-xs text-muted-foreground">
          Showing news filtered to{" "}
          <span className="font-medium text-foreground">{selectedTheme}</span>. Click the theme again or &ldquo;Clear filter&rdquo; to reset.
        </p>
      )}
    </div>
  );
}
