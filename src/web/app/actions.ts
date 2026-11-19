'use server';

import { revalidatePath } from 'next/cache';

const API_URL = process.env.API_URL || 'http://localhost:3001';

export type Task = {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  project_id?: number;
  project_name?: string;
  project_color?: string;
  recurrence_pattern?: string;
  is_recurring_parent?: boolean;
  parent_task_id?: number;
  scheduled_for?: string;
  due_date?: string;
  snoozed_until?: string;
  created_at: string;
  instances_count?: number;
};

export type Project = {
  id: number;
  name: string;
  description?: string;
  color: string;
  created_at: string;
};

export type Notification = {
  id: number;
  task_id: number;
  type: string;
  status: string;
  scheduled_at: string;
  sent_at?: string;
  created_at: string;
};

export type CalendarDay = {
  date: string;
  task_count: number;
  completed_count: number;
  tasks: Task[];
};

// ============ TASKS ============

export async function getTasks(projectId?: number): Promise<Task[]> {
  const params = new URLSearchParams();
  if (projectId) params.append('projectId', projectId.toString());

  const res = await fetch(`${API_URL}/tasks?${params.toString()}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

export async function getTasksWithFilters(
  filters?: Record<string, string>
): Promise<Task[]> {
  const params = new URLSearchParams(filters);
  const res = await fetch(`${API_URL}/tasks?${params.toString()}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

export async function createTask(formData: FormData) {
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  const projectId = formData.get('projectId') as string;
  const scheduledFor = formData.get('scheduledFor') as string;
  const dueDate = formData.get('dueDate') as string;

  // Recurrence fields
  const recurrenceFrequency = formData.get('recurrenceFrequency') as string;
  const recurrenceInterval = formData.get('recurrenceInterval') as string;
  const recurrenceEndType = formData.get('recurrenceEndType') as string;
  const recurrenceEndValue = formData.get('recurrenceEndValue') as string;

  const body: Record<string, unknown> = { title };

  if (description) body.description = description;
  if (projectId) body.projectId = parseInt(projectId, 10);
  if (scheduledFor) body.scheduledFor = scheduledFor;
  if (dueDate) body.dueDate = dueDate;

  if (recurrenceFrequency) {
    body.recurrence = {
      frequency: recurrenceFrequency,
      interval: recurrenceInterval ? parseInt(recurrenceInterval, 10) : 1,
      endType: recurrenceEndType,
      endValue: recurrenceEndValue,
    };
  }

  await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  revalidatePath('/');
}

export async function updateTask(
  id: number,
  updates: Partial<Task>
): Promise<Task> {
  const body: Record<string, unknown> = {};

  if (updates.completed !== undefined) body.completed = updates.completed;
  if (updates.title !== undefined) body.title = updates.title;
  if (updates.description !== undefined) body.description = updates.description;
  if (updates.project_id !== undefined) body.projectId = updates.project_id;
  if (updates.scheduled_for !== undefined)
    body.scheduledFor = updates.scheduled_for;
  if (updates.due_date !== undefined) body.dueDate = updates.due_date;
  if (updates.snoozed_until !== undefined)
    body.snoozedUntil = updates.snoozed_until;

  const res = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error('Failed to update task');
  return res.json();
}

export async function toggleTask(id: number, completed: boolean): Promise<void> {
  await updateTask(id, { completed });
  revalidatePath('/');
}

export async function snoozeTask(id: number, until: string): Promise<void> {
  await updateTask(id, { snoozed_until: until });
  revalidatePath('/');
}

export async function deleteTask(id: number): Promise<void> {
  await fetch(`${API_URL}/tasks/${id}`, {
    method: 'DELETE',
  });
  revalidatePath('/');
}

// ============ NOTIFICATIONS ============

export async function getTaskNotifications(
  taskId: number
): Promise<Notification[]> {
  const res = await fetch(`${API_URL}/tasks/${taskId}/notifications`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}

export async function dismissNotification(
  notificationId: number
): Promise<void> {
  await fetch(`${API_URL}/notifications/${notificationId}/dismiss`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
  });
  revalidatePath('/');
}

// ============ PROJECTS ============

export async function getProjects(): Promise<Project[]> {
  const res = await fetch(`${API_URL}/projects`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export async function createProject(formData: FormData): Promise<void> {
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const color = formData.get('color') as string;

  await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      description: description || null,
      color: color || '#3b82f6',
    }),
  });
  revalidatePath('/');
}

export async function updateProject(
  id: number,
  formData: FormData
): Promise<void> {
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const color = formData.get('color') as string;

  await fetch(`${API_URL}/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      description,
      color,
    }),
  });
  revalidatePath('/');
}

export async function deleteProject(id: number): Promise<void> {
  await fetch(`${API_URL}/projects/${id}`, {
    method: 'DELETE',
  });
  revalidatePath('/');
}

// ============ CALENDAR ============

export async function getCalendar(
  startDate: string,
  endDate: string,
  projectId?: number
): Promise<CalendarDay[]> {
  const params = new URLSearchParams({
    startDate,
    endDate,
  });
  if (projectId) params.append('projectId', projectId.toString());

  const res = await fetch(`${API_URL}/calendar?${params.toString()}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch calendar');
  return res.json();
}
