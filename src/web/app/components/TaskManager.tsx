'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import {
  getTasks,
  createTask,
  getProjects,
  createProject,
  deleteProject,
  type Task,
  type Project,
} from '../actions';
import TaskTree from './TaskTree';

export default function TaskManager({
  initialProjects,
  initialTasks,
}: {
  initialProjects: Project[];
  initialTasks: Task[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedProjectId = searchParams.get('projectId')
    ? parseInt(searchParams.get('projectId')!, 10)
    : null;

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reloads the flat task list (the tree is rebuilt client-side from parent_id).
  const refreshTasks = useCallback(async () => {
    const updated = selectedProjectId
      ? await getTasks(selectedProjectId)
      : await getTasks();
    setTasks(updated);
  }, [selectedProjectId]);

  // Refresh tasks when selected project changes
  useEffect(() => {
    refreshTasks().catch((err) => console.error('Failed to refresh tasks:', err));
  }, [refreshTasks]);

  const handleAddTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (selectedProjectId) {
      formData.set('projectId', selectedProjectId.toString());
    }
    try {
      await createTask(formData);
      (e.target as HTMLFormElement).reset();
      setError(null);
      await refreshTasks();
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  };

  const handleAddProject = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await createProject(formData);
      const updated = await getProjects();
      setProjects(updated);
      (e.target as HTMLFormElement).reset();
      setShowNewProjectForm(false);
    } catch (err) {
      console.error('Failed to add project:', err);
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (!window.confirm('Delete this project and all its tasks?')) return;
    try {
      await deleteProject(id);
      const updated = await getProjects();
      setProjects(updated);
      if (selectedProjectId === id) {
        router.push('/');
      }
    } catch (err) {
      console.error('Failed to delete project:', err);
    }
  };

  const currentProject = projects.find((p) => p.id === selectedProjectId);
  // Count only top-level tasks in the summary; subtasks are shown inside their parent.
  const rootTasks = tasks.filter((t) => t.parent_id === null);
  const completedCount = rootTasks.filter((t) => t.completed).length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-8 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar - Projects */}
        <div className="md:col-span-1">
          <div className="sticky top-8">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mb-4">
              Projects
            </h2>

            {/* New Project Button */}
            <button
              onClick={() => setShowNewProjectForm(!showNewProjectForm)}
              className="w-full mb-4 rounded-lg bg-blue-600 dark:bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
            >
              + New Project
            </button>

            {/* New Project Form */}
            {showNewProjectForm && (
              <form
                onSubmit={handleAddProject}
                className="mb-4 p-4 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
              >
                <input
                  name="name"
                  type="text"
                  placeholder="Project name"
                  required
                  className="w-full mb-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50"
                />
                <textarea
                  name="description"
                  placeholder="Description (optional)"
                  className="w-full mb-2 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50"
                  rows={2}
                />
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-xs text-zinc-600 dark:text-zinc-400">
                    Color:
                  </label>
                  <input
                    name="color"
                    type="color"
                    defaultValue="#3b82f6"
                    className="w-10 h-8 rounded cursor-pointer"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 rounded bg-blue-600 dark:bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                  >
                    Create
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewProjectForm(false)}
                    className="flex-1 rounded bg-zinc-200 dark:bg-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-900 dark:text-zinc-50 hover:bg-zinc-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Projects List */}
            <div className="space-y-2">
              <button
                onClick={() => router.push('/')}
                className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedProjectId === null
                    ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
              >
                All Tasks
              </button>

              {projects.map((project) => (
                <div key={project.id} className="group relative">
                  <button
                    onClick={() => router.push(`/?projectId=${project.id}`)}
                    className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                      selectedProjectId === project.id
                        ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50'
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="truncate">{project.name}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 transition-all"
                    title="Delete project"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content - Tasks */}
        <div className="md:col-span-3">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
              {currentProject ? currentProject.name : 'All Tasks'}
            </h1>
            {currentProject?.description && (
              <p className="text-zinc-600 dark:text-zinc-400 mb-8 text-sm">
                {currentProject.description}
              </p>
            )}

            {/* Add task form */}
            <form onSubmit={handleAddTask} className="flex gap-2 mb-8">
              <input
                name="title"
                type="text"
                required
                placeholder="Add a new task..."
                className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 dark:bg-zinc-50 px-5 py-2 font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
              >
                Add
              </button>
            </form>

            {error && (
              <div
                role="alert"
                className="mb-4 flex items-start justify-between gap-4 rounded-lg border border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950 px-4 py-3 text-sm text-red-700 dark:text-red-300"
              >
                <span>{error}</span>
                <button onClick={() => setError(null)} className="font-bold" aria-label="Dismiss">
                  ✕
                </button>
              </div>
            )}

            {/* Task tree: subtasks are nested under their parents */}
            {tasks.length === 0 ? (
              <p className="text-zinc-400 text-center py-8">
                {selectedProjectId
                  ? 'No tasks in this project. Add one above!'
                  : 'No tasks yet. Add one above!'}
              </p>
            ) : (
              <TaskTree
                tasks={tasks}
                onChanged={refreshTasks}
                onError={(message) => setError(message)}
              />
            )}

            {rootTasks.length > 0 && (
              <p className="mt-4 text-xs text-zinc-400">
                {completedCount} / {rootTasks.length} completed
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
