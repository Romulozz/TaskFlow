import type { Task, TaskInput } from './storage';
export function createTaskApi(baseUrl = '/api') {
  const base = baseUrl.replace(/\/$/, '');
  async function request<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${base}${path}`, {
        method, signal: controller.signal,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error?.message || `La API respondió con un error (${response.status}).`);
      }
      if (response.status === 204) return undefined as T;
      return await response.json() as T;
    } catch (error) {
      if (controller.signal.aborted) throw new Error('La API tardó demasiado en responder.');
      if (error instanceof TypeError) throw new Error('No se pudo conectar con la API. Comprueba que el backend esté iniciado.');
      throw error;
    } finally { clearTimeout(timeout); }
  }
  return {
    list: () => request<Task[]>('/tasks'),
    create: (input: TaskInput) => request<Task>('/tasks', 'POST', input),
    update: (id: string, input: Partial<TaskInput>) => request<Task>(`/tasks/${encodeURIComponent(id)}`, 'PATCH', input),
    remove: (id: string) => request<void>(`/tasks/${encodeURIComponent(id)}`, 'DELETE'),
  };
}
