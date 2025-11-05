# Phase 1: Data Model

**Status**: Drafted (2025-11-05)  
**Scope**: Modern football administration platform (Next.js + Drizzle + PostgreSQL)  
**Key Principle**: All persistent identifiers are UUID v7 strings (`uuid_generate_v7()` via database extension or generated in application code).

---

## Conceptual Diagram

```
        +--------------+          +-------------------+
        |    users     |<>--------| role_invitations  |
        |--------------|          |-------------------|
        | id (PK)      |          | id (PK)           |
        | email        |          | email             |
        | ...          |          | role              |
        +--------------+          | scope_type/id     |
               |                  +---------+---------+
               |                            ^
        +--------------+                    |
        |  user_roles  |<-------------------+
        |--------------|
        | id (PK)      |       +---------------------+
        | user_id (FK) |       |    competitions     |
        | role         |       |---------------------|
        | scope_type/id|-----> | id (PK)             |
        +--------------+       | name, slug, ...     |
                                +----------+----------+
                                           |
                                +----------+----------+
                                |       editions      |
                                |---------------------|
                                | id (PK)             |
                                | competition_id (FK) |
                                | label, slug, ...    |
                                +----+-----------+----+
                                     |           |
                        +------------+           +--------------------+
                        |                                    |
              +--------------------+            +---------------------+
              |      stages        |            |       venues        |
              |--------------------|            |---------------------|
              | id (PK)            |            | id (PK)             |
              | edition_id (FK)    |            | edition_id (FK)     |
              | stage_type         |            | name, slug, ...     |
              +----+---------------+            +---------------------+
                   |
        +----------+-----------+
        |                      |
+---------------+   +-------------------+
|    groups     |   |     brackets      |
|---------------|   |-------------------|
| id (PK)       |   | id (PK)           |
| stage_id (FK) |   | stage_id (FK)     |
| code, name    |   | bracket_type, ... |
+------+--------+   +---------+---------+
       |                          |
+------+--------+        +-------+---------+
|   rounds      |        |      matches    |
|---------------|        |-----------------|
| id (PK)       |        | id (PK)         |
| stage_id (FK) |        | edition_id (FK) |
| group_id FK   |        | stage/group/... |
| label, order  |        | home_entry_id   |
+---------------+        | away_entry_id   |
                         | venue_id, ...   |
                         +---+---------+---+
                             |         |
             +---------------+         +-------------------+
             |                                      |
    +---------------+                    +----------------------+
    |    entries    |                    |     match_events     |
    |---------------|                    |----------------------|
    | id (PK)       |                    | id (PK)              |
    | edition_id FK |                    | match_id (FK)        |
    | team_id (FK)  |                    | appearance_id (FK)   |
    | status, ...   |                    | event_type, minute   |
    +-------+-------+                    +----------------------+
            |
    +-------+--------+        +------------------+
    |     squads     |        |   appearances    |
    |----------------|        |------------------|
    | id (PK)        |        | id (PK)          |
    | entry_id (FK)  |        | match_id (FK)    |
    | locked_at      |        | squad_member_id  |
    +-------+--------+        | minutes_played   |
            |                 +------------------+
   +--------+---------+
   |   squad_members  |
   |------------------|
   | id (PK)          |
   | squad_id (FK)    |
   | person_id (FK)   |
   | jersey_number    |
   +--------+---------+
            |
   +--------+---------+
   |  persons         |
   |------------------|
   | id (PK)          |
   | name fields...   |
   +------------------+

Additional supporting entities: `team_memberships`, `notifications`, `event_feed`, `audit_logs`.
```

---

## Table Specifications

### Access & Identity

#### `users`

| Column        | Type         | Constraints                                    | Notes                                |
| ------------- | ------------ | ---------------------------------------------- | ------------------------------------ |
| `id`          | `uuid`       | PK                                             | UUID v7                              |
| `email`       | `citext`     | Unique, Not Null                               | Case-insensitive                     |
| `hashed_pwd`  | `text`       | Nullable                                       | Null when SSO-only                   |
| `full_name`   | `text`       | Nullable                                       | Display in admin UI                  |
| `locale`      | `text`       | Default `nb-NO`                                | User preference                      |
| `created_at`  | `timestamptz`| Default `now()`                                |                                      |
| `updated_at`  | `timestamptz`| Default `now()`                                |                                      |

#### `role_invitations`

| Column          | Type          | Constraints                                            | Notes                                           |
| --------------- | ------------- | ------------------------------------------------------ | ----------------------------------------------- |
| `id`            | `uuid`        | PK                                                     |                                                 |
| `email`         | `citext`      | Not Null                                              | Sent to prospective user                        |
| `role`          | `text`        | Enum (`admin`, `tournament_admin`, `team_manager`)     | Matches RBAC layer                              |
| `scope_type`    | `text`        | Enum (`global`, `competition`, `edition`, `team`)      |                                                 |
| `scope_id`      | `uuid`        | Nullable (null for global invites)                     | References scope table                          |
| `invited_by`    | `uuid`        | FK -> `users.id`, Not Null                            | Sender                                          |
| `token`         | `text`        | Unique, Not Null                                      | Invitation acceptance token                     |
| `expires_at`    | `timestamptz` | Not Null                                              |                                                  |
| `accepted_at`   | `timestamptz` | Nullable                                              |                                                  |
| `created_at`    | `timestamptz` | Default `now()`                                       |                                                  |

#### `user_roles`

| Column        | Type          | Constraints                                           | Notes                                  |
| ------------- | ------------- | ----------------------------------------------------- | -------------------------------------- |
| `id`          | `uuid`        | PK                                                    |                                         |
| `user_id`     | `uuid`        | FK -> `users.id`, Not Null                            |                                         |
| `role`        | `text`        | Enum (`admin`, `tournament_admin`, `team_manager`)    |                                         |
| `scope_type`  | `text`        | Enum (`global`, `competition`, `edition`, `team`)     |                                         |
| `scope_id`    | `uuid`        | Nullable                                              | Null for global role                    |
| `granted_by`  | `uuid`        | FK -> `users.id`, Nullable                            | Populated for delegated grants          |
| `created_at`  | `timestamptz` | Default `now()`                                       |                                         |

### Competition Structure

#### `competitions`

| Column              | Type          | Constraints                         | Notes                                        |
| ------------------- | ------------- | ----------------------------------- | -------------------------------------------- |
| `id`                | `uuid`        | PK                                  |                                              |
| `name`              | `text`        | Not Null                            | Public name                                  |
| `slug`              | `text`        | Unique, Not Null                    | For URLs (`/competitions/{slug}`)            |
| `default_timezone`  | `text`        | Not Null                            | Olson string                                 |
| `description`       | `text`        | Nullable                            | Markdown/HTML snippet                        |
| `primary_color`     | `text`        | Nullable                            | Hex string                                   |
| `secondary_color`   | `text`        | Nullable                            |                                              |
| `archived_at`       | `timestamptz` | Nullable                            | Soft archive                                 |
| `created_at`        | `timestamptz` | Default `now()`                     |                                              |
| `updated_at`        | `timestamptz` | Default `now()`                     |                                              |

#### `editions`

| Column                 | Type          | Constraints                                         | Notes                                         |
| ---------------------- | ------------- | --------------------------------------------------- | --------------------------------------------- |
| `id`                   | `uuid`        | PK                                                  |                                               |
| `competition_id`       | `uuid`        | FK -> `competitions.id`, Not Null                   |                                               |
| `label`                | `text`        | Not Null                                            | Display label (“2025”, “Spring Cup”)          |
| `slug`                 | `text`        | Unique per competition (`competitions.slug + slug`) | Edition URL                                   |
| `timezone`             | `text`        | Not Null                                            | Olson string                                  |
| `status`               | `text`        | Enum (`draft`, `published`, `archived`)             |                                               |
| `registration_opens_at`| `timestamptz` | Nullable                                            |                                               |
| `registration_closes_at`| `timestamptz`| Nullable                                            |                                               |
| `contact_email`        | `citext`      | Nullable                                            |                                               |
| `contact_phone`        | `text`        | Nullable                                            |                                               |
| `primary_venue_id`     | `uuid`        | FK -> `venues.id`, Nullable                         | Default scoreboard venue                      |
| `created_at`           | `timestamptz` | Default `now()`                                     |                                               |
| `updated_at`           | `timestamptz` | Default `now()`                                     |                                               |

#### `edition_settings`

| Column              | Type          | Constraints                         | Notes                                              |
| ------------------- | ------------- | ----------------------------------- | -------------------------------------------------- |
| `edition_id`        | `uuid`        | PK, FK -> `editions.id`             | One-to-one settings row                            |
| `scoreboard_theme`  | `jsonb`       | Not Null                            | Colors, backgrounds, assets                        |
| `scoreboard_rotation_seconds` | `integer` | Default `5`, CHECK >= 2     | UI safeguards                                      |
| `registration_requirements`    | `jsonb`  | Nullable                        | Medical forms, categories                          |
| `ruleset_notes`     | `text`        | Nullable                            | Markdown for staff                                 |

#### `stages`

| Column           | Type          | Constraints                                     | Notes                                               |
| ---------------- | ------------- | ----------------------------------------------- | --------------------------------------------------- |
| `id`             | `uuid`        | PK                                              |                                                     |
| `edition_id`     | `uuid`        | FK -> `editions.id`, Not Null                   |                                                     |
| `name`           | `text`        | Not Null                                        | “Gruppespill”, “Sluttspill”                         |
| `stage_type`     | `text`        | Enum (`group`, `knockout`)                      |                                                     |
| `order_index`    | `integer`     | Not Null                                        | Stage ordering                                      |
| `published_at`   | `timestamptz` | Nullable                                        | Stage visible to public                             |
| `config`         | `jsonb`       | Nullable                                        | Stage-specific options (points schema, progression) |
| `created_at`     | `timestamptz` | Default `now()`                                 |                                                     |

#### `groups`

| Column             | Type          | Constraints                             | Notes                                       |
| ------------------ | ------------- | --------------------------------------- | ------------------------------------------- |
| `id`               | `uuid`        | PK                                      |                                             |
| `stage_id`         | `uuid`        | FK -> `stages.id`, Not Null             |                                             |
| `code`             | `text`        | Not Null                                | “A”, “B”, ...                               |
| `name`             | `text`        | Nullable                                | Display name                                |
| `round_robin_mode` | `text`        | Enum (`single`, `double`)               |                                             |
| `advancement_rules`| `jsonb`       | Nullable                                | Structured instructions for progression     |
| `created_at`       | `timestamptz` | Default `now()`                         |                                             |

#### `brackets`

| Column            | Type          | Constraints                              | Notes                                              |
| ----------------- | ------------- | ---------------------------------------- | -------------------------------------------------- |
| `id`              | `uuid`        | PK                                       |                                                    |
| `stage_id`        | `uuid`        | FK -> `stages.id`, Not Null              |                                                    |
| `bracket_type`    | `text`        | Enum (`single_elimination`, `double_elimination`) | Phase one uses single elimination           |
| `third_place_match`| `boolean`    | Default `false`                          |                                                    |
| `config`          | `jsonb`       | Nullable                                 | Bracket size, seeding info                         |
| `created_at`      | `timestamptz` | Default `now()`                          |                                                    |

#### `rounds`

| Column            | Type          | Constraints                                   | Notes                                       |
| ----------------- | ------------- | --------------------------------------------- | ------------------------------------------- |
| `id`              | `uuid`        | PK                                            |                                             |
| `stage_id`        | `uuid`        | FK -> `stages.id`, Not Null                   |                                             |
| `group_id`        | `uuid`        | FK -> `groups.id`, Nullable                   | For group matchdays                         |
| `bracket_side`    | `text`        | Enum (`winners`, `losers`), Nullable          | Only for double elimination future use      |
| `label`           | `text`        | Not Null                                      | “Runde 1”, “Kvartfinale”                     |
| `order_index`     | `integer`     | Not Null                                      |                                             |
| `created_at`      | `timestamptz` | Default `now()`                               |                                             |

#### `venues`

| Column           | Type          | Constraints                          | Notes                                           |
| ---------------- | ------------- | ------------------------------------ | ----------------------------------------------- |
| `id`             | `uuid`        | PK                                   |                                                 |
| `edition_id`     | `uuid`        | FK -> `editions.id`, Nullable        | Null if reusable across competition             |
| `competition_id` | `uuid`        | FK -> `competitions.id`, Nullable    | At least one of edition or competition set      |
| `name`           | `text`        | Not Null                             |                                                 |
| `slug`           | `text`        | Unique per competition/edition       |                                                 |
| `address`        | `text`        | Nullable                             |                                                 |
| `notes`          | `text`        | Nullable                             | Special instructions                            |
| `timezone`       | `text`        | Nullable                             | Override if different from edition timezone     |
| `created_at`     | `timestamptz` | Default `now()`                      |                                                 |

### Participants & Membership

#### `teams`

| Column            | Type          | Constraints                             | Notes                                          |
| ----------------- | ------------- | --------------------------------------- | ---------------------------------------------- |
| `id`              | `uuid`        | PK                                      |                                                |
| `name`            | `text`        | Not Null                                |                                                |
| `short_name`      | `text`        | Nullable                                |                                                |
| `primary_color`   | `text`        | Nullable                                | HEX string                                     |
| `secondary_color` | `text`        | Nullable                                |                                                |
| `home_city`       | `text`        | Nullable                                | Optional metadata                              |
| `logo_url`        | `text`        | Nullable                                |                                                |
| `created_at`      | `timestamptz` | Default `now()`                         |                                                |
| `updated_at`      | `timestamptz` | Default `now()`                         |                                                |

#### `persons`

| Column          | Type          | Constraints                          | Notes                                      |
| --------------- | ------------- | ------------------------------------ | ------------------------------------------ |
| `id`            | `uuid`        | PK                                   |                                            |
| `first_name`    | `text`        | Not Null                             |                                            |
| `last_name`     | `text`        | Nullable                             | Supports single-name players               |
| `display_name`  | `text`        | Nullable                             | Defaults to `first_name last_name`         |
| `birthdate`     | `date`        | Nullable                             |                                            |
| `country_code`  | `text`        | Nullable                             | ISO alpha-2                                |
| `preferred_position` | `text`   | Nullable                             | e.g., `GK`, `FW`                           |
| `created_at`    | `timestamptz` | Default `now()`                      |                                            |

#### `team_memberships`

| Column        | Type          | Constraints                                       | Notes                                             |
| ------------- | ------------- | ------------------------------------------------- | ------------------------------------------------- |
| `id`          | `uuid`        | PK                                                |                                                   |
| `team_id`     | `uuid`        | FK -> `teams.id`, Not Null                        |                                                   |
| `person_id`   | `uuid`        | FK -> `persons.id`, Not Null                      |                                                   |
| `role`        | `text`        | Enum (`player`, `coach`, `manager`, `staff`)      | Extendable                                        |
| `status`      | `text`        | Enum (`active`, `inactive`)                       |                                                   |
| `started_on`  | `date`        | Nullable                                          |                                                   |
| `ended_on`    | `date`        | Nullable                                          |                                                   |
| `notes`       | `text`        | Nullable                                          |                                                   |
| `created_at`  | `timestamptz` | Default `now()`                                   |                                                   |

#### `entries`

| Column           | Type          | Constraints                                                             | Notes                                      |
| ---------------- | ------------- | ----------------------------------------------------------------------- | ------------------------------------------ |
| `id`             | `uuid`        | PK                                                                      |                                            |
| `edition_id`     | `uuid`        | FK -> `editions.id`, Not Null                                           |                                            |
| `team_id`        | `uuid`        | FK -> `teams.id`, Not Null                                              |                                            |
| `status`         | `text`        | Enum (`pending`, `approved`, `rejected`, `withdrawn`)                   |                                            |
| `submitted_by`   | `uuid`        | FK -> `users.id`, Not Null                                              | Team manager                               |
| `submitted_at`   | `timestamptz` | Default `now()`                                                         |                                            |
| `reviewed_by`    | `uuid`        | FK -> `users.id`, Nullable                                              | Edition admin                              |
| `reviewed_at`    | `timestamptz` | Nullable                                                                |                                            |
| `category`       | `text`        | Nullable                                                                | Age group / division                       |
| `notes`          | `text`        | Nullable                                                                | Internal commentary                         |

#### `squads`

| Column        | Type          | Constraints                             | Notes                                        |
| ------------- | ------------- | --------------------------------------- | -------------------------------------------- |
| `id`          | `uuid`        | PK                                      |                                              |
| `entry_id`    | `uuid`        | FK -> `entries.id`, Not Null            |                                              |
| `label`       | `text`        | Nullable                                | e.g., “Kamptropp A”                          |
| `locked_at`   | `timestamptz` | Nullable                                | Edition admin lock                            |
| `created_at`  | `timestamptz` | Default `now()`                         |                                              |
| `updated_at`  | `timestamptz` | Default `now()`                         |                                              |

#### `squad_members`

| Column            | Type          | Constraints                                        | Notes                                            |
| ----------------- | ------------- | -------------------------------------------------- | ------------------------------------------------ |
| `id`              | `uuid`        | PK                                                 |                                                  |
| `squad_id`        | `uuid`        | FK -> `squads.id`, Not Null                        |                                                  |
| `person_id`       | `uuid`        | FK -> `persons.id`, Not Null                       | Person must have active team membership          |
| `jersey_number`   | `integer`     | Nullable                                           | Unique per squad (enforced via partial index)    |
| `position`        | `text`        | Nullable                                           |                                                  |
| `availability`    | `text`        | Enum (`available`, `doubtful`, `injured`, `suspended`) |                                             |
| `notes`           | `text`        | Nullable                                           |                                                  |
| `created_at`      | `timestamptz` | Default `now()`                                    |                                                  |

### Matches & Statistics

#### `matches`

| Column             | Type          | Constraints                                                            | Notes                                                |
| ------------------ | ------------- | ---------------------------------------------------------------------- | ---------------------------------------------------- |
| `id`               | `uuid`        | PK                                                                     |                                                      |
| `edition_id`       | `uuid`        | FK -> `editions.id`, Not Null                                          |                                                      |
| `stage_id`         | `uuid`        | FK -> `stages.id`, Not Null                                            |                                                      |
| `group_id`         | `uuid`        | FK -> `groups.id`, Nullable                                            |                                                      |
| `bracket_id`       | `uuid`        | FK -> `brackets.id`, Nullable                                          |                                                      |
| `round_id`         | `uuid`        | FK -> `rounds.id`, Nullable                                            |                                                      |
| `home_entry_id`    | `uuid`        | FK -> `entries.id`, Not Null                                           |                                                      |
| `away_entry_id`    | `uuid`        | FK -> `entries.id`, Not Null                                           |                                                      |
| `venue_id`         | `uuid`        | FK -> `venues.id`, Nullable                                            |                                                      |
| `code`             | `text`        | Nullable                                                               | e.g., “A1”, “QF1”                                   |
| `kickoff_at`       | `timestamptz` | Nullable                                                               |                                                      |
| `status`           | `text`        | Enum (`scheduled`, `live`, `final`, `cancelled`, `postponed`)          |                                                      |
| `home_score`       | `integer`     | Default `0`                                                            |                                                      |
| `away_score`       | `integer`     | Default `0`                                                            |                                                      |
| `home_extra_time`  | `integer`     | Nullable                                                               |                                                      |
| `away_extra_time`  | `integer`     | Nullable                                                               |                                                      |
| `home_penalties`   | `integer`     | Nullable                                                               |                                                      |
| `away_penalties`   | `integer`     | Nullable                                                               |                                                      |
| `outcome`          | `text`        | Enum (`home_win`, `away_win`, `draw`, `forfeit`, `cancelled`)          |                                                      |
| `notes`            | `text`        | Nullable                                                               | Operational notes                                    |
| `published_at`     | `timestamptz` | Nullable                                                               |                                                      |
| `created_at`       | `timestamptz` | Default `now()`                                                        |                                                      |
| `updated_at`       | `timestamptz` | Default `now()`                                                        |                                                      |

#### `appearances`

| Column            | Type          | Constraints                                          | Notes                                          |
| ----------------- | ------------- | ---------------------------------------------------- | ---------------------------------------------- |
| `id`              | `uuid`        | PK                                                   |                                                |
| `match_id`        | `uuid`        | FK -> `matches.id`, Not Null                         |                                                |
| `squad_member_id` | `uuid`        | FK -> `squad_members.id`, Not Null                   |                                                |
| `team_side`       | `text`        | Enum (`home`, `away`)                                | Derived from entry membership                   |
| `started`         | `boolean`     | Default `false`                                      | Lineups formally deferred; start flag still useful |
| `minutes_played`  | `integer`     | Nullable                                             | Calculated downstream                          |
| `entered_at_minute` | `integer`   | Nullable                                             |                                                |
| `created_at`      | `timestamptz` | Default `now()`                                      |                                                |

#### `match_events`

| Column             | Type          | Constraints                                                              | Notes                                         |
| ------------------ | ------------- | ------------------------------------------------------------------------ | --------------------------------------------- |
| `id`               | `uuid`        | PK                                                                       |                                               |
| `match_id`         | `uuid`        | FK -> `matches.id`, Not Null                                             |                                               |
| `appearance_id`    | `uuid`        | FK -> `appearances.id`, Nullable                                         | Null for administrative events                |
| `team_side`        | `text`        | Enum (`home`, `away`)                                                    |                                               |
| `event_type`       | `text`        | Enum (`goal`, `own_goal`, `penalty_goal`, `assist`, `yellow_card`, `red_card`) | Phase-one events                      |
| `minute`           | `integer`     | Nullable                                                                 |                                               |
| `stoppage_time`    | `integer`     | Nullable                                                                 |                                               |
| `related_member_id`| `uuid`        | FK -> `squad_members.id`, Nullable                                       | e.g., assist provider                         |
| `metadata`         | `jsonb`       | Not Null Default `{}`                                                    | Extra info (penalty shootout order, reason)   |
| `created_at`       | `timestamptz` | Default `now()`                                                          |                                               |

### Collaboration & Audit

#### `notifications`

| Column           | Type          | Constraints                                    | Notes                                      |
| ---------------- | ------------- | ---------------------------------------------- | ------------------------------------------ |
| `id`             | `uuid`        | PK                                             |                                            |
| `user_id`        | `uuid`        | FK -> `users.id`, Not Null                     |                                            |
| `type`           | `text`        | Enum (`entry_status`, `schedule_change`, `score_finalized`, `score_disputed`) | |
| `payload`        | `jsonb`       | Not Null                                       |                                            |
| `read_at`        | `timestamptz` | Nullable                                       |                                            |
| `created_at`     | `timestamptz` | Default `now()`                                |                                            |

#### `event_feed`

| Column        | Type          | Constraints                                                           | Notes                                         |
| ------------- | ------------- | --------------------------------------------------------------------- | --------------------------------------------- |
| `id`          | `uuid`        | PK                                                                    | Feed cursor                                   |
| `edition_id`  | `uuid`        | FK -> `editions.id`, Nullable                                         | Null for cross-edition events                 |
| `entity_type` | `text`        | Enum (`match`, `match_event`, `entry`, `notification`)                | Extendable                                    |
| `entity_id`   | `uuid`        | Not Null                                                              | References target entity                      |
| `action`      | `text`        | Enum (`created`, `updated`, `deleted`)                                |                                               |
| `snapshot`    | `jsonb`       | Not Null                                                              | Data required by polling consumers            |
| `created_at`  | `timestamptz` | Default `now()`                                                       |                                               |

#### `audit_logs`

| Column        | Type          | Constraints                                                      | Notes                                        |
| ------------- | ------------- | ---------------------------------------------------------------- | -------------------------------------------- |
| `id`          | `uuid`        | PK                                                               |                                              |
| `actor_id`    | `uuid`        | FK -> `users.id`, Nullable                                       | System actions may be null                   |
| `scope_type`  | `text`        | Enum (`competition`, `edition`, `team`, `match`, `user`)         |                                              |
| `scope_id`    | `uuid`        | Nullable                                                         |                                              |
| `action`      | `text`        | Not Null                                                         | e.g., `edition.stage.update`                 |
| `metadata`    | `jsonb`       | Not Null                                                         | Before/after payload                         |
| `created_at`  | `timestamptz` | Default `now()`                                                  |                                              |

---

## Derived / Computed Views

- **`edition_standings_view`**: Materialized standings per edition/group using `matches`, honoring advancement rules, goal differential, goals scored, head-to-head mini-table, and fair play deductions.
- **`edition_top_scorers_view`**: Aggregates `match_events` where `event_type` in (`goal`, `penalty_goal`) grouped by `person_id`, exposing goals, assists, and matches played.
- **`edition_schedule_view`**: Filters `matches` with upcoming `kickoff_at`, ordered by venue and start time for scoreboard and notification feeds.

---

## Data Integrity Constraints & Enforcement

- Partial unique index `UNIQUE(squad_id, jersey_number)` filtered where `jersey_number IS NOT NULL` to guarantee unique squad numbers.
- `team_memberships` must exist (via FK) before a `squad_member` referencing the person is inserted; enforced through deferred check using trigger or application guard.
- `matches.home_entry_id` and `matches.away_entry_id` must reference entries approved (`status = 'approved'`); enforce via trigger checking `entries.status`.
- `match_events` referencing `appearance_id` must belong to the same `match_id`; enforced via FK with `MATCH SIMPLE` and check constraint.
- Cascades: deleting an edition removes dependent stages, groups, brackets, rounds, matches, entries, squads, squad members, appearances, and match events. Teams and persons remain reusable and are not cascaded.
- Official assignments, lineups, and two-legged ties are intentionally deferred; placeholder tables are not created in phase one.
- Audit log triggers capture mutations on `matches`, `entries`, `stages`, `scoreboard_theme`, and `user_roles`.

No outstanding questions remain for phase one. Future iterations will introduce tie aggregates, lineup tables, and referee assignments when the corresponding features enter scope.
