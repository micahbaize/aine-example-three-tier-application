const express = require('express');
const app = express();
const port = 3001;

app.use(express.json());

// In-memory storage
const projects = [
  { id: 1, name: 'Work', description: 'Work tasks', color: '#3b82f6', created_at: new Date().toISOString() },
  { id: 2, name: 'Personal', description: 'Personal tasks', color: '#ef4444', created_at: new Date().toISOString() },
  { id: 3, name: 'Shopping', description: 'Shopping list', color: '#10b981', created_at: new Date().toISOString() },
];

const tasks = [
  { id: 1, title: 'Complete project proposal', completed: false, project_id: 1, created_at: new Date().toISOString() },
  { id: 2, title: 'Review meeting notes', completed: true, project_id: 1, created_at: new Date().toISOString() },
  { id: 3, title: 'Call mom', completed: false, project_id: 2, created_at: new Date().toISOString() },
  { id: 4, title: 'Milk', completed: false, project_id: 3, created_at: new Date().toISOString() },
  { id: 5, title: 'Bread', completed: true, project_id: 3, created_at: new Date().toISOString() },
  { id: 6, title: 'Unassigned task', completed: false, project_id: null, created_at: new Date().toISOString() },
];

let nextTaskId = 7;
let nextProjectId = 4;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ========== PROJECTS ==========
app.get('/projects', (req, res) => {
  res.json(projects);
});

app.post('/projects', (req, res) => {
  const { name, description, color } = req.body;
  const project = {
    id: nextProjectId++,
    name,
    description,
    color,
    created_at: new Date().toISOString(),
  };
  projects.push(project);
  res.status(201).json(project);
});

app.patch('/projects/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const project = projects.find(p => p.id === id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  
  const { name, description, color } = req.body;
  Object.assign(project, { name, description, color });
  res.json(project);
});

app.delete('/projects/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = projects.findIndex(p => p.id === id);
  if (index === -1) return res.status(404).json({ error: 'Project not found' });
  
  // Cascade delete tasks
  const tasksToDelete = tasks.filter(t => t.project_id === id);
  for (const task of tasksToDelete) {
    const taskIndex = tasks.findIndex(t => t.id === task.id);
    if (taskIndex !== -1) tasks.splice(taskIndex, 1);
  }
  
  projects.splice(index, 1);
  res.status(204).send();
});

// ========== TASKS ==========
app.get('/tasks', (req, res) => {
  const projectId = req.query.projectId;
  if (projectId) {
    const filtered = tasks.filter(t => t.project_id === parseInt(projectId));
    return res.json(filtered);
  }
  res.json(tasks);
});

app.post('/tasks', (req, res) => {
  const { title, projectId } = req.body;
  const task = {
    id: nextTaskId++,
    title,
    completed: false,
    project_id: projectId || null,
    created_at: new Date().toISOString(),
  };
  tasks.push(task);
  res.status(201).json(task);
});

app.patch('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const task = tasks.find(t => t.id === id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  
  const { completed, projectId } = req.body;
  if (completed !== undefined) task.completed = completed;
  if (projectId !== undefined) task.project_id = projectId;
  res.json(task);
});

app.delete('/tasks/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const index = tasks.findIndex(t => t.id === id);
  if (index === -1) return res.status(404).json({ error: 'Task not found' });
  
  tasks.splice(index, 1);
  res.status(204).send();
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Mock API server running on port ${port}`);
});
