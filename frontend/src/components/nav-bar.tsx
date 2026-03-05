"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/actions", label: "Actions" },
];

export function NavBar() {
  const pathname = usePathname();

  // Hide on landing page — it has its own sticky nav
  if (pathname === "/") return null;

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center px-6">
        <Link href="/" className="mr-8 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-400">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" />
              <ellipse cx="8" cy="8" rx="3" ry="7" stroke="currentColor" strokeWidth="1" />
              <line x1="1" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1" />
            </svg>
          </div>
          <span className="text-sm font-semibold tracking-tight">Meridian</span>
        </Link>
        <div className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                pathname.startsWith(link.href)
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
