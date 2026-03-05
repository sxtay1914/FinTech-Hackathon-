import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ImpactDots } from "@/components/impact-dots";
import { ThemeBadge } from "@/components/theme-badge";
import type { EventDetail } from "@/lib/types";

export function EventSidebar({ event }: { event: EventDetail }) {
  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto pr-2">
      {/* Header card */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{event.source}</span>
            <span>·</span>
            <span>{event.published_date}</span>
          </div>
          <CardTitle className="text-lg leading-snug">{event.headline}</CardTitle>
          <div className="flex items-center gap-2 pt-1">
            <Badge variant="outline" className="text-xs">
              {event.country}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {event.theme}
            </Badge>
            <ThemeBadge heat={event.heat} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <p className="text-sm leading-relaxed text-muted-foreground">{event.summary}</p>
          <div className="flex items-center gap-6">
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Opportunity</p>
              <ImpactDots value={event.opportunity_impact} variant="opportunity" />
            </div>
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Portfolio</p>
              <ImpactDots value={event.portfolio_impact} variant="portfolio" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Chain card */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Risk Chain</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {event.risk_chain.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {i + 1}
                </div>
                <p className="text-sm text-muted-foreground">{step}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Analysis card */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Analysis</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {event.analysis}
          </p>
        </CardContent>
      </Card>

      {/* Actions card */}
      <Card className="border-border/50 bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Recommended Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {event.actions.map((action, i) => (
            <div key={i}>
              {i > 0 && <Separator className="mb-3" />}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{action.action}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{action.rationale}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Badge
                    variant="outline"
                    className={
                      action.direction === "Buy"
                        ? "border-emerald-500/30 text-emerald-400"
                        : action.direction === "Sell"
                        ? "border-red-500/30 text-red-400"
                        : action.direction === "Hedge"
                        ? "border-orange-500/30 text-orange-400"
                        : "border-border text-muted-foreground"
                    }
                  >
                    {action.direction}
                  </Badge>
                </div>
              </div>
              <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                <span>{action.asset_class}</span>
                <span>·</span>
                <span>{action.urgency}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
