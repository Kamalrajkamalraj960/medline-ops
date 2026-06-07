# Medline API — production image.
# Build context MUST be the repo root:  docker build -f apps/api/Dockerfile .
# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
# Prisma's query engine needs OpenSSL on Alpine.
RUN apk add --no-cache openssl

# ---- deps: install workspace dependencies (cached on manifest changes) ----
FROM base AS deps
COPY package.json package-lock.json* ./
COPY packages/db/package.json packages/db/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci

# ---- build: generate the Prisma client ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate --schema packages/db/prisma/schema.prisma

# ---- runtime ----
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 4000

# Apply migrations, then start the API (runs via tsx — see start:prod).
# Swap `migrate deploy` for `db push` only in throwaway environments.
CMD ["sh", "-c", "npx prisma migrate deploy --schema packages/db/prisma/schema.prisma && npm run start:prod -w @medline/api"]
