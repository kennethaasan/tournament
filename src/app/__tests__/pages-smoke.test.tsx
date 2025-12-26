import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ScoreboardData } from "@/modules/public/scoreboard-types";
import LandingPage from "@/app/page";
import AdminOverviewPage from "@/app/(dashboard)/dashboard/admin/overview/page";
import CompetitionDetailPage from "@/app/(dashboard)/dashboard/competitions/[competitionId]/page";
import ScoreboardPage from "@/app/(scoreboard)/competitions/[competitionSlug]/[editionSlug]/scoreboard/page";
import LoginPage from "@/app/(public)/auth/login/page";
import SignupPage from "@/app/(public)/auth/signup/page";

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("next/navigation", () => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const scoreboardStub: ScoreboardData = {
  edition: {
    id: "ed-1",
    competitionId: "comp-1",
    competitionSlug: "comp-1",
    label: "Elite Cup",
    slug: "elite-cup",
    status: "published",
    format: "round_robin",
    timezone: "UTC",
    publishedAt: new Date("2024-06-01T00:00:00Z"),
    registrationWindow: { opensAt: null, closesAt: null },
    scoreboardRotationSeconds: 5,
    scoreboardTheme: {
      primaryColor: "#0B1F3A",
      secondaryColor: "#FFFFFF",
      backgroundImageUrl: null,
    },
  },
  matches: [],
  standings: [],
  tables: [],
  topScorers: [],
  rotation: ["live_matches", "upcoming", "standings", "top_scorers"],
  overlayMessage: null,
  entries: [],
};

vi.mock("@/modules/public/scoreboard-service", () => ({
  getPublicScoreboard: vi.fn(async () => scoreboardStub),
}));

vi.mock("@/modules/admin/service", () => ({
  getCompetitionDetail: vi.fn(async () => ({
    id: "comp-1",
    name: "Elite Cup",
    description: "Desc",
    slug: "elite-cup",
    defaultTimezone: "UTC",
    editions: [
      {
        id: "ed-1",
        label: "Edition 1",
        slug: "edition-1",
        format: "round_robin",
        timezone: "UTC",
        status: "published",
        updatedAt: new Date("2024-06-01T00:00:00Z"),
        registrationOpensAt: null,
        registrationClosesAt: null,
      },
    ],
    administrators: [
      {
        userId: "user-1",
        name: "Admin",
        email: "admin@example.com",
        role: "owner",
      },
    ],
    createdAt: new Date("2024-05-01T00:00:00Z"),
    archivedAt: null,
  })),
  getGlobalAdminOverview: vi.fn(async () => ({
    metrics: {
      totalCompetitions: 2,
      publishedEditions: 1,
      draftEditions: 1,
      pendingInvitations: 0,
      unreadNotifications: 0,
      totalAdministrators: 3,
      unresolvedDisputes: 0,
      pendingEntries: 1,
    },
    competitions: [
      {
        id: "comp-1",
        name: "Elite Cup",
        slug: "elite-cup",
        editions: [{ id: "ed-1", label: "Edition 1", updatedAt: new Date() }],
        administrators: [{ userId: "user-1", name: "Admin" }],
        updatedAt: new Date(),
        status: "active",
      },
    ],
  })),
  listAuditLogs: vi.fn(async () => [
    {
      id: "log-1",
      actor: "admin@example.com",
      action: "login",
      createdAt: new Date("2024-06-01T10:00:00Z"),
      metadata: {},
    },
  ]),
}));

vi.mock("@/ui/components/navigation-links", () => ({
  NavigationGrid: () => <div>Navigation Grid</div>,
}));

vi.mock("@/ui/components/page-hero", () => ({
  PageHero: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock("@/ui/components/scoreboard/scoreboard-layout", () => ({
  ScoreboardProviders: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ScoreboardScreen: ({
    competitionSlug,
    editionSlug,
  }: {
    competitionSlug: string;
    editionSlug: string;
  }) => (
    <div>
      Scoreboard for {competitionSlug}/{editionSlug}
    </div>
  ),
}));

describe("app pages smoke test", () => {
  it("renders landing and auth pages", () => {
    render(<LandingPage />);
    render(<LoginPage />);
    render(<SignupPage />);

    expect(document.body.textContent).toContain("Moderne administrasjon");
  });

  it("renders admin overview and competition detail", async () => {
    const adminOverview = await AdminOverviewPage();
    render(adminOverview as React.ReactElement);

    const competitionDetail = await CompetitionDetailPage({
      params: { competitionId: "comp-1" },
    });
    render(competitionDetail as React.ReactElement);

    expect(document.body.textContent).toContain("Elite Cup");
  });

  it("renders public scoreboard page with mocked data", async () => {
    const scoreboardPage = await ScoreboardPage({
      params: Promise.resolve({
        competitionSlug: "comp-1",
        editionSlug: "ed-1",
      }),
    });

    render(scoreboardPage as React.ReactElement);
    expect(document.body.textContent).toContain("Scoreboard for comp-1/ed-1");
  });
});
