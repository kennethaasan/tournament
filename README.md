# Football Tournament Administration App

A modern football tournament administration platform built with Next.js 16, React 19, and TypeScript. This application enables organizers to manage competitions, editions, teams, matches, and provides a real-time public scoreboard for venue displays.

## Features

- **Multi-format tournaments**: Round-robin, knockout, and hybrid formats
- **Role-based access control**: Global admins, competition admins, and team managers
- **Self-service onboarding**: Teams can register and manage their own entries
- **Live scoreboard**: Real-time public display with configurable themes
- **Match scheduling**: Automated round-robin generation and bracket seeding
- **Squad management**: Edition-specific rosters with jersey numbers
- **Notifications**: In-app and email notifications for schedule changes

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **UI**: React 19, Tailwind CSS 4, Shadcn UI
- **Language**: TypeScript 5 with strict mode
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: better-auth with session management
- **API**: OpenAPI 3.1 contract with openapi-fetch client
- **Testing**: Vitest, Testing Library, Playwright
- **Infrastructure**: AWS Lambda, Terraform

## Getting Started

### Prerequisites

- Node.js 22 (see `.nvmrc`)
- PostgreSQL 17
- Docker (optional, for local database)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start database (Docker)
npm run docker:compose:up

# Or run migrations manually
npm run db:migrate
npm run seed
```

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

### Testing

```bash
# Run unit and integration tests
npm test

# Run tests in watch mode
npm run test:watch

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui
```

### Code Quality

```bash
# Lint (Biome)
npm run lint

# Type check
npm run tsc

# Format
npm run format

# OpenAPI lint
npm run spectral
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # Authenticated dashboard routes
│   ├── (public)/           # Public routes (auth flows)
│   ├── (scoreboard)/       # Public scoreboard display
│   └── api/                # API route handlers
├── lib/                    # Shared utilities
│   ├── api/                # API client and OpenAPI types
│   ├── errors/             # RFC 9457 Problem Details
│   └── logger/             # pino logging
├── modules/                # Domain business logic
│   ├── competitions/       # Competition/Edition management
│   ├── entries/            # Team entries and squads
│   ├── scheduling/         # Match scheduling
│   └── teams/              # Team and roster management
├── server/                 # Server-side infrastructure
│   ├── api/                # API handler utilities
│   ├── auth/               # Authentication config
│   ├── db/                 # Database client and schema
│   └── email/              # Email sending (AWS SES)
├── test/                   # Test setup and factories
└── ui/                     # Reusable UI components
```

## API

The API follows REST conventions with RFC 9457 Problem Details for errors.

### Health Check

```bash
curl http://localhost:3000/api/health
```

### OpenAPI

The API contract is defined in `/openapi.yaml`. Generate TypeScript types:

```bash
npm run openapi:generate
```

## Database

### Migrations

```bash
# Generate migration from schema changes
npm run db:generate

# Apply migrations
npm run db:migrate

# Open Drizzle Studio
npm run db:studio
```

### Schema

- `users`, `sessions`, `accounts` - Authentication (better-auth)
- `competitions`, `editions`, `edition_settings` - Tournament structure
- `teams`, `persons`, `team_memberships` - Team rosters
- `entries`, `squads`, `squad_members` - Edition registrations
- `stages`, `groups`, `brackets`, `rounds` - Tournament format
- `matches`, `match_events`, `match_disputes` - Match data

## Environment Variables

See `.env.example` for all available configuration options:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Session encryption key |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Allowed origins for CORS |
| `AWS_SES_REGION` | AWS region for email sending |

## Deployment

The application is deployed to AWS Lambda using Terraform:

```bash
# Build Lambda package
npm run build:lambda

# Deploy (requires Terraform setup)
cd iac && terraform apply
```

## Contributing

1. Follow the coding conventions in `AGENTS.md`
2. Write tests for new functionality
3. Use conventional commits (`feat:`, `fix:`, `docs:`, etc.)
4. Ensure `npm run lint && npm run tsc && npm test` passes

## Architecture Decisions

- **UUID v7**: All identifiers use time-sortable UUIDs
- **RFC 9457**: API errors follow Problem Details standard
- **Norwegian UI**: User-facing text in Norwegian Bokmål
- **English API**: Developer-facing messages in English
- **OpenAPI-first**: Contract defined before implementation

## License

This project is private. See `LICENSE` for details.
