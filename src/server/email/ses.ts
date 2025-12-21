import { SESClient } from "@aws-sdk/client-ses";
import { env } from "@/env";

let cachedClient: SESClient | null = null;

export function shouldSendEmails(): boolean {
  return env.SES_ENABLED && env.NODE_ENV !== "test";
}

export function getSesClient(): SESClient {
  if (!env.SES_REGION) {
    throw new Error("SES_REGION is missing from the environment.");
  }

  if (cachedClient) {
    return cachedClient;
  }

  cachedClient = new SESClient({
    region: env.SES_REGION,
    credentials:
      env.SES_ACCESS_KEY_ID && env.SES_SECRET_ACCESS_KEY
        ? {
            accessKeyId: env.SES_ACCESS_KEY_ID,
            secretAccessKey: env.SES_SECRET_ACCESS_KEY,
          }
        : undefined,
  });

  return cachedClient;
}

export function resolveSourceEmail(): string {
  return env.SES_SOURCE_EMAIL ?? env.BETTER_AUTH_EMAIL_SENDER;
}

export function resolveConfigurationSet(): string | undefined {
  return env.SES_CONFIGURATION_SET ?? undefined;
}
