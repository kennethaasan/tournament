import type { components } from "@/lib/api/generated/openapi";

export type MatchStatus = components["schemas"]["MatchStatus"];
export type Match = components["schemas"]["Match"];
export type MatchEventInput = components["schemas"]["MatchEventInput"];
export type MatchEventSide = MatchEventInput["team_side"];
export type MatchEventType = MatchEventInput["event_type"];

export type ResultsView = "compact" | "comfortable";

export type ResultsFilters = {
  query: string;
  status: MatchStatus | "all";
  roundLabel: string | "all";
  groupCode: string | "all";
  venueId: string | "all";
  teamId: string | "all";
  view: ResultsView;
};

export type MatchIndex = {
  id: string;
  status: MatchStatus;
  kickoffAt: string | null;
  roundLabel: string | null;
  groupCode: string | null;
  venueId: string | null;
  venueName: string | null;
  homeEntryId: string | null;
  awayEntryId: string | null;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeLabel: string;
  awayLabel: string;
  matchLabel: string;
  searchable: string;
};

export type MatchEventDraft = {
  id: string;
  teamSide: MatchEventSide;
  eventType: MatchEventType;
  minute: string;
  stoppageTime: string;
  membershipId: string;
  squadMemberId: string | null;
};

export type OptionalScoreInputs = {
  homeExtraTime: string;
  awayExtraTime: string;
  homePenalties: string;
  awayPenalties: string;
};

export type OptionalScores = {
  homeExtraTime: number | null;
  awayExtraTime: number | null;
  homePenalties: number | null;
  awayPenalties: number | null;
};
