# Medline Ops

Enterprise SaaS platform for a healthcare licensing **consultancy** + **academy** company.
Monorepo: a Prisma/PostgreSQL data layer, an Express + TypeScript API (JWT auth, RBAC,
audit logging), and a Next.js 15 web app (role-aware dashboards).

> **Global rule:** `serviceType` is only ever `consultancy` or `academy`. "Both" does not
> exist in the schema, the API validation, or the UI. Legacy `both` rows are migrated to a
> flagged state (`Lead.legacyBothFlag`) for admin reassignment — never as a third enum value.

---

## Stack

| Layer    | Tech |
|----------|------|
| Web      | Next.js 15 · React 19 · TypeScript · Tailwind · React Query · Zustand · Framer Motion · Recharts |
| API      | Node.js · Express · TypeScript · Zod · JWT (+ refresh tokens) |
| Data     | PostgreSQL · Prisma |
| Infra    | Docker (Postgres) · npm workspaces |

## Repository layout

```
medline-ops/
├── docker-compose.yml         # local PostgreSQL
├── packages/db/               # Prisma schema, client, seed (9 users + RBAC)
└── apps/
    ├── api/                   # Express REST API  → http://localhost:4000/api/v1
    └── web/                   # Next.js app       → http://localhost:3000
```

---

## Getting started

Prerequisites: **Node 20+**, **Docker Desktop**.

```bash
# 1. install all workspaces
npm install

# 2. copy env files
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 3. start PostgreSQL
npm run docker:up

# 4. create the schema + generate the client + seed data
npm run db:push
npm run db:seed

# 5. run API + Web together
npm run dev
```

- Web: http://localhost:3000
- API health: http://localhost:4000/health

> On Windows PowerShell, replace `cp` with `Copy-Item`, e.g.
> `Copy-Item .env.example .env`.

### Login accounts (seeded)

| Role               | Email                              | Password |
|--------------------|------------------------------------|----------|
| Super Admin        | super_admin@medline.com            | 1001     |
| Operations Manager | operations_manager@medline.com     | 2001     |
| Sales Manager      | sales_manager@medline.com          | 3001     |
| Sales Executive    | sales_executive@medline.com        | 4001     |
| Accounts           | accounts@medline.com               | 5001     |
| Academy Head       | academy_head@medline.com           | 6001     |
| Marketing          | marketing@medline.com              | 7001     |
| Documentation      | documentation_team@medline.com     | 8001     |
| Client / Student   | client@medline.com                 | 9999     |

The login screen has one-click buttons to fill each demo account.

---

## What's implemented in this foundation

- **Auth**: login (email *or* username), JWT access tokens, DB-backed refresh-token
  rotation with session tracking, transparent refresh on the client, logout/revoke.
- **RBAC**: roles → permissions (`resource:action`) matrix seeded for all 9 roles;
  `authorize('lead:create')` route guards; Super Admin bypass.
- **Audit log**: append-only trail (actor, action, resource, old/new value, IP, UA).
- **CRM / Leads**: list + search, create with the 4-step field model, duplicate detection
  (phone/email/passport/national id), `consultancy|academy`-only enforcement at schema,
  API and UI. Sales executives are scoped to their own leads.
- **Dashboards**: role-aware sidebar (full IA for every role), executive metrics endpoint,
  KPI cards, recent-leads table. Unbuilt modules render a roadmap placeholder so the whole
  navigation is walkable.

## Modules

All major modules are implemented end-to-end (DB → API → UI), each typechecked
and boot-verified:

CRM/Leads · Consultancy (cases, documents, authority tracking, follow-ups) ·
Academy (courses, batches, students, faculty, demos) · Accounts (invoices,
payments + reconciliation, GST, refunds) · Marketing (sources, campaigns,
attribution) · Client/Student Portal · Automation Engine · Notifications ·
Role-specific Dashboards · Admin (users, roles matrix, audit viewer, settings) ·
Tasks (Kanban) · Report Builder.

Integrations are real and provider-backed, each degrading gracefully when
unconfigured (the app runs fully without them in local dev):
- **Document storage** — S3 presigned uploads (`AWS_REGION` + `S3_BUCKET`).
- **Outbound messaging** — Resend (email) + Twilio (SMS/WhatsApp), dispatched by
  the automation engine alongside the in-app notification row.

See the deployment guide §10 for setup.

## Deployment

See [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the full production guide —
managed PaaS (Vercel + Railway + Neon), single-host Docker Compose
(`docker-compose.prod.yml`), and AWS (ECS/RDS) paths, plus the env-var
reference, migration workflow, and security checklist. Production images:
`apps/api/Dockerfile`, `apps/web/Dockerfile`.

## Useful scripts

```bash
npm run dev          # API + Web concurrently
npm run dev:api      # API only
npm run dev:web      # Web only
npm run db:studio    # Prisma Studio
npm run db:seed      # re-seed
npm run docker:down  # stop Postgres
```
