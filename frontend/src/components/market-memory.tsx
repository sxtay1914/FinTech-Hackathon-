"use client";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { HistoricalPrecedent } from "@/lib/types";

interface MarketMemoryProps {
  precedents: HistoricalPrecedent[];
  selected: HistoricalPrecedent | null;
  onSelect: (p: HistoricalPrecedent) => void;
  predictedImpact?: string;
}

export function MarketMemory({ precedents, selected, onSelect, predictedImpact }: MarketMemoryProps) {
  if (!precedents.length) return null;

  return (
    <div className="w-full">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/20 text-emerald-400">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v4l2.5 1.5M11 6a5 5 0 11-10 0 5 5 0 0110 0z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </div>
        <h3 className="text-sm font-medium">MarketMemory</h3>
        <span className="text-xs text-muted-foreground">Click to explore what happened before</span>
      </div>
      {/* Timeline line */}
      <div className="relative h-px w-full bg-border" />
      {/* Cards */}
      <div className="flex gap-4 overflow-x-auto pt-3 pb-2">
        {precedents.map((p, i) => {
          const isSelected = selected?.title === p.title;
          return (
            <div
              key={i}
              className="relative min-w-[240px] max-w-[280px] shrink-0 cursor-pointer"
              onClick={() => onSelect(p)}
            >
              {/* Timeline dot */}
              <div
                className={cn(
                  "absolute -top-3 left-6 z-10 h-3.5 w-3.5 rounded-full border-2 bg-background transition-colors",
                  isSelected ? "border-emerald-400 bg-emerald-400" : "border-emerald-500"
                )}
              />
              <Card
                className={cn(
                  "border-border/50 bg-card transition-all",
                  isSelected && "border-emerald-500/50 ring-1 ring-emerald-500/30",
                  !isSelected && "hover:border-border"
                )}
              >
                <CardContent className="p-4 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-emerald-400">{p.year}</div>
                    {p.country && (
                      <span className="text-[10px] text-muted-foreground">{p.country}</span>
                    )}
                  </div>
                  <p className="mt-1 text-sm font-medium leading-snug">{p.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{p.description}</p>
                  {p.market_impact && (
                    <p className="mt-1.5 text-xs font-medium text-red-400">{p.market_impact}</p>
                  )}
                  <p className="mt-1.5 text-xs text-emerald-400/80 line-clamp-1">
                    Outcome: {p.outcome}
                  </p>
                </CardContent>
              </Card>
            </div>
          );
        })}

        {/* NOW → Predicted Impact card */}
        {predictedImpact && (
          <>
            {/* Arrow connector between history and prediction */}
            <div className="relative flex shrink-0 items-center px-1 pt-3">
              <div className="flex flex-col items-center gap-1">
                <div className="h-px w-8 bg-amber-500/40" />
                <span className="text-[9px] font-semibold uppercase tracking-widest text-amber-500/70">now</span>
              </div>
            </div>

            <div className="relative min-w-[260px] max-w-[300px] shrink-0">
              {/* Pulsing amber dot */}
              <div className="absolute -top-3 left-6 z-10 h-3.5 w-3.5 rounded-full border-2 border-amber-400 bg-amber-400/20">
                <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/30" />
              </div>
              <Card className="border-amber-500/30 bg-card ring-1 ring-amber-500/20">
                <CardContent className="p-4 pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                      <span className="text-xs font-semibold text-amber-400">Predicted Impact</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">3–6 months</span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {predictedImpact}
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
