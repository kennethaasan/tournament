import { SendEmailCommand } from "@aws-sdk/client-ses";
import { env } from "@/env";
import { createProblem } from "@/lib/errors/problem";
import { logger } from "@/lib/logger/powertools";
import type { Role, RoleScope } from "@/server/auth";
import { escapeHtml } from "@/server/email/email-utils";
import {
  getSesClient,
  resolveConfigurationSet,
  resolveSourceEmail,
  shouldSendEmails,
} from "@/server/email/ses";

type InvitationEmailInput = {
  toEmail: string;
  acceptUrl: string;
  role: Role;
  scopeType: RoleScope;
  scopeLabel?: string | null;
  inviterEmail?: string | null;
  expiresAt: Date;
};

type SendResult = {
  status: "sent" | "skipped";
};

const ROLE_LABELS: Record<Role, string> = {
  global_admin: "global administrator",
  competition_admin: "konkurranseadministrator",
  team_manager: "lagleder",
};

export async function sendInvitationEmail(
  input: InvitationEmailInput,
): Promise<SendResult> {
  if (!shouldSendEmails()) {
    logger.info("invitation_email_skipped", {
      toEmail: input.toEmail,
      status: "skipped",
    });
    return { status: "skipped" };
  }

  if (!env.SES_REGION) {
    throw createProblem({
      type: "https://tournament.app/problems/invitations/email-config",
      title: "E-post er ikke konfigurert",
      status: 500,
      detail: "SES_REGION mangler i miljøvariablene.",
    });
  }

  const client = getSesClient();
  const sourceEmail = resolveSourceEmail();
  const configurationSet = resolveConfigurationSet();

  const subject = buildSubject(input);
  const textBody = buildTextBody(input);
  const htmlBody = buildHtmlBody(input);

  try {
    await client.send(
      new SendEmailCommand({
        Source: sourceEmail,
        Destination: {
          ToAddresses: [input.toEmail],
        },
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: {
            Text: { Data: textBody, Charset: "UTF-8" },
            Html: { Data: htmlBody, Charset: "UTF-8" },
          },
        },
        ...(configurationSet ? { ConfigurationSetName: configurationSet } : {}),
      }),
    );

    logger.info("invitation_email_sent", {
      toEmail: input.toEmail,
      status: "sent",
    });

    return { status: "sent" };
  } catch (error) {
    logger.error("invitation_email_failed", { error, toEmail: input.toEmail });

    throw createProblem({
      type: "https://tournament.app/problems/invitations/email-failed",
      title: "Kunne ikke sende invitasjon",
      status: 502,
      detail:
        "Invitasjonen ble opprettet, men e-posten kunne ikke sendes. Prøv igjen senere.",
    });
  }
}

function buildSubject(input: InvitationEmailInput): string {
  const roleLabel = ROLE_LABELS[input.role] ?? "administrator";
  const scopeDescriptor = buildScopeDescriptor(
    input.scopeType,
    input.scopeLabel,
  );

  return scopeDescriptor
    ? `Du er invitert som ${roleLabel} for ${scopeDescriptor}`
    : `Du er invitert som ${roleLabel}`;
}

function buildTextBody(input: InvitationEmailInput): string {
  const roleLabel = ROLE_LABELS[input.role] ?? "administrator";
  const scopeDescriptor = buildScopeDescriptor(
    input.scopeType,
    input.scopeLabel,
  );
  const expiresAt = formatExpiry(input.expiresAt);
  const inviterLine = input.inviterEmail
    ? `Invitasjonen ble sendt av ${input.inviterEmail}.`
    : "Du har mottatt en invitasjon.";

  const roleLine = scopeDescriptor
    ? `Du er invitert som ${roleLabel} for ${scopeDescriptor}.`
    : `Du er invitert som ${roleLabel}.`;

  return [
    "Hei!",
    "",
    inviterLine,
    roleLine,
    "",
    "Godta invitasjonen ved å bruke lenken under:",
    input.acceptUrl,
    "",
    `Invitasjonen utløper ${expiresAt}.`,
    "",
    "Hvis du ikke forventet denne e-posten kan du se bort fra den.",
  ].join("\n");
}

function buildHtmlBody(input: InvitationEmailInput): string {
  const roleLabel = ROLE_LABELS[input.role] ?? "administrator";
  const scopeDescriptor = buildScopeDescriptor(
    input.scopeType,
    input.scopeLabel,
  );
  const expiresAt = formatExpiry(input.expiresAt);
  const inviterLine = input.inviterEmail
    ? `Invitasjonen ble sendt av <strong>${escapeHtml(
        input.inviterEmail,
      )}</strong>.`
    : "Du har mottatt en invitasjon.";
  const roleLine = scopeDescriptor
    ? `Du er invitert som <strong>${roleLabel}</strong> for <strong>${escapeHtml(
        scopeDescriptor,
      )}</strong>.`
    : `Du er invitert som <strong>${roleLabel}</strong>.`;

  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      <p>Hei!</p>
      <p>${inviterLine}</p>
      <p>${roleLine}</p>
      <p>
        <a href="${input.acceptUrl}" style="display: inline-block; padding: 10px 16px; background: #2563eb; color: #fff; border-radius: 999px; text-decoration: none;">
          Godta invitasjonen
        </a>
      </p>
      <p>Invitasjonen utløper ${escapeHtml(expiresAt)}.</p>
      <p style="color: #475569;">Hvis du ikke forventet denne e-posten kan du se bort fra den.</p>
    </div>
  `;
}

function buildScopeDescriptor(
  scopeType: RoleScope,
  scopeLabel?: string | null,
): string | null {
  if (scopeType === "global") {
    return null;
  }

  if (scopeType === "competition") {
    return scopeLabel ? `konkurransen ${scopeLabel}` : "en konkurranse";
  }

  if (scopeType === "team") {
    return scopeLabel ? `laget ${scopeLabel}` : "et lag";
  }

  return scopeLabel ?? null;
}

function formatExpiry(expiresAt: Date): string {
  return expiresAt.toLocaleString("no-NO", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
