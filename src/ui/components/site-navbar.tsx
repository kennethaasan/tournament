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
  const containerWidth = "max-w-[1440px]";

  return (
    <header
      className={`${layout === "dashboard" ? "hidden lg:block" : ""} sticky top-0 z-[60] border-b border-border/60 bg-background/80 backdrop-blur-xl`}
    >
      <div
        className={`mx-auto flex h-14 w-full items-center gap-2 px-3 sm:h-16 sm:gap-4 sm:px-4 lg:px-6 ${containerWidth}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2 rounded-xl border border-border/80 bg-gradient-to-r from-primary/15 to-transparent px-3 py-1.5 text-sm font-semibold tracking-tight text-foreground shadow-md sm:gap-3 sm:px-4 sm:py-2"
          >
            <span className="text-lg sm:text-xl">🏆</span>
            <span className="hidden xs:inline sm:inline">Turneringsadmin</span>
          </Link>

          <nav className="hidden items-center gap-1 text-sm font-semibold md:flex">
            {isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className="rounded-xl px-3 py-2 text-muted-foreground transition hover:bg-primary/10 hover:text-foreground"
                >
                  Dashboard
                </Link>
                <Link
                  href="/hjelp"
                  className="rounded-xl px-3 py-2 text-muted-foreground transition hover:bg-primary/10 hover:text-foreground"
                >
                  Hjelp
                </Link>
                <Link
                  href="/dashboard/notifications"
                  className="rounded-xl px-3 py-2 text-muted-foreground transition hover:bg-primary/10 hover:text-foreground"
                >
                  Varsler
                </Link>
                {canInvite ? (
                  <Link
                    href="/dashboard/invitations"
                    className="rounded-xl px-3 py-2 text-muted-foreground transition hover:bg-primary/10 hover:text-foreground"
                  >
                    Invitasjoner
                  </Link>
                ) : null}
                {isGlobalAdmin ? (
                  <details className="group relative">
                    <summary className="list-none rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-primary shadow-sm transition hover:bg-primary/10 active:scale-[0.98] [&::-webkit-details-marker]:hidden cursor-pointer">
                      Global admin
                    </summary>
                    <div className="absolute left-0 mt-2 w-64 rounded-2xl border border-border/70 bg-background/95 p-3 shadow-xl backdrop-blur-xl">
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
                  className="rounded-xl px-3 py-2 text-muted-foreground transition hover:bg-primary/10 hover:text-foreground"
                >
                  Scoreboard-demo
                </Link>
                <Link
                  href="/hjelp"
                  className="rounded-xl px-3 py-2 text-muted-foreground transition hover:bg-primary/10 hover:text-foreground"
                >
                  Hjelp
                </Link>
              </>
            )}
          </nav>

          {/* Mobile navigation menu */}
          <details
            className={`group relative md:hidden ${layout === "dashboard" ? "hidden" : ""}`}
          >
            <summary className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg border border-border/70 text-foreground transition hover:bg-primary/10 [&::-webkit-details-marker]:hidden">
              <svg
                className="h-5 w-5 group-open:hidden"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              <svg
                className="hidden h-5 w-5 group-open:block"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              <span className="sr-only">Åpne meny</span>
            </summary>
            <div className="absolute left-0 top-full mt-2 w-56 rounded-2xl border border-border/70 bg-background/95 p-3 shadow-xl backdrop-blur-xl">
              <nav className="space-y-1 text-sm font-semibold">
                {isAuthenticated ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="block rounded-xl px-3 py-2 text-foreground transition hover:bg-primary/10"
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/hjelp"
                      className="block rounded-xl px-3 py-2 text-foreground transition hover:bg-primary/10"
                    >
                      Hjelp
                    </Link>
                    <Link
                      href="/dashboard/notifications"
                      className="block rounded-xl px-3 py-2 text-foreground transition hover:bg-primary/10"
                    >
                      Varsler
                    </Link>
                    {canInvite ? (
                      <Link
                        href="/dashboard/invitations"
                        className="block rounded-xl px-3 py-2 text-foreground transition hover:bg-primary/10"
                      >
                        Invitasjoner
                      </Link>
                    ) : null}
                    {isGlobalAdmin ? (
                      <>
                        <div className="my-2 border-t border-border/40" />
                        <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Global admin
                        </p>
                        <Link
                          href="/dashboard/admin/overview"
                          className="block rounded-xl px-3 py-2 text-foreground transition hover:bg-primary/10"
                        >
                          Oversikt
                        </Link>
                        <Link
                          href="/dashboard/admin/audit"
                          className="block rounded-xl px-3 py-2 text-foreground transition hover:bg-primary/10"
                        >
                          Revisjon
                        </Link>
                        <Link
                          href="/dashboard/competitions/new"
                          className="block rounded-xl px-3 py-2 text-foreground transition hover:bg-primary/10"
                        >
                          Ny konkurranse
                        </Link>
                      </>
                    ) : null}
                  </>
                ) : (
                  <>
                    <Link
                      href="/competitions/trondheim-cup/2025/scoreboard"
                      className="block rounded-xl px-3 py-2 text-foreground transition hover:bg-primary/10"
                    >
                      Scoreboard-demo
                    </Link>
                    <Link
                      href="/hjelp"
                      className="block rounded-xl px-3 py-2 text-foreground transition hover:bg-primary/10"
                    >
                      Hjelp
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </details>
        </div>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <AuthAction initialAuthenticated={isAuthenticated} />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
