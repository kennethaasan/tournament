import { beforeEach, describe, expect, it, vi } from "vitest";

type SesEnv = {
  SES_ENABLED: boolean;
  NODE_ENV: string;
  SES_REGION: string | undefined;
  SES_ACCESS_KEY_ID: string | undefined;
  SES_SECRET_ACCESS_KEY: string | undefined;
  SES_SOURCE_EMAIL: string | undefined;
  SES_CONFIGURATION_SET: string | undefined;
  BETTER_AUTH_EMAIL_SENDER: string;
};

const env: SesEnv = {
  SES_ENABLED: false,
  NODE_ENV: "test",
  SES_REGION: "eu-west-1",
  SES_ACCESS_KEY_ID: undefined,
  SES_SECRET_ACCESS_KEY: undefined,
  SES_SOURCE_EMAIL: undefined,
  SES_CONFIGURATION_SET: undefined,
  BETTER_AUTH_EMAIL_SENDER: "no-reply@example.com",
};

vi.mock("@/env", () => ({ env }));

const loadSesModule = async () => import("@/server/email/ses");

beforeEach(() => {
  env.SES_ENABLED = false;
  env.NODE_ENV = "test";
  env.SES_REGION = "eu-west-1";
  env.SES_ACCESS_KEY_ID = undefined;
  env.SES_SECRET_ACCESS_KEY = undefined;
  env.SES_SOURCE_EMAIL = undefined;
  env.SES_CONFIGURATION_SET = undefined;
  env.BETTER_AUTH_EMAIL_SENDER = "no-reply@example.com";
  vi.resetModules();
});

describe("ses helpers", () => {
  it("checks if email sending is enabled", async () => {
    const { shouldSendEmails } = await loadSesModule();

    expect(shouldSendEmails()).toBe(false);

    env.SES_ENABLED = true;
    env.NODE_ENV = "production";
    expect(shouldSendEmails()).toBe(true);
  });

  it("throws when region is missing", async () => {
    const { getSesClient } = await loadSesModule();
    env.SES_REGION = undefined;

    expect(() => getSesClient()).toThrow("SES_REGION is missing");
  });

  it("caches the SES client instance", async () => {
    const { getSesClient } = await loadSesModule();

    const first = getSesClient();
    const second = getSesClient();

    expect(second).toBe(first);
  });

  it("resolves source email and configuration set", async () => {
    const { resolveConfigurationSet, resolveSourceEmail } =
      await loadSesModule();

    env.SES_SOURCE_EMAIL = "sender@example.com";
    env.SES_CONFIGURATION_SET = "config-set";

    expect(resolveSourceEmail()).toBe("sender@example.com");
    expect(resolveConfigurationSet()).toBe("config-set");

    env.SES_SOURCE_EMAIL = undefined;
    env.SES_CONFIGURATION_SET = undefined;

    expect(resolveSourceEmail()).toBe("no-reply@example.com");
    expect(resolveConfigurationSet()).toBeUndefined();
  });
});
