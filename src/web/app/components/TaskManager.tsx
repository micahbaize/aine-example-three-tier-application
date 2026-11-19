'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  getTasks,
  createTask,
  toggleTask,
  getProjects,
  createProject,
  deleteProject,
  deleteTask,
  type Task,
  type Project,
} from '../actions';
import { ThemeToggle } from './ThemeToggle';

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

  // Refresh tasks when selected project changes
  useEffect(() => {
    const refreshTasks = async () => {
      try {
        const updated = selectedProjectId
          ? await getTasks(selectedProjectId)
          : await getTasks();
        setTasks(updated);
      } catch (error) {
        console.error('Failed to refresh tasks:', error);
      }
    };
    refreshTasks();
  }, [selectedProjectId]);

  const handleAddTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (selectedProjectId) {
      formData.set('projectId', selectedProjectId.toString());
    }
    try {
      await createTask(formData);
      (e.target as HTMLFormElement).reset();
      // Refresh tasks
      const updated = selectedProjectId
        ? await getTasks(selectedProjectId)
        : await getTasks();
      setTasks(updated);
    } catch (error) {
      console.error('Failed to add task:', error);
    }
  };

  const handleToggleTask = async (id: number, completed: boolean) => {
    try {
      await toggleTask(id, !completed);
      const updated = selectedProjectId
        ? await getTasks(selectedProjectId)
        : await getTasks();
      setTasks(updated);
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      await deleteTask(id);
      setTasks(tasks.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Failed to delete task:', error);
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
    } catch (error) {
      console.error('Failed to add project:', error);
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
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const currentProject = projects.find((p) => p.id === selectedProjectId);
  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-8 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidebar - Projects */}
        <div className="md:col-span-1">
          <div className="sticky top-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Projects
              </h2>
              <ThemeToggle />
            </div>

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

            {/* Task list */}
            <ul className="space-y-2">
              {tasks.length === 0 && (
                <li className="text-zinc-400 text-center py-8">
                  {selectedProjectId
                    ? 'No tasks in this project. Add one above!'
                    : 'No tasks yet. Add one above!'}
                </li>
              )}
              {tasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 group"
                >
                  <button
                    onClick={() => handleToggleTask(task.id, task.completed)}
                    className={`h-5 w-5 rounded border-2 flex-shrink-0 transition-colors ${
                      task.completed
                        ? 'bg-zinc-900 dark:bg-zinc-50 border-zinc-900 dark:border-zinc-50'
                        : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-500'
                    }`}
                    aria-label={
                      task.completed ? 'Mark incomplete' : 'Mark complete'
                    }
                  >
                    {task.completed && (
                      <svg
                        viewBox="0 0 12 12"
                        className="text-white dark:text-zinc-900 w-full h-full p-0.5"
                      >
                        <path
                          d="M2 6l3 3 5-5"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          fill="none"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>
                  <span
                    className={`flex-1 text-sm ${
                      task.completed
                        ? 'line-through text-zinc-400'
                        : 'text-zinc-800 dark:text-zinc-100'
                    }`}
                  >
                    {task.title}
                  </span>
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 text-sm transition-all"
                    title="Delete task"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>

            {tasks.length > 0 && (
              <p className="mt-4 text-xs text-zinc-400">
                {completedCount} / {tasks.length} completed
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
