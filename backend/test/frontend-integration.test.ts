import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import { PGlite } from '@electric-sql/pglite';
import { createServer } from '../../frontend/node_modules/vite/dist/node/index.js';
import { createTaskApi } from '../../frontend/src/api.ts';
import { createApp } from '../src/app.js';
import { TaskRepository, type Database } from '../src/repository.js';

test('frontend client → Vite proxy → Express → PostgreSQL engine', async () => {
  const db = new PGlite();
  await db.exec(await readFile(new URL('../migrations/001_tasks.sql', import.meta.url), 'utf8'));
  const adapter: Database = { query: (sql, params) => db.query(sql, params) };
  const server = createApp(new TaskRepository(adapter)).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const vite = await createServer({
    root: new URL('../../frontend', import.meta.url).pathname,
    configFile: false,
    server: { host: '127.0.0.1', port: 0, proxy: { '/api': { target: `http://127.0.0.1:${address.port}`, changeOrigin: true } } },
  });
  try {
    await vite.listen();
    const endpoint = vite.httpServer!.address();
    assert.ok(endpoint && typeof endpoint !== 'string');
    const api = createTaskApi(`http://127.0.0.1:${endpoint.port}/api`);
    assert.deepEqual(await api.list(), []);
    const task = await api.create({ title: 'Integración', description: 'Cliente real por HTTP', status: 'Pending' });
    assert.match(task.id, /^[0-9a-f-]{36}$/);
    assert.equal((await api.list())[0].id, task.id);
    const edited = await api.update(task.id, { title: 'Editada', status: 'In Progress' });
    assert.equal(edited.description, 'Cliente real por HTTP');
    assert.equal(edited.status, 'In Progress');
    await api.update(task.id, { status: 'Completed' });
    const reloaded = createTaskApi(`http://127.0.0.1:${endpoint.port}/api`);
    assert.equal((await reloaded.list())[0].status, 'Completed');
    await assert.rejects(api.update(task.id, { title: '' }), /Revisa los campos/);
    await api.remove(task.id);
    assert.deepEqual(await api.list(), []);
    await assert.rejects(api.remove(task.id), /Tarea no encontrada/);
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await assert.rejects(api.list(), /error \(500\)/);
  } finally {
    await vite.close();
    if (server.listening) await new Promise<void>(resolve => server.close(() => resolve()));
    await db.close();
  }
});
