"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/ui/components/badge";
import { Button } from "@/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/ui/components/card";
import { type NavLink, navigationLinks } from "@/ui/components/navigation-data";

export type { NavLink };

export function NavigationGrid() {
  const pathname = usePathname();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {navigationLinks.map((link) => (
        <Card
          key={link.href}
          className={`relative overflow-hidden border-border/70 bg-card/70 transition duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl ${
            (
              link.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(link.href)
            )
              ? "ring-2 ring-primary/60"
              : ""
          }`}
        >
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <Badge
                variant={
                  (
                    link.href === "/dashboard"
                      ? pathname === "/dashboard"
                      : pathname.startsWith(link.href)
                  )
                    ? "accent"
                    : "outline"
                }
              >
                {(
                  link.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(link.href)
                )
                  ? "Aktiv"
                  : "Snarvei"}
              </Badge>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="rounded-full px-3 text-xs"
              >
                <Link href={link.href as Route}>Åpne</Link>
              </Button>
            </div>
            <CardTitle className="text-xl text-foreground">
              {link.label}
            </CardTitle>
            <CardDescription className="mt-2 text-muted-foreground">
              {link.description}
            </CardDescription>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
