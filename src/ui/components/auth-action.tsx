"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SignOutButton } from "@/ui/components/sign-out-button";

type AuthActionProps = {
  initialAuthenticated?: boolean;
};

type SessionResponse = {
  session?: unknown;
};

export function AuthAction({ initialAuthenticated = false }: AuthActionProps) {
  const [error, setError] = useState<Error | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(initialAuthenticated);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const fetchSession = async () => {
      try {
        const response = await fetch("/api/auth/get-session", {
          method: "GET",
          credentials: "include",
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Kunne ikke hente innloggingsstatus.");
        }

        const body = await response.text();
        const data: SessionResponse | null =
          body.length > 0 ? (JSON.parse(body) as SessionResponse) : null;

        if (isMounted) {
          if (data?.session) {
            setIsAuthenticated(true);
          } else if (!initialAuthenticated) {
            setIsAuthenticated(false);
          }
          setHasChecked(true);
        }
      } catch (caught) {
        if (!isMounted || controller.signal.aborted) {
          return;
        }

        setError(
          caught instanceof Error
            ? caught
            : new Error("Kunne ikke hente innloggingsstatus."),
        );
      }
    };

    void fetchSession();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [initialAuthenticated]);

  if (error) {
    throw error;
  }

  const shouldShowSignOut = hasChecked ? isAuthenticated : initialAuthenticated;

  return shouldShowSignOut ? (
    <SignOutButton />
  ) : (
    <Link
      href="/dashboard/admin/overview"
      className="rounded-full border border-border/70 px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-primary/10"
    >
      Logg inn
    </Link>
  );
}
