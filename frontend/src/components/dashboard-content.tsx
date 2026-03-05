"use client";

import { useState } from "react";
import { ThemeCloud } from "@/components/theme-cloud";
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
      <ThemeCloud
        themes={themes}
        selectedTheme={selectedTheme}
        onSelect={handleThemeSelect}
      />
      <EventTable
        data={events}
        themeFilter={selectedTheme ?? undefined}
        onThemeFilterClear={() => setSelectedTheme(null)}
      />
    </>
  );
}
