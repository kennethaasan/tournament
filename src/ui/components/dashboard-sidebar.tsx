"use client";

import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { apiClient, unwrapResponse } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";
import { translateEditionStatus } from "@/lib/utils/translations";
import type { NavSection } from "@/ui/components/navigation-data";

type NavSectionProps = {
  label: string;
  links: NavSection["links"];
  pathname: string;
};

type DashboardSidebarProps = {
  sections: NavSection[];
};

type ContextData = {
  competition?: { id: string; name: string; slug: string };
  edition?: {
    id: string;
    label: string;
    slug: string;
    status: string;
    format: string;
    competition_id: string;
    competition_name: string;
    competition_slug: string;
  };
};

export function DashboardSidebar({ sections }: DashboardSidebarProps) {
  const pathname = usePathname();
  const params = useParams();

  const competitionId = params.competitionId as string | undefined;
  const editionId = params.editionId as string | undefined;

  const { data: context } = useQuery({
    queryKey: ["sidebar-context", competitionId, editionId],
    queryFn: async () => {
      const result: ContextData = {};
      if (editionId) {
        const { data, error, response } = await apiClient.GET(
          "/api/editions/{edition_id}",
          {
            params: { path: { edition_id: editionId } },
          },
        );
        const editionData = unwrapResponse({ data, error, response }) as {
          edition: ContextData["edition"];
        };
        result.edition = editionData.edition;
        if (editionData.edition) {
          result.competition = {
            id: editionData.edition.competition_id,
            name: editionData.edition.competition_name,
            slug: editionData.edition.competition_slug,
          };
        }
      }

      // If we don't have competition from edition, but have competitionId, fetch it
      if (!result.competition && competitionId) {
        const { data, error, response } = await apiClient.GET(
          "/api/competitions/{competition_id}",
          {
            params: { path: { competition_id: competitionId } },
          },
        );
        const competition = unwrapResponse({ data, error, response }) as {
          id: string;
          name: string;
          slug: string;
        };
        result.competition = competition;
      }
      return result;
    },
    enabled: !!(competitionId || editionId),
  });

  const editionLinks = editionId
    ? [
        { label: "Oversikt", path: "" },
        { label: "Kampoppsett", path: "/schedule" },
        { label: "Lag og tropp", path: "/teams" },
        { label: "Kamp-administrasjon", path: "/results" },
        { label: "Hendelser", path: "/events" },
        { label: "Scoreboard-innstillinger", path: "/scoreboard" },
      ]
    : [];

  const effectiveCompetitionId = context?.competition?.id;

  const competitionLinks = effectiveCompetitionId
    ? [
        { label: "Oversikt", path: "" },
        { label: "Arenaer", path: "/venues" },
        { label: "Ny utgave", path: "/editions/new" },
      ]
    : [];

  return (
    <aside className="hidden w-72 flex-col gap-6 rounded-3xl border border-border/60 bg-background/80 p-6 shadow-[0_25px_60px_-45px_rgba(0,0,0,0.45)] backdrop-blur lg:sticky lg:top-[5.5rem] lg:flex lg:h-[calc(100vh-7rem)]">
      <div className="flex-1 space-y-8 overflow-y-auto pr-1">
        {/* Scope Context */}
        {(context?.competition || context?.edition) && (
          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
              Aktiv Administrasjon
            </p>
            <div className="space-y-1">
              {context.competition && (
                <div className="space-y-4">
                  <Link
                    href={`/dashboard/competitions/${context.competition.id}`}
                    className={cn(
                      "group block rounded-xl border border-transparent px-3 py-2 transition hover:bg-primary/5",
                      pathname ===
                        `/dashboard/competitions/${context.competition.id}` &&
                        "border-primary/20 bg-primary/10",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">🏟️</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-foreground">
                          {context.competition.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Konkurranse
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Contextual Competition Sub-navigation */}
                  {competitionLinks.length > 0 && (
                    <nav className="ml-4 space-y-1 border-l border-border/60 pl-4">
                      {competitionLinks.map((item) => {
                        const href =
                          `/dashboard/competitions/${context.competition?.id}${item.path}` as Route;
                        const isActive =
                          item.path === ""
                            ? pathname === href
                            : pathname.startsWith(href);
                        return (
                          <Link
                            key={item.label}
                            href={href}
                            className={cn(
                              "block py-1 text-xs font-medium transition hover:text-primary",
                              isActive
                                ? "text-primary"
                                : "text-muted-foreground",
                            )}
                          >
                            {item.label}
                          </Link>
                        );
                      })}
                    </nav>
                  )}
                </div>
              )}
              {context.edition && (
                <div className="space-y-4 pt-2">
                  <Link
                    href={`/dashboard/editions/${context.edition.id}`}
                    className={cn(
                      "group block rounded-xl border border-transparent px-3 py-2 transition hover:bg-primary/5",
                      pathname ===
                        `/dashboard/editions/${context.edition.id}` &&
                        "border-primary/20 bg-primary/10",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">📅</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-semibold text-foreground">
                          {context.edition.label}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <span>Utgave</span>
                          <span className="h-1 w-1 rounded-full bg-border" />
                          <span className="capitalize">
                            {translateEditionStatus(context.edition.status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>

                  {/* Contextual Edition Sub-navigation */}
                  <nav className="ml-4 space-y-1 border-l border-border/60 pl-4">
                    {editionLinks.map((item) => {
                      const href =
                        `/dashboard/editions/${context.edition?.id}${item.path}` as Route;
                      const isActive =
                        item.path === ""
                          ? pathname === href
                          : pathname.startsWith(href);
                      return (
                        <Link
                          key={item.label}
                          href={href}
                          className={cn(
                            "block py-1 text-xs font-medium transition hover:text-primary",
                            isActive ? "text-primary" : "text-muted-foreground",
                          )}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Global Navigation (Filtered) */}
        <div className="space-y-6">
          {sections.map((section) => {
            // Filter out "Oversikt" if we are in a deep context to reduce noise
            if (section.label === "Oversikt" && (competitionId || editionId))
              return null;

            return (
              <SidebarSection
                key={section.label}
                label={section.label}
                links={section.links}
                pathname={pathname}
              />
            );
          })}
        </div>
      </div>

      {/* Footer / Meta */}
      <div className="space-y-4 rounded-2xl border border-border/70 bg-card/40 p-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
            System Status
          </span>
        </div>
        <p className="text-[10px] leading-relaxed text-muted-foreground">
          Logget inn som administrator. Alle handlinger logges i systemets
          revisjonsspor.
        </p>
      </div>
    </aside>
  );
}

function SidebarSection({ label, links, pathname }: NavSectionProps) {
  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/80">
        {label}
      </p>
      <nav className="space-y-1">
        {links.map((link) => {
          const isActive =
            link.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(link.href);

          return (
            <Link
              key={link.href}
              href={link.href as Route}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group block rounded-xl border border-transparent px-3 py-2 transition",
                isActive
                  ? "border-primary/20 bg-primary/10 text-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-primary/5 hover:text-foreground",
              )}
            >
              <div className="text-xs font-semibold">{link.label}</div>
              {!isActive && (
                <div className="truncate text-[10px] text-muted-foreground group-hover:text-muted-foreground/80">
                  {link.description}
                </div>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
