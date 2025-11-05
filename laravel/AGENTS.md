# Laravel Guidelines

This is the legacy application that you **NEVER** need to touch unless explicitly asked to.

## Project Structure & Module Organization
- Legacy Laravel 4 + Angular code lives in `/`.
- Backend domain logic sits in `app`, split into `controllers`, `models`, `views`, and `database` migrations/seeds.
- Front-end assets live in `public`; Angular modules are in `public/js`, templates in `public/partials`, and styles in `public/css`.
- Tests reside in `app/tests`; data fixtures and seeds are under `app/database`.
- The root `README.md` tracks the planned Next.js rewrite; keep any new modernization work in clearly named top-level folders to avoid mixing with legacy code.

## Build, Test & Development Commands
- `docker-compose up -d nginx mysql phpmyadmin workspace`: start Laradock services required by the legacy stack.
- `docker-compose exec workspace bash`: enter the PHP 5.6 workspace container.
- `composer install`: install Laravel dependencies inside the workspace.
- `php artisan migrate` then `php artisan migrate:refresh && php artisan db:seed`: initialize the schema and load sample data.
- `php artisan serve --port=8000`: run the app locally; the UI responds at `http://localhost:8000`.

## Coding Style & Naming Conventions
- Follow PSR-2 for PHP: 4-space indentation, braces on new lines, StudlyCaps classes, camelCase methods, and `*Controller` suffixes.
- Blade views in `app/views` should match controller return values; reuse partials instead of duplicating markup.
- Angular scripts in `public/js` use single quotes, semicolons, and 4-space indentation; module names stay dot-separated (`app.services`).
- Database tables follow the existing singular naming; align new migrations and seeders with the legacy schema.

## Testing Guidelines
- Feature and unit tests belong in `app/tests`; name files `SomethingTest.php` to keep phpunit discovery working.
- Run suites with `vendor/bin/phpunit` from the workspace shell so the bundled `phpunit.xml` is honored.
- Document any required seeding in test descriptions; prefer deterministic factories over raw SQL dumps.
- Ship at least one regression or characterization test with each behavioral change.

## Commit & Pull Request Guidelines
- Keep commit subjects short, present-tense, and lower-case (e.g., `fix mistakes`, `update from 2025`).
- Isolate refactors from features when possible and explain why if they must land together.
- Pull requests need a concise summary, setup steps, and linked issues or spec-kit tasks; include UI screenshots for Angular updates.
- State the result of `vendor/bin/phpunit` or other relevant commands in the PR description and call out follow-up chores when deferring work.
