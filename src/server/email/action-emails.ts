import { eq, inArray } from "drizzle-orm";
import { env } from "@/env";
import { logger } from "@/lib/logger/powertools";
import type { Role, RoleScope } from "@/server/auth";
import { db } from "@/server/db/client";
import type { Match } from "@/server/db/schema";
import {
  competitions,
  editions,
  entries,
  matches,
  stages,
  teams,
  users,
  venues,
} from "@/server/db/schema";
import { escapeHtml, formatDateTime } from "./email-utils";
import {
  getCompetitionAdminEmails,
  getEditionTeamManagerEmails,
  getGlobalAdminEmails,
  getTeamManagerEmails,
  uniqueEmails,
} from "./recipients";
import { type SendEmailResult, sendEmailBestEffort } from "./send-email";

export type EmailSendSummary = {
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
};

export async function sendEntrySubmittedEmails(input: {
  teamId: string;
  editionId: string;
}): Promise<{ team: EmailSendSummary; admins: EmailSendSummary } | null> {
  try {
    const [team, editionContext] = await Promise.all([
      getTeamContext(input.teamId),
      getEditionContext(input.editionId),
    ]);

    if (!team || !editionContext) {
      return null;
    }

    const teamRecipients = await getTeamNotificationEmails(input.teamId, team);
    const adminRecipients = uniqueEmails([
      ...(await getCompetitionAdminEmails(editionContext.competitionId)),
      ...(await getGlobalAdminEmails()),
    ]);

    const teamSubject = `Påmelding sendt – ${team.name} (${editionContext.editionLabel})`;
    const adminSubject = `Ny påmelding – ${team.name} (${editionContext.editionLabel})`;

    const teamText = [
      "Hei!",
      "",
      `Påmeldingen for ${team.name} til ${editionContext.competitionName} ${editionContext.editionLabel} er sendt inn.`,
      "Du kan følge statusen i administrasjonen.",
      baseAppUrl() ? baseAppUrl() : "",
    ]
      .filter(isNonEmptyString)
      .join("\n");

    const adminText = [
      "Hei!",
      "",
      `En ny påmelding er sendt inn for ${team.name} i ${editionContext.competitionName} ${editionContext.editionLabel}.`,
      "Gå til administrasjonen for å behandle påmeldingen.",
      baseAppUrl() ? baseAppUrl() : "",
    ]
      .filter(isNonEmptyString)
      .join("\n");

    const teamHtml = wrapHtml([
      `<p>Hei!</p>`,
      `<p>Påmeldingen for <strong>${escapeHtml(team.name)}</strong> til ${escapeHtml(
        editionContext.competitionName,
      )} ${escapeHtml(editionContext.editionLabel)} er sendt inn.</p>`,
      `<p>Du kan følge statusen i administrasjonen.</p>`,
      baseAppUrl()
        ? `<p><a href="${escapeHtml(baseAppUrl() ?? "")}">Åpne administrasjonen</a></p>`
        : "",
    ]);

    const adminHtml = wrapHtml([
      `<p>Hei!</p>`,
      `<p>En ny påmelding er sendt inn for <strong>${escapeHtml(team.name)}</strong> i ${escapeHtml(
        editionContext.competitionName,
      )} ${escapeHtml(editionContext.editionLabel)}.</p>`,
      `<p>Gå til administrasjonen for å behandle påmeldingen.</p>`,
      baseAppUrl()
        ? `<p><a href="${escapeHtml(baseAppUrl() ?? "")}">Åpne administrasjonen</a></p>`
        : "",
    ]);

    const [teamSummary, adminSummary] = await Promise.all([
      sendEmailBatch(teamRecipients, {
        subject: teamSubject,
        textBody: teamText,
        htmlBody: teamHtml,
        context: {
          kind: "entry_submitted_team",
          editionId: input.editionId,
          teamId: input.teamId,
        },
      }),
      sendEmailBatch(adminRecipients, {
        subject: adminSubject,
        textBody: adminText,
        htmlBody: adminHtml,
        context: {
          kind: "entry_submitted_admin",
          editionId: input.editionId,
          teamId: input.teamId,
        },
      }),
    ]);

    return { team: teamSummary, admins: adminSummary };
  } catch (error) {
    logger.error("entry_submitted_email_failed", { error, input });
    return null;
  }
}

export async function sendEntryStatusEmails(input: {
  teamId: string;
  editionId: string;
  status: "approved" | "rejected";
  reason?: string | null;
}): Promise<EmailSendSummary | null> {
  try {
    const [team, editionContext] = await Promise.all([
      getTeamContext(input.teamId),
      getEditionContext(input.editionId),
    ]);

    if (!team || !editionContext) {
      return null;
    }

    const recipients = await getTeamNotificationEmails(input.teamId, team);
    const statusLabel = input.status === "approved" ? "godkjent" : "avvist";
    const reason = input.reason?.trim();

    const subject = `Påmelding ${statusLabel} – ${team.name} (${editionContext.editionLabel})`;
    const textLines = [
      "Hei!",
      "",
      `Påmeldingen for ${team.name} i ${editionContext.competitionName} ${editionContext.editionLabel} er ${statusLabel}.`,
    ];

    if (reason) {
      textLines.push("", `Begrunnelse: ${reason}`);
    }

    if (baseAppUrl()) {
      textLines.push("", baseAppUrl() ?? "");
    }

    const htmlLines = [
      `<p>Hei!</p>`,
      `<p>Påmeldingen for <strong>${escapeHtml(team.name)}</strong> i ${escapeHtml(
        editionContext.competitionName,
      )} ${escapeHtml(editionContext.editionLabel)} er <strong>${escapeHtml(
        statusLabel,
      )}</strong>.</p>`,
    ];

    if (reason) {
      htmlLines.push(`<p>Begrunnelse: ${escapeHtml(reason)}</p>`);
    }

    if (baseAppUrl()) {
      htmlLines.push(
        `<p><a href="${escapeHtml(baseAppUrl() ?? "")}">Åpne administrasjonen</a></p>`,
      );
    }

    const htmlBody = wrapHtml(htmlLines);
    const textBody = textLines.join("\n");

    return await sendEmailBatch(recipients, {
      subject,
      textBody,
      htmlBody,
      context: {
        kind: "entry_status",
        editionId: input.editionId,
        teamId: input.teamId,
        status: input.status,
      },
    });
  } catch (error) {
    logger.error("entry_status_email_failed", { error, input });
    return null;
  }
}

export async function sendMatchScheduleChangedEmails(input: {
  previousMatch: Match;
  updatedMatch: Match;
}): Promise<EmailSendSummary | null> {
  try {
    const kickoffChanged =
      input.previousMatch.kickoffAt?.getTime() !==
      input.updatedMatch.kickoffAt?.getTime();
    const venueChanged =
      input.previousMatch.venueId !== input.updatedMatch.venueId;

    if (!kickoffChanged && !venueChanged) {
      return null;
    }

    const matchContext = await getMatchContext(input.updatedMatch);
    if (!matchContext) {
      return null;
    }

    const recipients = await getTeamManagerEmails(matchContext.teamIds);
    if (recipients.length === 0) {
      return null;
    }

    const subject = `Kampoppdatering – ${matchContext.matchLabel} (${matchContext.editionLabel})`;
    const kickoffLabel = matchContext.kickoffAt
      ? formatDateTime(matchContext.kickoffAt, {
          timeZone: matchContext.timezone,
        })
      : "Ikke satt";
    const venueLabel = matchContext.venueName ?? "Ikke satt";

    const textLines = [
      "Hei!",
      "",
      `Kampoppsettet er oppdatert for ${matchContext.matchLabel} i ${matchContext.competitionName} ${matchContext.editionLabel}.`,
    ];

    if (kickoffChanged) {
      textLines.push(`Ny kampstart: ${kickoffLabel}`);
    }
    if (venueChanged) {
      textLines.push(`Nytt kampsted: ${venueLabel}`);
    }

    if (baseAppUrl()) {
      textLines.push("", baseAppUrl() ?? "");
    }

    const htmlLines = [
      `<p>Hei!</p>`,
      `<p>Kampoppsettet er oppdatert for <strong>${escapeHtml(
        matchContext.matchLabel,
      )}</strong> i ${escapeHtml(matchContext.competitionName)} ${escapeHtml(
        matchContext.editionLabel,
      )}.</p>`,
    ];

    if (kickoffChanged) {
      htmlLines.push(
        `<p>Ny kampstart: <strong>${escapeHtml(kickoffLabel)}</strong></p>`,
      );
    }
    if (venueChanged) {
      htmlLines.push(
        `<p>Nytt kampsted: <strong>${escapeHtml(venueLabel)}</strong></p>`,
      );
    }

    if (baseAppUrl()) {
      htmlLines.push(
        `<p><a href="${escapeHtml(baseAppUrl() ?? "")}">Åpne administrasjonen</a></p>`,
      );
    }

    return await sendEmailBatch(recipients, {
      subject,
      textBody: textLines.join("\n"),
      htmlBody: wrapHtml(htmlLines),
      context: {
        kind: "match_schedule_changed",
        matchId: input.updatedMatch.id,
      },
    });
  } catch (error) {
    logger.error("match_schedule_email_failed", { error, input });
    return null;
  }
}

export async function sendMatchFinalizedEmails(input: {
  updatedMatch: Match;
}): Promise<EmailSendSummary | null> {
  try {
    const matchContext = await getMatchContext(input.updatedMatch);
    if (!matchContext) {
      return null;
    }

    const recipients = await getTeamManagerEmails(matchContext.teamIds);
    if (recipients.length === 0) {
      return null;
    }

    const subject = `Resultat klart – ${matchContext.matchLabel} (${matchContext.editionLabel})`;
    const scoreLines = buildScoreLines(input.updatedMatch);

    const textLines = [
      "Hei!",
      "",
      `Kampen ${matchContext.matchLabel} i ${matchContext.competitionName} ${matchContext.editionLabel} er ferdigspilt.`,
      ...scoreLines.text,
    ];

    if (baseAppUrl()) {
      textLines.push("", baseAppUrl() ?? "");
    }

    const htmlLines = [
      `<p>Hei!</p>`,
      `<p>Kampen <strong>${escapeHtml(
        matchContext.matchLabel,
      )}</strong> i ${escapeHtml(matchContext.competitionName)} ${escapeHtml(
        matchContext.editionLabel,
      )} er ferdigspilt.</p>`,
      ...scoreLines.html,
    ];

    if (baseAppUrl()) {
      htmlLines.push(
        `<p><a href="${escapeHtml(baseAppUrl() ?? "")}">Åpne administrasjonen</a></p>`,
      );
    }

    return await sendEmailBatch(recipients, {
      subject,
      textBody: textLines.join("\n"),
      htmlBody: wrapHtml(htmlLines),
      context: {
        kind: "match_finalized",
        matchId: input.updatedMatch.id,
      },
    });
  } catch (error) {
    logger.error("match_finalized_email_failed", { error, input });
    return null;
  }
}

export async function sendMatchDisputedEmails(input: {
  updatedMatch: Match;
}): Promise<EmailSendSummary | null> {
  try {
    const matchContext = await getMatchContext(input.updatedMatch);
    if (!matchContext) {
      return null;
    }

    const recipients = uniqueEmails([
      ...(await getTeamManagerEmails(matchContext.teamIds)),
      ...(await getCompetitionAdminEmails(matchContext.competitionId)),
      ...(await getGlobalAdminEmails()),
    ]);

    if (recipients.length === 0) {
      return null;
    }

    const subject = `Resultat omtvistet – ${matchContext.matchLabel} (${matchContext.editionLabel})`;

    const textLines = [
      "Hei!",
      "",
      `Resultatet for ${matchContext.matchLabel} i ${matchContext.competitionName} ${matchContext.editionLabel} er markert som omtvistet.`,
      "Administrasjonen vil følge opp saken.",
    ];

    if (baseAppUrl()) {
      textLines.push("", baseAppUrl() ?? "");
    }

    const htmlLines = [
      `<p>Hei!</p>`,
      `<p>Resultatet for <strong>${escapeHtml(
        matchContext.matchLabel,
      )}</strong> i ${escapeHtml(matchContext.competitionName)} ${escapeHtml(
        matchContext.editionLabel,
      )} er markert som omtvistet.</p>`,
      `<p>Administrasjonen vil følge opp saken.</p>`,
    ];

    if (baseAppUrl()) {
      htmlLines.push(
        `<p><a href="${escapeHtml(baseAppUrl() ?? "")}">Åpne administrasjonen</a></p>`,
      );
    }

    return await sendEmailBatch(recipients, {
      subject,
      textBody: textLines.join("\n"),
      htmlBody: wrapHtml(htmlLines),
      context: {
        kind: "match_disputed",
        matchId: input.updatedMatch.id,
      },
    });
  } catch (error) {
    logger.error("match_disputed_email_failed", { error, input });
    return null;
  }
}

export async function sendMatchDisputeSubmittedEmails(input: {
  matchId: string;
  entryId: string;
  reason: string;
}): Promise<{ teams: EmailSendSummary; admins: EmailSendSummary } | null> {
  try {
    const match = await db.query.matches.findFirst({
      where: eq(matches.id, input.matchId),
    });

    if (!match) {
      return null;
    }

    const matchContext = await getMatchContext(match);
    if (!matchContext) {
      return null;
    }

    const disputingTeam = await getTeamForEntry(input.entryId);
    const opposingEntryId = resolveOpposingEntryId(match, input.entryId);
    const opponentTeam = opposingEntryId
      ? await getTeamForEntry(opposingEntryId)
      : null;

    const teamRecipients = uniqueEmails([
      ...(await getTeamManagerEmails(matchContext.teamIds)),
    ]);
    const adminRecipients = uniqueEmails([
      ...(await getCompetitionAdminEmails(matchContext.competitionId)),
      ...(await getGlobalAdminEmails()),
    ]);

    const teamSubject = `Tvist registrert – ${matchContext.matchLabel} (${matchContext.editionLabel})`;
    const adminSubject = `Ny tvist – ${matchContext.matchLabel} (${matchContext.editionLabel})`;

    const teamText = [
      "Hei!",
      "",
      `Det er registrert en tvist for ${matchContext.matchLabel} i ${matchContext.competitionName} ${matchContext.editionLabel}.`,
      disputingTeam
        ? `Tvisten ble sendt inn av ${disputingTeam.name}.`
        : "Tvisten ble sendt inn av et av lagene.",
      opponentTeam ? `Motstander: ${opponentTeam.name}.` : "",
      "Administrasjonen vil følge opp saken.",
    ]
      .filter(isNonEmptyString)
      .join("\n");

    const adminText = [
      "Hei!",
      "",
      `Det er registrert en tvist for ${matchContext.matchLabel} i ${matchContext.competitionName} ${matchContext.editionLabel}.`,
      disputingTeam
        ? `Tvisten ble sendt inn av ${disputingTeam.name}.`
        : "Tvisten ble sendt inn av et av lagene.",
      opponentTeam ? `Motstander: ${opponentTeam.name}.` : "",
      `Begrunnelse: ${input.reason.trim()}`,
    ]
      .filter(isNonEmptyString)
      .join("\n");

    const teamHtml = wrapHtml([
      `<p>Hei!</p>`,
      `<p>Det er registrert en tvist for <strong>${escapeHtml(
        matchContext.matchLabel,
      )}</strong> i ${escapeHtml(matchContext.competitionName)} ${escapeHtml(
        matchContext.editionLabel,
      )}.</p>`,
      `<p>${escapeHtml(
        disputingTeam
          ? `Tvisten ble sendt inn av ${disputingTeam.name}.`
          : "Tvisten ble sendt inn av et av lagene.",
      )}</p>`,
      opponentTeam
        ? `<p>Motstander: ${escapeHtml(opponentTeam.name)}.</p>`
        : "",
      `<p>Administrasjonen vil følge opp saken.</p>`,
    ]);

    const adminHtml = wrapHtml([
      `<p>Hei!</p>`,
      `<p>Det er registrert en tvist for <strong>${escapeHtml(
        matchContext.matchLabel,
      )}</strong> i ${escapeHtml(matchContext.competitionName)} ${escapeHtml(
        matchContext.editionLabel,
      )}.</p>`,
      `<p>${escapeHtml(
        disputingTeam
          ? `Tvisten ble sendt inn av ${disputingTeam.name}.`
          : "Tvisten ble sendt inn av et av lagene.",
      )}</p>`,
      opponentTeam
        ? `<p>Motstander: ${escapeHtml(opponentTeam.name)}.</p>`
        : "",
      `<p>Begrunnelse: ${escapeHtml(input.reason.trim())}</p>`,
    ]);

    const [teamSummary, adminSummary] = await Promise.all([
      sendEmailBatch(teamRecipients, {
        subject: teamSubject,
        textBody: teamText,
        htmlBody: teamHtml,
        context: { kind: "match_dispute_team", matchId: input.matchId },
      }),
      sendEmailBatch(adminRecipients, {
        subject: adminSubject,
        textBody: adminText,
        htmlBody: adminHtml,
        context: { kind: "match_dispute_admin", matchId: input.matchId },
      }),
    ]);

    return { teams: teamSummary, admins: adminSummary };
  } catch (error) {
    logger.error("match_dispute_submitted_email_failed", { error, input });
    return null;
  }
}

export async function sendScheduleGeneratedEmails(input: {
  editionId: string;
  stageId: string;
  algorithm: "round_robin_circle" | "knockout_seeded";
}): Promise<{ teams: EmailSendSummary; admins: EmailSendSummary } | null> {
  try {
    const [editionContext, stage] = await Promise.all([
      getEditionContext(input.editionId),
      db.query.stages.findFirst({ where: eq(stages.id, input.stageId) }),
    ]);

    if (!editionContext || !stage) {
      return null;
    }

    const teamRecipients = await getEditionTeamManagerEmails(input.editionId);
    const adminRecipients = uniqueEmails([
      ...(await getCompetitionAdminEmails(editionContext.competitionId)),
      ...(await getGlobalAdminEmails()),
    ]);

    const algorithmLabel =
      input.algorithm === "round_robin_circle"
        ? "Round-robin (sirkel)"
        : "Cup (seedet)";

    const teamSubject = `Kampprogram publisert – ${editionContext.editionLabel}`;
    const adminSubject = `Kampprogram generert – ${editionContext.editionLabel}`;

    const teamText = [
      "Hei!",
      "",
      `Kampprogrammet er nå publisert for ${editionContext.competitionName} ${editionContext.editionLabel}.`,
      `Stadie: ${stage.name}.`,
      `Metode: ${algorithmLabel}.`,
      "Logg inn for å se kampene.",
      baseAppUrl() ? baseAppUrl() : "",
    ]
      .filter(isNonEmptyString)
      .join("\n");

    const adminText = [
      "Hei!",
      "",
      `Kampprogrammet er generert for ${editionContext.competitionName} ${editionContext.editionLabel}.`,
      `Stadie: ${stage.name}.`,
      `Metode: ${algorithmLabel}.`,
      baseAppUrl() ? baseAppUrl() : "",
    ]
      .filter(isNonEmptyString)
      .join("\n");

    const teamHtml = wrapHtml([
      `<p>Hei!</p>`,
      `<p>Kampprogrammet er nå publisert for ${escapeHtml(
        editionContext.competitionName,
      )} ${escapeHtml(editionContext.editionLabel)}.</p>`,
      `<p>Stadie: <strong>${escapeHtml(stage.name)}</strong>.</p>`,
      `<p>Metode: <strong>${escapeHtml(algorithmLabel)}</strong>.</p>`,
      `<p>Logg inn for å se kampene.</p>`,
      baseAppUrl()
        ? `<p><a href="${escapeHtml(baseAppUrl() ?? "")}">Åpne administrasjonen</a></p>`
        : "",
    ]);

    const adminHtml = wrapHtml([
      `<p>Hei!</p>`,
      `<p>Kampprogrammet er generert for ${escapeHtml(
        editionContext.competitionName,
      )} ${escapeHtml(editionContext.editionLabel)}.</p>`,
      `<p>Stadie: <strong>${escapeHtml(stage.name)}</strong>.</p>`,
      `<p>Metode: <strong>${escapeHtml(algorithmLabel)}</strong>.</p>`,
      baseAppUrl()
        ? `<p><a href="${escapeHtml(baseAppUrl() ?? "")}">Åpne administrasjonen</a></p>`
        : "",
    ]);

    const [teamSummary, adminSummary] = await Promise.all([
      sendEmailBatch(teamRecipients, {
        subject: teamSubject,
        textBody: teamText,
        htmlBody: teamHtml,
        context: { kind: "schedule_published", editionId: input.editionId },
      }),
      sendEmailBatch(adminRecipients, {
        subject: adminSubject,
        textBody: adminText,
        htmlBody: adminHtml,
        context: { kind: "schedule_generated", editionId: input.editionId },
      }),
    ]);

    return { teams: teamSummary, admins: adminSummary };
  } catch (error) {
    logger.error("schedule_generated_email_failed", { error, input });
    return null;
  }
}

export async function sendInvitationAcceptedEmail(input: {
  invitationId: string;
  inviterId: string;
  inviteeEmail: string;
  role: Role;
  scopeType: RoleScope;
  scopeId: string | null;
}): Promise<EmailSendSummary | null> {
  try {
    const inviter = await db.query.users.findFirst({
      columns: { email: true, fullName: true },
      where: eq(users.id, input.inviterId),
    });

    if (!inviter) {
      return null;
    }

    const scopeLabel = await resolveScopeLabel(input.scopeType, input.scopeId);
    const roleLabel = ROLE_LABELS[input.role] ?? "administrator";
    const recipient = inviter.email;

    const subject = `Invitasjon akseptert – ${input.inviteeEmail}`;

    const textLines = [
      "Hei!",
      "",
      `Invitasjonen du sendte til ${input.inviteeEmail} er akseptert.`,
      `Rolle: ${roleLabel}.`,
    ];

    if (scopeLabel) {
      textLines.push(`Omfang: ${scopeLabel}.`);
    }

    if (baseAppUrl()) {
      textLines.push("", baseAppUrl() ?? "");
    }

    const htmlLines = [
      `<p>Hei!</p>`,
      `<p>Invitasjonen du sendte til <strong>${escapeHtml(
        input.inviteeEmail,
      )}</strong> er akseptert.</p>`,
      `<p>Rolle: <strong>${escapeHtml(roleLabel)}</strong>.</p>`,
    ];

    if (scopeLabel) {
      htmlLines.push(
        `<p>Omfang: <strong>${escapeHtml(scopeLabel)}</strong>.</p>`,
      );
    }

    if (baseAppUrl()) {
      htmlLines.push(
        `<p><a href="${escapeHtml(baseAppUrl() ?? "")}">Åpne administrasjonen</a></p>`,
      );
    }

    return await sendEmailBatch([recipient], {
      subject,
      textBody: textLines.join("\n"),
      htmlBody: wrapHtml(htmlLines),
      context: {
        kind: "invitation_accepted",
        invitationId: input.invitationId,
      },
    });
  } catch (error) {
    logger.error("invitation_accepted_email_failed", { error, input });
    return null;
  }
}

const ROLE_LABELS: Record<Role, string> = {
  global_admin: "global administrator",
  competition_admin: "konkurranseadministrator",
  team_manager: "lagleder",
};

type EditionContext = {
  editionId: string;
  editionLabel: string;
  editionSlug: string;
  competitionId: string;
  competitionName: string;
  competitionSlug: string;
  timezone: string | null;
};

type TeamContext = {
  id: string;
  name: string;
  slug: string;
  contactEmail: string | null;
};

type MatchContext = EditionContext & {
  matchLabel: string;
  teamIds: string[];
  kickoffAt: Date | null;
  venueName: string | null;
};

function baseAppUrl(): string | null {
  const base = (env.BETTER_AUTH_URL ?? env.NEXT_PUBLIC_APP_URL).replace(
    /\/$/,
    "",
  );
  return base.length > 0 ? base : null;
}

async function getEditionContext(
  editionId: string,
): Promise<EditionContext | null> {
  const row = await db
    .select({
      editionId: editions.id,
      editionLabel: editions.label,
      editionSlug: editions.slug,
      competitionId: competitions.id,
      competitionName: competitions.name,
      competitionSlug: competitions.slug,
      timezone: editions.timezone,
    })
    .from(editions)
    .innerJoin(competitions, eq(competitions.id, editions.competitionId))
    .where(eq(editions.id, editionId))
    .limit(1);

  const context = row[0];
  if (!context) {
    return null;
  }

  return {
    editionId: context.editionId,
    editionLabel: context.editionLabel,
    editionSlug: context.editionSlug,
    competitionId: context.competitionId,
    competitionName: context.competitionName,
    competitionSlug: context.competitionSlug,
    timezone: context.timezone ?? null,
  };
}

async function getTeamContext(teamId: string): Promise<TeamContext | null> {
  const team = await db.query.teams.findFirst({
    columns: {
      id: true,
      name: true,
      slug: true,
      contactEmail: true,
    },
    where: eq(teams.id, teamId),
  });

  if (!team) {
    return null;
  }

  return {
    id: team.id,
    name: team.name,
    slug: team.slug,
    contactEmail: team.contactEmail ?? null,
  };
}

async function getTeamForEntry(entryId: string): Promise<TeamContext | null> {
  const rows = await db
    .select({
      id: teams.id,
      name: teams.name,
      slug: teams.slug,
      contactEmail: teams.contactEmail,
    })
    .from(entries)
    .innerJoin(teams, eq(teams.id, entries.teamId))
    .where(eq(entries.id, entryId))
    .limit(1);

  const team = rows[0];
  if (!team) {
    return null;
  }

  return {
    id: team.id,
    name: team.name,
    slug: team.slug,
    contactEmail: team.contactEmail ?? null,
  };
}

async function getMatchContext(match: Match): Promise<MatchContext | null> {
  const editionContext = await getEditionContext(match.editionId);
  if (!editionContext) {
    return null;
  }

  const entryIds = uniqueStrings([match.homeEntryId, match.awayEntryId]);
  const teamRows = entryIds.length
    ? await db
        .select({
          entryId: entries.id,
          teamId: teams.id,
          teamName: teams.name,
        })
        .from(entries)
        .innerJoin(teams, eq(teams.id, entries.teamId))
        .where(inArray(entries.id, entryIds))
    : [];

  const teamMap = new Map(teamRows.map((row) => [row.entryId, row.teamName]));

  const homeName = match.homeEntryId
    ? (teamMap.get(match.homeEntryId) ?? "Hjemmelag")
    : "Hjemmelag";
  const awayName = match.awayEntryId
    ? (teamMap.get(match.awayEntryId) ?? "Bortelag")
    : "Bortelag";

  const venueName = match.venueId
    ? await resolveVenueName(match.venueId)
    : null;

  const teamIds = uniqueStrings(teamRows.map((row) => row.teamId));

  return {
    ...editionContext,
    matchLabel: `${homeName} – ${awayName}`,
    teamIds,
    kickoffAt: match.kickoffAt ?? null,
    venueName,
  };
}

async function resolveVenueName(venueId: string): Promise<string | null> {
  const venue = await db.query.venues.findFirst({
    columns: { name: true },
    where: eq(venues.id, venueId),
  });

  return venue?.name ?? null;
}

async function getTeamNotificationEmails(
  teamId: string,
  teamContext?: TeamContext | null,
): Promise<string[]> {
  const team = teamContext ?? (await getTeamContext(teamId));
  const managerEmails = await getTeamManagerEmails([teamId]);

  return uniqueEmails([...(managerEmails ?? []), team?.contactEmail ?? null]);
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => !!value)),
  );
}

function wrapHtml(lines: string[]): string {
  const body = lines.filter((line) => line.length > 0).join("\n");
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
      ${body}
      <p style="color: #475569;">Dette er en automatisk e-post.</p>
    </div>
  `;
}

function isNonEmptyString(value: string | null | undefined): value is string {
  return typeof value === "string" && value.length > 0;
}

function summarizeResults(results: SendEmailResult[]): EmailSendSummary {
  return results.reduce(
    (summary, result) => {
      summary.attempted += 1;
      if (result.status === "sent") {
        summary.sent += 1;
      } else if (result.status === "skipped") {
        summary.skipped += 1;
      } else {
        summary.failed += 1;
      }
      return summary;
    },
    { attempted: 0, sent: 0, failed: 0, skipped: 0 },
  );
}

async function sendEmailBatch(
  recipients: string[],
  input: {
    subject: string;
    textBody: string;
    htmlBody: string;
    context?: Record<string, unknown>;
  },
): Promise<EmailSendSummary> {
  const emails = uniqueEmails(recipients);

  if (emails.length === 0) {
    return { attempted: 0, sent: 0, failed: 0, skipped: 0 };
  }

  const results = await Promise.all(
    emails.map((toEmail) =>
      sendEmailBestEffort({
        toEmail,
        subject: input.subject,
        textBody: input.textBody,
        htmlBody: input.htmlBody,
        context: input.context,
      }),
    ),
  );

  return summarizeResults(results);
}

function resolveOpposingEntryId(match: Match, entryId: string): string | null {
  if (match.homeEntryId === entryId) {
    return match.awayEntryId ?? null;
  }

  if (match.awayEntryId === entryId) {
    return match.homeEntryId ?? null;
  }

  return null;
}

function buildScoreLines(match: Match): { text: string[]; html: string[] } {
  const lines: string[] = [];
  const html: string[] = [];

  const regulation = `${match.homeScore}–${match.awayScore}`;
  lines.push(`Resultat: ${regulation}`);
  html.push(`<p>Resultat: <strong>${escapeHtml(regulation)}</strong></p>`);

  if (match.homeExtraTime !== null || match.awayExtraTime !== null) {
    const homeExtra = match.homeExtraTime ?? 0;
    const awayExtra = match.awayExtraTime ?? 0;
    const extraLabel = `${homeExtra}–${awayExtra}`;
    lines.push(`Ekstraomganger: ${extraLabel}`);
    html.push(
      `<p>Ekstraomganger: <strong>${escapeHtml(extraLabel)}</strong></p>`,
    );
  }

  if (match.homePenalties !== null || match.awayPenalties !== null) {
    const homePens = match.homePenalties ?? 0;
    const awayPens = match.awayPenalties ?? 0;
    const penaltiesLabel = `${homePens}–${awayPens}`;
    lines.push(`Straffer: ${penaltiesLabel}`);
    html.push(
      `<p>Straffer: <strong>${escapeHtml(penaltiesLabel)}</strong></p>`,
    );
  }

  return { text: lines, html };
}

async function resolveScopeLabel(
  scopeType: RoleScope,
  scopeId: string | null,
): Promise<string | null> {
  if (!scopeId) {
    return scopeType === "global" ? "global" : null;
  }

  if (scopeType === "competition") {
    const competition = await db.query.competitions.findFirst({
      columns: { name: true, slug: true },
      where: eq(competitions.id, scopeId),
    });

    return competition ? `${competition.name} (${competition.slug})` : scopeId;
  }

  if (scopeType === "team") {
    const team = await db.query.teams.findFirst({
      columns: { name: true, slug: true },
      where: eq(teams.id, scopeId),
    });

    return team ? `${team.name} (${team.slug})` : scopeId;
  }

  if (scopeType === "edition") {
    const edition = await db.query.editions.findFirst({
      columns: { label: true, slug: true },
      where: eq(editions.id, scopeId),
    });

    return edition ? `${edition.label} (${edition.slug})` : scopeId;
  }

  return scopeId;
}
