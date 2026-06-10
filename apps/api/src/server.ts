import { prisma } from '@medline/db';
import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

async function start() {
  // Verify the PostgreSQL (Supabase) connection before accepting traffic.
  await prisma.$connect();
  console.log('✅ PostgreSQL connected (Supabase)');

  const server = app.listen(env.port, () => {
    console.log(`\n🚀 Medline API running at http://localhost:${env.port}`);
    console.log(`   Health:  http://localhost:${env.port}/health`);
    console.log(`   API:     http://localhost:${env.port}/api/v1\n`);
  });

  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received, shutting down...`);
    await prisma.$disconnect();
    server.close(() => process.exit(0));
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start().catch((err) => {
  console.error('❌ Failed to start API:', err);
  process.exit(1);
});
