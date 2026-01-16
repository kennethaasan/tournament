import { and, asc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import {
  buildBracketRoundMap,
  derivePlaceholderName,
  parseMatchMetadata,
} from "@/modules/matches/placeholder";
import { assertEditionAdminAccess } from "@/server/api/edition-access";
import { createApiHandler } from "@/server/api/handler";
import { db } from "@/server/db/client";
import {
  entries,
  groups,
  matches,
  stages,
  teams,
  venues,
} from "@/server/db/schema";

type RouteParams = {
  editionId: string;
};

const MATCH_STATUSES = [
  "scheduled",
  "in_progress",
  "finalized",
  "disputed",
] as const;

type MatchStatus = (typeof MATCH_STATUSES)[number];

function isMatchStatus(value: string | null): value is MatchStatus {
  return value ? MATCH_STATUSES.includes(value as MatchStatus) : false;
}

type CreateMatchRequest = {
  stage_id: string;
  kickoff_at: string;
  home_entry_id?: string | null;
  away_entry_id?: string | null;
  venue_id?: string | null;
  group_id?: string | null;
  code?: string | null;
};

export const POST = createApiHandler<RouteParams>(
  async ({ params, request, auth }) => {
    const editionId = Array.isArray(params.editionId)
      ? params.editionId[0]
      : params.editionId;

    const edition = await assertEditionAdminAccess(editionId, auth);
    const payload = (await request.json()) as CreateMatchRequest;

    if (!payload.stage_id) {
      return NextResponse.json(
        {
          type: "https://tournament.app/problems/validation-error",
          title: "Stage is required",
          status: 400,
          detail: "You must select a stage for the match.",
        },
        { status: 400 },
      );
    }

    if (!payload.kickoff_at) {
      return NextResponse.json(
        {
          type: "https://tournament.app/problems/validation-error",
          title: "Kickoff time is required",
          status: 400,
          detail: "You must set a kickoff time for the match.",
        },
        { status: 400 },
      );
    }

    const kickoffAt = new Date(payload.kickoff_at);
    if (Number.isNaN(kickoffAt.getTime())) {
      return NextResponse.json(
        {
          type: "https://tournament.app/problems/validation-error",
          title: "Invalid kickoff time",
          status: 400,
          detail: "The kickoff time must be a valid date.",
        },
        { status: 400 },
      );
    }

    // Verify stage belongs to this edition
    const stage = await db.query.stages.findFirst({
      where: and(
        eq(stages.id, payload.stage_id),
        eq(stages.editionId, edition.id),
      ),
    });

    if (!stage) {
      return NextResponse.json(
        {
          type: "https://tournament.app/problems/stage-not-found",
          title: "Stage not found",
          status: 404,
          detail:
            "The selected stage does not exist or belongs to another edition.",
        },
        { status: 404 },
      );
    }

    // Verify venue if provided
    if (payload.venue_id) {
      const venue = await db.query.venues.findFirst({
        where: eq(venues.id, payload.venue_id),
      });

      if (!venue) {
        return NextResponse.json(
          {
            type: "https://tournament.app/problems/venue-not-found",
            title: "Venue not found",
            status: 404,
            detail: "The selected venue does not exist.",
          },
          { status: 404 },
        );
      }
    }

    // Verify group if provided
    if (payload.group_id) {
      const group = await db.query.groups.findFirst({
        where: and(
          eq(groups.id, payload.group_id),
          eq(groups.stageId, payload.stage_id),
        ),
      });

      if (!group) {
        return NextResponse.json(
          {
            type: "https://tournament.app/problems/group-not-found",
            title: "Group not found",
            status: 404,
            detail:
              "The selected group does not exist or belongs to another stage.",
          },
          { status: 404 },
        );
      }
    }

    // Verify entries if provided
    const entryIds = [payload.home_entry_id, payload.away_entry_id].filter(
      (id): id is string => Boolean(id),
    );

    if (entryIds.length > 0) {
      const entryRows = await db
        .select({ id: entries.id, editionId: entries.editionId })
        .from(entries)
        .where(inArray(entries.id, entryIds));

      for (const entry of entryRows) {
        if (entry.editionId !== edition.id) {
          return NextResponse.json(
            {
              type: "https://tournament.app/problems/entry-not-in-edition",
              title: "Entry not in this edition",
              status: 400,
              detail: `Entry ${entry.id} belongs to a different edition.`,
            },
            { status: 400 },
          );
        }
      }

      if (entryRows.length !== entryIds.length) {
        return NextResponse.json(
          {
            type: "https://tournament.app/problems/entry-not-found",
            title: "Entry not found",
            status: 404,
            detail: "One or more selected entries do not exist.",
          },
          { status: 404 },
        );
      }
    }

    const [match] = await db
      .insert(matches)
      .values({
        editionId: edition.id,
        stageId: payload.stage_id,
        groupId: payload.group_id ?? null,
        venueId: payload.venue_id ?? null,
        homeEntryId: payload.home_entry_id ?? null,
        awayEntryId: payload.away_entry_id ?? null,
        kickoffAt,
        code: payload.code?.trim() ?? null,
        status: "scheduled",
      })
      .returning();

    if (!match) {
      return NextResponse.json(
        {
          type: "https://tournament.app/problems/match-creation-failed",
          title: "Failed to create match",
          status: 500,
          detail: "The match could not be created. Please try again.",
        },
        { status: 500 },
      );
    }

    // Fetch team names for entries
    const entryNameMap = new Map<string, string>();
    const matchEntryIds = [match.homeEntryId, match.awayEntryId].filter(
      (id): id is string => Boolean(id),
    );

    if (matchEntryIds.length > 0) {
      const entryRows = await db
        .select({
          entryId: entries.id,
          teamName: teams.name,
        })
        .from(entries)
        .innerJoin(teams, eq(teams.id, entries.teamId))
        .where(inArray(entries.id, matchEntryIds));

      for (const entry of entryRows) {
        entryNameMap.set(entry.entryId, entry.teamName);
      }
    }

    // Fetch venue name if present
    let venueName: string | null = null;
    if (match.venueId) {
      const venue = await db.query.venues.findFirst({
        columns: { name: true },
        where: eq(venues.id, match.venueId),
      });
      venueName = venue?.name ?? null;
    }

    // Fetch group code if present
    let groupCode: string | null = null;
    if (match.groupId) {
      const group = await db.query.groups.findFirst({
        columns: { code: true },
        where: eq(groups.id, match.groupId),
      });
      groupCode = group?.code ?? null;
    }

    return NextResponse.json(
      {
        id: match.id,
        edition_id: match.editionId,
        stage_id: match.stageId,
        group_id: match.groupId,
        group_code: groupCode,
        code: match.code ?? null,
        status: match.status,
        kickoff_at:
          match.kickoffAt?.toISOString() ?? match.createdAt.toISOString(),
        venue_id: match.venueId,
        venue_name: venueName,
        home_entry_id: match.homeEntryId,
        home_entry_name: match.homeEntryId
          ? (entryNameMap.get(match.homeEntryId) ?? null)
          : null,
        away_entry_id: match.awayEntryId,
        away_entry_name: match.awayEntryId
          ? (entryNameMap.get(match.awayEntryId) ?? null)
          : null,
        home_score: {
          regulation: match.homeScore ?? 0,
          extra_time: match.homeExtraTime ?? undefined,
          penalties: match.homePenalties ?? undefined,
        },
        away_score: {
          regulation: match.awayScore ?? 0,
          extra_time: match.awayExtraTime ?? undefined,
          penalties: match.awayPenalties ?? undefined,
        },
        outcome: match.outcome ?? null,
      },
      { status: 201 },
    );
  },
  {
    requireAuth: true,
    roles: ["global_admin", "competition_admin"],
  },
);

export const GET = createApiHandler<RouteParams>(
  async ({ params, request, auth }) => {
    const editionId = Array.isArray(params.editionId)
      ? params.editionId[0]
      : params.editionId;

    const edition = await assertEditionAdminAccess(editionId, auth);

    const stageId = request.nextUrl.searchParams.get("stage_id");
    const statusParam = request.nextUrl.searchParams.get("status");
    const status = isMatchStatus(statusParam) ? statusParam : null;

    const filters = [eq(matches.editionId, edition.id)];
    if (stageId) {
      filters.push(eq(matches.stageId, stageId));
    }
    if (status) {
      filters.push(eq(matches.status, status));
    }

    const rows = await db
      .select({
        id: matches.id,
        editionId: matches.editionId,
        stageId: matches.stageId,
        groupId: matches.groupId,
        status: matches.status,
        kickoffAt: matches.kickoffAt,
        createdAt: matches.createdAt,
        venueId: matches.venueId,
        venueName: venues.name,
        homeEntryId: matches.homeEntryId,
        awayEntryId: matches.awayEntryId,
        homeScore: matches.homeScore,
        awayScore: matches.awayScore,
        homeExtraTime: matches.homeExtraTime,
        awayExtraTime: matches.awayExtraTime,
        homePenalties: matches.homePenalties,
        awayPenalties: matches.awayPenalties,
        outcome: matches.outcome,
        code: matches.code,
        groupCode: groups.code,
        bracketId: matches.bracketId,
        metadata: matches.metadata,
      })
      .from(matches)
      .leftJoin(groups, eq(groups.id, matches.groupId))
      .leftJoin(venues, eq(venues.id, matches.venueId))
      .where(and(...filters))
      .orderBy(asc(matches.kickoffAt), asc(matches.createdAt));

    const entryIds = Array.from(
      new Set(
        rows
          .flatMap((row) => [row.homeEntryId, row.awayEntryId])
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const entryNameMap = new Map<string, string>();
    if (entryIds.length > 0) {
      const entryRows = await db
        .select({
          entryId: entries.id,
          teamName: teams.name,
        })
        .from(entries)
        .innerJoin(teams, eq(teams.id, entries.teamId))
        .where(inArray(entries.id, entryIds));

      for (const entry of entryRows) {
        entryNameMap.set(entry.entryId, entry.teamName);
      }
    }

    const bracketRounds = buildBracketRoundMap(
      rows.map((row) => ({ bracketId: row.bracketId, metadata: row.metadata })),
    );

    return NextResponse.json(
      {
        matches: rows.map((row) => ({
          ...mapMatchResponse(row, entryNameMap, bracketRounds),
        })),
      },
      { status: 200 },
    );
  },
  {
    requireAuth: true,
    roles: ["global_admin", "competition_admin"],
  },
);

function mapMatchResponse(
  row: {
    id: string;
    editionId: string;
    stageId: string;
    groupId: string | null;
    groupCode: string | null;
    code: string | null;
    status: string;
    kickoffAt: Date | null;
    createdAt: Date;
    venueId: string | null;
    venueName: string | null;
    homeEntryId: string | null;
    awayEntryId: string | null;
    homeScore: number;
    awayScore: number;
    homeExtraTime: number | null;
    awayExtraTime: number | null;
    homePenalties: number | null;
    awayPenalties: number | null;
    outcome: string | null;
    metadata: unknown;
  },
  entryNameMap: Map<string, string>,
  bracketRounds: Map<string, number>,
) {
  const metadata = parseMatchMetadata(row.metadata);
  const homeLabel = metadata.homeLabel;
  const awayLabel = metadata.awayLabel;
  const homeEntryName = row.homeEntryId
    ? (entryNameMap.get(row.homeEntryId) ?? null)
    : (homeLabel ?? derivePlaceholderName(metadata.homeSource, bracketRounds));
  const awayEntryName = row.awayEntryId
    ? (entryNameMap.get(row.awayEntryId) ?? null)
    : (awayLabel ?? derivePlaceholderName(metadata.awaySource, bracketRounds));

  return {
    id: row.id,
    edition_id: row.editionId,
    stage_id: row.stageId,
    group_id: row.groupId,
    group_code: row.groupCode ?? null,
    code: row.code ?? null,
    status: row.status,
    kickoff_at: (row.kickoffAt ?? row.createdAt).toISOString(),
    venue_id: row.venueId,
    venue_name: row.venueName ?? null,
    home_entry_id: row.homeEntryId,
    home_entry_name: homeEntryName ?? null,
    away_entry_id: row.awayEntryId,
    away_entry_name: awayEntryName ?? null,
    home_score: {
      regulation: row.homeScore ?? 0,
      extra_time: row.homeExtraTime ?? undefined,
      penalties: row.homePenalties ?? undefined,
    },
    away_score: {
      regulation: row.awayScore ?? 0,
      extra_time: row.awayExtraTime ?? undefined,
      penalties: row.awayPenalties ?? undefined,
    },
    outcome: row.outcome ?? null,
  };
}
