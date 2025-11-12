import { auditLogs, eventFeed, notifications } from "./audit";
import { accounts, sessions, users, verifications } from "./auth";
import {
  competitions,
  editionSettings,
  editions,
  venues,
} from "./competitions";
import { entries, squadMembers, squads } from "./entries";
import { roleInvitations, userRoles } from "./identity";
import { matchDisputes, matchEvents, matches } from "./matches";
import { scoreboardHighlights } from "./scoreboard";
import { brackets, groups, rounds, stages } from "./stages";
import { persons, teamMemberships, teams } from "./teams";

export * from "./audit";
export * from "./auth";
export * from "./competitions";
export * from "./entries";
export * from "./identity";
export * from "./matches";
export * from "./scoreboard";
export * from "./shared";
export * from "./stages";
export * from "./teams";

interface SchemaTables extends Record<string, unknown> {
  users: typeof users;
  sessions: typeof sessions;
  accounts: typeof accounts;
  verifications: typeof verifications;
  competitions: typeof competitions;
  editions: typeof editions;
  editionSettings: typeof editionSettings;
  venues: typeof venues;
  stages: typeof stages;
  groups: typeof groups;
  brackets: typeof brackets;
  rounds: typeof rounds;
  matches: typeof matches;
  matchEvents: typeof matchEvents;
  matchDisputes: typeof matchDisputes;
  teams: typeof teams;
  persons: typeof persons;
  teamMemberships: typeof teamMemberships;
  entries: typeof entries;
  squads: typeof squads;
  squadMembers: typeof squadMembers;
  scoreboardHighlights: typeof scoreboardHighlights;
  roleInvitations: typeof roleInvitations;
  userRoles: typeof userRoles;
  notifications: typeof notifications;
  auditLogs: typeof auditLogs;
  eventFeed: typeof eventFeed;
}

export const schema: SchemaTables = {
  users,
  sessions,
  accounts,
  verifications,
  competitions,
  editions,
  editionSettings,
  venues,
  stages,
  groups,
  brackets,
  rounds,
  matches,
  matchEvents,
  matchDisputes,
  teams,
  persons,
  teamMemberships,
  entries,
  squads,
  squadMembers,
  scoreboardHighlights,
  roleInvitations,
  userRoles,
  notifications,
  auditLogs,
  eventFeed,
};

export type DatabaseSchema = typeof schema;
