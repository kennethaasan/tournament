import { beforeEach, describe, expect, test, vi } from "vitest";
import { env } from "@/env";
import { ProblemError } from "@/lib/errors/problem";
import { sendInvitationEmail } from "@/server/email/invitations";
import {
  getSesClient,
  resolveConfigurationSet,
  resolveSourceEmail,
  shouldSendEmails,
} from "@/server/email/ses";

vi.mock("@/env", () => ({
  env: {
    SES_REGION: "eu-west-1",
    SES_ENABLED: true,
    NODE_ENV: "production",
    BETTER_AUTH_EMAIL_SENDER: "no-reply@example.com",
  },
}));

vi.mock("@/server/email/ses", () => ({
  shouldSendEmails: vi.fn(),
  getSesClient: vi.fn(),
  resolveSourceEmail: vi.fn(() => "no-reply@example.com"),
  resolveConfigurationSet: vi.fn(() => "config-set"),
}));

const mockShouldSend = vi.mocked(shouldSendEmails);
const mockGetSesClient = vi.mocked(getSesClient);

const baseInput = {
  toEmail: "invitee@example.com",
  acceptUrl: "http://localhost/auth/invitations/token",
  role: "competition_admin" as const,
  scopeType: "competition" as const,
  scopeLabel: "Elite Cup",
  inviterEmail: "admin@example.com",
  expiresAt: new Date(Date.now() + 60_000),
};

beforeEach(() => {
  mockShouldSend.mockReset();
  mockGetSesClient.mockReset();
  vi.mocked(resolveSourceEmail).mockReset();
  vi.mocked(resolveConfigurationSet).mockReset();
  (env as { SES_REGION?: string }).SES_REGION = "eu-west-1";
});

describe("invitation emails", () => {
  test("skips sending when email delivery is disabled", async () => {
    mockShouldSend.mockReturnValue(false);

    const result = await sendInvitationEmail(baseInput);
    expect(result.status).toBe("skipped");
    expect(mockGetSesClient).not.toHaveBeenCalled();
  });

  test("throws when SES region is missing", async () => {
    mockShouldSend.mockReturnValue(true);
    (env as { SES_REGION?: string }).SES_REGION = undefined;

    await expect(sendInvitationEmail(baseInput)).rejects.toBeInstanceOf(
      ProblemError,
    );
  });

  test("sends invitation emails when configured", async () => {
    mockShouldSend.mockReturnValue(true);
    const send = vi.fn().mockResolvedValue({});
    mockGetSesClient.mockReturnValue({ send } as never);

    const result = await sendInvitationEmail(baseInput);
    expect(result.status).toBe("sent");
    expect(send).toHaveBeenCalledTimes(1);
  });

  test("wraps send failures in problem details", async () => {
    mockShouldSend.mockReturnValue(true);
    const send = vi.fn().mockRejectedValue(new Error("SES down"));
    mockGetSesClient.mockReturnValue({ send } as never);

    await expect(sendInvitationEmail(baseInput)).rejects.toBeInstanceOf(
      ProblemError,
    );
  });

  test("builds subject for global admin without scope", async () => {
    mockShouldSend.mockReturnValue(true);
    const send = vi.fn().mockResolvedValue({});
    mockGetSesClient.mockReturnValue({ send } as never);

    await sendInvitationEmail({
      ...baseInput,
      role: "global_admin",
      scopeType: "global",
      scopeLabel: null,
    });

    expect(send).toHaveBeenCalledTimes(1);
  });

  test("builds subject for team_manager with team scope", async () => {
    mockShouldSend.mockReturnValue(true);
    const send = vi.fn().mockResolvedValue({});
    mockGetSesClient.mockReturnValue({ send } as never);

    await sendInvitationEmail({
      ...baseInput,
      role: "team_manager",
      scopeType: "team",
      scopeLabel: "Vikings FC",
    });

    expect(send).toHaveBeenCalledTimes(1);
  });

  test("builds subject for team_manager without scope label", async () => {
    mockShouldSend.mockReturnValue(true);
    const send = vi.fn().mockResolvedValue({});
    mockGetSesClient.mockReturnValue({ send } as never);

    await sendInvitationEmail({
      ...baseInput,
      role: "team_manager",
      scopeType: "team",
      scopeLabel: null,
    });

    expect(send).toHaveBeenCalledTimes(1);
  });

  test("builds subject for edition scope type", async () => {
    mockShouldSend.mockReturnValue(true);
    const send = vi.fn().mockResolvedValue({});
    mockGetSesClient.mockReturnValue({ send } as never);

    await sendInvitationEmail({
      ...baseInput,
      role: "competition_admin",
      scopeType: "edition" as never,
      scopeLabel: "2025 Season",
    });

    expect(send).toHaveBeenCalledTimes(1);
  });

  test("builds body without inviter email", async () => {
    mockShouldSend.mockReturnValue(true);
    const send = vi.fn().mockResolvedValue({});
    mockGetSesClient.mockReturnValue({ send } as never);

    await sendInvitationEmail({
      ...baseInput,
      inviterEmail: null,
    });

    expect(send).toHaveBeenCalledTimes(1);
  });

  test("builds body for competition scope without label", async () => {
    mockShouldSend.mockReturnValue(true);
    const send = vi.fn().mockResolvedValue({});
    mockGetSesClient.mockReturnValue({ send } as never);

    await sendInvitationEmail({
      ...baseInput,
      scopeType: "competition",
      scopeLabel: undefined,
    });

    expect(send).toHaveBeenCalledTimes(1);
  });

  test("uses fallback role label for unknown role", async () => {
    mockShouldSend.mockReturnValue(true);
    const send = vi.fn().mockResolvedValue({});
    mockGetSesClient.mockReturnValue({ send } as never);

    await sendInvitationEmail({
      ...baseInput,
      role: "unknown_role" as never,
      scopeType: "global",
      scopeLabel: null,
    });

    expect(send).toHaveBeenCalledTimes(1);
  });

  test("handles unknown scope type without label", async () => {
    mockShouldSend.mockReturnValue(true);
    const send = vi.fn().mockResolvedValue({});
    mockGetSesClient.mockReturnValue({ send } as never);

    await sendInvitationEmail({
      ...baseInput,
      scopeType: "unknown_scope" as never,
      scopeLabel: null,
    });

    expect(send).toHaveBeenCalledTimes(1);
  });

  test("omits configuration set when not configured", async () => {
    mockShouldSend.mockReturnValue(true);
    const send = vi.fn().mockResolvedValue({});
    mockGetSesClient.mockReturnValue({ send } as never);
    vi.mocked(resolveConfigurationSet).mockReturnValue(null);
    vi.mocked(resolveSourceEmail).mockReturnValue("no-reply@example.com");

    await sendInvitationEmail(baseInput);

    expect(send).toHaveBeenCalledTimes(1);
  });
});
