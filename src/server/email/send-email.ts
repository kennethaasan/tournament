import type { SESClient } from "@aws-sdk/client-ses";
import { SendEmailCommand } from "@aws-sdk/client-ses";
import { logger } from "@/lib/logger/pino";
import {
  getSesClient,
  resolveConfigurationSet,
  resolveSourceEmail,
  shouldSendEmails,
} from "./ses";

export type SendEmailInput = {
  toEmail: string;
  subject: string;
  textBody: string;
  htmlBody?: string;
  context?: Record<string, unknown>;
};

export type SendEmailResult = {
  status: "sent" | "skipped" | "failed";
  reason?: "disabled" | "config" | "error";
};

export async function sendEmailBestEffort(
  input: SendEmailInput,
): Promise<SendEmailResult> {
  if (!shouldSendEmails()) {
    logger.info(
      { toEmail: input.toEmail, status: "skipped", reason: "disabled" },
      "email_skipped",
    );
    return { status: "skipped", reason: "disabled" };
  }

  let client: SESClient;
  try {
    client = getSesClient();
  } catch (error) {
    logger.error(
      { error, toEmail: input.toEmail, status: "failed", reason: "config" },
      "email_config_error",
    );
    return { status: "failed", reason: "config" };
  }

  const sourceEmail = resolveSourceEmail();
  const configurationSet = resolveConfigurationSet();

  try {
    await client.send(
      new SendEmailCommand({
        Source: sourceEmail,
        Destination: {
          ToAddresses: [input.toEmail],
        },
        Message: {
          Subject: { Data: input.subject, Charset: "UTF-8" },
          Body: {
            Text: { Data: input.textBody, Charset: "UTF-8" },
            ...(input.htmlBody
              ? { Html: { Data: input.htmlBody, Charset: "UTF-8" } }
              : {}),
          },
        },
        ...(configurationSet ? { ConfigurationSetName: configurationSet } : {}),
      }),
    );

    logger.info(
      { toEmail: input.toEmail, status: "sent", context: input.context },
      "email_sent",
    );

    return { status: "sent" };
  } catch (error) {
    logger.error(
      {
        error,
        toEmail: input.toEmail,
        status: "failed",
        context: input.context,
      },
      "email_failed",
    );
    return { status: "failed", reason: "error" };
  }
}
