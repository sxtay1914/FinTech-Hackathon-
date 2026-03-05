"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { GlobeConnection, GlobePoint } from "@/lib/types";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

interface GlobeViewProps {
  connections: GlobeConnection[];
  points: GlobePoint[];
  centerLat: number;
  centerLng: number;
}

function getSunPosition() {
  const now = new Date();
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const sunLng = ((12 - utcHours) * 15 + 360) % 360 - 180;
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000
  );
  const sunLat = 23.44 * Math.sin(((2 * Math.PI) / 365) * (dayOfYear - 81));
  return { lat: sunLat, lng: sunLng };
}

export function GlobeView({ connections, points, centerLat, centerLng }: GlobeViewProps) {
  const globeRef = useRef<any>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const readyRef = useRef(false);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  function setupControls() {
    const globe = globeRef.current;
    if (!globe) return;

    globe.pointOfView({ lat: centerLat, lng: centerLng, altitude: 2.0 }, 1000);

    const controls = globe.controls();
    if (controls) {
      controls.enableRotate = true;
      controls.enableZoom = true;
      controls.enablePan = false;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.4;
      controls.rotateSpeed = 1.0;
      controls.zoomSpeed = 0.8;
      controls.minDistance = 120;
      controls.maxDistance = 600;

      // Pause auto-rotate while user drags, resume 3s after release
      let resumeTimer: ReturnType<typeof setTimeout>;
      controls.domElement?.addEventListener("pointerdown", () => {
        controls.autoRotate = false;
        clearTimeout(resumeTimer);
      });
      controls.domElement?.addEventListener("pointerup", () => {
        resumeTimer = setTimeout(() => {
          controls.autoRotate = true;
        }, 3000);
      });
    }
  }

  function setupLighting() {
    const globe = globeRef.current;
    if (!globe) return;

    const scene = globe.scene();
    if (!scene) return;

    // Remove default lights
    const lightsToRemove = [...scene.children].filter(
      (child: any) => child.isLight
    );
    lightsToRemove.forEach((light: any) => scene.remove(light));

    import("three").then((THREE) => {
      // Dim ambient for the night side
      const ambient = new THREE.AmbientLight(0x222244, 0.4);
      scene.add(ambient);

      // Directional light = the sun
      const sun = getSunPosition();
      const sunLight = new THREE.DirectionalLight(0xfff5e6, 2.0);
      const phi = (90 - sun.lat) * (Math.PI / 180);
      const theta = (sun.lng + 180) * (Math.PI / 180);
      const radius = 400;
      sunLight.position.set(
        -radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.cos(phi),
        radius * Math.sin(phi) * Math.sin(theta)
      );
      scene.add(sunLight);

      // Warm hemisphere fill
      const hemi = new THREE.HemisphereLight(0xffeedd, 0x080820, 0.3);
      scene.add(hemi);
    });
  }

  const onGlobeReady = () => {
    if (readyRef.current) return;
    readyRef.current = true;
    setupControls();
    setupLighting();
  };

  // Re-animate globe to new target when centerLat/Lng change
  useEffect(() => {
    if (readyRef.current && globeRef.current) {
      globeRef.current.pointOfView({ lat: centerLat, lng: centerLng, altitude: 2.0 }, 1000);
    }
  }, [centerLat, centerLng]);

  const arcsData = connections.map((c) => ({
    startLat: c.from_lat,
    startLng: c.from_lng,
    endLat: c.to_lat,
    endLng: c.to_lng,
    color: [
      `rgba(16, 185, 129, ${0.3 + c.strength * 0.14})`,
      `rgba(239, 68, 68, ${0.3 + c.strength * 0.14})`,
    ],
    label: c.label,
    stroke: 0.5 + c.strength * 0.3,
  }));

  const pointsData = points.map((p) => ({
    lat: p.lat,
    lng: p.lng,
    label: p.label,
    size: p.size,
    color: p.size >= 0.8 ? "#10b981" : "#f59e0b",
  }));

  return (
    <div ref={containerRef} className="h-full w-full">
      {dimensions.width > 0 && (
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
          backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
          onGlobeReady={onGlobeReady}
          arcsData={arcsData}
          arcColor="color"
          arcStroke="stroke"
          arcDashLength={0.5}
          arcDashGap={0.2}
          arcDashAnimateTime={2000}
          arcLabel="label"
          pointsData={pointsData}
          pointLat="lat"
          pointLng="lng"
          pointLabel="label"
          pointColor="color"
          pointRadius="size"
          pointAltitude={0.01}
          atmosphereColor="#10b981"
          atmosphereAltitude={0.15}
        />
      )}
    </div>
  );
}
