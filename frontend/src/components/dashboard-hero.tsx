"use client";

import { useEffect, useState } from "react";
import { HeroGlobe } from "./hero-globe";
import type { EventListItem } from "@/lib/types";

export function DashboardHero({ events }: { events: EventListItem[] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsExpanded(window.scrollY === 0);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      className="relative w-full overflow-hidden border-b border-border/40 transition-[height] duration-500 ease-in-out"
      style={{ height: isExpanded ? "100vh" : "280px" }}
    >
      <HeroGlobe events={events} />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
