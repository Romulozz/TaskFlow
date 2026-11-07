import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { TaskRepository, type Database } from '../src/repository.js';
let db: PGlite;
let directory: string;
const adapter: Database = { query: (sql, params) => db.query(sql, params) };
const app = createApp(new TaskRepository(adapter));
before(async () => {
  directory = await mkdtemp(join(tmpdir(), 'taskflow-test-'));
  db = new PGlite(directory);
  const migration = await readFile(new URL('../migrations/001_tasks.sql', import.meta.url), 'utf8');
  await db.exec(migration);
  await db.exec(migration); // Initial migration is safe to rerun.
});
after(async () => { await db.close(); await rm(directory, { recursive: true, force: true }); });
test('CRUD, partial updates and persistence after database restart', async () => {
  await request(app).get('/api/tasks').expect(200, []);
  const created = await request(app).post('/api/tasks').send({ title: '  Mi tarea  ', description: 'Detalles' }).expect(201);
  const task = created.body;
  assert.equal(task.title, 'Mi tarea');
  assert.equal(task.status, 'Pending');
  assert.ok(!isNaN(Date.parse(task.createdAt)));
  assert.equal(created.headers.location, `/api/tasks/${task.id}`);
  const patched = await request(app).patch(`/api/tasks/${task.id}`).send({ status: 'In Progress' }).expect(200);
  assert.equal(patched.body.title, 'Mi tarea');
  assert.equal(patched.body.description, 'Detalles');
  await request(app).patch(`/api/tasks/${task.id}`).send({ title: 'Terminada', description: '', status: 'Completed' }).expect(200);
  await db.close(); db = new PGlite(directory);
  const restored = await request(app).get(`/api/tasks/${task.id}`).expect(200);
  assert.equal(restored.body.status, 'Completed');
  assert.equal(restored.body.description, '');
  assert.equal(restored.body.createdAt, task.createdAt);
  assert.equal((await request(app).get('/api/tasks').expect(200)).body.length, 1);
  await request(app).delete(`/api/tasks/${task.id}`).expect(204);
  await request(app).get(`/api/tasks/${task.id}`).expect(404);
  await request(app).delete(`/api/tasks/${task.id}`).expect(404);
  await request(app).get('/api/tasks').expect(200, []);
});
test('rejects invalid fields, unknown properties and empty patches', async () => {
  for (const body of [{}, { title: '  ' }, { title: 7 }, { title: 'a'.repeat(121) }, { title: 'OK', description: 'a'.repeat(2001) }, { title: 'OK', status: 'Done' }, { title: 'OK', id: 'injected' }, { title: 'OK', description: null }]) {
    const response = await request(app).post('/api/tasks').send(body).expect(400);
    assert.equal(response.body.error.code, 'VALIDATION_ERROR');
  }
  await request(app).patch('/api/tasks/11111111-1111-4111-8111-111111111111').send({}).expect(400);
  await request(app).patch('/api/tasks/11111111-1111-4111-8111-111111111111').send({ status: 'Completed' }).expect(404);
  for (const method of ['get', 'patch', 'delete'] as const) await request(app)[method]('/api/tasks/not-a-uuid').send({ title: 'OK' }).expect(400);
});
test('JSON and payload errors, liveness, readiness and CORS', async () => {
  await request(app).post('/api/tasks').set('Content-Type', 'application/json').send('{oops').expect(400);
  await request(app).post('/api/tasks').send({ title: 'a'.repeat(17000) }).expect(413);
  await request(app).get('/health').expect(200, { status: 'ok' });
  await request(app).get('/ready').expect(200, { status: 'ok' });
  await request(app).get('/missing').expect(404);
  const response = await request(app).options('/api/tasks').set('Origin', 'http://localhost:5173').set('Access-Control-Request-Method', 'PATCH').expect(204);
  assert.equal(response.headers['access-control-allow-origin'], 'http://localhost:5173');
  const unavailable = createApp(new TaskRepository({ query: async () => { throw new Error('private database details'); } }));
  await request(unavailable).get('/ready').expect(503);
  const failure = await request(unavailable).get('/api/tasks').expect(500);
  assert.equal(failure.body.error.code, 'INTERNAL_ERROR');
  assert.ok(!JSON.stringify(failure.body).includes('private database details'));
});
test('SQL metacharacters are stored as text and database constraints apply', async () => {
  const title = "'; DROP TABLE tasks; --";
  const result = await request(app).post('/api/tasks').send({ title }).expect(201);
  assert.equal(result.body.title, title);
  await assert.rejects(db.query("INSERT INTO tasks (id, title, status) VALUES ('11111111-1111-4111-8111-111111111111', 'bad', 'Unknown')"));
  await request(app).get('/ready').expect(200);
  await request(app).delete(`/api/tasks/${result.body.id}`).expect(204);
});
