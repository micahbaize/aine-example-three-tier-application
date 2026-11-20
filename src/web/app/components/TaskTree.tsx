'use client';

import { useMemo, useState } from 'react';
import {
  createSubtask,
  deleteTask,
  reorderTask,
  toggleTask,
  type Task,
} from '../actions';

type Props = {
  tasks: Task[];
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
};

type ChildrenMap = Map<string, Task[]>;

// Builds a parent key -> ordered children lookup. Root tasks use the key "root".
function buildChildrenMap(tasks: Task[]): ChildrenMap {
  const map: ChildrenMap = new Map();
  for (const task of tasks) {
    const key = task.parent_id === null ? 'root' : String(task.parent_id);
    const list = map.get(key) ?? [];
    list.push(task);
    map.set(key, list);
  }
  for (const list of map.values()) {
    list.sort((a, b) => a.position - b.position || a.id - b.id);
  }
  return map;
}

// Number of incomplete tasks anywhere below `task`.
function countIncompleteDescendants(task: Task, childrenMap: ChildrenMap): number {
  const direct = childrenMap.get(String(task.id)) ?? [];
  return direct.reduce(
    (sum, child) =>
      sum + (child.completed ? 0 : 1) + countIncompleteDescendants(child, childrenMap),
    0
  );
}

export default function TaskTree({ tasks, onChanged, onError }: Props) {
  const childrenMap = useMemo(() => buildChildrenMap(tasks), [tasks]);
  const roots = childrenMap.get('root') ?? [];

  if (roots.length === 0) return null;

  return (
    <ul className="space-y-2">
      {roots.map((task) => (
        <TaskNode
          key={task.id}
          task={task}
          depth={0}
          childrenMap={childrenMap}
          onChanged={onChanged}
          onError={onError}
        />
      ))}
    </ul>
  );
}

function TaskNode({
  task,
  depth,
  childrenMap,
  onChanged,
  onError,
}: {
  task: Task;
  depth: number;
  childrenMap: ChildrenMap;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const kids = childrenMap.get(String(task.id)) ?? [];
  const doneKids = kids.filter((k) => k.completed).length;
  const incompleteBelow = countIncompleteDescendants(task, childrenMap);
  // A parent cannot be completed while any descendant is incomplete.
  const blocked = !task.completed && incompleteBelow > 0;

  const run = async (action: () => Promise<void>) => {
    try {
      await action();
      await onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Something went wrong');
    }
  };

  const handleToggle = () => run(() => toggleTask(task.id, !task.completed));

  const handleDelete = () => {
    const message =
      kids.length > 0
        ? 'Delete this task and all of its subtasks?'
        : 'Delete this task?';
    if (!window.confirm(message)) return;
    run(() => deleteTask(task.id));
  };

  const handleAddSubtask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const title = subtaskTitle.trim();
    if (!title) return;
    await run(async () => {
      await createSubtask(task.id, title);
      setSubtaskTitle('');
      setAddingSubtask(false);
      setExpanded(true);
    });
  };

  // Drag-and-drop reorders only among siblings sharing this task's parent.
  const handleDragStart = (e: React.DragEvent<HTMLLIElement>) => {
    e.stopPropagation();
    e.dataTransfer.setData('text/plain', String(task.id));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLLIElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const draggedId = Number(e.dataTransfer.getData('text/plain'));
    if (!draggedId || draggedId === task.id) return;
    const siblings = childrenMap.get(task.parent_id === null ? 'root' : String(task.parent_id)) ?? [];
    if (!siblings.some((s) => s.id === draggedId)) return; // different parent: ignored
    const targetIndex = siblings.findIndex((s) => s.id === task.id);
    run(() => reorderTask(draggedId, targetIndex));
  };

  return (
    <li
      draggable
      onDragStart={handleDragStart}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`group ${depth > 0 ? 'ml-6 border-l border-zinc-200 dark:border-zinc-700 pl-3' : ''}`}
    >
      <div
        className={`flex items-center gap-3 rounded-lg border bg-white dark:bg-zinc-800 px-4 py-3 ${
          dragOver ? 'border-blue-500' : 'border-zinc-200 dark:border-zinc-700'
        }`}
      >
        {/* Expand / collapse (only when there are subtasks) */}
        {kids.length > 0 ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-4 text-xs text-zinc-500 flex-shrink-0"
            aria-label={expanded ? 'Collapse subtasks' : 'Expand subtasks'}
            aria-expanded={expanded}
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        <button
          onClick={handleToggle}
          disabled={blocked}
          title={blocked ? `Complete the ${incompleteBelow} remaining subtask(s) first` : undefined}
          className={`h-5 w-5 rounded border-2 flex-shrink-0 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            task.completed
              ? 'bg-zinc-900 dark:bg-zinc-50 border-zinc-900 dark:border-zinc-50'
              : 'border-zinc-300 dark:border-zinc-600 hover:border-zinc-500'
          }`}
          aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {task.completed && (
            <svg viewBox="0 0 12 12" className="text-white dark:text-zinc-900 w-full h-full p-0.5">
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
            task.completed ? 'line-through text-zinc-400' : 'text-zinc-800 dark:text-zinc-100'
          }`}
        >
          {task.title}
        </span>

        {kids.length > 0 && (
          <span className="text-xs text-zinc-400" title="Direct subtasks completed">
            {doneKids}/{kids.length}
          </span>
        )}

        <button
          onClick={() => setAddingSubtask(!addingSubtask)}
          disabled={task.completed}
          className="opacity-0 group-hover:opacity-100 disabled:hidden px-1 rounded text-xs text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
          title="Add subtask"
        >
          + sub
        </button>

        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 text-sm transition-all"
          title="Delete task"
        >
          ✕
        </button>
      </div>

      {addingSubtask && (
        <form onSubmit={handleAddSubtask} className="ml-6 mt-2 flex gap-2">
          <input
            value={subtaskTitle}
            onChange={(e) => setSubtaskTitle(e.target.value)}
            type="text"
            autoFocus
            required
            placeholder="New subtask..."
            className="flex-1 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-1.5 text-sm text-zinc-900 dark:text-zinc-50"
          />
          <button
            type="submit"
            className="rounded bg-zinc-900 dark:bg-zinc-50 px-3 py-1.5 text-xs font-medium text-white dark:text-zinc-900"
          >
            Add
          </button>
        </form>
      )}

      {expanded && kids.length > 0 && (
        <ul className="mt-2 space-y-2">
          {kids.map((child) => (
            <TaskNode
              key={child.id}
              task={child}
              depth={depth + 1}
              childrenMap={childrenMap}
              onChanged={onChanged}
              onError={onError}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
