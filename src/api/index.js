const express = require('express');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ============ PROJECTS ENDPOINTS ============

// GET /projects — list all projects
app.get('/projects', async (_req, res) => {
  const { rows } = await db.query('SELECT * FROM projects ORDER BY created_at ASC');
  res.json(rows);
});

// POST /projects — create a new project
app.post('/projects', async (req, res) => {
  const { name, description = '', color = '#3b82f6' } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  const { rows } = await db.query(
    'INSERT INTO projects (name, description, color) VALUES ($1, $2, $3) RETURNING *',
    [name.trim(), description.trim(), color]
  );
  res.status(201).json(rows[0]);
});

// PATCH /projects/:id — update a project
app.patch('/projects/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { name, description, color } = req.body;

  const { rows } = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });

  const current = rows[0];
  const newName = name !== undefined ? name.trim() : current.name;
  const newDescription = description !== undefined ? description.trim() : current.description;
  const newColor = color !== undefined ? color : current.color;

  const { rows: updated } = await db.query(
    'UPDATE projects SET name = $1, description = $2, color = $3 WHERE id = $4 RETURNING *',
    [newName, newDescription, newColor, id]
  );
  res.json(updated[0]);
});

// DELETE /projects/:id — delete a project (and its tasks)
app.delete('/projects/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { rows } = await db.query('SELECT * FROM projects WHERE id = $1', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Project not found' });

  await db.query('DELETE FROM projects WHERE id = $1', [id]);
  res.json({ success: true });
});

// ============ TASKS ENDPOINTS ============

// GET /tasks — list all tasks, optionally filtered by project
app.get('/tasks', async (req, res) => {
  const { projectId } = req.query;
  
  if (projectId) {
    const projectIdNum = parseInt(projectId, 10);
    const { rows } = await db.query(
      'SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at ASC',
      [projectIdNum]
    );
    return res.json(rows);
  }

  const { rows } = await db.query('SELECT * FROM tasks ORDER BY created_at ASC');
  res.json(rows);
});

// POST /tasks — create a task
app.post('/tasks', async (req, res) => {
  const { title, projectId } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }

  // Verify project exists if provided
  if (projectId) {
    const { rows: projectRows } = await db.query('SELECT * FROM projects WHERE id = $1', [projectId]);
    if (projectRows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
  }

  const { rows } = await db.query(
    'INSERT INTO tasks (title, project_id) VALUES ($1, $2) RETURNING *',
    [title.trim(), projectId || null]
  );
  res.status(201).json(rows[0]);
});

// PATCH /tasks/:id — update a task (complete/uncomplete, rename, or change project)
app.patch('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { completed, title, projectId } = req.body;

  const { rows } = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

  const current = rows[0];
  const newCompleted = completed !== undefined ? Boolean(completed) : current.completed;
  const newTitle = title !== undefined ? title.trim() : current.title;
  const newProjectId = projectId !== undefined ? projectId : current.project_id;

  // Verify project exists if being changed
  if (newProjectId && newProjectId !== current.project_id) {
    const { rows: projectRows } = await db.query('SELECT * FROM projects WHERE id = $1', [newProjectId]);
    if (projectRows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
  }

  const { rows: updated } = await db.query(
    'UPDATE tasks SET completed = $1, title = $2, project_id = $3 WHERE id = $4 RETURNING *',
    [newCompleted, newTitle, newProjectId, id]
  );
  res.json(updated[0]);
});

// DELETE /tasks/:id — delete a task
app.delete('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { rows } = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

  await db.query('DELETE FROM tasks WHERE id = $1', [id]);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
