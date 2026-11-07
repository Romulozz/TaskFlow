import { readFile } from 'node:fs/promises';
import { pool } from './database.js';
try {
  const sql = await readFile(new URL('../migrations/001_tasks.sql', import.meta.url), 'utf8');
  const client = await pool.connect();
  try { await client.query('BEGIN'); await client.query(sql); await client.query('COMMIT'); console.log('Migración 001 aplicada.'); }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
} catch { console.error('No se pudo aplicar la migración. Revisa la conexión y los permisos de PostgreSQL.'); process.exitCode = 1; }
finally { await pool.end(); }
