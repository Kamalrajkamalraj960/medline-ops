import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

const server = app.listen(env.port, () => {
  console.log(`\n🚀 Medline API running at http://localhost:${env.port}`);
  console.log(`   Health:  http://localhost:${env.port}/health`);
  console.log(`   API:     http://localhost:${env.port}/api/v1\n`);
});

const shutdown = (signal: string) => {
  console.log(`\n${signal} received, shutting down...`);
  server.close(() => process.exit(0));
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
