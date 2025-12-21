import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { createProblem } from "@/lib/errors/problem";
import {
  buildKnockoutBracket,
  type KnockoutParticipant,
} from "@/modules/scheduling/bracket-service";
import { generateRoundRobinSchedule } from "@/modules/scheduling/round-robin-service";
import { createApiHandler } from "@/server/api/handler";
import { userHasRole } from "@/server/auth";
import { db, withTransaction } from "@/server/db/client";
import {
  brackets,
  editions,
  groups,
  matches,
  stages,
} from "@/server/db/schema";
import { sendScheduleGeneratedEmails } from "@/server/email/action-emails";

type RouteParams = {
  editionId: string;
};

type GenerateMatchesBody = {
  stage_id: string;
  algorithm: "round_robin_circle" | "knockout_seeded";
  options: unknown;
};

type RoundRobinGenerationOptions = {
  start_at: Date;
  match_duration_minutes: number;
  break_minutes: number;
  venues: Array<{ venue_id: string }>;
  groups: Array<{ group_id: string; entry_ids: string[] }>;
};

type KnockoutGenerationOptions = {
  seeds: Array<{ seed: number; entry_id: string | null }>;
  third_place_match?: boolean;
};

export const POST = createApiHandler<RouteParams>(
  async ({ request, params, auth }) => {
    if (!auth) {
      throw createProblem({
        type: "https://httpstatuses.com/401",
        title: "Autentisering kreves",
        status: 401,
        detail: "Du må være innlogget for å generere kamper.",
      });
    }

    const editionId = Array.isArray(params.editionId)
      ? params.editionId[0]
      : params.editionId;

    if (!editionId) {
      throw createProblem({
        type: "https://httpstatuses.com/400",
        title: "Ugyldig forespørsel",
        status: 400,
        detail: "EditionId mangler i URLen.",
      });
    }

    const edition = await db.query.editions.findFirst({
      columns: {
        id: true,
        competitionId: true,
      },
      where: eq(editions.id, editionId),
    });

    if (!edition) {
      throw createProblem({
        type: "https://httpstatuses.com/404",
        title: "Utgaven finnes ikke",
        status: 404,
        detail: "Vi fant ikke utgaven du prøver å oppdatere.",
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
          "Du må være global administrator eller konkurranseadministrator for å generere kamper.",
      });
    }

    const payload = (await request.json()) as GenerateMatchesBody;

    if (!payload.stage_id) {
      throw createProblem({
        type: "https://httpstatuses.com/400",
        title: "Stadie mangler",
        status: 400,
        detail: "Oppgi hvilket stadie som skal generere kamper.",
      });
    }

    const stage = await db.query.stages.findFirst({
      where: eq(stages.id, payload.stage_id),
    });

    if (!stage || stage.editionId !== edition.id) {
      throw createProblem({
        type: "https://httpstatuses.com/404",
        title: "Stadie ikke funnet",
        status: 404,
        detail: "Stadiet finnes ikke eller tilhører en annen utgave.",
      });
    }

    const jobId = randomUUID();

    switch (payload.algorithm) {
      case "round_robin_circle": {
        if (stage.stageType !== "group") {
          throw createProblem({
            type: "https://httpstatuses.com/400",
            title: "Ugyldig algoritme",
            status: 400,
            detail: "Round-robin-generatoren kan kun brukes på gruppestadier.",
          });
        }

        await handleRoundRobinGeneration(stage.id, edition.id, payload.options);
        break;
      }
      case "knockout_seeded": {
        if (stage.stageType !== "knockout") {
          throw createProblem({
            type: "https://httpstatuses.com/400",
            title: "Ugyldig algoritme",
            status: 400,
            detail: "Knockout-generatoren kan kun brukes på cupstadier.",
          });
        }

        await handleKnockoutGeneration(stage.id, edition.id, payload.options);
        break;
      }
      default: {
        throw createProblem({
          type: "https://httpstatuses.com/400",
          title: "Ukjent algoritme",
          status: 400,
          detail: `Algoritmen "${payload.algorithm}" støttes ikke.`,
        });
      }
    }

    await sendScheduleGeneratedEmails({
      editionId: edition.id,
      stageId: stage.id,
      algorithm: payload.algorithm,
    });

    return NextResponse.json(
      {
        job_id: jobId,
        status: "completed",
      },
      { status: 202 },
    );
  },
  {
    requireAuth: true,
    roles: ["global_admin", "competition_admin"],
  },
);

async function handleRoundRobinGeneration(
  stageId: string,
  editionId: string,
  optionsInput: unknown,
): Promise<void> {
  const options = parseRoundRobinOptions(optionsInput);

  const groupRecords = await db
    .select({
      id: groups.id,
      code: groups.code,
      roundRobinMode: groups.roundRobinMode,
    })
    .from(groups)
    .where(eq(groups.stageId, stageId));

  if (!groupRecords.length) {
    throw createProblem({
      type: "https://tournament.app/problems/generation/no-groups",
      title: "Ingen grupper",
      status: 400,
      detail: "Stadiet mangler grupper for å generere kamper.",
    });
  }

  const groupMap = new Map(groupRecords.map((record) => [record.id, record]));

  const schedule = generateRoundRobinSchedule({
    stageId,
    groups: options.groups.map((groupOption) => {
      const record = groupMap.get(groupOption.group_id);
      if (!record) {
        throw createProblem({
          type: "https://tournament.app/problems/generation/unknown-group",
          title: "Ukjent gruppe",
          status: 400,
          detail: `Gruppe ${groupOption.group_id} finnes ikke på stadiet.`,
        });
      }

      return {
        id: record.id,
        roundRobinMode: record.roundRobinMode ?? "single",
        entryIds: groupOption.entry_ids,
      };
    }),
    venues: options.venues.map((venue) => ({ id: venue.venue_id })),
    startAt: options.start_at,
    matchDurationMinutes: options.match_duration_minutes,
    breakMinutes: options.break_minutes,
  });

  const counters = new Map<string, number>();

  await withTransaction(async (tx) => {
    await tx.delete(matches).where(eq(matches.stageId, stageId));

    for (const match of schedule.matches) {
      const group = groupMap.get(match.groupId);
      if (!group) {
        continue;
      }

      const nextIndex = (counters.get(group.id) ?? 0) + 1;
      counters.set(group.id, nextIndex);

      const code = `${group.code}-${String(nextIndex).padStart(2, "0")}`;

      await tx.insert(matches).values({
        editionId,
        stageId,
        groupId: match.groupId,
        homeEntryId: match.homeEntryId,
        awayEntryId: match.awayEntryId,
        kickoffAt: match.kickoffAt,
        venueId: match.venueId ?? null,
        code,
        metadata: {
          roundNumber: match.roundNumber,
          generator: "round_robin_circle",
        },
      });
    }
  });
}

async function handleKnockoutGeneration(
  stageId: string,
  editionId: string,
  optionsInput: unknown,
): Promise<void> {
  const options = parseKnockoutOptions(optionsInput);

  const bracket = await db.query.brackets.findFirst({
    where: eq(brackets.stageId, stageId),
  });

  if (!bracket) {
    throw createProblem({
      type: "https://tournament.app/problems/generation/no-bracket",
      title: "Mangler bracket",
      status: 400,
      detail: "Stadiet mangler en aktiv bracket-konfigurasjon.",
    });
  }

  const bracketPlan = buildKnockoutBracket({
    stageId,
    bracketId: bracket.id,
    seeds: options.seeds.map((seed) => ({
      seed: seed.seed,
      entryId: seed.entry_id,
    })),
    thirdPlaceMatch: options.third_place_match ?? false,
  });

  const totalRounds = Math.max(
    0,
    ...bracketPlan.matches.map((match) => match.roundNumber),
  );

  await withTransaction(async (tx) => {
    await tx.delete(matches).where(eq(matches.stageId, stageId));

    for (const match of bracketPlan.matches) {
      await tx.insert(matches).values({
        editionId,
        stageId,
        bracketId: bracket.id,
        code: createKnockoutCode(match.roundNumber, totalRounds, match.type),
        homeEntryId: participantEntryId(match.home),
        awayEntryId: participantEntryId(match.away),
        metadata: {
          generator: "knockout_seeded",
          type: match.type,
          roundNumber: match.roundNumber,
          homeSource: participantSource(match.home),
          awaySource: participantSource(match.away),
        },
      });
    }
  });
}

function parseRoundRobinOptions(
  optionsInput: unknown,
): RoundRobinGenerationOptions {
  if (!optionsInput || typeof optionsInput !== "object") {
    throw createProblem({
      type: "https://httpstatuses.com/400",
      title: "Ugyldige alternativer",
      status: 400,
      detail: "Alternativene for generatoren er ikke gyldige.",
    });
  }

  const options = optionsInput as Partial<RoundRobinGenerationOptions>;

  if (!options.groups?.length) {
    throw createProblem({
      type: "https://tournament.app/problems/generation/groups-required",
      title: "Grupper mangler",
      status: 400,
      detail: "Du må velge minst én gruppe og tilhørende lag.",
    });
  }

  if (!options.venues?.length) {
    throw createProblem({
      type: "https://tournament.app/problems/generation/venues-required",
      title: "Baner mangler",
      status: 400,
      detail: "Du må velge minst én bane for å planlegge kampene.",
    });
  }

  if (!options.start_at) {
    throw createProblem({
      type: "https://tournament.app/problems/generation/start-time-required",
      title: "Starttid mangler",
      status: 400,
      detail: "Oppgi en starttid for første kamp.",
    });
  }

  const startAt = new Date(options.start_at);

  if (Number.isNaN(startAt.getTime())) {
    throw createProblem({
      type: "https://tournament.app/problems/generation/invalid-start-time",
      title: "Ugyldig starttid",
      status: 400,
      detail: "Starttiden må være en gyldig dato.",
    });
  }

  const matchDuration = Number(options.match_duration_minutes ?? 60);
  const breakMinutes = Number(options.break_minutes ?? 15);

  if (!Number.isFinite(matchDuration) || matchDuration <= 0) {
    throw createProblem({
      type: "https://tournament.app/problems/generation/invalid-duration",
      title: "Ugyldig kamptid",
      status: 400,
      detail: "Kamptiden må være et positivt antall minutter.",
    });
  }

  if (!Number.isFinite(breakMinutes) || breakMinutes < 0) {
    throw createProblem({
      type: "https://tournament.app/problems/generation/invalid-break",
      title: "Ugyldig pause",
      status: 400,
      detail: "Pausen må være et ikke-negativt antall minutter.",
    });
  }

  return {
    start_at: startAt,
    match_duration_minutes: matchDuration,
    break_minutes: breakMinutes,
    venues: options.venues,
    groups: options.groups,
  };
}

function parseKnockoutOptions(
  optionsInput: unknown,
): KnockoutGenerationOptions {
  if (!optionsInput || typeof optionsInput !== "object") {
    throw createProblem({
      type: "https://httpstatuses.com/400",
      title: "Ugyldige alternativer",
      status: 400,
      detail: "Alternativene for generatoren er ikke gyldige.",
    });
  }

  const options = optionsInput as Partial<KnockoutGenerationOptions>;

  if (!options.seeds?.length) {
    throw createProblem({
      type: "https://tournament.app/problems/generation/seeds-required",
      title: "Seeding mangler",
      status: 400,
      detail: "Oppgi minst to seedede lag for å generere bracketen.",
    });
  }

  return {
    seeds: options.seeds,
    third_place_match: options.third_place_match ?? false,
  };
}

function participantEntryId(participant: KnockoutParticipant): string | null {
  if (participant.type === "seed") {
    return participant.entryId ?? null;
  }

  return null;
}

function participantSource(participant: KnockoutParticipant) {
  switch (participant.type) {
    case "seed":
      return {
        type: "seed" as const,
        seed: participant.seed,
        entryId: participant.entryId,
      };
    case "winner":
      return {
        type: "winner" as const,
        matchId: participant.matchId,
      };
    case "loser":
      return {
        type: "loser" as const,
        matchId: participant.matchId,
      };
    default:
      return null;
  }
}

function createKnockoutCode(
  roundNumber: number,
  totalRounds: number,
  type: string,
): string {
  if (type === "third_place") {
    return "3P";
  }

  if (roundNumber === totalRounds) {
    return "F";
  }

  if (roundNumber === totalRounds - 1) {
    return `SF${roundNumber}`;
  }

  return `R${roundNumber}`;
}
