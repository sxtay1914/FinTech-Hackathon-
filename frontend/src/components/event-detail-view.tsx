"use client";

import { useState } from "react";
import { EventSidebar } from "@/components/event-sidebar";
import { GlobeView } from "@/components/globe-view";
import { MarketMemory } from "@/components/market-memory";
import { MemoryDetail } from "@/components/memory-detail";
import type { EventDetail, HistoricalPrecedent } from "@/lib/types";

export function EventDetailView({ event }: { event: EventDetail }) {
  const [globeTarget, setGlobeTarget] = useState<{ lat: number; lng: number }>({
    lat: event.lat,
    lng: event.lng,
  });
  const [selectedMemory, setSelectedMemory] = useState<HistoricalPrecedent | null>(null);

  function handleMemoryClick(precedent: HistoricalPrecedent) {
    if (selectedMemory?.title === precedent.title) {
      // Deselect — go back to event
      setSelectedMemory(null);
      setGlobeTarget({ lat: event.lat, lng: event.lng });
    } else {
      setSelectedMemory(precedent);
      if (precedent.lat && precedent.lng) {
        setGlobeTarget({ lat: precedent.lat, lng: precedent.lng });
      }
    }
  }

  function handleCloseMemory() {
    setSelectedMemory(null);
    setGlobeTarget({ lat: event.lat, lng: event.lng });
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Main content: sidebar + globe */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - 35% */}
        <div className="w-[35%] shrink-0 overflow-y-auto border-r border-border/40 p-4">
          {selectedMemory ? (
            <MemoryDetail memory={selectedMemory} onClose={handleCloseMemory} />
          ) : (
            <EventSidebar event={event} />
          )}
        </div>
        {/* Globe - 65% */}
        <div className="flex-1">
          <GlobeView
            connections={event.globe_connections}
            points={event.globe_points}
            centerLat={globeTarget.lat}
            centerLng={globeTarget.lng}
          />
        </div>
      </div>
      {/* Bottom MarketMemory timeline */}
      <div className="shrink-0 border-t border-border/40 bg-card/50 px-6 py-4">
        <MarketMemory
          precedents={event.historical_precedents}
          selected={selectedMemory}
          onSelect={handleMemoryClick}
        />
      </div>
    </div>
  );
}
