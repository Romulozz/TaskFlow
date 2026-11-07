import { createApp } from './app.js';
import { config } from './config.js';
import { pool } from './database.js';
import { TaskRepository } from './repository.js';
const repository = new TaskRepository(pool);
try {
  await repository.ready();
  const server = createApp(repository, config.CORS_ORIGIN).listen(config.PORT, config.HOST, () => {
    console.log(`TaskFlow API: http://${config.HOST}:${config.PORT}`);
  });
  server.on('error', async () => { console.error('No se pudo iniciar el servidor HTTP.'); await pool.end(); process.exitCode = 1; });
  let closing = false;
  function shutdown() {
    if (closing) return;
    closing = true;
    const deadline = setTimeout(() => process.exit(1), 10000).unref();
    server.close(async () => { await pool.end(); clearTimeout(deadline); });
  }
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
} catch { console.error('PostgreSQL no está listo. Revisa DATABASE_URL y ejecuta npm run db:migrate.'); await pool.end(); process.exitCode = 1; }
