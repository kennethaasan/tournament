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
    label: "Mine konkurranser",
    href: "/dashboard/competitions",
    description: "Administrer konkurranser og utgaver du har tilgang til.",
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

  // Index reference:
  // 0: Dashboard
  // 1: Invitasjoner
  // 2: Varsler
  // 3: Mine konkurranser
  // 4: Global admin
  // 5: Revisjon
  // 6: Ny konkurranse
  // 7: Offentlig scoreboard

  const overviewLinks: NavLink[] = [navigationLinks[0]!, navigationLinks[2]!];

  if (canInvite) {
    overviewLinks.push(navigationLinks[1]!);
  }

  // Add "Mine konkurranser" for competition admins (but not global admins who have a fuller view)
  if (flags.isCompetitionAdmin && !flags.isGlobalAdmin) {
    overviewLinks.push(navigationLinks[3]!);
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
      links: [navigationLinks[4]!, navigationLinks[5]!, navigationLinks[6]!],
    });
  }

  sections.push({
    label: "Verktøy",
    links: [navigationLinks[7]!],
  });

  return sections.filter((section) => section.links.length > 0);
}
