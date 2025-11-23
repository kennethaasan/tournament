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

export type NavLink = {
  label: string;
  href: string;
  description: string;
};

export const navigationLinks: NavLink[] = [
  {
    label: "Adminoversikt",
    href: "/dashboard/admin/overview",
    description: "Plattformstatus, invitasjoner og publiserte utgaver.",
  },
  {
    label: "Revisjon",
    href: "/dashboard/admin/audit",
    description: "Gjennomgå hendelser per konkurranse, utgave eller bruker.",
  },
  {
    label: "Ny konkurranse",
    href: "/dashboard/competitions/new",
    description: "Start en ny konkurranse og klargjør første utgave.",
  },
  {
    label: "Utgaveoppsett",
    href: "/dashboard/competitions/demo/editions/new",
    description: "Opprett nye utgaver og definer registreringsvindu.",
  },
  {
    label: "Kampoppsett",
    href: "/dashboard/editions/demo-2025/schedule",
    description: "Bygg grupper, sluttspill og generer kampplaner.",
  },
  {
    label: "Storskjermkontroll",
    href: "/dashboard/editions/demo-2025/scoreboard",
    description: "Tema, rotasjon og høydepunkter for venue-visning.",
  },
  {
    label: "Lag og spillere",
    href: "/dashboard/teams/demo-team/roster",
    description: "Vedlikehold staller, roller og tilgjengelighet.",
  },
  {
    label: "Påmeldinger og tropper",
    href: "/dashboard/teams/demo-team/entries",
    description: "Registrer lag til utgaver og bygg utvalgte tropper.",
  },
  {
    label: "Varsler",
    href: "/dashboard/notifications",
    description: "In-app meldinger for frister, resultatendringer og tvister.",
  },
  {
    label: "Offentlig scoreboard",
    href: "/competitions/oslo-cup/2025/scoreboard",
    description: "Publikumsvisning med polling og høydepunkter.",
  },
];

export function NavigationGrid() {
  const pathname = usePathname();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {navigationLinks.map((link) => (
        <Card
          key={link.href}
          className={`relative overflow-hidden border-border/70 bg-card/70 transition duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl ${
            pathname.startsWith(link.href) ? "ring-2 ring-primary/60" : ""
          }`}
        >
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <Badge
                variant={pathname.startsWith(link.href) ? "accent" : "outline"}
              >
                {pathname.startsWith(link.href) ? "Aktiv" : "Snarvei"}
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
