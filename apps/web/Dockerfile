# Medline Web (Next.js) — production image using standalone output.
# Build context MUST be the repo root:  docker build -f apps/web/Dockerfile .
# NEXT_PUBLIC_API_URL is baked at BUILD time (it ships to the browser), so it
# must be passed as a build-arg:  --build-arg NEXT_PUBLIC_API_URL=https://api.example.com/api/v1
# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app

# ---- deps ----
FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/db/package.json packages/db/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci

# ---- build ----
FROM base AS build
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Prisma client is a transitive dep of @medline/db; generate so the build resolves it.
RUN npx prisma generate --schema packages/db/prisma/schema.prisma \
 && npm run build -w @medline/web

# ---- runtime (minimal standalone server) ----
FROM base AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
