import { TaskManager } from './components/TaskManager';
import { getTasks } from './actions';

export default async function Page() {
  let tasks = [];
  try {
    tasks = await getTasks(true);
  } catch (err) {
    console.error('Failed to fetch tasks:', err);
  }

  return <TaskManager initialTasks={tasks} />;
}
