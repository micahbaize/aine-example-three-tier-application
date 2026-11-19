import { Suspense } from 'react';
import { getTasks, getProjects, Task, Project } from './actions';
import TaskManager from './components/TaskManager';

async function getInitialData() {
  try {
    const [projects, tasks] = await Promise.all([
      getProjects(),
      getTasks(),
    ]);
    return { projects, tasks };
  } catch (error) {
    console.error('Failed to fetch initial data:', error);
    // Return empty data for testing theme functionality
    return { projects: [], tasks: [] };
  }
}

export default async function Home() {
  const { projects, tasks } = await getInitialData();

  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50 dark:bg-zinc-900" />}>
      <TaskManager initialProjects={projects} initialTasks={tasks} />
    </Suspense>
  );
}
