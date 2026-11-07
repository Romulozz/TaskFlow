import { randomUUID } from 'node:crypto';
export type Status = 'Pending' | 'In Progress' | 'Completed';
export type Task = { id: string; title: string; description: string; status: Status; createdAt: string };
export type TaskInput = Pick<Task, 'title' | 'description' | 'status'>;
export interface Database { query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[] }> }
const columns = 'id, title, description, status, created_at';
function task(row: Record<string, unknown>): Task {
  return { id: row.id as string, title: row.title as string, description: row.description as string, status: row.status as Status, createdAt: new Date(row.created_at as string).toISOString() };
}
export class TaskRepository {
  constructor(private db: Database) {}
  async ready() { await this.db.query('SELECT 1 FROM tasks LIMIT 1'); }
  async list() { return (await this.db.query(`SELECT ${columns} FROM tasks ORDER BY created_at DESC, id DESC`)).rows.map(task); }
  async get(id: string) { const row = (await this.db.query(`SELECT ${columns} FROM tasks WHERE id = $1`, [id])).rows[0]; return row ? task(row) : null; }
  async create(input: TaskInput) {
    const { rows } = await this.db.query(`INSERT INTO tasks (id, title, description, status) VALUES ($1, $2, $3, $4) RETURNING ${columns}`, [randomUUID(), input.title, input.description, input.status]);
    return task(rows[0]!);
  }
  async update(id: string, input: Partial<TaskInput>) {
    const { rows } = await this.db.query(`UPDATE tasks SET title = COALESCE($2, title), description = COALESCE($3, description), status = COALESCE($4, status) WHERE id = $1 RETURNING ${columns}`, [id, input.title ?? null, input.description ?? null, input.status ?? null]);
    return rows[0] ? task(rows[0]) : null;
  }
  async delete(id: string) { return (await this.db.query('DELETE FROM tasks WHERE id = $1 RETURNING id', [id])).rows.length > 0; }
}
