"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import type { NavLink } from "@/ui/components/navigation-links";
import { navigationLinks } from "@/ui/components/navigation-links";
import { ThemeToggle } from "@/ui/components/theme-toggle";

const primaryLinks = navigationLinks.slice(0, 5);
const secondaryLinks = navigationLinks.slice(5);

type NavSectionProps = {
  label: string;
  links: NavLink[];
  pathname: string;
};

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 flex-col gap-6 rounded-3xl border border-border/60 bg-background/80 p-6 shadow-[0_25px_60px_-45px_rgba(0,0,0,0.45)] backdrop-blur lg:sticky lg:top-6 lg:flex lg:h-[calc(100vh-3rem)]">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full border border-border/70 bg-gradient-to-r from-primary/15 to-transparent px-3 py-1 text-sm font-semibold text-foreground shadow-sm"
        >
          <span className="text-base font-bold tracking-wide">TA</span>
          <span>Turneringsadmin</span>
        </Link>
        <ThemeToggle />
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto pr-1">
        <NavSection
          label="Hurtigtilgang"
          links={primaryLinks}
          pathname={pathname}
        />
        <NavSection
          label="Operativt"
          links={secondaryLinks}
          pathname={pathname}
        />
      </div>

      <div className="rounded-2xl border border-border/70 bg-card/70 p-4 text-xs text-muted-foreground">
        <p className="text-sm font-semibold text-foreground">Administrasjon</p>
        <p>Hold oversikt over konkurranser, utgaver og lag fra sidemenyen.</p>
      </div>
    </aside>
  );
}

function NavSection({ label, links, pathname }: NavSectionProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        {label}
      </p>
      <nav className="space-y-2">
        {links.map((link) => {
          const isActive = pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href as Route}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group block rounded-2xl border px-3 py-2 transition",
                isActive
                  ? "border-primary/40 bg-primary/15 text-foreground shadow-sm"
                  : "border-transparent text-muted-foreground hover:border-border/70 hover:bg-primary/10 hover:text-foreground",
              )}
            >
              <div className="text-sm font-semibold">{link.label}</div>
              <div
                className={cn(
                  "text-xs",
                  isActive ? "text-foreground/70" : "text-muted-foreground",
                )}
              >
                {link.description}
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
