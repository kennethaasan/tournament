"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signUp } from "@/lib/auth-client";
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

type FormState = "idle" | "loading" | "success" | "error";

export function SignupForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState("loading");
    setErrorMessage(null);

    if (password !== confirmPassword) {
      setFormState("error");
      setErrorMessage("Passordene stemmer ikke overens.");
      return;
    }

    if (password.length < 8) {
      setFormState("error");
      setErrorMessage("Passordet må være minst 8 tegn.");
      return;
    }

    try {
      const result = await signUp.email({
        name,
        email,
        password,
        callbackURL: "/dashboard/admin/overview",
      });

      if (result.error) {
        setFormState("error");
        setErrorMessage(
          result.error.message ?? "Kunne ikke opprette konto. Prøv igjen.",
        );
        return;
      }

      setFormState("success");
      router.push("/dashboard/admin/overview");
      router.refresh();
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
              Ny bruker
            </Badge>
            <CardTitle className="text-2xl text-foreground">
              Opprett konto
            </CardTitle>
            <CardDescription>
              Registrer deg for å administrere turneringer, lag og kamper.
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
                <Label htmlFor="name">Navn</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ditt navn"
                  disabled={formState === "loading"}
                />
              </div>

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
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minst 8 tegn"
                  disabled={formState === "loading"}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Bekreft passord</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Gjenta passordet"
                  disabled={formState === "loading"}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={formState === "loading"}
              >
                {formState === "loading"
                  ? "Oppretter konto..."
                  : "Opprett konto"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Har du allerede konto?{" "}
                <Link
                  href="/auth/login"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Logg inn
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
