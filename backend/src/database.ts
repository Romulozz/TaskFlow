import pg from 'pg';
import { config } from './config.js';
export const pool = new pg.Pool({ connectionString: config.DATABASE_URL, max: 10, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000, statement_timeout: 10000 });
pool.on('error', () => console.error('Se perdió una conexión inactiva con PostgreSQL.'));
