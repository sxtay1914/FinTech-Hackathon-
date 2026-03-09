"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import type { EventListItem } from "@/lib/types";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

const HEAT_CONFIG: Record<string, { color: string; duration: string; pulse: boolean }> = {
  // fallback seeder values
  hot:     { color: "#ef4444", duration: "1s",   pulse: true  },
  warming: { color: "#eab308", duration: "2.5s", pulse: true  },
  cooling: { color: "#6b7280", duration: "0s",   pulse: false },
  cold:    { color: "#6b7280", duration: "0s",   pulse: false },
  // LLM-returned values
  critical: { color: "#ef4444", duration: "1s",   pulse: true  },
  high:     { color: "#ef4444", duration: "1s",   pulse: true  },
  moderate: { color: "#eab308", duration: "2.5s", pulse: true  },
  medium:   { color: "#eab308", duration: "2.5s", pulse: true  },
  low:      { color: "#6b7280", duration: "0s",   pulse: false },
};

function makeMarkerElement(event: EventListItem): HTMLElement {
  const cfg = HEAT_CONFIG[event.heat?.toLowerCase()] ?? HEAT_CONFIG.cold;

  const wrapper = document.createElement("div");
  // data-event-id is used for delegated click handling on the container
  wrapper.dataset.eventId = String(event.id);
  wrapper.style.cssText = "position:relative;width:14px;height:14px;cursor:pointer;pointer-events:auto;";

  // Country label above the marker
  if (event.country) {
    const label = document.createElement("div");
    label.textContent = event.country;
    label.style.cssText = [
      "position:absolute;",
      "bottom:calc(100% + 5px);",
      "left:50%;",
      "transform:translateX(-50%);",
      "white-space:nowrap;",
      "font-size:9px;",
      "font-weight:600;",
      "letter-spacing:0.04em;",
      "color:#f1f5f9;",
      "text-shadow:0 1px 3px rgba(0,0,0,0.9),0 0 8px rgba(0,0,0,0.7);",
      "pointer-events:none;",
      "line-height:1;",
    ].join("");
    wrapper.appendChild(label);
  }

  if (cfg.pulse) {
    const ring = document.createElement("div");
    ring.style.cssText = [
      "position:absolute;inset:0;border-radius:50%;",
      `border:2px solid ${cfg.color};`,
      `animation:globe-pulse ${cfg.duration} ease-out infinite;`,
    ].join("");
    wrapper.appendChild(ring);
  }

  const dot = document.createElement("div");
  dot.style.cssText = [
    "position:absolute;inset:3px;border-radius:50%;",
    `background:${cfg.color};`,
    `box-shadow:0 0 8px 2px ${cfg.color}80;`,
  ].join("");
  wrapper.appendChild(dot);

  return wrapper;
}

class GlobeErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

function HeroGlobeInner({ events }: { events: EventListItem[] }) {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Inject keyframes once
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes globe-pulse {
        0%   { transform: scale(1);   opacity: 0.9; }
        100% { transform: scale(2.8); opacity: 0;   }
      }
      .scene-container { pointer-events: auto !important; }
    `;
    document.head.appendChild(style);
    return () => style.remove();
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(() => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Delegated click handler — react-globe.gl's HTML overlay has pointer-events:none,
  // so we listen on the container and find the nearest [data-event-id] ancestor.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onClick = (e: MouseEvent) => {
      const marker = (e.target as HTMLElement).closest("[data-event-id]") as HTMLElement | null;
      if (!marker) return;
      const id = Number(marker.dataset.eventId);
      window.dispatchEvent(new CustomEvent("meridian:focus-event", { detail: { id } }));
    };
    container.addEventListener("click", onClick);
    return () => container.removeEventListener("click", onClick);
  }, []);

  const onGlobeReady = () => {
    const globe = globeRef.current;
    if (!globe) return;

    const controls = globe.controls();
    if (controls) {
      controls.enableRotate = true;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.8;

      // Resume auto-rotate 3s after user stops dragging
      let resumeTimer: ReturnType<typeof setTimeout> | null = null;
      const pause = () => {
        controls.autoRotate = false;
        if (resumeTimer) clearTimeout(resumeTimer);
        resumeTimer = setTimeout(() => { controls.autoRotate = true; }, 3000);
      };
      controls.domElement?.addEventListener("pointerdown", pause);
    }

    globe.pointOfView({ lat: 20, lng: 0, altitude: 2.2 });

    const scene = globe.scene();
    if (!scene) return;

    const lightsToRemove = [...scene.children].filter((c: any) => c.isLight);
    lightsToRemove.forEach((l: any) => scene.remove(l));

    import("three").then((THREE) => {
      const ambient = new THREE.AmbientLight(0xffffff, 1.2);
      scene.add(ambient);
      const rim = new THREE.PointLight(0x10b981, 1.5, 600);
      rim.position.set(-200, 100, 200);
      scene.add(rim);
    });
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
          showAtmosphere={true}
          htmlElementsData={events}
          htmlLat="lat"
          htmlLng="lng"
          htmlAltitude={0.01}
          htmlElement={(d: any) => makeMarkerElement(d)}
        />
      )}
    </div>
  );
}

export function HeroGlobe({ events }: { events: EventListItem[] }) {
  return (
    <GlobeErrorBoundary>
      <HeroGlobeInner events={events} />
    </GlobeErrorBoundary>
  );
}
