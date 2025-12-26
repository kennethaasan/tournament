import type { SESClient } from "@aws-sdk/client-ses";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { sendEmailBestEffort } from "@/server/email/send-email";
import {
  getSesClient,
  resolveConfigurationSet,
  resolveSourceEmail,
  shouldSendEmails,
} from "@/server/email/ses";

vi.mock("@/server/email/ses", () => ({
  shouldSendEmails: vi.fn(),
  getSesClient: vi.fn(),
  resolveSourceEmail: vi.fn(),
  resolveConfigurationSet: vi.fn(),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe("sendEmailBestEffort", () => {
  it("skips when emails are disabled", async () => {
    vi.mocked(shouldSendEmails).mockReturnValue(false);

    const result = await sendEmailBestEffort({
      toEmail: "user@example.com",
      subject: "Test",
      textBody: "Hello",
    });

    expect(result).toEqual({ status: "skipped", reason: "disabled" });
    expect(getSesClient).not.toHaveBeenCalled();
  });

  it("returns config errors when SES is misconfigured", async () => {
    vi.mocked(shouldSendEmails).mockReturnValue(true);
    vi.mocked(getSesClient).mockImplementation(() => {
      throw new Error("SES_REGION missing");
    });

    const result = await sendEmailBestEffort({
      toEmail: "user@example.com",
      subject: "Test",
      textBody: "Hello",
    });

    expect(result).toEqual({ status: "failed", reason: "config" });
  });

  it("sends emails via SES", async () => {
    const send = vi.fn().mockResolvedValue({});
    vi.mocked(shouldSendEmails).mockReturnValue(true);
    vi.mocked(getSesClient).mockReturnValue({ send } as unknown as SESClient);
    vi.mocked(resolveSourceEmail).mockReturnValue("from@example.com");
    vi.mocked(resolveConfigurationSet).mockReturnValue("config-set");

    const result = await sendEmailBestEffort({
      toEmail: "user@example.com",
      subject: "Test",
      textBody: "Hello",
      htmlBody: "<p>Hello</p>",
      context: { kind: "test" },
    });

    expect(result).toEqual({ status: "sent" });
    expect(send).toHaveBeenCalledOnce();
  });

  it("returns failed when SES send throws", async () => {
    const send = vi.fn().mockRejectedValue(new Error("SES down"));
    vi.mocked(shouldSendEmails).mockReturnValue(true);
    vi.mocked(getSesClient).mockReturnValue({ send } as unknown as SESClient);
    vi.mocked(resolveSourceEmail).mockReturnValue("from@example.com");
    vi.mocked(resolveConfigurationSet).mockReturnValue(undefined);

    const result = await sendEmailBestEffort({
      toEmail: "user@example.com",
      subject: "Test",
      textBody: "Hello",
    });

    expect(result).toEqual({ status: "failed", reason: "error" });
  });
});
