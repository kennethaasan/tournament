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
import { entries, groups, matches, teams, venues } from "@/server/db/schema";

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
  const homeEntryName = row.homeEntryId
    ? (entryNameMap.get(row.homeEntryId) ?? null)
    : derivePlaceholderName(metadata.homeSource, bracketRounds);
  const awayEntryName = row.awayEntryId
    ? (entryNameMap.get(row.awayEntryId) ?? null)
    : derivePlaceholderName(metadata.awaySource, bracketRounds);

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
      extra_time: row.homeExtraTime ?? 0,
      penalties: row.homePenalties ?? 0,
    },
    away_score: {
      regulation: row.awayScore ?? 0,
      extra_time: row.awayExtraTime ?? 0,
      penalties: row.awayPenalties ?? 0,
    },
    outcome: row.outcome ?? null,
  };
}
