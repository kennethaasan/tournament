"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navigationLinks } from "@/ui/components/navigation-links";
import { ThemeToggle } from "@/ui/components/theme-toggle";

export function DashboardHeader() {
  const pathname = usePathname();

  return (
    <header className="lg:hidden">
      <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/80 px-4 py-3 shadow-sm backdrop-blur">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full border border-border/70 bg-gradient-to-r from-primary/10 to-transparent px-3 py-1 text-sm font-semibold text-foreground shadow-sm"
        >
          <span className="text-lg">🏆</span>
          <span className="hidden sm:inline">TourneyAdmin</span>
        </Link>

        <div className="flex items-center gap-2">
          <details className="group relative">
            <summary className="list-none rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground shadow-sm transition hover:bg-primary/10 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 [&::-webkit-details-marker]:hidden group-open:bg-primary/15 group-open:text-foreground">
              Meny
            </summary>
            <div className="absolute right-0 mt-3 w-72 rounded-2xl border border-border/70 bg-background/95 p-3 shadow-xl">
              <nav className="space-y-1">
                {navigationLinks.map((link) => {
                  const isActive = pathname.startsWith(link.href);

                  return (
                    <Link
                      key={link.href}
                      href={link.href as Route}
                      aria-current={isActive ? "page" : undefined}
                      className={`block rounded-xl px-3 py-2 text-sm font-semibold transition ${
                        isActive
                          ? "bg-primary/15 text-foreground"
                          : "text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                      }`}
                    >
                      <div>{link.label}</div>
                      <div className="text-xs font-normal text-muted-foreground">
                        {link.description}
                      </div>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </details>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
