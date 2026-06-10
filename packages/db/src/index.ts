// ---------------------------------------------------------------------------
// @medline/db — single import surface for the entire database layer.
//
// Backed by Prisma + PostgreSQL (Supabase). All app code imports the shared
// `prisma` client plus the `Prisma` namespace and generated enums from here —
// never from @prisma/client directly.
// ---------------------------------------------------------------------------

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Load environment variables BEFORE the PrismaClient is constructed.
//
// `@prisma/client` reads DATABASE_URL / DIRECT_URL from process.env at the
// moment `new PrismaClient()` runs. Because this module can be imported before
// an app's own dotenv bootstrap (server.ts imports @medline/db on its first
// line), we load the repo-root .env here ourselves. `process.loadEnvFile`
// (Node ≥20.12) does not overwrite vars that are already set, so calling it
// here and again in the API's config/env.ts is harmless.
// ---------------------------------------------------------------------------
const here = path.dirname(fileURLToPath(import.meta.url)); // packages/db/src
for (const candidate of [
  path.resolve(here, '../../../.env'), // repo root
  path.resolve(here, '../.env'),       // packages/db/.env (optional override)
  path.resolve(process.cwd(), '.env'), // cwd fallback (e.g. apps/api)
  path.resolve(process.cwd(), '../../.env'),
]) {
  try {
    (process as NodeJS.Process & { loadEnvFile(p: string): void }).loadEnvFile(candidate);
  } catch {
    /* file absent — ignore */
  }
}

// ---------------------------------------------------------------------------
// Prisma client singleton. Reusing one instance avoids exhausting the database
// connection pool across hot reloads in development (`tsx watch`).
// ---------------------------------------------------------------------------
const globalForPrisma = globalThis as unknown as { __medlinePrisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.__medlinePrisma ?? new PrismaClient({ log: ['warn', 'error'] });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.__medlinePrisma = prisma;
}

// Re-export the generated Prisma namespace, enums (RoleName, CaseStatus, …),
// model types and PrismaClient so app code keeps importing them from
// '@medline/db' exactly as before.
export * from '@prisma/client';
