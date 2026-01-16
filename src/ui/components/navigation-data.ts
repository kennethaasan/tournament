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

export const navigationLinks = [
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
] satisfies Readonly<
  [NavLink, NavLink, NavLink, NavLink, NavLink, NavLink, NavLink, NavLink]
>;

export function buildDashboardSections(flags: RoleFlags): NavSection[] {
  const canInvite =
    flags.isGlobalAdmin || flags.isCompetitionAdmin || flags.isTeamManager;

  const [
    dashboardLink,
    invitationLink,
    notificationLink,
    competitionsLink,
    globalAdminLink,
    auditLink,
    newCompetitionLink,
    scoreboardLink,
  ] = navigationLinks;

  const overviewLinks: NavLink[] = [dashboardLink, notificationLink];

  if (canInvite) {
    overviewLinks.push(invitationLink);
  }

  // Add "Mine konkurranser" for competition admins (but not global admins who have a fuller view)
  if (flags.isCompetitionAdmin && !flags.isGlobalAdmin) {
    overviewLinks.push(competitionsLink);
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
      links: [globalAdminLink, auditLink, newCompetitionLink],
    });
  }

  sections.push({
    label: "Verktøy",
    links: [scoreboardLink],
  });

  return sections.filter((section) => section.links.length > 0);
}
