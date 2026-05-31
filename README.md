# Lawfirm Management System (LMS)

Lawfirm Management System is a self-hosted internal operations platform for law firms. It combines case management, client records, billing, personnel, marketing, and file storage in one application, with PocketBase providing authentication and data persistence.

## Overview

The application is built as a modern Next.js App Router project and is designed to support day-to-day legal operations with a strong focus on structured workflows and role-based access control.

Core areas of the product include:

- Case management with assigned attorneys, status tracking, and searchable records
- Client management with client history, related cases, and file attachments
- Ledger and invoice workflows, including retainer tracking and summaries
- Personnel and team management with invitation flows
- Marketing campaign tracking and performance visibility
- Authentication and session handling backed by PocketBase
- Backblaze B2 integration for object storage and CDN delivery

## Tech Stack

- Next.js 16 with the App Router
- React 19 and TypeScript
- tRPC 11 and TanStack Query
- PocketBase for authentication and database access
- Tailwind CSS 4 and Radix UI primitives
- Framer Motion for motion and page transitions
- Bun for package management and the container runtime

## Requirements

- Node.js 20 or newer
- Bun 1.2 or newer
- A running PocketBase instance
- Backblaze B2 credentials if file uploads are enabled

## Getting Started

1. Install dependencies:

```bash
bun install
```

1. Copy the example environment file:

```bash
cp .env.example .env
```

1. Fill in the required values in `.env`.

1. Start the development server:

```bash
bun run dev
```

1. Open <http://localhost:3000>.

## Environment Variables

Start from `.env.example` and adjust the values to match your environment.

### PocketBase

- `POCKETBASE_URL` - PocketBase API URL used by the app and server-side helpers
- `POCKETBASE_PUBLIC_URL` - Public PocketBase URL used in the VPS reverse-proxy setup
- `POCKETBASE_SUPERUSER_EMAIL` - PocketBase admin email used for server-side access
- `POCKETBASE_SUPERUSER_PASSWORD` - PocketBase admin password used for server-side access

### LMS Session Handling

- `LMS_AUTH_SECRET` - Secret used to sign and verify LMS session cookies

### Backblaze B2

These are used on the server side for uploads and signed object access:

- `B2_ENDPOINT`
- `B2_REGION`
- `B2_KEY_ID`
- `B2_APP_KEY`
- `B2_BUCKET`

### Public CDN

- `NEXT_PUBLIC_B2_CDN_URL` - Public CDN base URL for files stored in B2

## PocketBase Setup

The application expects the required PocketBase collections to exist before it can be used in production. If you need to verify or initialize the PocketBase side of the installation, run:

```bash
bun run setup:pocketbase
```

This script is safe to run against a host-reachable PocketBase instance during local or VPS setup.

## Available Scripts

- `bun run dev` - Start the development server
- `bun run build` - Create a production build
- `bun run start` - Start the production server
- `bun run lint` - Run ESLint with zero warnings allowed
- `bun run setup:pocketbase` - Check or initialize PocketBase data requirements
- `bun run deploy:vps` - Build and deploy the Docker stack defined in `docker-compose.vps.yml`

## Docker

The repository includes a multi-stage `Dockerfile` and a standard `docker-compose.yml` for local or self-hosted deployment.

To build and start the default compose stack:

```bash
docker compose up -d --build
```

What this setup does:

- Builds LMS in a Node.js 20 stage
- Runs the production container with Bun
- Starts PocketBase alongside the app by default
- Persists PocketBase data in the named volume `pocketbase_data`

In the default compose setup, LMS can reach PocketBase through the internal service name `pb_lms`.

## VPS Deployment

For a direct VPS deployment from the checked-out repository, use the provided script:

```bash
bun run deploy:vps
```

This command runs `docker compose -f docker-compose.vps.yml up -d --build --force-recreate --remove-orphans` and is intended for pull-and-build deployments on your server.

### VPS Networking Notes

- If PocketBase runs on the same VPS host, `POCKETBASE_URL` must point to a host-reachable address.
- In `docker-compose.vps.yml`, URL precedence is: `POCKETBASE_URL` -> `POCKETBASE_PUBLIC_URL` -> `http://pb_lms`.
- If your PocketBase enforces HTTPS for auth, prefer setting `POCKETBASE_URL` (or `POCKETBASE_PUBLIC_URL`) to your reverse-proxied HTTPS endpoint.
- For Docker deployments, do not use `localhost`, `127.0.0.1`, or `0.0.0.0` unless the service is reachable from inside the LMS container.
- When running `bun run setup:pocketbase` directly on the host, use a host-accessible URL such as `http://127.0.0.1:8090`.

### HTTPS + `/lms` Subpath

The `docker-compose.vps.yml` file supports reverse-proxy deployment with PocketBase behind a `/lms` subpath.

Typical values look like this:

```bash
POCKETBASE_URL=https://api.example.com/lms
POCKETBASE_PUBLIC_URL=https://api.example.com/lms
```

In that setup, your reverse proxy forwards the LMS app on one host name and PocketBase on a `/lms` subpath of another host name.

## Project Structure

```text
app/                 App Router pages, layouts, and route handlers
components/          Shared UI, forms, dialogs, and layout components
hooks/               Client-side React hooks
lib/                 Auth, storage, PocketBase, query client, and utilities
server/              tRPC context and routers
scripts/             Utility scripts
styles/              Global styles
public/              Static assets
```

## Contributing

1. Keep changes focused and easy to review.
2. Update environment or setup notes whenever a change affects deployment.
3. Run `bun run lint` before opening a pull request.
4. Include any PocketBase schema or data migration notes with the change.
