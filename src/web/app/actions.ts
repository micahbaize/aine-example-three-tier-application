'use server';

import { revalidatePath } from 'next/cache';

const API_URL = process.env.API_URL || 'http://localhost:3001';

export type Task = {
  id: number;
  title: string;
  completed: boolean;
  project_id: number | null;
  created_at: string;
};

export type Project = {
  id: number;
  name: string;
  description: string | null;
  color: string;
  created_at: string;
};

// ============ PROJECT ACTIONS ============

export async function getProjects(): Promise<Project[]> {
  const res = await fetch(`${API_URL}/projects`, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch projects');
  return res.json();
}

export async function createProject(formData: FormData) {
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const color = formData.get('color') as string;

  const res = await fetch(`${API_URL}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, color }),
  });

  if (!res.ok) throw new Error('Failed to create project');
  revalidatePath('/');
}

export async function updateProject(id: number, formData: FormData) {
  const name = formData.get('name') as string;
  const description = formData.get('description') as string;
  const color = formData.get('color') as string;

  const res = await fetch(`${API_URL}/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, color }),
  });

  if (!res.ok) throw new Error('Failed to update project');
  revalidatePath('/');
}

export async function deleteProject(id: number) {
  const res = await fetch(`${API_URL}/projects/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) throw new Error('Failed to delete project');
  revalidatePath('/');
}

// ============ TASK ACTIONS ============

export async function getTasks(projectId?: number): Promise<Task[]> {
  const url = projectId
    ? `${API_URL}/tasks?projectId=${projectId}`
    : `${API_URL}/tasks`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('Failed to fetch tasks');
  return res.json();
}

export async function createTask(formData: FormData) {
  const title = formData.get('title') as string;
  const projectId = formData.get('projectId') as string;

  const res = await fetch(`${API_URL}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      projectId: projectId ? parseInt(projectId, 10) : undefined,
    }),
  });

  if (!res.ok) throw new Error('Failed to create task');
  revalidatePath('/');
}

export async function toggleTask(id: number, completed: boolean) {
  const res = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed }),
  });

  if (!res.ok) throw new Error('Failed to update task');
  revalidatePath('/');
}

export async function updateTaskProject(id: number, projectId: number | null) {
  const res = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId }),
  });

  if (!res.ok) throw new Error('Failed to update task project');
  revalidatePath('/');
}

export async function deleteTask(id: number) {
  const res = await fetch(`${API_URL}/tasks/${id}`, {
    method: 'DELETE',
  });

  if (!res.ok) throw new Error('Failed to delete task');
  revalidatePath('/');
}
