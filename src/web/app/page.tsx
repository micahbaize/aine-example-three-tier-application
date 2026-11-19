import { getProjects, getTasks } from './actions';
import { TaskManager } from './components/TaskManager';

export default async function Home() {
  const tasks = await getTasks();
  const projects = await getProjects();

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-white">Task Manager</h1>

        <div className="h-[calc(100vh-150px)]">
          <TaskManager initialTasks={tasks} initialProjects={projects} />
        </div>
      </div>
    </div>
  );
}
