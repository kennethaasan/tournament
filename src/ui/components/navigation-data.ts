export type NavLink = {
  label: string;
  href: string;
  description: string;
};

export type NavSection = {
  label: string;
  links: NavLink[];
};

export type RoleFlags = {
  isGlobalAdmin: boolean;
  isCompetitionAdmin: boolean;
  isTeamManager: boolean;
};

export const navigationLinks: NavLink[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    description: "Personlig oversikt og snarveier til daglige oppgaver.",
  },
  {
    label: "Invitasjoner",
    href: "/dashboard/invitations",
    description: "Inviter administratorer og lagledere til riktig scope.",
  },
  {
    label: "Varsler",
    href: "/dashboard/notifications",
    description: "Følg frister, endringer og tvister på ett sted.",
  },
  {
    label: "Global admin",
    href: "/dashboard/admin/overview",
    description: "Konkurranser, utgaver og plattformstatus samlet.",
  },
  {
    label: "Revisjon",
    href: "/dashboard/admin/audit",
    description: "Spor hendelser per konkurranse, utgave og bruker.",
  },
  {
    label: "Ny konkurranse",
    href: "/dashboard/competitions/new",
    description: "Opprett ny konkurranse og klargjør første utgave.",
  },
  {
    label: "Offentlig scoreboard",
    href: "/competitions/trondheim-cup/2025/scoreboard",
    description: "Demo av publikumsvisning med live oppdateringer.",
  },
];

export function buildDashboardSections(flags: RoleFlags): NavSection[] {
  const canInvite =
    flags.isGlobalAdmin || flags.isCompetitionAdmin || flags.isTeamManager;

  const overviewLinks: NavLink[] = [navigationLinks[0]!, navigationLinks[2]!];

  if (canInvite) {
    overviewLinks.push(navigationLinks[1]!);
  }

  const sections: NavSection[] = [
    {
      label: "Oversikt",
      links: overviewLinks,
    },
  ];

  if (flags.isGlobalAdmin) {
    sections.push({
      label: "Global administrasjon",
      links: [navigationLinks[3]!, navigationLinks[4]!, navigationLinks[5]!],
    });
  }

  sections.push({
    label: "Verktøy",
    links: [navigationLinks[6]!],
  });

  return sections.filter((section) => section.links.length > 0);
}
