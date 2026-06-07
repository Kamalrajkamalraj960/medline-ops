// Boots a portable PostgreSQL (no Docker/admin needed) for local runs.
// Keeps running until killed; data persists in .pgdata/.
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import path from 'node:path';

const dir = path.resolve('.pgdata');
const pg = new EmbeddedPostgres({
  databaseDir: dir,
  user: 'medline',
  password: 'medline',
  port: 5432,
  persistent: true,
  authMethod: 'password',
  onLog: () => {},
  onError: (e) => console.error('[pg]', e instanceof Error ? e.message : e),
});

const fresh = !existsSync(path.join(dir, 'PG_VERSION'));
if (fresh) {
  console.log('initialising postgres cluster...');
  await pg.initialise();
}
await pg.start();
try {
  await pg.createDatabase('medline_ops');
  console.log('created database medline_ops');
} catch {
  console.log('database medline_ops already exists');
}
console.log('DB_READY');

const shutdown = async () => {
  try { await pg.stop(); } catch { /* noop */ }
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
setInterval(() => {}, 1 << 30); // keep alive
