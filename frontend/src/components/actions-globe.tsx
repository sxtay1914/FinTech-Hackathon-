"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { EventListItem } from "@/lib/types";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

class GlobeErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError)
      return (
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          Globe unavailable
        </div>
      );
    return this.props.children;
  }
}

function impactColor(avg: number): string {
  if (avg >= 4) return "#ef4444";
  if (avg >= 3) return "#f97316";
  if (avg >= 2) return "#eab308";
  return "#10b981";
}

const THEME_COLORS: Record<string, string> = {
  "Monetary Policy": "bg-blue-500/15 text-blue-400",
  Trade: "bg-orange-500/15 text-orange-400",
  Fiscal: "bg-purple-500/15 text-purple-400",
  Geopolitical: "bg-red-500/15 text-red-400",
  Growth: "bg-emerald-500/15 text-emerald-400",
  Inflation: "bg-amber-500/15 text-amber-400",
};

const HEAT_COLORS: Record<string, string> = {
  Hot: "bg-red-500/15 text-red-400",
  Warming: "bg-amber-500/15 text-amber-400",
  Cooling: "bg-blue-400/15 text-blue-400",
  Cold: "bg-slate-500/15 text-slate-400",
};

interface CountryPoint {
  country: string;
  lat: number;
  lng: number;
  avgImpact: number;
  eventCount: number;
  color: string;
}

function ActionsGlobeInner({
  events,
  selectedCountry,
  onCountrySelect,
}: {
  events: EventListItem[];
  selectedCountry: string | null;
  onCountrySelect: (c: string | null) => void;
}) {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const countryPoints = useMemo<CountryPoint[]>(() => {
    const map = new Map<string, { lat: number; lng: number; sumImpact: number; count: number }>();
    for (const e of events) {
      const impact = (e.opportunity_impact + e.portfolio_impact) / 2;
      const existing = map.get(e.country);
      if (existing) {
        existing.sumImpact += impact;
        existing.count += 1;
      } else {
        map.set(e.country, { lat: e.lat, lng: e.lng, sumImpact: impact, count: 1 });
      }
    }
    return Array.from(map.entries()).map(([country, d]) => {
      const avg = d.sumImpact / d.count;
      return { country, lat: d.lat, lng: d.lng, avgImpact: avg, eventCount: d.count, color: impactColor(avg) };
    });
  }, [events]);

  const onGlobeReady = () => {
    const globe = globeRef.current;
    if (!globe) return;

    const controls = globe.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.5;
      controls.enablePan = false;

      const el = globe.renderer().domElement;
      el.addEventListener("pointerdown", () => { controls.autoRotate = false; });
      el.addEventListener("pointerup", () => {
        setTimeout(() => { controls.autoRotate = true; }, 2000);
      });
    }

    globe.pointOfView({ lat: 20, lng: 0, altitude: 2.0 });

    const scene = globe.scene();
    if (!scene) return;
    [...scene.children].filter((c: any) => c.isLight).forEach((l: any) => scene.remove(l));

    import("three").then((THREE) => {
      scene.add(new THREE.AmbientLight(0xffffff, 1.0));
      const dir = new THREE.DirectionalLight(0xffffff, 0.6);
      dir.position.set(1, 1, 1);
      scene.add(dir);
    });
  };

  const handlePointClick = (point: any) => {
    const p = point as CountryPoint;
    const next = selectedCountry === p.country ? null : p.country;
    onCountrySelect(next);
    if (next) {
      globeRef.current?.pointOfView({ lat: p.lat, lng: p.lng, altitude: 1.6 }, 800);
    }
  };

  return (
    <div ref={containerRef} className="h-full w-full">
      {dimensions.width > 0 && (
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundColor="rgba(0,0,0,0)"
          onGlobeReady={onGlobeReady}
          atmosphereColor="#10b981"
          atmosphereAltitude={0.15}
          showAtmosphere
          pointsData={countryPoints}
          pointLat="lat"
          pointLng="lng"
          pointColor={(d: any) =>
            (d as CountryPoint).country === selectedCountry
              ? "#ffffff"
              : (d as CountryPoint).color
          }
          pointRadius={(d: any) => {
            const p = d as CountryPoint;
            const base = 0.25 + (p.avgImpact / 5) * 0.5;
            return p.country === selectedCountry ? base * 1.4 : base;
          }}
          pointAltitude={0.01}
          pointLabel={(d: any) => {
            const p = d as CountryPoint;
            return `<div style="background:rgba(0,0,0,0.85);color:#fff;padding:6px 10px;border-radius:6px;font-size:12px;line-height:1.6;">
              <strong>${p.country}</strong><br/>
              Avg impact: ${p.avgImpact.toFixed(1)}/5 &nbsp;·&nbsp; ${p.eventCount} event${p.eventCount !== 1 ? "s" : ""}
            </div>`;
          }}
          onPointClick={handlePointClick}
          pointsMerge={false}
        />
      )}
    </div>
  );
}

export function ActionsGlobe({ events }: { events: EventListItem[] }) {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  const countryEvents = useMemo(
    () => (selectedCountry ? events.filter((e) => e.country === selectedCountry) : []),
    [events, selectedCountry]
  );

  return (
    <div className="mb-8">
      {/* Header + legend */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Impact by Country</h2>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Low
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-400" />
            Medium
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500" />
            High
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
            Critical
          </span>
        </div>
      </div>

      {/* Globe */}
      <div className="relative h-[420px] overflow-hidden rounded-xl border border-border/40 bg-black/40">
        <GlobeErrorBoundary>
          <ActionsGlobeInner
            events={events}
            selectedCountry={selectedCountry}
            onCountrySelect={setSelectedCountry}
          />
        </GlobeErrorBoundary>
        {!selectedCountry && (
          <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground/50">
            Click a country marker to view its news
          </p>
        )}
      </div>

      {/* Country news panel */}
      {selectedCountry && countryEvents.length > 0 && (
        <div className="mt-3 rounded-xl border border-border/50 bg-card/60 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {selectedCountry} —{" "}
              <span className="text-muted-foreground font-normal">
                {countryEvents.length} event{countryEvents.length !== 1 ? "s" : ""}
              </span>
            </h3>
            <button
              onClick={() => setSelectedCountry(null)}
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              ✕ Close
            </button>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {countryEvents.map((e) => (
              <Link
                key={e.id}
                href={`/events/${e.id}`}
                className="group block rounded-lg border border-border/40 bg-background/60 p-3 transition-colors hover:border-border hover:bg-background"
              >
                <p className="mb-2 line-clamp-2 text-xs font-medium leading-snug text-foreground/90 group-hover:text-foreground">
                  {e.headline}
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      THEME_COLORS[e.theme] ?? "bg-muted text-muted-foreground"
                    }`}
                  >
                    {e.theme}
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      HEAT_COLORS[e.heat] ?? "bg-muted text-muted-foreground"
                    }`}
                  >
                    {e.heat}
                  </span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{e.published_date}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
