"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SplashScreen() {
  const router = useRouter();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 200);   // Title
    const t2 = setTimeout(() => setPhase(2), 1500);  // Subtitle
    const t3 = setTimeout(() => setPhase(3), 3500);  // Fade out
    const t4 = setTimeout(() => router.push("/dashboard"), 4200); // Navigate
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [router]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black transition-opacity duration-700 ${phase >= 3 ? "opacity-0" : "opacity-100"}`}
    >
      <h1
        className={`text-7xl font-bold tracking-tighter text-white transition-all duration-1000 ease-out sm:text-9xl ${phase >= 1 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}
      >
        Meridian
      </h1>
      <p
        className={`mt-5 text-lg tracking-wide text-zinc-500 transition-all duration-800 ease-out ${phase >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
      >
        Global Macro Intelligence
      </p>
    </div>
  );
}
