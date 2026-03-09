"use client";

import { useState } from "react";
import { MacroSummary } from "@/components/macro-summary";
import { ThemeCloud } from "@/components/theme-cloud";
import { PortfolioStressTester } from "@/components/portfolio-stress-tester";
import { EventTable } from "@/components/event-table";
import type { EventListItem, ThemeOverview } from "@/lib/types";

export function DashboardContent({
  events,
  themes,
}: {
  events: EventListItem[];
  themes: ThemeOverview[];
}) {
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);

  const handleThemeSelect = (theme: string) => {
    setSelectedTheme((prev) => (prev === theme ? null : theme));
  };

  return (
    <>
      <MacroSummary events={events} themes={themes} />
      <ThemeCloud
        themes={themes}
        events={events}
        selectedTheme={selectedTheme}
        onSelect={handleThemeSelect}
      />
      <PortfolioStressTester events={events} />
      <EventTable
        data={events}
        themeFilter={selectedTheme ?? undefined}
        onThemeFilterClear={() => setSelectedTheme(null)}
      />
    </>
  );
}
