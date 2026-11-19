'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getTasks,
  getProjects,
  getCalendar,
  createTask,
  createProject,
  deleteProject,
  Project,
  Task,
  CalendarDay,
} from '../actions';
import { TaskItem } from './TaskItem';
import { Calendar } from './Calendar';
import { RecurrenceForm } from './RecurrenceForm';

interface TaskManagerProps {
  initialTasks: Task[];
  initialProjects: Project[];
}

type ViewMode = 'list' | 'calendar';

export const TaskManager: React.FC<TaskManagerProps> = ({
  initialTasks,
  initialProjects,
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedProjectId = searchParams.get('projectId');

  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showNewProjectForm, setShowNewProjectForm] = useState(false);
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [showRecurrenceForm, setShowRecurrenceForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectColor, setNewProjectColor] = useState('#3b82f6');
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [newTaskScheduledFor, setNewTaskScheduledFor] = useState('');
  const [recurrenceData, setRecurrenceData] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Refresh tasks when project selection changes
  useEffect(() => {
    const loadTasks = async () => {
      try {
        setIsLoading(true);
        const projectId = selectedProjectId ? parseInt(selectedProjectId) : undefined;
        const fetchedTasks = await getTasks(projectId);
        setTasks(fetchedTasks);

        // Load calendar data for current view
        if (viewMode === 'calendar') {
          const now = new Date();
          const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString()
            .split('T')[0];
          const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
            .toISOString()
            .split('T')[0];

          const calendarData = await getCalendar(startDate, endDate, projectId);
          setCalendarDays(calendarData);
        }
      } catch (error) {
        console.error('Error loading tasks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTasks();
  }, [selectedProjectId, viewMode]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    try {
      const formData = new FormData();
      formData.append('name', newProjectName);
      formData.append('color', newProjectColor);
      await createProject(formData);

      const updatedProjects = await getProjects();
      setProjects(updatedProjects);
      setNewProjectName('');
      setNewProjectColor('#3b82f6');
      setShowNewProjectForm(false);
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const formData = new FormData();
      formData.append('title', newTaskTitle);
      if (selectedProjectId) {
        formData.append('projectId', selectedProjectId);
      }
      if (newTaskDueDate) {
        formData.append('dueDate', newTaskDueDate);
      }
      if (newTaskScheduledFor) {
        formData.append('scheduledFor', newTaskScheduledFor);
      }

      if (recurrenceData) {
        formData.append('recurrenceFrequency', recurrenceData.frequency as string);
        formData.append('recurrenceInterval', recurrenceData.interval as string);
        formData.append('recurrenceEndType', recurrenceData.endType as string);
        if (recurrenceData.endValue) {
          formData.append('recurrenceEndValue', recurrenceData.endValue as string);
        }
      }

      await createTask(formData);

      const projectId = selectedProjectId
        ? parseInt(selectedProjectId)
        : undefined;
      const updatedTasks = await getTasks(projectId);
      setTasks(updatedTasks);
      setNewTaskTitle('');
      setNewTaskDueDate('');
      setNewTaskScheduledFor('');
      setRecurrenceData(null);
      setShowNewTaskForm(false);
      setShowRecurrenceForm(false);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (window.confirm('Delete this project and all its tasks?')) {
      try {
        await deleteProject(id);
        const updatedProjects = await getProjects();
        setProjects(updatedProjects);

        if (selectedProjectId === id.toString()) {
          router.push('/');
        }
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  const handleSelectProject = (projectId: number | null) => {
    if (projectId === null) {
      router.push('/');
    } else {
      router.push(`/?projectId=${projectId}`);
    }
  };

  const handleDateClick = (date: string) => {
    setNewTaskScheduledFor(date);
  };

  return (
    <div className="flex h-full gap-4">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-4 overflow-y-auto">
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-white">Projects</h2>

          <button
            onClick={() =>
              handleSelectProject(null)
            }
            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
              !selectedProjectId
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-700'
            }`}
          >
            📋 All Tasks
          </button>

          {projects.map((project) => (
            <div
              key={project.id}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group ${
                selectedProjectId === project.id.toString()
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
              onClick={() => handleSelectProject(project.id)}
            >
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: project.color }}
              />
              <span className="text-sm truncate">{project.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteProject(project.id);
                }}
                className="ml-auto px-2 py-1 rounded opacity-0 group-hover:opacity-100 bg-red-600 hover:bg-red-700 text-xs transition-all"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* New Project Form */}
        {showNewProjectForm ? (
          <form
            onSubmit={handleCreateProject}
            className="space-y-2 bg-slate-700 p-3 rounded-lg"
          >
            <input
              type="text"
              placeholder="Project name"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full px-2 py-1 bg-slate-600 text-white text-sm rounded border border-slate-500 focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <div className="flex gap-2 items-center">
              <label className="text-xs text-slate-300">Color:</label>
              <input
                type="color"
                value={newProjectColor}
                onChange={(e) => setNewProjectColor(e.target.value)}
                className="w-8 h-6 rounded cursor-pointer"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewProjectForm(false);
                  setNewProjectName('');
                }}
                className="flex-1 px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white text-sm rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowNewProjectForm(true)}
            className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
          >
            + New Project
          </button>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-4">
        {/* View Mode Toggle */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            📝 List
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              viewMode === 'calendar'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            📅 Calendar
          </button>
        </div>

        {/* Calendar View */}
        {viewMode === 'calendar' && (
          <Calendar days={calendarDays} onDateClick={handleDateClick} />
        )}

        {/* Task List View */}
        {viewMode === 'list' && (
          <>
            {/* New Task Form */}
            {showNewTaskForm ? (
              <form
                onSubmit={handleCreateTask}
                className="bg-slate-800 rounded-lg border border-slate-700 p-4 space-y-3"
              >
                <div>
                  <input
                    type="text"
                    placeholder="Task title"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 text-white rounded border border-slate-600 focus:outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Due Date
                    </label>
                    <input
                      type="datetime-local"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-700 text-white text-xs rounded border border-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Schedule For
                    </label>
                    <input
                      type="datetime-local"
                      value={newTaskScheduledFor}
                      onChange={(e) => setNewTaskScheduledFor(e.target.value)}
                      className="w-full px-2 py-1 bg-slate-700 text-white text-xs rounded border border-slate-600 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Recurrence Section */}
                {showRecurrenceForm ? (
                  <RecurrenceForm
                    onSubmit={(pattern) => {
                      setRecurrenceData(pattern);
                      setShowRecurrenceForm(false);
                    }}
                    onCancel={() => setShowRecurrenceForm(false)}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowRecurrenceForm(true)}
                    className="w-full px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded transition-colors"
                  >
                    {recurrenceData ? '✓ Recurrence Set' : '+ Add Recurrence'}
                  </button>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors"
                  >
                    Create Task
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewTaskForm(false);
                      setNewTaskTitle('');
                      setNewTaskDueDate('');
                      setNewTaskScheduledFor('');
                      setRecurrenceData(null);
                      setShowRecurrenceForm(false);
                    }}
                    className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setShowNewTaskForm(true)}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                + New Task
              </button>
            )}

            {/* Task List */}
            {isLoading ? (
              <div className="text-center text-slate-400 py-8">Loading...</div>
            ) : tasks.length === 0 ? (
              <div className="text-center text-slate-400 py-8">
                No tasks yet. Create one to get started!
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto">
                {tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onUpdate={() => {
                      const projectId = selectedProjectId
                        ? parseInt(selectedProjectId)
                        : undefined;
                      getTasks(projectId)
                        .then(setTasks)
                        .catch(console.error);
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};
