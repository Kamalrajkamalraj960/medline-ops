# Medline Ops — Production Deployment Guide

This guide takes Medline Ops from the repo to a running production deployment.
It covers three paths — pick the one that matches your team:

| Path | Best for | Effort | Cost |
|------|----------|--------|------|
| **A. Managed PaaS** (Vercel + Railway/Render + Neon) | Fastest to production, minimal ops | ★☆☆ | $ |
| **B. Docker Compose on one VM** | Full control, single box, predictable cost | ★★☆ | $$ |
| **C. AWS (ECS Fargate + RDS + S3 + CloudFront)** | Scale, compliance, multi-AZ | ★★★ | $$$ |

---

## 1. Architecture

```
                         ┌────────────────────────┐
   Browser ─────────────▶│  Web (Next.js 15)      │  :3000
                         │  standalone server      │
                         └───────────┬────────────┘
                                     │  HTTPS (NEXT_PUBLIC_API_URL)
                                     ▼
                         ┌────────────────────────┐
                         │  API (Express + tsx)    │  :4000
                         │  JWT · RBAC · audit      │
                         └───────────┬────────────┘
                                     │  DATABASE_URL (TLS)
                                     ▼
                         ┌────────────────────────┐
                         │  PostgreSQL 16          │  :5432
                         └────────────────────────┘
   (optional) AWS S3 / Cloudinary for document files
   (optional) Resend / Twilio for email · WhatsApp · SMS
```

The web app is a **pure client** of the API over HTTP — there is no server-side
coupling, so the two tiers scale and deploy independently.

---

## 2. Prerequisites

- Node.js 20+ (build) — or just Docker if using paths B/C
- A PostgreSQL 16 database (managed or self-hosted)
- A domain with the ability to create two records, e.g. `app.` and `api.`
- TLS certificates (handled automatically by Vercel/Railway/Caddy; via ACM on AWS)

---

## 3. Environment variables

| Variable | Tier | Example | Notes |
|----------|------|---------|-------|
| `DATABASE_URL` | API | `postgresql://user:pass@host:5432/medline_ops?schema=public&sslmode=require` | Add `sslmode=require` for managed DBs |
| `API_PORT` | API | `4000` | |
| `NODE_ENV` | API | `production` | Enables prod logging/security |
| `JWT_ACCESS_SECRET` | API | _(48-byte random)_ | `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | API | _(48-byte random)_ | **Different** from access secret |
| `JWT_ACCESS_TTL` | API | `15m` | Short — access tokens auto-refresh |
| `JWT_REFRESH_TTL_DAYS` | API | `7` | Session lifetime |
| `CORS_ORIGIN` | API | `https://app.medline.example` | The public web URL (exact origin) |
| `NEXT_PUBLIC_API_URL` | Web | `https://api.medline.example/api/v1` | **Baked at build time** — must include `/api/v1` |

> 🔐 **Rotate the JWT secrets** away from the dev defaults. Anyone with the
> access secret can mint valid tokens. Store them in your platform's secret
> manager, never in git.

---

## 4. Database migrations (do this once, before any deploy)

The repo ships with the Prisma **schema** but no migration history yet. Create
the initial migration locally and commit it so production applies it
deterministically:

```bash
# Point at a dev/staging database first
export DATABASE_URL="postgresql://medline:medline@localhost:5432/medline_ops?schema=public"

# Generates packages/db/prisma/migrations/<timestamp>_init/  — COMMIT THIS
npm run db:migrate -w @medline/db -- --name init
git add packages/db/prisma/migrations && git commit -m "chore(db): initial migration"
```

In every environment thereafter, apply migrations with:

```bash
npx prisma migrate deploy --schema packages/db/prisma/schema.prisma
```

The provided API Dockerfile runs `migrate deploy` automatically on container
start. For a throwaway preview environment you can instead use
`npx prisma db push` (no migration files needed) — never in production.

**Seeding production:** the seed creates the 9 named accounts and a demo client
journey. Run it **once** on first deploy, then change the seeded passwords:

```bash
npm run db:seed -w @medline/db
```

> ⚠️ The seeded passwords (`1001`…`9999`) are demo credentials. On a real
> deployment, either skip the seed and create users via the admin UI, or seed
> then immediately reset every password from **Admin → Users**.

---

## 5. Path A — Managed PaaS (recommended)

### 5.1 Database — Neon or Railway Postgres
1. Create a Postgres 16 instance. Copy its connection string (with `sslmode=require`).
2. From your machine, set `DATABASE_URL` to it and run the migration + seed (§4).

### 5.2 API — Railway / Render
1. New service from the repo. Root: the monorepo. Build command:
   ```bash
   npm ci && npx prisma generate --schema packages/db/prisma/schema.prisma
   ```
2. Start command:
   ```bash
   npx prisma migrate deploy --schema packages/db/prisma/schema.prisma && npm run start:prod -w @medline/api
   ```
3. Set env vars: `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`,
   `NODE_ENV=production`, `CORS_ORIGIN=https://app.medline.example`, `API_PORT=4000`.
4. Note the public URL, e.g. `https://medline-api.up.railway.app`.

### 5.3 Web — Vercel
1. Import the repo. Set **Root Directory** to `apps/web`.
2. Vercel auto-detects Next.js. Add the env var
   `NEXT_PUBLIC_API_URL=https://medline-api.up.railway.app/api/v1`.
3. Deploy. Point your `app.` domain at the Vercel project.
4. Go back to the API and set `CORS_ORIGIN` to the final web domain.

That's it — three managed services, auto-TLS, auto-scaling on the web tier.

---

## 6. Path B — Docker Compose on one VM

A single host runs Postgres + API + Web. Good for a dedicated server or a small
cloud VM (2 vCPU / 4 GB is plenty to start).

```bash
# On the server
git clone <your-repo> && cd medline-ops
cp .env.prod.example .env.prod
# Edit .env.prod: strong DB password, fresh JWT secrets, your public URLs
nano .env.prod

docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

This builds both images, starts Postgres, runs `migrate deploy` automatically,
and brings up the API (`:4000`) and Web (`:3000`).

**Seed once:**
```bash
docker compose -f docker-compose.prod.yml exec api npm run db:seed -w @medline/db
```

### 6.1 TLS / reverse proxy
Put a reverse proxy in front for HTTPS and to route `app.` → web and `api.` →
API. Caddy makes this a two-block file with automatic Let's Encrypt:

```caddyfile
app.medline.example {
    reverse_proxy localhost:3000
}
api.medline.example {
    reverse_proxy localhost:4000
}
```

Then set in `.env.prod`: `PUBLIC_WEB_URL=https://app.medline.example` and
`PUBLIC_API_URL=https://api.medline.example/api/v1`, and rebuild the web image
(the API URL is baked at build time).

---

## 7. Path C — AWS (outline)

For scale and compliance:

- **RDS for PostgreSQL** (Multi-AZ) — managed DB with automated backups.
- **ECS Fargate** — two services (api, web) from the Dockerfiles, behind an
  **Application Load Balancer**. Path/host routing: `api.` → api target group,
  `app.` → web target group.
- **Secrets Manager** — `JWT_*` and `DATABASE_URL`; injected as task secrets.
- **ECR** — push the two images in CI; ECS pulls them.
- **ACM + CloudFront** (optional) — CDN + TLS for the web tier; or terminate TLS
  at the ALB.
- **S3** — document storage once file uploads are wired (see §10).

Build & push images:
```bash
docker build -f apps/api/Dockerfile -t <ecr>/medline-api:$(git rev-parse --short HEAD) .
docker build -f apps/web/Dockerfile --build-arg NEXT_PUBLIC_API_URL=https://api.medline.example/api/v1 \
  -t <ecr>/medline-web:$(git rev-parse --short HEAD) .
```
Run `migrate deploy` as a one-off ECS task (or the api task's entrypoint, as the
Dockerfile already does).

---

## 8. Post-deploy verification

```bash
# API health
curl https://api.medline.example/health
# → {"status":"ok","service":"medline-api",...}

# Auth round-trip
curl -X POST https://api.medline.example/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"identifier":"super_admin@medline.com","password":"1001"}'
# → { accessToken, refreshToken, user }
```

Then open the web URL, log in as each role, and confirm role-specific dashboards
load. Check **Admin → Audit Logs** to see your logins recorded.

---

## 9. Security hardening checklist

- [ ] Fresh, unique `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (48+ bytes).
- [ ] All seeded demo passwords reset (or seed skipped on prod).
- [ ] `DATABASE_URL` uses TLS (`sslmode=require`) and a least-privilege DB user.
- [ ] `CORS_ORIGIN` set to the exact web origin (no wildcards).
- [ ] HTTPS everywhere; HTTP redirects to HTTPS at the proxy/CDN.
- [ ] DB and API not publicly reachable except through the proxy/LB / private network.
- [ ] Rate limiting confirmed (the API ships global + auth-specific limiters in `app.ts`).
- [ ] Secrets stored in a secret manager, not env files in git.
- [ ] Backups enabled (§11) and a restore tested.
- [ ] Audit logging retained (every mutating action already writes `AuditLog`).

Built-in protections already present: `helmet` security headers, CORS allow-list,
`express-rate-limit` (300 req/min global, 20/min on `/auth`), bcrypt password
hashing, DB-backed refresh-token rotation with revocation, Zod input validation,
and Prisma parameterized queries (no SQL injection surface).

---

## 10. Integrations

### 10.1 File uploads — S3 (implemented)

Document uploads use a **presigned-PUT** flow: the API issues a short-lived
(5 min) presigned URL, the browser uploads the file **directly to S3**, then
records the object key against the document. Files are private; viewing uses a
presigned GET. This is wired for both the documentation team
(`/consultancy/documents/:id/{presign,download}`) and the client portal
(`/portal/documents/:id/{presign,download}`).

To enable it, set on the **API**:

```
AWS_REGION=ap-south-1
S3_BUCKET=medline-documents-prod
# credentials via IAM role (preferred) or AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
```

If these are unset, presign endpoints return `503 STORAGE_UNCONFIGURED` and the
rest of the app runs normally (handy for local dev without AWS).

**Required bucket setup:**
1. **Block all public access** — objects are served only via presigned URLs.
2. **CORS** — the browser PUTs directly to S3, so the bucket must allow it from
   your web origin:
   ```json
   [{
     "AllowedOrigins": ["https://app.medline.example"],
     "AllowedMethods": ["PUT", "GET"],
     "AllowedHeaders": ["*"],
     "ExposeHeaders": ["ETag"],
     "MaxAgeSeconds": 3000
   }]
   ```
3. **IAM** — grant the API role `s3:PutObject` and `s3:GetObject` on
   `arn:aws:s3:::medline-documents-prod/*` (least privilege).
4. Optionally a lifecycle rule to expire/transition old document versions.

### 10.2 Outbound channels — email · SMS · WhatsApp (implemented)

The automation actions `SEND_EMAIL / SMS / WHATSAPP` send through real providers
(`apps/api/src/lib/messaging.ts`) **and** record the in-app `Notification` row.
Sends are dispatched to each resolved recipient's `email` / `phone`. Any
unconfigured provider is skipped gracefully (the in-app row is still written and
the automation never fails).

```
# Email — Resend
RESEND_API_KEY=re_xxx
EMAIL_FROM="Medline Ops <noreply@medline.example>"   # domain must be verified in Resend

# SMS + WhatsApp — Twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxx
TWILIO_SMS_FROM=+14155550100
TWILIO_WHATSAPP_FROM=+14155550100   # a WhatsApp-enabled Twilio sender
```

Notes:
- Recipients are internal staff (resolved as `lead_owner`, `managers`, `actor`,
  or an explicit user id) — ensure those users have an `email`/`phone` set.
- For WhatsApp, the recipient must have opted in / be within a session window per
  WhatsApp Business rules; otherwise use an approved template.
- Senders are HTTP calls with no extra SDK dependency, so they add no cold-start
  weight. They never throw into the automation path — failures are logged in the
  action's audit result string.

To add a channel or swap providers, edit `lib/messaging.ts` only.

---

## 11. Backups & disaster recovery

- **Managed DB:** enable automated daily snapshots + point-in-time recovery
  (Neon, RDS, Railway all support this).
- **Self-hosted:** schedule `pg_dump`:
  ```bash
  docker compose -f docker-compose.prod.yml exec -T postgres \
    pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > backup-$(date +%F).sql.gz
  ```
  Ship dumps off-box (S3/object storage). **Test a restore quarterly.**

---

## 12. Scaling & performance

- **Web** scales horizontally trivially (stateless standalone server) — add
  instances behind the LB/CDN.
- **API** is stateless except for DB-backed sessions, so it scales horizontally
  too. Put it behind the LB and run N replicas.
- **Database** is the bottleneck to watch. The schema already has indexes on hot
  paths (lead status/serviceType/owner/phone/email, case status/authority, audit
  resource/createdAt, etc.). Add read replicas and a connection pooler
  (PgBouncer / Neon pooling) as load grows. Targets from spec: 100k+ leads, 50k+
  clients, 10k+ students, 1k+ concurrent users.
- Add a CDN in front of the web tier for static assets.

---

## 13. CI/CD (GitHub Actions outline)

A minimal pipeline:

```yaml
# .github/workflows/ci.yml
name: ci
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx prisma generate --schema packages/db/prisma/schema.prisma
      - run: npx tsc -p apps/api/tsconfig.json --noEmit
      - run: npx tsc -p apps/web/tsconfig.json --noEmit
      - run: npm run build -w @medline/web
```

On `main`, add jobs to build+push the two Docker images and trigger your
platform's deploy (Railway/Render webhook, or `aws ecs update-service`).

---

## 14. Rollback

- **PaaS:** redeploy the previous build/commit from the platform dashboard.
- **Docker:** keep the previous image tag; `docker compose ... up -d` with the
  old tag. Database migrations are forward-only — never auto-rollback a
  migration in prod; ship a new corrective migration instead.

---

## Quick reference

```bash
# Local full stack (dev)
npm install
docker compose up -d                 # Postgres
npm run db:push && npm run db:seed
npm run dev                          # API :4000 + Web :3000

# Production single-host
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
docker compose -f docker-compose.prod.yml exec api npm run db:seed -w @medline/db
```
