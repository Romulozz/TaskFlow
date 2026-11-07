import { useCallback, useEffect, useRef, useState } from 'react';
import { createTaskApi } from './api';
import type { Task, TaskInput } from './storage';
const api = createTaskApi(import.meta.env.VITE_API_URL || '/api');
const message = (error: unknown) => error instanceof Error ? error.message : 'No se pudo completar la operación.';
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const locked = useRef(false);
  const mounted = useRef(false);
  const refresh = useCallback(async () => {
    if (locked.current) return;
    locked.current = true; setLoading(true); setError('');
    try { const data = await api.list(); if (mounted.current) { setTasks(data); setReady(true); } }
    catch (error) { if (mounted.current) { setError(message(error)); setReady(false); } }
    finally { locked.current = false; if (mounted.current) setLoading(false); }
  }, []);
  useEffect(() => { mounted.current = true; void refresh(); return () => { mounted.current = false; }; }, [refresh]);
  async function mutate(operation: () => Promise<void>, success: string) {
    if (locked.current || !ready) return false;
    locked.current = true; setSaving(true); setError(''); setNotice('');
    try { await operation(); setNotice(success); return true; }
    catch (error) {
      setError(`${message(error)} Actualiza las tareas antes de volver a intentarlo para comprobar si el cambio llegó a guardarse.`);
      setReady(false);
      return false;
    } finally { locked.current = false; setSaving(false); }
  }
  return { tasks, error, loading, ready, saving, notice, refresh,
    save: (id: string | undefined, input: TaskInput) => mutate(async () => {
      const saved = id ? await api.update(id, input) : await api.create(input);
      setTasks(current => id ? current.map(task => task.id === id ? saved : task) : [saved, ...current]);
    }, id ? 'Tarea actualizada.' : 'Tarea creada.'),
    changeStatus: (id: string, status: Task['status']) => mutate(async () => {
      const saved = await api.update(id, { status });
      setTasks(current => current.map(task => task.id === id ? saved : task));
    }, 'Estado actualizado.'),
    remove: (id: string) => mutate(async () => {
      await api.remove(id); setTasks(current => current.filter(task => task.id !== id));
    }, 'Tarea eliminada.'),
  };
}
