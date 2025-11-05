# Phase 1: Data Model

**Status**: Drafted (2025-11-05)

This data model targets PostgreSQL with Drizzle ORM. All primary keys are UUID v7 strings (`uuid_generate_v7()` via database extension or generated in application code).

---

## Conceptual Diagram

```
        +-----------------+          +-----------------+
        |     users       |          |  role_invitations|
        |-----------------|          |-----------------|
        | id (PK)         |<>------->| id (PK)         |
        | email           |          | role            |
        | ...             |          | scope_type/id   |
        +-----------------+          +-----------------+
                  |                         ^
                  |                         |
         +-----------------+                |
         |   user_roles    |<---------------+
         |-----------------|
         | id (PK)         |      +--------------------+
         | user_id (FK)    |      |    tournaments     |
         | role            |      |--------------------|
         | scope_type/id   |----->| id (PK)            |
         | granted_by      |      | name, slug, ...    |
         | ...             |      +--------------------+
                                         |
               +-------------------------+-------------------------+
               |                         |                         |
    +--------------------+    +--------------------+    +--------------------+
    | tournament_phases  |    |     fields         |    | scoreboard_settings |
    |--------------------|    |--------------------|    |--------------------|
    | id (PK)            |    | id (PK)            |    | tournament_id (PK) |
    | tournament_id (FK) |    | tournament_id (FK) |    | theme jsonb        |
    | phase_type         |    | label, notes       |    | rotation config    |
    | order_index        |    | availability       |    +--------------------+
    +---------+----------+    +---------+----------+
              |                         |
      +-------------------+          +-------------------+
      |   phase_groups    |          |  team_registrations|
      |-------------------|          |-------------------|
      | id (PK)           |          | id (PK)           |
      | phase_id (FK)     |          | tournament_id (FK)|
      | code, name        |          | team_name, ...    |
      | advancement_rules |          | status            |
      +---------+---------+          +---------+---------+
                |                              |
         +--------------------+      +--------------------+
         |       teams        |      |   team_roles       |
         |--------------------|      |--------------------|
         | id (PK)            |<---->| id (PK)            |
         | tournament_id (FK) |      | team_id (FK)       |
         | phase_group_id FK  |      | user_id (FK)       |
         | name, colors       |      | role (manager)     |
    +----+---------+----------+      | invited_by         |
    |              |                 +--------------------+
    |      +-------------------+
    |      |     players       |
    |      |-------------------|
    |      | id (PK)           |
    +----->| team_id (FK)      |
           | jersey_number     |
           | paid, status      |
           +-------------------+

                      +--------------------+
                      |      matches       |
                      |--------------------|
                      | id (PK)            |
                      | tournament_id (FK) |
                      | phase_id / group   |
                      | home_team_id (FK)  |
                      | away_team_id (FK)  |
                      | field_id (FK)      |
                      | schedule/status    |
                      +----------+---------+
                                 |
                      +--------------------+
                      |   match_events     |
                      |--------------------|
                      | id (PK)            |
                      | match_id (FK)      |
                      | event_type         |
                      | player_id (FK)     |
                      | assist_player_id   |
                      | minute, data       |
                      +--------------------+

Additional supporting entities: `notifications`, `audit_logs`.
```

---

## Table Specifications

### `users`

| Column          | Type         | Constraints                                    | Notes                                       |
| --------------- | ------------ | ---------------------------------------------- | ------------------------------------------- |
| `id`            | `uuid`       | PK                                             | UUID v7                                     |
| `email`         | `citext`     | Unique, Not Null                               | Case-insensitive                            |
| `password_hash` | `text`       | Not Null                                       | Managed by better-auth                      |
| `display_name`  | `text`       | Not Null                                       | Internal/admin display                      |
| `locale`        | `text`       | Default `nb-NO`                                | Determines default UI language              |
| `created_at`    | `timestamptz`| Default `now()`                                |                                             |
| `updated_at`    | `timestamptz`| Default `now()`                                |                                             |

### `user_roles`

| Column        | Type         | Constraints                                    | Notes                                                   |
| ------------- | ------------ | ---------------------------------------------- | ------------------------------------------------------- |
| `id`          | `uuid`       | PK                                             |                                                         |
| `user_id`     | `uuid`       | FK -> `users.id`, Not Null                     |                                                         |
| `role`        | `text`       | Enum (`admin`, `tournament_admin`, `team_manager`) |                                                         |
| `scope_type`  | `text`       | Enum (`global`, `tournament`, `team`)          |                                                         |
| `scope_id`    | `uuid`       | Nullable (required for scoped roles)           | References tournament/team depending on scope           |
| `granted_by`  | `uuid`       | FK -> `users.id`, Not Null                     | Audit trail                                             |
| `created_at`  | `timestamptz`| Default `now()`                                |                                                         |

### `role_invitations`

| Column       | Type         | Constraints                                    | Notes                                   |
| ------------ | ------------ | ---------------------------------------------- | --------------------------------------- |
| `id`         | `uuid`       | PK                                             | Invitation token                        |
| `email`      | `citext`     | Not Null                                      | Recipient email                         |
| `role`       | `text`       | Enum as above                                 |                                           |
| `scope_type` | `text`       | As above                                      |                                           |
| `scope_id`   | `uuid`       | Nullable                                      |                                           |
| `status`     | `text`       | Enum (`pending`, `accepted`, `expired`, `revoked`) |                                           |
| `expires_at` | `timestamptz`| Not Null                                      |                                           |
| `invited_by` | `uuid`       | FK -> `users.id`                              |                                           |
| `created_at` | `timestamptz`| Default `now()`                               |                                           |
| `accepted_at`| `timestamptz`| Nullable                                      |                                           |

### `tournaments`

| Column              | Type          | Constraints                         | Notes                                             |
| ------------------- | ------------- | ----------------------------------- | ------------------------------------------------- |
| `id`                | `uuid`        | PK                                  |                                                   |
| `name`              | `text`        | Not Null                            |                                                   |
| `slug`              | `citext`      | Unique, Not Null                    | Public URL identifier                             |
| `description`       | `text`        | Nullable                            |                                                   |
| `location`          | `text`        | Nullable                            | Venue/city                                        |
| `timezone`          | `text`        | Not Null                            | IANA timezone                                    |
| `registration_open` | `timestamptz` | Nullable                            | Start of registration window                      |
| `registration_close`| `timestamptz` | Nullable                            | End of registration window                        |
| `status`            | `text`        | Enum (`draft`, `published`, `archived`) |                                           |
| `contact_email`     | `citext`      | Nullable                            |                                                   |
| `created_by`        | `uuid`        | FK -> `users.id`                    |                                                   |
| `created_at`        | `timestamptz` | Default `now()`                     |                                                   |
| `updated_at`        | `timestamptz` | Default `now()`                     |                                                   |

### `scoreboard_settings`

| Column             | Type     | Constraints               | Notes                                                  |
| ------------------ | -------- | ------------------------- | ------------------------------------------------------ |
| `tournament_id`    | `uuid`   | PK, FK -> `tournaments.id`| One-to-one                                             |
| `theme`            | `jsonb`  | Not Null                  | Stores colors, typography, logo references             |
| `modules`          | `jsonb`  | Not Null                  | Enabled sections and rotation order                    |
| `auto_rotate_secs` | `int`    | Default 8                 | Enforced minimum of 2                                  |
| `updated_by`       | `uuid`   | FK -> `users.id`          |                                                         |
| `updated_at`       | `timestamptz`| Default `now()`       |                                                         |

### `tournament_phases`

| Column         | Type          | Constraints                     | Notes                                         |
| -------------- | ------------- | ------------------------------- | --------------------------------------------- |
| `id`           | `uuid`        | PK                              |                                               |
| `tournament_id`| `uuid`        | FK -> `tournaments.id`          |                                               |
| `phase_type`   | `text`        | Enum (`group`, `knockout`)      |                                               |
| `name`         | `text`        | Not Null                        | Displayed label                               |
| `order_index`  | `int`         | Not Null                        | Phase ordering                                |
| `config`       | `jsonb`       | Nullable                        | Phase-specific settings (e.g., tie-break rules)|
| `locked_at`    | `timestamptz` | Nullable                        | Scheduling freeze                             |

### `phase_groups`

| Column        | Type          | Constraints                     | Notes                                 |
| ------------- | ------------- | ------------------------------- | ------------------------------------- |
| `id`          | `uuid`        | PK                              |                                       |
| `phase_id`    | `uuid`        | FK -> `tournament_phases.id`    |                                       |
| `code`        | `text`        | Not Null                        | e.g., A, B, Q1                        |
| `name`        | `text`        | Nullable                        |                                       |
| `advancement_rules` | `jsonb` | Nullable                        | e.g., top 2 advance                   |
| `order_index` | `int`         | Not Null                        |                                       |

### `fields`

| Column         | Type          | Constraints                | Notes                                  |
| -------------- | ------------- | -------------------------- | -------------------------------------- |
| `id`           | `uuid`        | PK                         |                                        |
| `tournament_id`| `uuid`        | FK -> `tournaments.id`     |                                        |
| `label`        | `text`        | Not Null                   | Display name (“Bane 1”)                |
| `location`     | `text`        | Nullable                   | Address/description                    |
| `surface`      | `text`        | Nullable                   |                                         |
| `availability` | `tsrange[]`   | Nullable                   | Optional time slots for scheduling     |
| `created_at`   | `timestamptz` | Default `now()`            |                                        |

### `team_registrations`

| Column          | Type          | Constraints                           | Notes                                         |
| --------------- | ------------- | ------------------------------------- | --------------------------------------------- |
| `id`            | `uuid`        | PK                                    |                                               |
| `tournament_id` | `uuid`        | FK -> `tournaments.id`, Not Null      |                                               |
| `team_name`     | `text`        | Not Null                              |                                               |
| `short_name`    | `text`        | Nullable                              |                                               |
| `colors`        | `jsonb`       | Nullable                              | Home/away kits                                |
| `contact_name`  | `text`        | Not Null                              |                                               |
| `contact_email` | `citext`      | Not Null                              |                                               |
| `notes`         | `text`        | Nullable                              |                                               |
| `status`        | `text`        | Enum (`pending`, `approved`, `rejected`, `withdrawn`) |                     |
| `submitted_by`  | `uuid`        | FK -> `users.id`, Not Null            | Team manager                                  |
| `reviewed_by`   | `uuid`        | FK -> `users.id`, Nullable            | Tournament admin                              |
| `reviewed_at`   | `timestamptz` | Nullable                              |                                               |
| `created_at`    | `timestamptz` | Default `now()`                       |                                               |

### `teams`

| Column            | Type          | Constraints                           | Notes                                              |
| ----------------- | ------------- | ------------------------------------- | -------------------------------------------------- |
| `id`              | `uuid`        | PK                                    |                                                    |
| `tournament_id`   | `uuid`        | FK -> `tournaments.id`, Not Null      |                                                    |
| `phase_group_id`  | `uuid`        | FK -> `phase_groups.id`, Nullable     | Current group/seeding                              |
| `registration_id` | `uuid`        | FK -> `team_registrations.id`, Nullable | Link to original submission                      |
| `name`            | `text`        | Not Null                              |                                                    |
| `short_name`      | `text`        | Nullable                              |                                                    |
| `primary_color`   | `text`        | Nullable                              | HEX                                               |
| `secondary_color` | `text`        | Nullable                              |                                                    |
| `status`          | `text`        | Enum (`draft`, `active`, `eliminated`) |                                                   |
| `created_at`      | `timestamptz` | Default `now()`                       |                                                    |

### `team_roles`

| Column        | Type          | Constraints                           | Notes                               |
| ------------- | ------------- | ------------------------------------- | ----------------------------------- |
| `id`          | `uuid`        | PK                                    |                                     |
| `team_id`     | `uuid`        | FK -> `teams.id`, Not Null            |                                     |
| `user_id`     | `uuid`        | FK -> `users.id`, Not Null            |                                     |
| `role`        | `text`        | Enum (`manager`, `coach`)             | Extendable                          |
| `invited_by`  | `uuid`        | FK -> `users.id`, Nullable            |                                     |
| `created_at`  | `timestamptz` | Default `now()`                       |                                     |

### `players`

| Column         | Type          | Constraints                             | Notes                                        |
| -------------- | ------------- | --------------------------------------- | -------------------------------------------- |
| `id`           | `uuid`        | PK                                      |                                              |
| `team_id`      | `uuid`        | FK -> `teams.id`, Not Null              |                                              |
| `first_name`   | `text`        | Not Null                                |                                              |
| `last_name`    | `text`        | Not Null                                |                                              |
| `display_name` | `text`        | Not Null                                | Display on scoreboard                        |
| `jersey_number`| `int`         | Not Null                                | Unique constraint `(team_id, jersey_number)` |
| `position`     | `text`        | Nullable                                |                                              |
| `date_of_birth`| `date`        | Nullable                                |                                              |
| `paid`         | `boolean`     | Default `false`                         |                                              |
| `availability` | `text`        | Enum (`available`, `doubtful`, `injured`, `suspended`) | |
| `created_at`   | `timestamptz` | Default `now()`                         |                                              |

### `matches`

| Column             | Type          | Constraints                             | Notes                                                 |
| ------------------ | ------------- | --------------------------------------- | ----------------------------------------------------- |
| `id`               | `uuid`        | PK                                      |                                                       |
| `tournament_id`    | `uuid`        | FK -> `tournaments.id`, Not Null        |                                                       |
| `phase_id`         | `uuid`        | FK -> `tournament_phases.id`, Nullable  |                                                       |
| `phase_group_id`   | `uuid`        | FK -> `phase_groups.id`, Nullable       |                                                       |
| `round_number`     | `int`         | Nullable                                |                                                       |
| `match_code`       | `text`        | Not Null                                | Legacy codes (A, B, Q1...)                            |
| `home_team_id`     | `uuid`        | FK -> `teams.id`, Nullable              |                                                       |
| `away_team_id`     | `uuid`        | FK -> `teams.id`, Nullable              |                                                       |
| `home_placeholder` | `text`        | Nullable                                | For unassigned seeds (“Winner Q1”)                    |
| `away_placeholder` | `text`        | Nullable                                |                                                       |
| `field_id`         | `uuid`        | FK -> `fields.id`, Nullable             |                                                       |
| `kickoff_at`       | `timestamptz` | Nullable                                |                                                       |
| `duration_minutes` | `int`         | Default 25                              |                                                       |
| `status`           | `text`        | Enum (`draft`, `scheduled`, `live`, `final`, `forfeit`, `cancelled`, `postponed`) |   |
| `score_home`       | `int`         | Nullable                                |                                                       |
| `score_away`       | `int`         | Nullable                                |                                                       |
| `score_et_home`    | `int`         | Nullable                                | Extra time                                            |
| `score_et_away`    | `int`         | Nullable                                |                                                       |
| `score_pk_home`    | `int`         | Nullable                                | Penalty shootout                                     |
| `score_pk_away`    | `int`         | Nullable                                |                                                       |
| `notes`            | `text`        | Nullable                                |                                                       |
| `published_at`     | `timestamptz` | Nullable                                | When visible externally                               |
| `updated_by`       | `uuid`        | FK -> `users.id`, Nullable              |                                                       |
| `updated_at`       | `timestamptz` | Default `now()`                         |                                                       |

### `match_events`

| Column             | Type          | Constraints                             | Notes                                             |
| ------------------ | ------------- | --------------------------------------- | ------------------------------------------------- |
| `id`               | `uuid`        | PK                                      |                                                   |
| `match_id`         | `uuid`        | FK -> `matches.id`, Not Null            |                                                   |
| `event_type`       | `text`        | Enum (`goal`, `own_goal`, `penalty_goal`, `penalty_miss`, `yellow_card`, `red_card`) | |
| `minute`           | `int`         | Not Null                                |                                                   |
| `stoppage_time`    | `int`         | Nullable                                |                                                   |
| `team_id`          | `uuid`        | FK -> `teams.id`, Nullable              |                                                   |
| `player_id`        | `uuid`        | FK -> `players.id`, Nullable            |                                                   |
| `assist_player_id` | `uuid`        | FK -> `players.id`, Nullable            |                                                   |
| `created_by`       | `uuid`        | FK -> `users.id`, Not Null              |                                                   |
| `created_at`       | `timestamptz` | Default `now()`                         |                                                   |

### `score_confirmations`

| Column         | Type          | Constraints                           | Notes                                         |
| -------------- | ------------- | ------------------------------------- | --------------------------------------------- |
| `id`           | `uuid`        | PK                                    |                                               |
| `match_id`     | `uuid`        | FK -> `matches.id`, Not Null          |                                               |
| `team_id`      | `uuid`        | FK -> `teams.id`, Not Null            |                                               |
| `submitted_by` | `uuid`        | FK -> `users.id`, Not Null            | Team manager                                  |
| `status`       | `text`        | Enum (`pending`, `confirmed`, `disputed`, `expired`) |                     |
| `comment`      | `text`        | Nullable                              |                                               |
| `resolved_by`  | `uuid`        | FK -> `users.id`, Nullable            | Tournament admin                              |
| `resolved_at`  | `timestamptz` | Nullable                              |                                               |
| `created_at`   | `timestamptz` | Default `now()`                       |                                               |

### `notifications`

| Column       | Type          | Constraints                           | Notes                                |
| ------------ | ------------- | ------------------------------------- | ------------------------------------ |
| `id`         | `uuid`        | PK                                    |                                      |
| `user_id`    | `uuid`        | FK -> `users.id`, Not Null            | Recipient                            |
| `type`       | `text`        | Enum (`schedule_change`, `score_finalized`, `score_dispute`, `role_invite`) | |
| `payload`    | `jsonb`       | Not Null                              | Structured data                      |
| `read_at`    | `timestamptz` | Nullable                              |                                      |
| `created_at` | `timestamptz` | Default `now()`                       |                                      |

### `event_feed`

| Column         | Type          | Constraints                           | Notes                                         |
| -------------- | ------------- | ------------------------------------- | --------------------------------------------- |
| `id`           | `uuid`        | PK                                    | Feed cursor                                   |
| `tournament_id`| `uuid`        | FK -> `tournaments.id`, Nullable      | Null for global events                        |
| `entity_type`  | `text`        | Enum (`match`, `match_event`, `registration`, `notification`) | |
| `entity_id`    | `uuid`        | Not Null                              | References target entity                      |
| `action`       | `text`        | Enum (`created`, `updated`, `deleted`) |                                              |
| `snapshot`     | `jsonb`       | Not Null                              | Data needed for consumers                     |
| `created_at`   | `timestamptz` | Default `now()`                       |                                               |

### `audit_logs`

| Column       | Type          | Constraints                           | Notes                                |
| ------------ | ------------- | ------------------------------------- | ------------------------------------ |
| `id`         | `uuid`        | PK                                    |                                      |
| `actor_id`   | `uuid`        | FK -> `users.id`, Nullable            | System actions may be null           |
| `scope_type` | `text`        | Enum (`tournament`, `team`, `match`, `user`) |                                |
| `scope_id`   | `uuid`        | Nullable                              |                                      |
| `action`     | `text`        | Not Null                              | e.g., `match.score.update`           |
| `metadata`   | `jsonb`       | Not Null                              | Before/after snapshot                |
| `created_at` | `timestamptz` | Default `now()`                       |                                      |

---

## Derived/Computed Views

- **`standings_view`**: Materialized view per tournament/phase group computing matches played, wins/draws/losses, goals for/against, goal differential, points, fair play deductions, tie-break order.
- **`top_scorers_view`**: Aggregates `match_events` where `event_type` in (`goal`, `penalty_goal`) grouped by player, sorted by total goals, assists.
- **`upcoming_matches_view`**: Filters matches by scheduled status and future `kickoff_at`, ordered for scoreboard display.

---

## Data Integrity Constraints

- Enforce `CHECK` constraints ensuring `score_pk_*` values exist only when `status = 'final'` and match marked as penalty shootout.
- Disallow `match_events` referencing players not in `home_team_id` or `away_team_id`.
- Cascading rules: deleting a tournament removes dependent records (phases, teams, matches). Soft-delete not required in phase one; archival handled via `status`.

No outstanding data model questions remain; schema supports required functionality and anticipated extensions (referees, messaging).

