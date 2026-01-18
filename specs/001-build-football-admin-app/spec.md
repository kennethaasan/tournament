# Feature Specification: Modern Football Tournament Administration App

**Feature Branch**: `001-build-football-admin-app`  
**Created**: 2025-11-05  
**Last Updated**: 2025-12-20  
**Status**: Draft – 0 open clarifications

**Input (original brief)**: “Build a new football tournament administration application based on the legacy Laravel app in `/laravel`, using the existing Next.js starter as the foundation.”  
**Additional Direction**:
- Reference implementation patterns from https://github.com/kennethaasan/mattis.
- Retain functional parity with the Laravel app (tournaments, teams, players, matches, goals, leaderboard, scoreboard view).
- Deliver a modern UI (React + Tailwind CSS + Shadcn), authentication/authorization with better-auth, UUID v7 identifiers, and Norwegian Bokmål UI text (English code/logs).  
- Add new capabilities: multi-format tournaments, self-service team onboarding, improved scheduling, configurable big-screen display, and real-time updates via polling.

---

## Clarifications

### Session 2025-11-05
- Q: Do competitions/editions require integration with payment providers to reconcile the “paid” flag, or is manual tracking sufficient? → A: Remove the paid flag from phase one and revisit in a later release.
- Q: Are referee assignments in scope for phase one, or should the data model reserve space for future expansion? → A: Exclude referee data entirely in phase one; future releases can introduce it.
- Q: What is the expected ceiling for concurrent editions to ensure sizing of polling and caching layers? → A: 2 concurrent editions.
- Q: Should the platform support automated email/SMS delivery for notifications beyond basic email (e.g., SMS for urgent schedule changes)? → A: Stick to in-app + email notifications; defer SMS entirely.
- Q: What uptime target should the platform meet in phase one? → A: 99.0% monthly uptime (≤7h18m downtime).

### Session 2025-11-06
- Q: Should the scoreboard polling endpoint require authentication or keys for read access? → A: Keep it public and unauthenticated because it only exposes public scoreboard data and simplifies venue display setup.

---

## Domain Vocabulary

- **Competition**: The recurring umbrella brand/series (e.g., “UEFA Champions League”) that holds persistent metadata and aggregates historical editions.
- **Edition**: A single occurrence of a competition (e.g., 2025 season, spring weekend cup) with its own schedule, registration window, and scoreboard configuration.
- **Stage**: A major block inside an edition (e.g., Group Stage, Knockouts) that can contain round-robin groups or bracket play.
- **Group**: A round-robin bucket nested inside a stage.
- **Bracket**: The knockout/elimination structure for a stage.
- **Round**: A progression step within a group or bracket (e.g., Matchday 1, Quarterfinals).
- **Tie**: A two-legged knockout pairing decided on aggregate (deferred for future phases).
- **Match**: An individual game between two teams (ties and two-legged support reserved for later phases).
- **Team**: A reusable club/team entity that can participate in many competitions over time.
- **Person**: A reusable record for players, staff, or officials that can join teams and squads.
- **Entry**: The registration of a team into a specific edition (team ↔ edition).
- **Team Membership**: The baseline relationship between a person and a team, including role and active dates.
- **Squad**: The edition-specific list of eligible players for an entry.
- **Squad Member**: The linkage of a person into a squad, including jersey number for that edition.
- **Lineup**: A match-day selection for a team (deferred for future phases).
- **Lineup Slot**: An individual row in a lineup capturing position/number/starter or bench (deferred for future phases).
- **Appearance**: A player’s participation in a match with minutes and statistics (lineups and lineup slots remain deferred).
- **Venue**: A physical location where matches are scheduled.
- **Official Assignment**: The association between a match and its officiating crew (deferred for future work).

## User Scenarios & Testing _(mandatory)_

### Primary User Stories

1. **Competition Organizer (new or existing user)**: wants to sign up, create a new competition, be automatically assigned as that competition’s admin, and configure baseline settings for its first edition.
2. **Global Admin**: wants to oversee platform health, assist competitions as needed, and manage cross-competition policies that fall outside any single organizer’s scope.
3. **Edition Administrator (`competition_admin`)**: wants to configure an edition’s stages, schedule matches quickly, manage results, and control the public scoreboard.
4. **Team Manager**: wants to maintain a reusable team roster, register that team into editions, manage competition-specific squads, and stay informed about schedules and score updates.
5. **Spectator / Venue Staff**: wants a real-time big-screen experience showing live scores, upcoming matches, and top scorers without needing to log in.

### Acceptance Scenarios

1. **Invite Role Peer**: Given an authenticated user with role `competition_admin` on Competition A, when they invite a colleague by email, then the colleague receives an invitation, accepts it, and is granted the `competition_admin` role scoped to Competition A only.
2. **Self-Service Competition Creation**: Given an authenticated user without any existing scoped roles, when they create a new competition with baseline metadata, then the competition is created, they are automatically granted the `competition_admin` role scoped to that competition, and they gain access to competition settings.
3. **Edition Creation by Competition Admin**: Given a competition admin for Competition A, when they create an edition under it with year/slug, timezone, registration window, and scoreboard theme, then the edition appears in their workspace with default empty stages and the public landing page (scoreboard route) is reachable via its slug.
4. **Round-Robin Wizard**: Given an edition configured for group stage play, when the edition admin selects entries, time slots, and venues, then the wizard generates a full round-robin schedule that can be reviewed, edited, and published in one action.
5. **Knockout Bracket**: Given a hybrid edition with completed group standings, when the admin seeds the top entries into a knockout bracket, then the bracket auto-populates quarterfinals/semifinals/final (supporting byes) and future round placeholders reference winners of prior matches.
6. **Team Entry Flow**: Given a team manager with a platform account, when they register an existing team as an entry for an open edition, then the submission enters “pending” status and the edition admin is notified to approve or reject it.
7. **Squad Management**: Given a team manager, when they assemble an edition squad from their team members and assign jersey numbers, then the UI shows validation errors for duplicate numbers within that squad and saves member details without requiring payment tracking.
8. **Live Scoring**: Given an edition admin viewing a live match, when they record goals and cards with player attribution, then the live score, standings, and top-scorer list update immediately after the next poll cycle.
9. **Result Challenge**: Given a team manager, when a match they participated in is marked final, then they can review the recorded result and optionally file a dispute that the edition admin sees in their review queue without needing to approve the score.
10. **Schedule Change Notification**: Given a match is rescheduled, when the edition admin publishes the new kickoff time, then affected team managers receive an in-app notification (and email if opted-in) within one poll cycle.
11. **Public Scoreboard Configuration**: Given an edition admin editing display settings, when they adjust background and font colors and toggle modules (standings, upcoming matches, top scorers), then the public scoreboard updates within 5 seconds and respects accessibility contrast thresholds.
12. **Big-Screen Mode**: Given venue staff opening the scoreboard on a large display, when they enable auto-rotate between sections, then the screen cycles at the configured interval and highlights live matches distinctly from completed ones.
13. **UUID Compliance**: Given a developer inspects API responses for competitions, editions, entries, matches, teams, players, or users, then all identifiers are UUID v7 strings without sequential integer IDs exposed.

### Edge Cases

- Entry submission after the edition registration window closes → reject with actionable messaging.
- Attempt to invite a user to a role they already possess → return success with idempotent response (no duplicate invitations).
- Match result submitted with a goal for a person not in either squad → block and surface validation errors.
- Adjusting a group’s tie-break rules after matches are complete → re-rank standings immediately using the new order.
- Removing or reassigning an entry after the schedule is published → require admin override and revalidation of affected matches.
- Scoreboard theme configured with insufficient contrast → warn and prevent publication until contrast passes WCAG 2.2 AA.
- Polling endpoint requested with stale cursor → return full payload up to maximum window rather than error.
- Edition admin tries to delete a match that has dependent bracket references → block or require detachment first.

---

## Requirements _(Functional)_

### Authentication & Roles

- **FR-001**: The system MUST support invite-based onboarding with email verification for the roles `global_admin`, `competition_admin`, and `team_manager`, while still allowing self-service competition creation without an invite.
- **FR-002**: Users MUST be able to invite additional users into the same role they hold (scope-aware): global admins invite global admins, competition admins invite peers for competitions they manage, and team managers invite co-managers for their teams.
- **FR-003**: Role-based access control MUST restrict data visibility and actions to the appropriate scope (global for global admins, per-competition for competition admins, per-team for team managers).
- **FR-004**: The platform MUST enforce session management with automatic sign-out on credential revocation and provide device/session listings for administrators.
- **FR-005**: Newly registered users MUST be able to create their first competition and are automatically granted the `competition_admin` role scoped to that competition without needing prior approval.
- **FR-006**: Invitation acceptance links MUST be delivered by email; dashboards should not expose raw acceptance URLs.

### Competition & Edition Setup

- **FR-010**: Competition admins (including newly created organizers and global admins) MUST be able to create, edit, and manage competition-level settings capturing name, slug, description, default timezone, branding, default scoreboard options, and archival status.
- **FR-011**: Competition admins MUST be able to create and manage editions under competitions they administer, capturing edition label (e.g., year), slug, timezone, registration window, contact info, primary venue context, and status (draft, published, archived); global admins MAY manage any edition.
- **FR-012**: Editions MUST support configurable stages (round-robin groups, knockout brackets, or hybrid sequences) with customizable ordering and visibility.
- **FR-013**: Edition admins MUST assign entries to groups or bracket seeds and update assignments until the relevant stage is locked.
- **FR-014**: A scheduling wizard MUST generate round-robin fixtures based on selected entries, groups, venues, start times, and interval lengths, allowing manual adjustments before publish.
- **FR-015**: The system MUST provide a knockout bracket builder that supports configurable bracket sizes, byes, third-place matches, and automatic progression of winners.
- **FR-016**: Edition admins MUST manage venues/playing surfaces with labels, capacity notes, and availability slots to drive scheduling decisions.
- **FR-017**: Edition settings MUST include configurable scoreboard themes (primary/secondary background, accent, font colors, optional background image) with validation against accessibility contrast rules.

### Team Registration & Management

- **FR-020**: Team managers MUST be able to create or select a reusable team and submit it as an entry into an edition during open periods, including team metadata (name, short name, colors, category) and manager contact details.
- **FR-021**: Edition admins MUST review entry requests, approve or reject them with rationale, and the system SHALL notify the submitting manager of the outcome.
- **FR-022**: The system MUST allow multiple team managers per team and provide quick context switching between teams they manage.
- **FR-023**: Edition admins MUST be able to freeze entry submissions once scheduling begins to prevent structural drift.
- **FR-024**: Competition admins MUST be able to create teams and manage edition squads on behalf of teams within their competitions when those teams cannot complete the setup themselves.

### Player Management

- **FR-030**: Team managers MUST manage reusable person profiles (players, staff) and associate them with teams via time-bounded team memberships capturing role and eligibility notes.
- **FR-031**: Team managers MUST assemble edition-specific squads by selecting from active team memberships and assign jersey numbers unique within the squad; jersey numbers MAY differ between editions.
- **FR-032**: The system MUST present accessible validation feedback for squad composition issues (e.g., duplicate jersey numbers, missing names) and allow tracking player availability (available, doubtful, injured, suspended) for planning.
- **FR-033**: Edition admins MUST have read-only access to all squads and export them (CSV/Excel) for operational use.
- **FR-034**: Payment tracking is deferred for phase one; no paid flag or fee reconciliation is exposed in entry or squad flows.

### Match Scheduling & Results

- **FR-040**: Edition admins MUST manage match details (stage, group code, round, kickoff timestamp, venue, status) with versioning to track changes.
- **FR-041**: Match codes (e.g., A, B, Q1, F) MUST remain configurable per edition while providing sensible defaults matching the legacy app.
- **FR-042**: The system MUST support recording regulation scores, extra-time scores, penalty shootouts, and special outcomes (forfeit, cancelled, postponed) with administrative notes.
- **FR-043**: Live match events (goal, own goal, penalty goal, assist, yellow/red card) MUST be captured with player attribution, minute, and stoppage time.
- **FR-044**: Standings, statistics, and advancement logic MUST recalculate immediately whenever match scores or events change.
- **FR-045**: Team managers MUST be able to review finalized match results and submit disputes when discrepancies are found, without being required to confirm results for publication.
- **FR-046**: The system SHOULD generate printable and shareable schedule views by team, by venue, and by day.
- **FR-047**: Phase-one implementation omits official assignments entirely; data model and UI MUST not surface referee fields until a later release.

### Statistics & Public Display

- **FR-050**: Group standings MUST follow the ranking order: points (3/1/0), goal differential, goals scored, head-to-head mini-table, and fair play (yellow/red cards) as a final tiebreaker.
- **FR-051**: Top-scorer leaderboards MUST list at least the top 25 players with ties handled alphabetically, and support filters by group or knockout stage.
- **FR-052**: Team dashboards MUST summarize results, upcoming matches, and cumulative stats (wins, draws, losses, goals for/against, points).
- **FR-053**: Each edition MUST expose a public landing page with schedule, results, standings, top scorers, and venue information, accessible without authentication. The landing view may live on the scoreboard route with a UI toggle for big-screen mode.
- **FR-054**: The big-screen scoreboard MUST allow configurable sections (e.g., rotating between live matches, upcoming fixtures, standings, top scorers) and display time since last refresh.
- **FR-055**: Edition admins MUST be able to trigger highlight overlays (e.g., “Finale starter nå”) for the scoreboard, lasting a configurable duration.

### Notifications & Collaboration

- **FR-060**: A poll-based feed endpoint MUST return match, schedule, and registration changes since a provided cursor to power dashboards and the scoreboard, and it MUST be publicly accessible without authentication or API keys while remaining read-only.
- **FR-061**: Team managers MUST receive in-app notifications (and optional email digests) for entry approvals, match schedule changes, score finalizations, and disputed results resolutions.
- **FR-062**: Edition admins SHOULD receive alerts when score disputes remain unresolved beyond a configurable SLA.
- **FR-063**: SMS delivery is out of scope for phase one; notification channels are limited to in-app and email.

### Audit & Compliance

- **FR-070**: The system MUST maintain an immutable audit log for critical actions (role assignments, schedule edits, result changes, scoreboard configuration updates) including actor, timestamp, and before/after snapshots.
- **FR-071**: Audit trails MUST be filterable by competition, edition, entity type, and actor, with export capability for compliance reviews.

### Localization & Accessibility

- **FR-080**: UI text presented to end users MUST be Norwegian Bokmål, while database fields, code, logging, and API responses remain US English.
- **FR-081**: Norwegian Bokmål UI copy MUST be hard-coded in source for phase one; runtime editing or externalized translation management is deferred.
- **FR-082**: All interactive surfaces, including the scoreboard, MUST comply with WCAG 2.2 AA (keyboard navigation, focus management, contrast).
- **FR-083**: Error messages surfaced to users MUST be localized (Norwegian), while API error payloads use English messages for developer clarity.

---

## Non-Functional Requirements

- **NFR-001**: The application MUST use Next.js (App Router) with React 19 and Node.js 22, written in TypeScript (ES2022 target).
- **NFR-002**: Styling MUST rely on Tailwind CSS (v4) with Shadcn UI for accessible, composable components.
- **NFR-003**: Authentication MUST integrate with better-auth to provide secure session handling, MFA readiness, and role-aware invitations.
- **NFR-004**: All persistent identifiers (users, competitions, editions, entries, teams, persons, matches, events, notifications) MUST be UUID v7.
- **NFR-005**: APIs MUST be described in an OpenAPI 3.2 contract, validated via Spectral, surfaced through a typed client consumed by the frontend, and error responses MUST conform to Problem Details for HTTP APIs (RFC 9457).
- **NFR-006**: Polling endpoints MUST respond within 200 ms at p95 under expected edition load (≤ 10 active matches) and support ETag/If-None-Match for caching.
- **NFR-007**: Logging MUST use structured logs (@aws-lambda-powertools/logger) with correlation IDs across API boundaries; audit events must emit to a dedicated channel.
- **NFR-008**: Automated testing MUST cover unit/integration scenarios with Vitest, E2E flows with Playwright, and maintain ≥ 85 % statement coverage.
- **NFR-009**: Continuous integration MUST run linting (Biome), type-checking, contract validation, and tests on every push; deploy pipelines MUST use concurrency controls.
- **NFR-010**: Data seeding MUST provide sample competitions, editions, teams, and matches for local development without conflicting with production IDs.
- **NFR-011**: Localization infrastructure MAY remain minimal for phase one; Norwegian Bokmål strings are hard-coded in source and changes require code updates until runtime management is introduced.
- **NFR-012**: Scoreboard polling interval MUST be configurable (default 5 s) with safeguards preventing values below 2 s.
- **NFR-013**: Infrastructure sizing assumptions MUST target support for up to 2 concurrent active editions without performance degradation.
- **NFR-014**: The hosted platform MUST achieve ≥ 99.0 % uptime per calendar month (≤ 7 h 18 m downtime) with documented incident response procedures.

---

## Analytics & Observability

- **AO-001**: Instrument key lifecycle events (`UserInvited`, `CompetitionCreated`, `EditionPublished`, `EntryApproved`, `ScheduleGenerated`, `MatchStarted`, `MatchFinalized`, `ScoreDisputed`, `ScoreboardViewed`) with metadata for dashboards.
- **AO-002**: Capture metrics for queue depths (entry approvals pending, score disputes pending), scoreboard poll counts, average schedule lead time, and top API latencies.
- **AO-003**: Provide health endpoints for database, background workers (notifications), and polling freshness to surface on admin dashboards.

---

## Open Questions / Follow-Ups
