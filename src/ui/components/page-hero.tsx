import type { Route } from "next";
import Link from "next/link";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";

export type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: Route;
};

export function PageHero({
  eyebrow,
  title,
  description,
  actionHref,
  actionLabel,
}: PageHeroProps) {
  return (
    <div className="relative mb-8 overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-white/5 via-primary/10 to-transparent p-8 shadow-xl">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(138,180,255,0.16),transparent_30%)]" />
      <div className="relative flex flex-col gap-4">
        <Badge
          variant="accent"
          className="self-start uppercase tracking-[0.22em]"
        >
          {eyebrow}
        </Badge>
        <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
          {title}
        </h1>
        <p className="max-w-3xl text-base text-muted-foreground">
          {description}
        </p>
        {actionHref && actionLabel ? (
          <div className="flex flex-wrap gap-3">
            <Button asChild size="sm" className="rounded-full">
              <Link href={actionHref}>{actionLabel}</Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="rounded-full border border-border/80"
            >
              <Link href="/competitions/oslo-cup/2025/scoreboard">
                Se scoreboard-demo
              </Link>
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
