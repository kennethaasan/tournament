import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createProblem } from "@/lib/errors/problem";
import {
  BusinessMetric,
  logger,
  recordBusinessMetric,
} from "@/lib/logger/powertools";
import { createApiHandler } from "@/server/api/handler";
import { userHasRole } from "@/server/auth";
import { db, withTransaction } from "@/server/db/client";
import { editions, entries, matchEvents, matches } from "@/server/db/schema";
import {
  sendMatchDisputedEmails,
  sendMatchFinalizedEmails,
  sendMatchScheduleChangedEmails,
} from "@/server/email/action-emails";

type RouteParams = {
  matchId: string;
};

type ScoreBreakdownInput = {
  regulation?: number;
  extra_time?: number;
  penalties?: number;
};

type MatchEventInput = {
  team_side: "home" | "away";
  event_type:
    | "goal"
    | "own_goal"
    | "penalty_goal"
    | "assist"
    | "yellow_card"
    | "red_card";
  minute: number;
  stoppage_time?: number | null;
  squad_member_id?: string | null;
};

type UpdateMatchBody = {
  code?: string | null;
  home_entry_id?: string | null;
  away_entry_id?: string | null;
  kickoff_at?: string | null;
  venue_id?: string | null;
  status?: "scheduled" | "in_progress" | "finalized" | "disputed";
  score?: {
    home?: ScoreBreakdownInput;
    away?: ScoreBreakdownInput;
  };
  events?: MatchEventInput[];
  admin_notes?: string | null;
};

export const GET = createApiHandler<RouteParams>(
  async ({ params, auth }) => {
    if (!auth) {
      throw createProblem({
        type: "https://httpstatuses.com/401",
        title: "Autentisering kreves",
        status: 401,
        detail: "Du må være innlogget for å hente kampen.",
      });
    }

    const matchId = Array.isArray(params.matchId)
      ? params.matchId[0]
      : params.matchId;

    if (!matchId) {
      throw createProblem({
        type: "https://httpstatuses.com/400",
        title: "Ugyldig forespørsel",
        status: 400,
        detail: "MatchId mangler i URLen.",
      });
    }

    const match = await db.query.matches.findFirst({
      where: eq(matches.id, matchId),
    });

    if (!match) {
      throw createProblem({
        type: "https://httpstatuses.com/404",
        title: "Kamp ikke funnet",
        status: 404,
        detail: "Kampen finnes ikke.",
      });
    }

    const edition = await db.query.editions.findFirst({
      columns: {
        id: true,
        competitionId: true,
      },
      where: eq(editions.id, match.editionId),
    });

    if (!edition) {
      throw createProblem({
        type: "https://httpstatuses.com/404",
        title: "Utgave ikke funnet",
        status: 404,
        detail: "Utgaven til kampen finnes ikke lenger.",
      });
    }

    const isGlobalAdmin = userHasRole(auth, "global_admin");
    const hasScopedAdmin = auth.user.roles.some(
      (assignment) =>
        assignment.role === "competition_admin" &&
        assignment.scopeType === "competition" &&
        assignment.scopeId === edition.competitionId,
    );

    if (!isGlobalAdmin && !hasScopedAdmin) {
      throw createProblem({
        type: "https://httpstatuses.com/403",
        title: "Ingen tilgang",
        status: 403,
        detail:
          "Du må være global administrator eller konkurranseadministrator for å hente kamper.",
      });
    }

    const events = await db.query.matchEvents.findMany({
      where: eq(matchEvents.matchId, matchId),
    });

    return NextResponse.json(mapMatchToResponse(match, events), {
      status: 200,
    });
  },
  {
    requireAuth: true,
    roles: ["global_admin", "competition_admin"],
  },
);

export const PATCH = createApiHandler<RouteParams>(
  async ({ request, params, auth }) => {
    if (!auth) {
      throw createProblem({
        type: "https://httpstatuses.com/401",
        title: "Autentisering kreves",
        status: 401,
        detail: "Du må være innlogget for å oppdatere kamper.",
      });
    }

    const matchId = Array.isArray(params.matchId)
      ? params.matchId[0]
      : params.matchId;

    if (!matchId) {
      throw createProblem({
        type: "https://httpstatuses.com/400",
        title: "Ugyldig forespørsel",
        status: 400,
        detail: "MatchId mangler i URLen.",
      });
    }

    const match = await db.query.matches.findFirst({
      where: eq(matches.id, matchId),
    });

    if (!match) {
      throw createProblem({
        type: "https://httpstatuses.com/404",
        title: "Kamp ikke funnet",
        status: 404,
        detail: "Kampen finnes ikke.",
      });
    }

    const edition = await db.query.editions.findFirst({
      columns: {
        id: true,
        competitionId: true,
      },
      where: eq(editions.id, match.editionId),
    });

    if (!edition) {
      throw createProblem({
        type: "https://httpstatuses.com/404",
        title: "Utgave ikke funnet",
        status: 404,
        detail: "Utgaven til kampen finnes ikke lenger.",
      });
    }

    const isGlobalAdmin = userHasRole(auth, "global_admin");
    const hasScopedAdmin = auth.user.roles.some(
      (assignment) =>
        assignment.role === "competition_admin" &&
        assignment.scopeType === "competition" &&
        assignment.scopeId === edition.competitionId,
    );

    if (!isGlobalAdmin && !hasScopedAdmin) {
      throw createProblem({
        type: "https://httpstatuses.com/403",
        title: "Ingen tilgang",
        status: 403,
        detail:
          "Du må være global administrator eller konkurranseadministrator for å oppdatere kamper.",
      });
    }

    const payload = (await request.json()) as UpdateMatchBody;

    const update = await buildMatchUpdate(match, payload);

    await withTransaction(async (tx) => {
      if (Object.keys(update).length > 0) {
        await tx.update(matches).set(update).where(eq(matches.id, matchId));
      }

      if (payload.events) {
        await tx.delete(matchEvents).where(eq(matchEvents.matchId, matchId));

        if (payload.events.length > 0) {
          await tx.insert(matchEvents).values(
            payload.events.map((event) => ({
              matchId,
              teamSide: event.team_side,
              eventType: event.event_type,
              minute: event.minute,
              stoppageTime: event.stoppage_time ?? null,
              relatedMemberId: event.squad_member_id ?? null,
              metadata: {},
            })),
          );
        }
      }
    });

    const updatedMatch = await db.query.matches.findFirst({
      where: eq(matches.id, matchId),
    });

    if (!updatedMatch) {
      throw createProblem({
        type: "https://httpstatuses.com/500",
        title: "Ukjent feil",
        status: 500,
        detail: "Kampen ble oppdatert, men kunne ikke hentes etterpå.",
      });
    }

    await sendMatchScheduleChangedEmails({
      previousMatch: match,
      updatedMatch,
    });

    if (match.status !== updatedMatch.status) {
      if (updatedMatch.status === "finalized") {
        await sendMatchFinalizedEmails({ updatedMatch });
        recordBusinessMetric(BusinessMetric.MATCH_FINALIZED);
        logger.info("match_finalized", {
          matchId: updatedMatch.id,
          editionId: updatedMatch.editionId,
        });
      }

      if (updatedMatch.status === "disputed") {
        await sendMatchDisputedEmails({ updatedMatch });
      }
    }

    const updatedEvents = await db.query.matchEvents.findMany({
      where: eq(matchEvents.matchId, matchId),
    });

    return NextResponse.json(mapMatchToResponse(updatedMatch, updatedEvents), {
      status: 200,
    });
  },
  {
    requireAuth: true,
    roles: ["global_admin", "competition_admin"],
  },
);

async function buildMatchUpdate(
  match: typeof matches.$inferSelect,
  payload: UpdateMatchBody,
): Promise<Partial<typeof matches.$inferInsert>> {
  const update: Partial<typeof matches.$inferInsert> = {};

  if (payload.code !== undefined) {
    const trimmed = payload.code?.trim() ?? "";
    update.code = trimmed.length > 0 ? trimmed : null;
  }

  const nextHomeEntryId =
    payload.home_entry_id !== undefined
      ? payload.home_entry_id
      : match.homeEntryId;
  const nextAwayEntryId =
    payload.away_entry_id !== undefined
      ? payload.away_entry_id
      : match.awayEntryId;

  if (
    payload.home_entry_id !== undefined ||
    payload.away_entry_id !== undefined
  ) {
    if (!nextHomeEntryId || !nextAwayEntryId) {
      throw createProblem({
        type: "https://tournament.app/problems/matches/invalid-entry",
        title: "Ugyldig lag",
        status: 400,
        detail: "Begge lag må være satt på kampen.",
      });
    }

    if (nextHomeEntryId === nextAwayEntryId) {
      throw createProblem({
        type: "https://tournament.app/problems/matches/duplicate-entry",
        title: "Ugyldig lagvalg",
        status: 400,
        detail: "Hjemme- og bortelag kan ikke være det samme.",
      });
    }

    await assertEntryBelongsToEdition(nextHomeEntryId, match.editionId);
    await assertEntryBelongsToEdition(nextAwayEntryId, match.editionId);

    update.homeEntryId = nextHomeEntryId;
    update.awayEntryId = nextAwayEntryId;
  }

  if (payload.kickoff_at !== undefined) {
    if (payload.kickoff_at === null) {
      update.kickoffAt = null;
    } else {
      const kickoffAt = new Date(payload.kickoff_at);
      if (Number.isNaN(kickoffAt.getTime())) {
        throw createProblem({
          type: "https://tournament.app/problems/matches/invalid-kickoff",
          title: "Ugyldig tidspunkt",
          status: 400,
          detail: "Kickoff må være en gyldig dato.",
        });
      }
      update.kickoffAt = kickoffAt;
    }
  }

  if (payload.venue_id !== undefined) {
    update.venueId = payload.venue_id ?? null;
  }

  if (payload.status) {
    update.status = payload.status;
  }

  if (payload.admin_notes !== undefined) {
    update.notes = payload.admin_notes ?? null;
  }

  if (payload.score) {
    const home = normalizeScoreBreakdown(
      match.homeScore ?? 0,
      match.homeExtraTime ?? 0,
      match.homePenalties ?? 0,
      payload.score.home,
    );

    const away = normalizeScoreBreakdown(
      match.awayScore ?? 0,
      match.awayExtraTime ?? 0,
      match.awayPenalties ?? 0,
      payload.score.away,
    );

    update.homeScore = home.regulation;
    update.homeExtraTime = home.extraTime;
    update.homePenalties = home.penalties;

    update.awayScore = away.regulation;
    update.awayExtraTime = away.extraTime;
    update.awayPenalties = away.penalties;

    const nextStatus = payload.status ?? match.status;
    if (nextStatus === "finalized" || nextStatus === "disputed") {
      update.outcome = computeOutcome(home, away);
    } else if (payload.status) {
      update.outcome = null;
    }
  }

  return update;
}

function normalizeScoreBreakdown(
  currentRegulation: number,
  currentExtra: number,
  currentPenalties: number,
  input?: ScoreBreakdownInput,
) {
  const regulation = sanitizeScore(input?.regulation, currentRegulation);
  const extraTime = sanitizeScore(input?.extra_time, currentExtra);
  const penalties = sanitizeScore(input?.penalties, currentPenalties);

  return { regulation, extraTime, penalties };
}

function sanitizeScore(incoming: number | undefined, fallback: number): number {
  if (incoming === undefined || incoming === null) {
    return fallback;
  }

  if (!Number.isFinite(incoming) || incoming < 0) {
    throw createProblem({
      type: "https://tournament.app/problems/matches/invalid-score",
      title: "Ugyldig poengsum",
      status: 400,
      detail: "Målsummer må være ikke-negative tall.",
    });
  }

  return Math.trunc(incoming);
}

function computeOutcome(
  home: { regulation: number; extraTime: number; penalties: number },
  away: { regulation: number; extraTime: number; penalties: number },
): (typeof matches.$inferInsert)["outcome"] {
  const homeTotal = home.regulation + home.extraTime;
  const awayTotal = away.regulation + away.extraTime;

  if (home.penalties > 0 || away.penalties > 0) {
    if (home.penalties > away.penalties) {
      return "home_win";
    }
    if (away.penalties > home.penalties) {
      return "away_win";
    }
  }

  if (homeTotal > awayTotal) {
    return "home_win";
  }

  if (awayTotal > homeTotal) {
    return "away_win";
  }

  return "draw";
}

function mapMatchToResponse(
  match: typeof matches.$inferSelect,
  events: (typeof matchEvents.$inferSelect)[],
) {
  return {
    id: match.id,
    edition_id: match.editionId,
    stage_id: match.stageId,
    group_id: match.groupId,
    code: match.code ?? null,
    round_label: null,
    status: match.status,
    kickoff_at: (match.kickoffAt ?? match.createdAt).toISOString(),
    venue_id: match.venueId,
    home_entry_id: match.homeEntryId,
    away_entry_id: match.awayEntryId,
    home_score: {
      regulation: match.homeScore ?? 0,
      extra_time: match.homeExtraTime ?? 0,
      penalties: match.homePenalties ?? 0,
    },
    away_score: {
      regulation: match.awayScore ?? 0,
      extra_time: match.awayExtraTime ?? 0,
      penalties: match.awayPenalties ?? 0,
    },
    outcome: match.outcome ?? null,
    events: events.map((event) => ({
      id: event.id,
      match_id: event.matchId,
      team_side: event.teamSide,
      event_type: event.eventType,
      minute: event.minute ?? 0,
      stoppage_time: event.stoppageTime ?? null,
      squad_member_id: event.relatedMemberId ?? null,
    })),
  };
}

async function assertEntryBelongsToEdition(entryId: string, editionId: string) {
  const entry = await db.query.entries.findFirst({
    columns: { id: true, editionId: true },
    where: eq(entries.id, entryId),
  });

  if (!entry || entry.editionId !== editionId) {
    throw createProblem({
      type: "https://tournament.app/problems/matches/entry-mismatch",
      title: "Ugyldig lag",
      status: 400,
      detail: "Laget tilhører ikke denne utgaven.",
    });
  }
}
