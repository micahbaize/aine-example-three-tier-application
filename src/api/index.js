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

// ============ TASK HIERARCHY HELPERS ============

// Parse a positive integer route/body id; returns null when invalid.
function parseId(value) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

// Ids of all descendants of taskId (children, grandchildren, ...).
async function getDescendantIds(taskId, client = db) {
  const { rows } = await client.query(
    `WITH RECURSIVE subtree AS (
       SELECT id FROM tasks WHERE parent_id = $1
       UNION ALL
       SELECT t.id FROM tasks t JOIN subtree s ON t.parent_id = s.id
     )
     SELECT id FROM subtree`,
    [taskId]
  );
  return rows.map((r) => r.id);
}

// Number of incomplete descendants of a task (0 means the whole subtree is done).
async function countIncompleteDescendants(taskId) {
  const { rows } = await db.query(
    `WITH RECURSIVE subtree AS (
       SELECT id, completed FROM tasks WHERE parent_id = $1
       UNION ALL
       SELECT t.id, t.completed FROM tasks t JOIN subtree s ON t.parent_id = s.id
     )
     SELECT COUNT(*)::int AS n FROM subtree WHERE completed = false`,
    [taskId]
  );
  return rows[0].n;
}

// True when candidateId is taskId itself or one of its descendants.
// Making such a node the parent of taskId would create a cycle.
async function isSelfOrDescendant(taskId, candidateId) {
  if (taskId === candidateId) return true;
  const descendants = await getDescendantIds(taskId);
  return descendants.includes(candidateId);
}

// Next free position among the siblings of parentId (null = root tasks).
async function nextPosition(parentId, client = db) {
  const { rows } = await client.query(
    'SELECT COALESCE(MAX(position), -1) + 1 AS next FROM tasks WHERE parent_id IS NOT DISTINCT FROM $1',
    [parentId]
  );
  return rows[0].next;
}

// ============ TASKS ENDPOINTS ============

// GET /tasks — list all tasks (flat), optionally filtered by project.
// Clients rebuild the tree from parent_id and order siblings by position.
app.get('/tasks', async (req, res) => {
  const { projectId } = req.query;

  if (projectId) {
    const projectIdNum = parseId(projectId);
    if (projectIdNum === null) return res.status(400).json({ error: 'projectId must be a positive integer' });
    const { rows } = await db.query(
      'SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at ASC, id ASC',
      [projectIdNum]
    );
    return res.json(rows);
  }

  const { rows } = await db.query('SELECT * FROM tasks ORDER BY created_at ASC, id ASC');
  res.json(rows);
});

// GET /tasks/:id/subtasks — direct children of a task, ordered by position
app.get('/tasks/:id/subtasks', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'Invalid id' });

  const { rows: exists } = await db.query('SELECT id FROM tasks WHERE id = $1', [id]);
  if (exists.length === 0) return res.status(404).json({ error: 'Not found' });

  const { rows } = await db.query(
    'SELECT * FROM tasks WHERE parent_id = $1 ORDER BY position ASC, id ASC',
    [id]
  );
  res.json(rows);
});

// Shared creation logic for POST /tasks and POST /tasks/:id/subtasks.
// Returns { status, body }.
async function createTask({ title, projectId, parentId }) {
  let resolvedProjectId = projectId || null;

  if (parentId !== null) {
    const { rows: parentRows } = await db.query('SELECT * FROM tasks WHERE id = $1', [parentId]);
    if (parentRows.length === 0) return { status: 404, body: { error: 'Parent task not found' } };
    // A completed parent cannot gain an incomplete child.
    if (parentRows[0].completed) {
      return { status: 409, body: { error: 'Cannot add a subtask to a completed task' } };
    }
    // A subtask always lives in its parent's project.
    resolvedProjectId = parentRows[0].project_id;
  } else if (resolvedProjectId) {
    const { rows: projectRows } = await db.query('SELECT * FROM projects WHERE id = $1', [resolvedProjectId]);
    if (projectRows.length === 0) return { status: 404, body: { error: 'Project not found' } };
  }

  const position = await nextPosition(parentId);
  const { rows } = await db.query(
    'INSERT INTO tasks (title, project_id, parent_id, position) VALUES ($1, $2, $3, $4) RETURNING *',
    [title.trim(), resolvedProjectId, parentId, position]
  );
  return { status: 201, body: rows[0] };
}

// POST /tasks — create a task (optionally with projectId, or under parentId)
app.post('/tasks', async (req, res) => {
  const { title, projectId, parentId } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }

  let parent = null;
  if (parentId !== undefined && parentId !== null) {
    parent = parseId(parentId);
    if (parent === null) return res.status(400).json({ error: 'parentId must be a positive integer' });
  }

  const result = await createTask({ title, projectId, parentId: parent });
  res.status(result.status).json(result.body);
});

// POST /tasks/:id/subtasks — create a child task under :id
app.post('/tasks/:id/subtasks', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'Invalid id' });

  const { title } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }

  const result = await createTask({ title, projectId: null, parentId: id });
  res.status(result.status).json(result.body);
});

// POST /tasks/:id/reorder — move a task to an index among its siblings.
// Body: { position: number }. Sibling positions are rewritten as 0..n-1.
app.post('/tasks/:id/reorder', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'Invalid id' });

  const target = Number(req.body.position);
  if (!Number.isInteger(target) || target < 0) {
    return res.status(400).json({ error: 'position must be a non-negative integer' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows: found } = await client.query('SELECT parent_id FROM tasks WHERE id = $1 FOR UPDATE', [id]);
    if (found.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found' });
    }

    const { rows: siblings } = await client.query(
      'SELECT id FROM tasks WHERE parent_id IS NOT DISTINCT FROM $1 ORDER BY position ASC, id ASC FOR UPDATE',
      [found[0].parent_id]
    );
    const ordered = siblings.map((s) => s.id).filter((sid) => sid !== id);
    ordered.splice(Math.min(target, ordered.length), 0, id);

    for (let i = 0; i < ordered.length; i++) {
      await client.query('UPDATE tasks SET position = $1 WHERE id = $2', [i, ordered[i]]);
    }
    await client.query('COMMIT');

    const { rows } = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
    res.json(rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// PATCH /tasks/:id — update a task (complete/uncomplete, rename, change project, change parent)
app.patch('/tasks/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'Invalid id' });

  const { completed, title, projectId, parentId } = req.body;

  const { rows } = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

  const current = rows[0];
  const newCompleted = completed !== undefined ? Boolean(completed) : current.completed;
  const newTitle = title !== undefined ? title.trim() : current.title;
  const newProjectId = projectId !== undefined ? projectId : current.project_id;

  // parentId: null makes the task a root task; a number reparents it.
  let newParentId = current.parent_id;
  if (parentId !== undefined) {
    if (parentId === null) {
      newParentId = null;
    } else {
      newParentId = parseId(parentId);
      if (newParentId === null) {
        return res.status(400).json({ error: 'parentId must be a positive integer or null' });
      }
    }
  }
  const reparenting = newParentId !== current.parent_id;

  if (reparenting && newParentId !== null) {
    if (await isSelfOrDescendant(id, newParentId)) {
      return res.status(409).json({ error: 'A task cannot be moved under itself or its own subtasks' });
    }
    const { rows: parentRows } = await db.query('SELECT * FROM tasks WHERE id = $1', [newParentId]);
    if (parentRows.length === 0) return res.status(404).json({ error: 'Parent task not found' });
    if (parentRows[0].completed && !newCompleted) {
      return res.status(409).json({ error: 'Cannot move an incomplete task under a completed parent' });
    }
  }

  // Completion rule: a task can only be completed when all of its subtasks are complete.
  if (newCompleted && !current.completed) {
    const incomplete = await countIncompleteDescendants(id);
    if (incomplete > 0) {
      return res.status(409).json({
        error: `Cannot complete task: ${incomplete} subtask(s) are not complete`,
        incompleteSubtasks: incomplete,
      });
    }
  }

  // Verify project exists if being changed
  if (newProjectId && newProjectId !== current.project_id) {
    const { rows: projectRows } = await db.query('SELECT * FROM projects WHERE id = $1', [newProjectId]);
    if (projectRows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const position = reparenting ? await nextPosition(newParentId, client) : current.position;
    const { rows: updated } = await client.query(
      'UPDATE tasks SET completed = $1, title = $2, project_id = $3, parent_id = $4, position = $5 WHERE id = $6 RETURNING *',
      [newCompleted, newTitle, newProjectId, newParentId, position, id]
    );

    // Moving a task to another project moves its whole subtree with it.
    if (newProjectId !== current.project_id) {
      const descendants = await getDescendantIds(id, client);
      if (descendants.length > 0) {
        await client.query('UPDATE tasks SET project_id = $1 WHERE id = ANY($2::int[])', [newProjectId, descendants]);
      }
    }
    await client.query('COMMIT');
    res.json(updated[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});

// DELETE /tasks/:id — delete a task (subtasks are removed by ON DELETE CASCADE)
app.delete('/tasks/:id', async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) return res.status(400).json({ error: 'Invalid id' });

  const { rows } = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

  await db.query('DELETE FROM tasks WHERE id = $1', [id]);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
