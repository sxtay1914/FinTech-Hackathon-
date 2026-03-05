"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import type { HistoricalPrecedent } from "@/lib/types";

interface MemoryDetailProps {
  memory: HistoricalPrecedent;
  onClose: () => void;
}

// Simple sparkline-style bar chart showing a stylized market impact
function ImpactChart({ memory }: { memory: HistoricalPrecedent }) {
  // Generate a plausible drawdown-recovery curve
  const isNegative = memory.market_impact?.toLowerCase().includes("fell") ||
    memory.market_impact?.toLowerCase().includes("drop") ||
    memory.market_impact?.toLowerCase().includes("crash") ||
    memory.market_impact?.toLowerCase().includes("decline");

  const bars = isNegative
    ? [0, -12, -28, -45, -60, -55, -42, -30, -18, -8, 2, 10, 15, 12]
    : [0, 5, 12, 8, 15, 22, 18, 25, 30, 28, 35, 40, 38, 42];

  const max = Math.max(...bars.map(Math.abs));

  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Event start</span>
        <span>+12 months</span>
      </div>
      <div className="flex items-end gap-[3px] h-20">
        {bars.map((val, i) => {
          const height = Math.abs(val) / max * 100;
          const color = val >= 0 ? "bg-emerald-500/70" : "bg-red-500/70";
          return (
            <div key={i} className="flex-1 flex flex-col justify-end h-full">
              {val >= 0 ? (
                <div className={`${color} rounded-t-sm`} style={{ height: `${height}%` }} />
              ) : (
                <>
                  <div className="flex-1" />
                  <div className={`${color} rounded-b-sm`} style={{ height: `${height}%` }} />
                </>
              )}
            </div>
          );
        })}
      </div>
      <Separator className="mt-1" />
    </div>
  );
}

export function MemoryDetail({ memory, onClose }: MemoryDetailProps) {
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto pr-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-emerald-500/20 text-emerald-400">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1v4l2.5 1.5M11 6a5 5 0 11-10 0 5 5 0 0110 0z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="text-xs font-medium text-emerald-400">MarketMemory</span>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-7 text-xs text-muted-foreground">
          Back to event
        </Button>
      </div>

      {/* Event overview */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs">
              {memory.year}
            </Badge>
            {memory.country && (
              <Badge variant="outline" className="text-xs">{memory.country}</Badge>
            )}
          </div>
          <CardTitle className="text-lg leading-snug">{memory.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <p className="text-sm leading-relaxed text-muted-foreground">{memory.description}</p>
        </CardContent>
      </Card>

      {/* Market Impact + Chart */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Market Impact</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {memory.market_impact ? (
            <p className="text-sm font-medium text-red-400">{memory.market_impact}</p>
          ) : (
            <p className="text-sm text-muted-foreground">Significant market volatility observed across asset classes.</p>
          )}
          <ImpactChart memory={memory} />
        </CardContent>
      </Card>

      {/* Firm Response */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Firm Response</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Action Taken</p>
            <p className="text-sm leading-relaxed">
              {memory.firm_action || "Portfolio managers moved to reduce risk exposure and increase hedging positions in anticipation of continued volatility."}
            </p>
          </div>
          <Separator />
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Result</p>
            <p className="text-sm leading-relaxed text-emerald-400/90">
              {memory.firm_result || "The defensive positioning protected capital during the drawdown, and the subsequent reallocation captured the recovery."}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Outcome */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Historical Outcome</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm leading-relaxed text-muted-foreground">{memory.outcome}</p>
        </CardContent>
      </Card>
    </div>
  );
}
