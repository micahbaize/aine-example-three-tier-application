import { Suspense } from 'react';
import { getTasks, getProjects } from './actions';
import TaskManager from './components/TaskManager';

export default async function Home() {
  const [projects, tasks] = await Promise.all([
    getProjects(),
    getTasks(),
  ]);

  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50 dark:bg-zinc-900" />}>
      <TaskManager initialProjects={projects} initialTasks={tasks} />
    </Suspense>
  );
}
