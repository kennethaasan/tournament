Build a new football tournament administration application based on the existing Laravel application in the `laravel` folder. I've already set up a new Next.js project here that you should start from.

Follow instructions in the `/instructions/`, `AGENTS.md`, and `README.md` folders and files. I recently did the same modernization for another app, which you can find [here](https://github.com/kennethaasan/mattis). Use that repository as a reference on how to solve similar problems. Also use that repository to create requirements for this new application.

Try go get requirements based on what you can see in the existing Laravel application. You can also suggest improvements and new features that would make sense for a modern football tournament administration app.

In addition to the features in the existing Laravel app, I want these features:
- A modern, responsive UI built with React, Tailwind CSS, and Shadcn (follow https://ui.shadcn.com/docs/installation/next)
- User authentication and authorization using better-auth. We need at least admin, tournament-admin, and team-manager roles. Users with these roles need to be able to add other users with the same role.
- Support for multiple tournament formats (e.g., knockout, round-robin) similar to the existing app
- Tournament admins should be able to create and manage tournaments, teams, players, and match schedules through the UI. We MUST make it very easy to set up matches in a new tournament.
- Allow team-managers to sign up and join tournaments with their teams.
- Team managers should be able to manage their team's squad and view match schedules and results.
- Tournament, Match, Team and Player management
- Real-time updates and notifications. This can be done using polling.
- A single tournament page that can be displayed on a big screen at the tournament venue, showing live scores, upcoming matches, and other relevant information like top scorers. This must be configurable by the tournament admin. This page is without authentication, and should have a clean, easy-to-read design. Allow the tournament admin to customize the background color(s) and font color(s).
- MUST use UUID v7 for all IDs
- MUST use US-English for all code, but display text in Norwegian Bokmål. Errors can be in English, at least unknown errors.

------------------------------------------------------------------------------------------------------------------------

# Use these names for the entities:

## Core competition structure

* **competition** — The umbrella brand/series (e.g., “UEFA Champions League”).
* **edition** — One occurrence/instance (e.g., 2025 edition or a youth weekend cup).
* **stage** — Major block within an edition (e.g., Group Stage, Knockouts).
* **group** — Round-robin bucket inside a stage.
* **bracket** — Knockout/elimination structure.
* **round** — Progression step (works for group matchdays or KO rounds).
* **tie** — Two-legged KO pairing (aggregate home/away). (Not needed for now)
* **match** — The actual match between two teams.

## Participants & people

* **team** — Reusable team entity across editions.
* **person** — Reusable person record (players, staff, officials, etc.).

## Registrations & membership

* **entry** — A team’s registration into an edition.
* **team_membership** — Person ↔ team relationship (general, time-bounded).
* **squad** — Edition-specific list of eligible players for a team.
* **squad_member** — Link person into a squad (the eligible list).
* **lineup** — Match-day selection for a team. (not needed for now)
* **lineup_slot** — Row in a lineup (position/number/starter or bench). (not needed for now)
* **appearance** — A player’s participation in a match (minutes/stats).

## Logistics

* **venue** — Where matches are played.
* **official_assignment** — Referee/official crew attached to a match. (Not needed for now)

# Details and rationale

We need to introduce another entity above the edition (previously called tournament), called Competition. Editions are typically repeated every year, so we want another entity that holds the recurring information about a repeated edition. That allows a competition admin to create a new edition for a given year, weekend, or day without re-entering all the static information, and also allows us to show historical data about past competitions under the same competition umbrella.

In addition, I want teams to be reusable across competitions. A team can register for multiple competitions without re-entering all the team information each time. And a team can select a squad for each competition they register for from their the players that are members of the team. This allows team managers to reuse player information across competitions as well. The jersey number can be selected as part of the squad member entity, since players can have different numbers in different competitions.

------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

New requirements:

- A new user is allowed to create a new competition and will automatically be assigned as the competition admin.
- A competition admin is able to create new editions of the competition.
- A competition admin can manage competition settings
- A competition admin can create teams, and set up the squad for the team in editions of the competition in case the team is not able to set up the squad themselves.
- Team managers should not need to confirm or approve any results, scores, or statistics. However, we can allow them to view and challenge any discrepancies.
- The localized strings must be hard coded in the source code for now. We won't want to manage that in the application.
- Use OpenAPI 3.2 specification for API design.
- Use the Problem Details for HTTP APIs (RFC 9457) for errors in the API.

---------------------------------------------------------------------------------------------------------------------------------------------------------

Focus on good architecture and code structure. Make sure to separate concerns properly, and use best practices. Make sure we follow DRY principles. Use the https://github.com/kennethaasan/mattis repo as a reference. You are allowed to write tests after implmentation if that is easier.

---------------------------------------------------------------------------------------------------------------------------------------------------------

Fix the broken tests (npm test). Ensure the tests are set up the same way as https://github.com/kennethaasan/mattis/blob/main/tests/setup.ts to mock a database


---------------------------------------------------------------------------------------------------------------------------------------------------------
