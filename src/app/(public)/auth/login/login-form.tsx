"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { signIn } from "@/lib/auth-client";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/ui/components/card";
import { Input } from "@/ui/components/input";
import { Label } from "@/ui/components/label";

type FormState = "idle" | "loading" | "error";

const DEFAULT_REDIRECT = "/dashboard/admin/overview";

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? DEFAULT_REDIRECT;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState("loading");
    setErrorMessage(null);

    try {
      const result = await signIn.email({
        email,
        password,
        callbackURL: callbackUrl,
      });

      if (result.error) {
        setFormState("error");
        setErrorMessage(
          result.error.message ?? "Innlogging feilet. Sjekk e-post og passord.",
        );
        return;
      }

      // Use window.location for dynamic callback URLs from search params
      window.location.href = callbackUrl;
    } catch {
      setFormState("error");
      setErrorMessage("Noe gikk galt. Vennligst prøv igjen.");
    }
  }

  return (
    <main className="page-shell">
      <div className="page-padding flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md border-border/70 bg-card/80">
          <CardHeader className="space-y-3">
            <Badge
              variant="accent"
              className="w-fit uppercase tracking-[0.2em]"
            >
              Autentisering
            </Badge>
            <CardTitle className="text-2xl text-foreground">Logg inn</CardTitle>
            <CardDescription>
              Logg inn med e-post og passord for å administrere dine
              turneringer.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage ? (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {errorMessage}
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="email">E-post</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="din@epost.no"
                  disabled={formState === "loading"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Passord</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ditt passord"
                  disabled={formState === "loading"}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={formState === "loading"}
              >
                {formState === "loading" ? "Logger inn..." : "Logg inn"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Har du ikke konto?{" "}
                <Link
                  href="/auth/signup"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Opprett konto
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
