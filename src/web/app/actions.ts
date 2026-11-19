'use server';

import { revalidatePath } from 'next/cache';

const API_URL = process.env.API_URL || 'http://localhost:3001';

export type Task = {
  id: number;
  title: string;
  completed: boolean;
  parent_id?: number | null;
  position?: number;
  created_at: string;
  subtasks?: Task[];
};

export async function getTasks(includeSubtasks: boolean = true): Promise<Task[]> {
  const url = new URL(`${API_URL}/tasks`);
  if (includeSubtasks) {
    url.searchParams.append('includeSubtasks', 'true');
  }
  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

export async function getTaskTree(id: number): Promise<Task> {
  const res = await fetch(`${API_URL}/tasks/${id}/tree`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch task tree');
  return res.json();
}

export async function getSubtasks(parentId: number): Promise<Task[]> {
  const res = await fetch(`${API_URL}/tasks/${parentId}/subtasks`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch subtasks');
  return res.json();
}

export async function createTask(formData: FormData) {
  const title = formData.get('title') as string;
  const parentIdStr = formData.get('parent_id') as string | null;
  const parentId = parentIdStr ? parseInt(parentIdStr, 10) : undefined;

  const res = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, ...(parentId && { parent_id: parentId }) }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to create task');
  }

  revalidatePath('/');
}

export async function toggleTask(id: number, completed: boolean) {
  const res = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update task');
  }

  revalidatePath('/');
}

export async function updateTask(
  id: number,
  updates: { title?: string; completed?: boolean; parent_id?: number | null; position?: number }
) {
  const res = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Failed to update task');
  }

  revalidatePath('/');
}

export async function deleteTask(id: number) {
  const res = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    throw new Error('Failed to delete task');
  }

  revalidatePath('/');
}

export async function reorderSubtasks(parentId: number, order: number[]) {
  const res = await fetch(`${API_URL}/tasks/${parentId}/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order }),
  });

  if (!res.ok) {
    throw new Error('Failed to reorder subtasks');
  }

  revalidatePath('/');
}
