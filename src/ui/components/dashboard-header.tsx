"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationLinks } from "@/ui/components/navigation-links";
import { ThemeToggle } from "@/ui/components/theme-toggle";

export function DashboardHeader() {
  const pathname = usePathname();
  const primaryLinks = navigationLinks.slice(0, 5);
  const secondaryLinks = navigationLinks.slice(5);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-full border border-border/70 bg-gradient-to-r from-primary/10 to-transparent px-3 py-1 text-sm font-semibold text-foreground shadow-sm"
          >
            <span className="text-lg">🏆</span>
            <span className="hidden sm:inline">TourneyAdmin</span>
          </Link>
          <nav className="hidden items-center gap-2 md:flex">
            {primaryLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href as Route}
                className={`rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition hover:bg-primary/10 hover:text-foreground ${
                  pathname.startsWith(link.href)
                    ? "bg-primary/20 text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <nav className="hidden gap-2 sm:flex">
            {secondaryLinks.slice(0, 3).map((link) => (
              <Link
                key={link.href}
                href={link.href as Route}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] transition hover:bg-primary/10 hover:text-foreground ${
                  pathname.startsWith(link.href)
                    ? "bg-primary/20 text-foreground"
                    : "text-muted-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
