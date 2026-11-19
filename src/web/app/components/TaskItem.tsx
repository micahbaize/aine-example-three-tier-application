'use client';

import React, { useState } from 'react';
import { Task, toggleTask, snoozeTask, deleteTask, updateTask } from '../actions';

interface TaskItemProps {
  task: Task;
  onUpdate: () => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [snoozeHours, setSnoozeHours] = useState(1);

  const isOverdue =
    task.due_date && !task.completed && new Date(task.due_date) < new Date();
  const isScheduledForFuture =
    task.scheduled_for && new Date(task.scheduled_for) > new Date();
  const isSnoozed = task.snoozed_until && new Date(task.snoozed_until) > new Date();

  const handleToggle = async () => {
    await toggleTask(task.id, !task.completed);
    onUpdate();
  };

  const handleSnooze = async () => {
    const until = new Date();
    until.setHours(until.getHours() + snoozeHours);
    await snoozeTask(task.id, until.toISOString());
    setSnoozeHours(1);
    onUpdate();
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this task?')) {
      await deleteTask(task.id);
      onUpdate();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className={`bg-slate-700 rounded-lg p-3 border-l-4 transition-all ${
        task.completed
          ? 'border-green-500 opacity-60'
          : isOverdue
            ? 'border-red-500'
            : task.project_color
              ? 'border-[' + task.project_color + ']'
              : 'border-slate-600'
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={handleToggle}
          className="mt-1 w-4 h-4 rounded cursor-pointer"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-sm font-medium ${task.completed ? 'line-through text-slate-400' : 'text-white'}`}
            >
              {task.title}
            </span>

            {task.project_name && (
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: task.project_color || '#3b82f6' }}
                title={task.project_name}
              />
            )}

            {task.is_recurring_parent && (
              <span className="text-xs bg-blue-900 text-blue-200 px-2 py-0.5 rounded">
                Recurring
              </span>
            )}

            {isOverdue && (
              <span className="text-xs bg-red-900 text-red-200 px-2 py-0.5 rounded">
                Overdue
              </span>
            )}

            {isSnoozed && (
              <span className="text-xs bg-yellow-900 text-yellow-200 px-2 py-0.5 rounded">
                Snoozed
              </span>
            )}
          </div>

          {task.description && (
            <p className="text-xs text-slate-400 mt-1">{task.description}</p>
          )}

          <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
            {task.scheduled_for && (
              <div title="Scheduled">
                📅 {formatDate(task.scheduled_for)}
              </div>
            )}
            {task.due_date && (
              <div title="Due date" className={isOverdue ? 'text-red-400' : ''}>
                ⏰ {formatDate(task.due_date)}
              </div>
            )}
            {task.instances_count && task.instances_count > 0 && (
              <div title="Recurring instances">
                🔄 {task.instances_count} instances
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-slate-600 rounded transition-colors"
        >
          ⋮
        </button>

        <button
          onClick={handleDelete}
          className="p-1 hover:bg-red-600 rounded transition-colors text-red-400 hover:text-red-200"
        >
          ✕
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-600 space-y-2">
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max="24"
              value={snoozeHours}
              onChange={(e) => setSnoozeHours(parseInt(e.target.value) || 1)}
              className="w-12 px-2 py-1 bg-slate-600 text-white text-xs rounded border border-slate-500"
            />
            <button
              onClick={handleSnooze}
              className="flex-1 px-3 py-1 bg-yellow-600 hover:bg-yellow-700 text-white text-xs rounded transition-colors"
            >
              Snooze ({snoozeHours}h)
            </button>
          </div>

          {task.recurrence_pattern && (
            <div className="text-xs text-slate-300 bg-slate-600 p-2 rounded">
              <strong>Recurrence:</strong> {task.recurrence_pattern}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
