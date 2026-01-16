import { cookies, headers } from "next/headers";
import Link from "next/link";
import { getSessionFromHeaders, userHasRole } from "@/server/auth";
import { AuthAction } from "@/ui/components/auth-action";
import { ThemeToggle } from "@/ui/components/theme-toggle";

type SiteNavbarLayout = "public" | "dashboard";

type SiteNavbarProps = {
  layout?: SiteNavbarLayout;
};

export async function SiteNavbar({ layout = "public" }: SiteNavbarProps) {
  const requestHeaders = await headers();
  const cookieStore = await cookies();
  const hasSessionCookie =
    Boolean(cookieStore.get("better-auth.session_token")) ||
    Boolean(cookieStore.get("__Secure-better-auth.session_token"));
  const session = await getSessionFromHeaders(new Headers(requestHeaders));
  const isGlobalAdmin = userHasRole(session, "global_admin");
  const isCompetitionAdmin = userHasRole(session, "competition_admin");
  const isTeamManager = userHasRole(session, "team_manager");
  const canInvite = isGlobalAdmin || isCompetitionAdmin || isTeamManager;
  const isAuthenticated = Boolean(session) || hasSessionCookie;
  const containerWidth =
    layout === "dashboard" ? "max-w-[1440px]" : "max-w-[1200px]";

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div
        className={`mx-auto flex h-16 w-full items-center gap-4 px-4 lg:px-6 ${containerWidth}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-full border border-border/80 bg-gradient-to-r from-primary/15 to-transparent px-4 py-2 text-sm font-semibold tracking-tight text-foreground shadow-md"
          >
            <span className="text-xl">🏆</span>
            <span>Turneringsadmin</span>
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold">
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-full px-3 py-2 text-muted-foreground transition hover:bg-primary/10 hover:text-foreground"
                >
                  Dashboard
                </Link>
                <Link
                  href="/hjelp"
                  className="rounded-full px-3 py-2 text-muted-foreground transition hover:bg-primary/10 hover:text-foreground"
                >
                  Hjelp
                </Link>
                <Link
                  href="/dashboard/notifications"
                  className="rounded-full px-3 py-2 text-muted-foreground transition hover:bg-primary/10 hover:text-foreground"
                >
                  Varsler
                </Link>
                {canInvite ? (
                  <Link
                    href="/dashboard/invitations"
                    className="rounded-full px-3 py-2 text-muted-foreground transition hover:bg-primary/10 hover:text-foreground"
                  >
                    Invitasjoner
                  </Link>
                ) : null}
                {isGlobalAdmin ? (
                  <details className="group relative">
                    <summary className="list-none rounded-full border border-primary/40 bg-primary/10 px-3 py-2 text-foreground shadow-sm transition hover:bg-primary/15 [&::-webkit-details-marker]:hidden">
                      Global admin
                    </summary>
                    <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-border/70 bg-background/95 p-3 shadow-xl">
                      <div className="space-y-1">
                        <Link
                          href="/dashboard/admin/overview"
                          className="block rounded-xl px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-primary/10"
                        >
                          Oversikt
                        </Link>
                        <Link
                          href="/dashboard/admin/audit"
                          className="block rounded-xl px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-primary/10"
                        >
                          Revisjon
                        </Link>
                        <Link
                          href="/dashboard/competitions/new"
                          className="block rounded-xl px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-primary/10"
                        >
                          Ny konkurranse
                        </Link>
                      </div>
                    </div>
                  </details>
                ) : null}
              </>
            ) : (
              <>
                <Link
                  href="/competitions/trondheim-cup/2025/scoreboard"
                  className="rounded-full px-3 py-2 text-muted-foreground transition hover:bg-primary/10 hover:text-foreground"
                >
                  Scoreboard-demo
                </Link>
                <Link
                  href="/hjelp"
                  className="rounded-full px-3 py-2 text-muted-foreground transition hover:bg-primary/10 hover:text-foreground"
                >
                  Hjelp
                </Link>
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <AuthAction initialAuthenticated={isAuthenticated} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
