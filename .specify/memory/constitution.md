<!--
Sync Impact Report
- Version change: N/A -> 1.0.0
- Modified principles:
  - Quality-Driven TypeScript Craft
  - Evidence-Backed Testing Discipline
  - Inclusive, Consistent Experience
  - Performance-Conscious Delivery
- Added sections:
  - Delivery Guardrails
  - Specification & Task Alignment
- Removed sections:
  - Placeholder Principle 5 slot
- Templates requiring updates:
  - updated .specify/templates/plan-template.md
  - updated .specify/templates/spec-template.md
  - updated .specify/templates/tasks-template.md
- Follow-up TODOs: None
-->

# Football Tournament Administration App Constitution

## Core Principles

### Quality-Driven TypeScript Craft
- Code contributions MUST build under the repository's strict TypeScript 5 configuration, handling
  all `undefined` paths mandated by `noUncheckedIndexedAccess`, and adhere to the 2-space indent,
  type-only imports, and naming conventions captured in `AGENTS.md`.
- Engineers MUST run `npm run lint`, `npm run tsc`, and `npm run build` locally before requesting
  review, resolving Biome, type, or bundling issues instead of ignoring rules or suppressing errors.
- Modules MUST surface failures with actionable `Error` instances or typed `Result` objects and
  record operational events through the shared `pino` logger; `console.*` usage is forbidden.
*Rationale:* Preserving disciplined TypeScript and logging practices keeps the modernized codebase
consistent, reviewable, and production-safe.

### Evidence-Backed Testing Discipline
- Every functional or visual change MUST ship with automated coverage: Vitest unit/integration
  exercises for logic, Playwright E2E flows for user journeys, and regenerated contract tests when
  the OpenAPI schema changes.
- Tests MUST assert behavior through accessible selectors (`getByRole`, `getByLabel`, etc.) and
  await concrete UI states; brittle timeouts, floating promises, or unhandled rejections are not
  permitted.
- Pull requests MUST maintain or improve repository coverage thresholds defined in
  `vitest.config.ts`, and failures in CI's lint, type, unit, or E2E stages block merges.
*Rationale:* Shipping only with demonstrable, automated proof guards against regressions while the
legacy Laravel system is replaced feature by feature.

### Inclusive, Consistent Experience
- UI implementations MUST honor the accessibility playbook: semantic HTML, WCAG 2.2 AA compliance,
  predictable keyboard focus, consistent navigation order, and Tailwind-based design tokens applied
  via shared components.
- Server and client responsibilities MUST follow the Next.js App Router contract, render shared
  layouts with Server Components, isolate interactivity in `'use client'` modules, and avoid
  duplicated state or divergent experiences between routes.
- Copy, interactions, and feedback MUST remain consistent across the tournament flows; if a pattern
  exists in `src/`, extend it before introducing variants.
*Rationale:* A modernized experience only succeeds if every screen behaves predictably for all
participants, including people using assistive technology.

### Performance-Conscious Delivery
- Features MUST define and honor quantitative budgets in specs (e.g., <200 ms server render,
  <2 s Largest Contentful Paint, responsive hydration), enforcing them through instrumentation or
  automated checks before release.
- Engineers MUST favor Server Components, streaming, caching, and Suspense to minimize client
  JavaScript and ship only the CSS and data each route needs; lazy-load heavy dependencies and
  measure bundle impact with Next.js analytics.
- Database and API interactions MUST reuse generated clients, batch requests where practical, and
  ensure `npm run seed` remains deterministic for reproducible performance tests.
*Rationale:* The modernization effort must feel faster than the legacy app and scale with tournament
growth without costly rewrites.

## Delivery Guardrails
- Treat `npm run lint`, `npm run tsc`, `npm run build`, and `npm test` (with coverage) as required
  quality gates before review; pre-commit hooks SHOULD mirror these checks locally.
- When dependencies change, engineers MUST justify the addition, update engines, and rerun lint,
  type, and test suites; generated artifacts (`dist/`, `.next/`, `reports/`) remain untouched.
- OpenAPI changes MUST be reflected in `/openapi.yaml`, followed by `npm run openapi:generate` and
  regeneration of typed clients before any API-facing merge.
- Database evolution flows through `npm run seed`, `db:generate`, and `db:migrate`; never run tests
  in parallel with seeding to avoid data drift.

## Specification & Task Alignment
- Feature specs MUST capture code-quality acceptance criteria (lint, type, logging expectations),
  test matrices (unit, integration, E2E responsibilities), UX accessibility requirements, and
  performance budgets derived from these principles.
- Implementation plans MUST pass a Constitution Check confirming the enforcement strategy for each
  principle, including tooling, measurement, and review accountability.
- Task breakdowns MUST keep user stories independently deliverable, enumerate mandatory tests per
  story, and schedule validation steps for accessibility and performance outcomes before polish.
- Checklists and research outputs SHOULD reference the relevant principle identifiers so reviewers
  can trace how each deliverable satisfies governance.

## Governance
- The maintainers stewarding the Next.js modernization ratify and amend this constitution. Amendments
  require consensus from those maintainers, an explicit version bump in this document, and updates to
  affected templates or guidance files within the same change.
- Semantic versioning applies: introduce new principles or mandatory sections with a MINOR bump;
  redefine or retire principles with a MAJOR bump; clarifications without behavioral change use
  PATCH.
- Each significant plan, spec, PR, and release review MUST document compliance with the Core
  Principles, Delivery Guardrails, and Specification requirements. Non-compliance blocks release
  until remediated.

**Version**: 1.0.0 | **Ratified**: 2025-11-05 | **Last Amended**: 2025-11-05
