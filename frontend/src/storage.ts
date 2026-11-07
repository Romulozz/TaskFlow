export const statuses = ['Pending', 'In Progress', 'Completed'] as const;
export type Status = typeof statuses[number];
export type Task = { id: string; title: string; description: string; status: Status; createdAt: string };
export type TaskInput = Pick<Task, 'title' | 'description' | 'status'>;
