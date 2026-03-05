"use client";

import { usePathname } from "next/navigation";
import { NavBar } from "@/components/nav-bar";

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <>
      <NavBar />
      <main className={isLanding ? "" : "pt-14"}>{children}</main>
    </>
  );
}
