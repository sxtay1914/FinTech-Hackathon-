"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { HistoricalPrecedent } from "@/lib/types";

interface MarketMemoryProps {
  precedents: HistoricalPrecedent[];
  selected: HistoricalPrecedent | null;
  onSelect: (p: HistoricalPrecedent) => void;
  onNow?: () => void;
  predictedImpact?: string;
}

export function MarketMemory({ precedents, selected, onSelect, onNow, predictedImpact }: MarketMemoryProps) {
  if (!precedents.length) return null;

  // Total stops = precedents + optional "NOW" stop
  const totalStops = precedents.length + (predictedImpact ? 1 : 0);
  const nowIndex = totalStops - 1; // last stop = "NOW"

  // Track slider index; default to first precedent
  const [sliderIdx, setSliderIdx] = useState(0);

  // Sync slider when external selection changes (e.g. deselect → reset to 0)
  useEffect(() => {
    if (!selected) {
      setSliderIdx(0);
    } else {
      const idx = precedents.findIndex((p) => p.title === selected.title);
      if (idx >= 0) setSliderIdx(idx);
    }
  }, [selected, precedents]);

  const isNow = predictedImpact && sliderIdx === nowIndex;
  const currentPrecedent = isNow ? null : precedents[sliderIdx];
  const progress = totalStops > 1 ? (sliderIdx / (totalStops - 1)) * 100 : 0;

  function handleSlider(idx: number) {
    setSliderIdx(idx);
    if (!predictedImpact || idx < nowIndex) {
      onSelect(precedents[idx]);
    } else {
      // "NOW" stop — reset globe to current event
      onNow?.();
    }
  }

  return (
    <div className="w-full select-none">
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/20 text-emerald-400">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M6 1v4l2.5 1.5M11 6a5 5 0 11-10 0 5 5 0 0110 0z"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h3 className="text-sm font-medium">MarketMemory</h3>
        <span className="text-xs text-muted-foreground">Drag to travel through history · globe follows</span>
      </div>

      <div className="flex gap-6">
        {/* ── Left: Scrubber ─────────────────────────────── */}
        <div className="flex flex-1 flex-col gap-2">
          {/* Year labels */}
          <div className="relative flex items-end" style={{ height: "18px" }}>
            {[...precedents.map((p) => p.year), ...(predictedImpact ? ["NOW"] : [])].map((label, i) => {
              const pct = totalStops > 1 ? (i / (totalStops - 1)) * 100 : 0;
              return (
                <span
                  key={i}
                  className={cn(
                    "absolute -translate-x-1/2 text-[9px] font-semibold uppercase tracking-wider transition-colors",
                    i === sliderIdx
                      ? label === "NOW"
                        ? "text-amber-400"
                        : "text-emerald-400"
                      : "text-muted-foreground/60"
                  )}
                  style={{ left: `${pct}%` }}
                >
                  {label}
                </span>
              );
            })}
          </div>

          {/* Slider track */}
          <div className="relative flex items-center" style={{ height: "28px" }}>
            {/* Background track */}
            <div className="absolute inset-y-0 left-0 right-0 my-auto h-1 rounded-full bg-border/60" />
            {/* Filled progress */}
            <div
              className="absolute inset-y-0 left-0 my-auto h-1 rounded-full bg-emerald-500/50 transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
            {/* Tick marks */}
            {Array.from({ length: totalStops }).map((_, i) => {
              const pct = totalStops > 1 ? (i / (totalStops - 1)) * 100 : 0;
              const isActive = i <= sliderIdx;
              const isNowTick = predictedImpact && i === nowIndex;
              return (
                <div
                  key={i}
                  className={cn(
                    "absolute -translate-x-1/2 rounded-full transition-all duration-150",
                    i === sliderIdx
                      ? isNowTick
                        ? "h-3.5 w-3.5 border-2 border-amber-400 bg-amber-400/30"
                        : "h-3.5 w-3.5 border-2 border-emerald-400 bg-emerald-400/30"
                      : isActive
                      ? "h-2 w-2 bg-emerald-500/70"
                      : "h-2 w-2 bg-border"
                  )}
                  style={{ left: `${pct}%` }}
                />
              );
            })}
            {/* Invisible range input for interaction */}
            <input
              type="range"
              min={0}
              max={totalStops - 1}
              step={1}
              value={sliderIdx}
              onChange={(e) => handleSlider(Number(e.target.value))}
              className="absolute inset-0 w-full cursor-pointer opacity-0"
              style={{ zIndex: 10 }}
            />
          </div>
        </div>

        {/* ── Right: Selected card ────────────────────────── */}
        <div className="w-72 shrink-0">
          {isNow ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 ring-1 ring-amber-500/20">
              <div className="flex items-center gap-1.5">
                <div className="relative h-2 w-2 rounded-full bg-amber-400">
                  <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/40" />
                </div>
                <span className="text-xs font-semibold text-amber-400">Predicted Impact</span>
                <span className="ml-auto text-[10px] text-muted-foreground">3–6 months</span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{predictedImpact}</p>
            </div>
          ) : currentPrecedent ? (
            <div className="rounded-lg border border-emerald-500/20 bg-card/60 px-4 py-3 ring-1 ring-emerald-500/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400">{currentPrecedent.year}</span>
                {currentPrecedent.country && (
                  <span className="text-[10px] text-muted-foreground">{currentPrecedent.country}</span>
                )}
              </div>
              <p className="mt-1 text-sm font-medium leading-snug">{currentPrecedent.title}</p>
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{currentPrecedent.description}</p>
              {currentPrecedent.market_impact && (
                <p className="mt-1.5 text-xs font-medium text-red-400">{currentPrecedent.market_impact}</p>
              )}
              <p className="mt-1.5 text-xs text-emerald-400/80 line-clamp-1">
                Outcome: {currentPrecedent.outcome}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
