"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { signOut } from "@/lib/auth-client";
import { cn } from "@/lib/utils/cn";

type SignOutButtonProps = {
  className?: string;
  children?: ReactNode;
};

export function SignOutButton({
  className,
  children = "Logg ut",
}: SignOutButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<Error | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (error) {
    throw error;
  }

  const handleSignOut = async () => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await signOut();

      if (result.error) {
        throw new Error(result.error.message ?? "Kunne ikke logge ut.");
      }

      router.push("/");
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught
          : new Error("Kunne ikke logge ut. Prøv igjen."),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleSignOut()}
      className={cn(
        "rounded-full border border-border/70 px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-70",
        className,
      )}
      disabled={isSubmitting}
    >
      {children}
    </button>
  );
}
