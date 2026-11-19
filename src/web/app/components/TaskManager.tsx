'use client';

import React, { useState, useRef } from 'react';
import { Task, toggleTask, updateTask, deleteTask, createTask } from '../actions';

interface TaskItemProps {
  task: Task;
  onTaskUpdated: () => void;
  depth?: number;
}

export function TaskItem({ task, onTaskUpdated, depth = 0 }: TaskItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isCreatingSubtask, setIsCreatingSubtask] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const formRef = useRef<HTMLFormElement>(null);

  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const isDisabledByIncomplete = hasSubtasks && task.subtasks.some(st => !st.completed);

  const handleToggleComplete = async () => {
    try {
      await toggleTask(task.id, !task.completed);
      onTaskUpdated();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleDelete = async () => {
    if (confirm(`Delete "${task.title}"${hasSubtasks ? ' and all its subtasks' : ''}?`)) {
      try {
        await deleteTask(task.id);
        onTaskUpdated();
      } catch (err) {
        alert((err as Error).message);
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      alert('Title cannot be empty');
      return;
    }
    try {
      await updateTask(task.id, { title: editTitle.trim() });
      setIsEditing(false);
      onTaskUpdated();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleCreateSubtask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append('parent_id', String(task.id));
    try {
      await createTask(formData);
      setIsCreatingSubtask(false);
      if (formRef.current) {
        formRef.current.reset();
      }
      onTaskUpdated();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const paddingLeft = `${depth * 1.5}rem`;

  return (
    <div style={{ paddingLeft }} className="space-y-1">
      <div className="flex items-center gap-2 group">
        {/* Expand/Collapse Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-5 h-5 flex items-center justify-center flex-shrink-0 transition-colors ${
            hasSubtasks
              ? 'hover:text-zinc-700 dark:hover:text-zinc-300 cursor-pointer'
              : 'text-zinc-300 dark:text-zinc-700 cursor-default'
          }`}
          disabled={!hasSubtasks}
        >
          {hasSubtasks && (
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          )}
        </button>

        {/* Checkbox */}
        <button
          onClick={handleToggleComplete}
          disabled={isDisabledByIncomplete}
          className={`h-5 w-5 rounded border-2 flex-shrink-0 transition-colors ${
            task.completed
              ? 'bg-green-600 dark:bg-green-500 border-green-600 dark:border-green-500'
              : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-500 disabled:opacity-50'
          }`}
          title={isDisabledByIncomplete ? 'Complete all subtasks first' : ''}
        >
          {task.completed && (
            <svg viewBox="0 0 12 12" className="text-white w-full h-full p-0.5">
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

        {/* Title or Edit Input */}
        {isEditing ? (
          <input
            autoFocus
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit();
              if (e.key === 'Escape') setIsEditing(false);
            }}
            className="flex-1 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <span
            onClick={() => setIsEditing(true)}
            className={`flex-1 cursor-pointer px-2 py-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors ${
              task.completed
                ? 'line-through text-zinc-400'
                : 'text-zinc-800 dark:text-zinc-100'
            }`}
          >
            {task.title}
          </span>
        )}

        {/* Subtask Badge */}
        {hasSubtasks && (
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex-shrink-0">
            {task.subtasks!.filter(st => st.completed).length}/{task.subtasks!.length}
          </span>
        )}

        {/* Action Buttons - Show on Hover */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => setIsCreatingSubtask(!isCreatingSubtask)}
            className="p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 transition-colors"
            title="Add subtask"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 transition-colors"
            title="Delete task"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Create Subtask Form */}
      {isCreatingSubtask && (
        <div style={{ paddingLeft: '1.5rem' }} className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 mt-2">
          <form onSubmit={handleCreateSubtask} ref={formRef} className="flex gap-2">
            <input
              name="title"
              type="text"
              required
              placeholder="Add a subtask..."
              className="flex-1 rounded px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsCreatingSubtask(false)}
              className="px-3 py-1 text-sm rounded bg-zinc-300 dark:bg-zinc-600 text-zinc-900 dark:text-zinc-50 hover:bg-zinc-400 dark:hover:bg-zinc-500 transition-colors"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Subtasks */}
      {hasSubtasks && isExpanded && (
        <div className="space-y-1 mt-1">
          {task.subtasks!.map((subtask) => (
            <TaskItem
              key={subtask.id}
              task={subtask}
              onTaskUpdated={onTaskUpdated}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TaskManagerProps {
  initialTasks: Task[];
}

export function TaskManager({ initialTasks }: TaskManagerProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshTasks = async () => {
    setIsRefreshing(true);
    try {
      const { getTasks } = await import('../actions');
      const updated = await getTasks(true);
      setTasks(updated);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await createTask(formData);
      await refreshTasks();
      if (e.currentTarget) {
        e.currentTarget.reset();
      }
    } catch (err) {
      alert((err as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-8">
          To-Do List with Subtasks
        </h1>

        {/* Add task form */}
        <form onSubmit={handleCreateTask} className="flex gap-2 mb-8">
          <input
            name="title"
            type="text"
            required
            placeholder="Add a new task..."
            className="flex-1 rounded-lg border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-4 py-2 text-zinc-900 dark:text-zinc-50 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-zinc-900 dark:bg-zinc-50 px-5 py-2 font-medium text-white dark:text-zinc-900 hover:bg-zinc-700 dark:hover:bg-zinc-200 transition-colors"
          >
            Add
          </button>
          {isRefreshing && (
            <span className="flex items-center text-xs text-zinc-400">
              <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </span>
          )}
        </form>

        {/* Task list */}
        {tasks.length === 0 ? (
          <div className="text-zinc-400 text-center py-8">No tasks yet. Add one above!</div>
        ) : (
          <div className="space-y-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
            {tasks.map((task) => (
              <TaskItem key={task.id} task={task} onTaskUpdated={refreshTasks} depth={0} />
            ))}
          </div>
        )}

        {tasks.length > 0 && (
          <p className="mt-4 text-xs text-zinc-400 text-right">
            {tasks.filter((t) => t.completed).length} / {tasks.length} completed
          </p>
        )}
      </div>
    </div>
  );
}
