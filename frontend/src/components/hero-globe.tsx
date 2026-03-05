"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";

const Globe = dynamic(() => import("react-globe.gl"), { ssr: false });

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

function HeroGlobeInner() {
  const globeRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

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

  const onGlobeReady = () => {
    const globe = globeRef.current;
    if (!globe) return;

    const controls = globe.controls();
    if (controls) {
      controls.enableRotate = false;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.8;
    }

    globe.pointOfView({ lat: 20, lng: 0, altitude: 2.2 });

    // Fix lighting: bright enough to see the night texture
    const scene = globe.scene();
    if (!scene) return;

    // Remove existing lights
    const lightsToRemove = [...scene.children].filter((c: any) => c.isLight);
    lightsToRemove.forEach((l: any) => scene.remove(l));

    import("three").then((THREE) => {
      // Bright ambient so city lights on the night texture are visible
      const ambient = new THREE.AmbientLight(0xffffff, 1.2);
      scene.add(ambient);

      // Subtle emerald rim light for atmosphere feel
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
        />
      )}
    </div>
  );
}

export function HeroGlobe() {
  return (
    <GlobeErrorBoundary>
      <HeroGlobeInner />
    </GlobeErrorBoundary>
  );
}
