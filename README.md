# Lawfirm Management System (LMS)

Internal legal operations platform built on Next.js 16, tRPC, and PocketBase.

## What This Repo Contains

- Case management flows
- Client management and client history
- Ledger and invoice workflows
- Personnel tracking
- Marketing campaign tracking
- Role-based authorization helpers
- PocketBase-backed auth/session and data access

## Tech Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- tRPC 11 + TanStack Query
- PocketBase
- Tailwind CSS 4 + Radix UI components
- Bun for package management and runtime in container

## Prerequisites

- Node.js 20+
- Bun 1.2+
- Access to a PocketBase instance
- Backblaze B2 bucket (if file storage is enabled)

## Quick Start

1. Install dependencies:

```bash
bun install
```

1. Create local environment file:

```bash
cp .env.example .env
```

1. Fill required values in .env.

1. Start development server:

```bash
bun run dev
```

1. Open <http://localhost:3000>.

## Environment Variables

Start from .env.example.

Required PocketBase variables:

- POCKETBASE_URL
- POCKETBASE_SUPERUSER_EMAIL
- POCKETBASE_SUPERUSER_PASSWORD

Required auth variable:

- LMS_AUTH_SECRET

Backblaze B2 (server side):

- B2_ENDPOINT
- B2_REGION
- B2_KEY_ID
- B2_APP_KEY
- B2_BUCKET

Public CDN value:

- NEXT_PUBLIC_B2_CDN_URL

## PocketBase Initialization

The app expects required collections to be provisioned in PocketBase.

Optional health/init check script:

```bash
bun run setup:pocketbase
```

## Package Scripts

- bun run dev - Start local dev server
- bun run build - Production build
- bun run start - Start production server
- bun run lint - Run Next.js linting

## Docker

The repo includes a multi-stage Dockerfile and docker-compose.yml.

Build and run with compose:

```bash
docker compose up -d --build
```

Notes:

- Build stage runs next build under Node.js 20.
- Runtime stage uses Bun and serves standalone Next.js output.
- Compose can run both LMS and PocketBase together for local/Coolify setups.
- Runtime PocketBase and secret vars are provided from .env.

## VPS Deployment (Direct From Repo)

If you deploy by cloning/pulling this repo directly on your VPS:

1. Clone the repository on the VPS.
1. Create your `.env` from `.env.example` and fill required values.
1. Run:

```bash
bun run deploy:vps
```

This command uses `docker-compose.vps.yml` to build locally and start containers:

- builds LMS from the current checked-out source
- recreates containers in detached mode
- removes orphaned containers

## High-Level Project Layout

```text
app/                 Next.js App Router routes and pages
components/          Shared UI, forms, dialogs, and layout pieces
hooks/               Client-side React hooks
lib/                 Integrations, auth/session, utilities, RBAC helpers
server/              tRPC server context and routers
scripts/             Utility scripts
styles/              Global styling assets
```

## Contributing

1. Branch from your working base.
2. Keep changes scoped and reviewable.
3. Run bun run lint before opening a PR.
4. Include notes for schema or environment changes.

## Operational Notes

- This repository intentionally does not include a .gitignore.
- If a directory must exist before it has domain files, use a .gitkeep file.
