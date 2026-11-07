import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { z } from 'zod';
import { TaskRepository } from './repository.js';
const fields = {
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000),
  status: z.enum(['Pending', 'In Progress', 'Completed']),
};
const createSchema = z.object({ title: fields.title, description: fields.description.default(''), status: fields.status.default('Pending') }).strict();
const patchSchema = z.object(fields).partial().strict().refine(value => Object.keys(value).length > 0, 'Incluye al menos un campo para actualizar.');
const uuid = z.string().uuid();
const validateId: RequestHandler = (req, res, next) => {
  if (!uuid.safeParse(req.params.id).success) { res.status(400).json({ error: { code: 'INVALID_ID', message: 'El identificador debe ser un UUID válido.' } }); return; }
  next();
};
const notFound = { error: { code: 'NOT_FOUND', message: 'Tarea no encontrada.' } };
export function createApp(repository: TaskRepository, origin = 'http://localhost:5173') {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin }));
  app.use(express.json({ limit: '16kb' }));
  app.get('/health', (_req, res) => { res.json({ status: 'ok' }); });
  app.get('/ready', async (_req, res) => {
    try { await repository.ready(); res.json({ status: 'ok' }); }
    catch { res.status(503).json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'La base de datos no está disponible o falta ejecutar las migraciones.' } }); }
  });
  app.get('/api/tasks', async (_req, res) => { res.json(await repository.list()); });
  app.post('/api/tasks', async (req, res) => {
    const result = createSchema.safeParse(req.body);
    if (!result.success) { res.status(400).json(validationError(result.error)); return; }
    const task = await repository.create(result.data);
    res.location(`/api/tasks/${task.id}`).status(201).json(task);
  });
  app.get('/api/tasks/:id', validateId, async (req, res) => {
    const task = await repository.get(req.params.id as string);
    if (!task) { res.status(404).json(notFound); return; }
    res.json(task);
  });
  app.patch('/api/tasks/:id', validateId, async (req, res) => {
    const result = patchSchema.safeParse(req.body);
    if (!result.success) { res.status(400).json(validationError(result.error)); return; }
    const task = await repository.update(req.params.id as string, result.data);
    if (!task) { res.status(404).json(notFound); return; }
    res.json(task);
  });
  app.delete('/api/tasks/:id', validateId, async (req, res) => {
    if (!await repository.delete(req.params.id as string)) { res.status(404).json(notFound); return; }
    res.status(204).end();
  });
  app.use((_req, res) => { res.status(404).json({ error: { code: 'ROUTE_NOT_FOUND', message: 'Ruta no encontrada.' } }); });
  const handleError: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error.type === 'entity.parse.failed') { res.status(400).json({ error: { code: 'INVALID_JSON', message: 'El cuerpo debe ser JSON válido.' } }); return; }
    if (error.type === 'entity.too.large') { res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'El cuerpo supera el límite de 16 KB.' } }); return; }
    console.error('No se pudo procesar una solicitud.');
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'No se pudo completar la operación.' } });
  };
  app.use(handleError);
  return app;
}
function validationError(error: z.ZodError) {
  return { error: { code: 'VALIDATION_ERROR', message: 'Revisa los campos de la tarea.', details: error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })) } };
}
