import { headers } from "next/headers";
import Link from "next/link";
import { getSessionFromHeaders, userHasRole } from "@/server/auth";
import { ThemeToggle } from "@/ui/components/theme-toggle";

export async function SiteNavbar() {
  const requestHeaders = await headers();
  const session = await getSessionFromHeaders(new Headers(requestHeaders));
  const isGlobalAdmin = userHasRole(session, "global_admin");
  const isAuthenticated = Boolean(session);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-full border border-border/80 bg-gradient-to-r from-primary/15 to-transparent px-4 py-2 text-sm font-semibold tracking-tight text-foreground shadow-md"
        >
          <span className="text-xl">🏆</span>
          <span>Turneringsadmin</span>
        </Link>
        <nav className="flex items-center gap-3 text-sm font-semibold">
          <Link
            href="/auth/organizer-signup"
            className="rounded-full px-3 py-2 text-muted-foreground transition hover:bg-primary/10 hover:text-foreground"
          >
            Arrangør
          </Link>
          <Link
            href="/competitions/trondheim-cup/2025/scoreboard"
            className="rounded-full px-3 py-2 text-muted-foreground transition hover:bg-primary/10 hover:text-foreground"
          >
            Scoreboard
          </Link>
          {isAuthenticated ? (
            <Link
              href="/dashboard/invitations"
              className="rounded-full px-3 py-2 text-muted-foreground transition hover:bg-primary/10 hover:text-foreground"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/dashboard/admin/overview"
              className="rounded-full px-3 py-2 text-muted-foreground transition hover:bg-primary/10 hover:text-foreground"
            >
              Logg inn
            </Link>
          )}
          {isGlobalAdmin ? (
            <Link
              href="/dashboard/admin/overview"
              className="rounded-full border border-primary/40 bg-primary/10 px-3 py-2 text-foreground shadow-sm transition hover:bg-primary/15"
            >
              Global admin
            </Link>
          ) : null}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
