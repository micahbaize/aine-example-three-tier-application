const express = require('express');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Helper function: Check if a task can be marked complete (all subtasks must be complete)
async function canCompleteTask(taskId) {
  const { rows } = await db.query(
    'SELECT COUNT(*) as incomplete_count FROM tasks WHERE parent_id = $1 AND completed = false',
    [taskId]
  );
  return rows[0].incomplete_count === 0;
}

// Helper function: Get task with subtasks (recursive tree structure)
async function getTaskWithSubtasks(taskId) {
  const { rows: taskRows } = await db.query(
    'SELECT * FROM tasks WHERE id = $1',
    [taskId]
  );
  if (taskRows.length === 0) return null;

  const task = taskRows[0];
  const { rows: subtasks } = await db.query(
    'SELECT * FROM tasks WHERE parent_id = $1 ORDER BY position ASC, created_at ASC',
    [taskId]
  );

  // Recursively get subtasks for each subtask
  task.subtasks = await Promise.all(subtasks.map(st => getTaskWithSubtasks(st.id)));
  return task;
}

// GET /tasks — list all root-level tasks (no parent)
app.get('/tasks', async (req, res) => {
  const { includeSubtasks } = req.query;
  const { rows } = await db.query(
    'SELECT * FROM tasks WHERE parent_id IS NULL ORDER BY position ASC, created_at ASC'
  );

  if (includeSubtasks === 'true') {
    const tasksWithSubtasks = await Promise.all(
      rows.map(task => getTaskWithSubtasks(task.id))
    );
    return res.json(tasksWithSubtasks);
  }

  res.json(rows);
});

// GET /tasks/:id/subtasks — get all subtasks of a task
app.get('/tasks/:id/subtasks', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { rows } = await db.query(
    'SELECT * FROM tasks WHERE parent_id = $1 ORDER BY position ASC, created_at ASC',
    [id]
  );
  res.json(rows);
});

// GET /tasks/:id/tree — get task with full subtask tree
app.get('/tasks/:id/tree', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const task = await getTaskWithSubtasks(id);
  if (!task) return res.status(404).json({ error: 'Not found' });
  res.json(task);
});

// POST /tasks — create a task
app.post('/tasks', async (req, res) => {
  const { title, parent_id, position } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }

  // If creating a subtask, validate parent exists
  if (parent_id !== undefined && parent_id !== null) {
    const { rows: parentRows } = await db.query('SELECT * FROM tasks WHERE id = $1', [parent_id]);
    if (parentRows.length === 0) {
      return res.status(400).json({ error: 'parent_id does not exist' });
    }
  }

  const { rows } = await db.query(
    'INSERT INTO tasks (title, parent_id, position) VALUES ($1, $2, $3) RETURNING *',
    [title.trim(), parent_id || null, position || 0]
  );
  res.status(201).json(rows[0]);
});

// PATCH /tasks/:id — update a task
app.patch('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { completed, title, parent_id, position } = req.body;

  const { rows } = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

  const current = rows[0];

  // If trying to mark as complete, check all subtasks are complete
  let newCompleted = completed;
  if (completed === true) {
    const canComplete = await canCompleteTask(id);
    if (!canComplete) {
      return res.status(400).json({
        error: 'Cannot complete task with incomplete subtasks',
      });
    }
    newCompleted = true;
  } else if (completed !== undefined) {
    newCompleted = Boolean(completed);
  } else {
    newCompleted = current.completed;
  }

  const newTitle = title !== undefined ? title.trim() : current.title;
  const newParentId = parent_id !== undefined ? parent_id : current.parent_id;
  const newPosition = position !== undefined ? position : current.position;

  // Prevent task from becoming its own parent (circular dependency)
  if (newParentId === id) {
    return res.status(400).json({ error: 'Task cannot be its own parent' });
  }

  // Prevent moving a task to be a child of its own child (circular dependency)
  if (newParentId) {
    let checkId = newParentId;
    let depth = 0;
    const maxDepth = 100; // Prevent infinite loops
    while (checkId && depth < maxDepth) {
      if (checkId === id) {
        return res.status(400).json({ error: 'Cannot create circular dependency' });
      }
      const { rows: checkRows } = await db.query(
        'SELECT parent_id FROM tasks WHERE id = $1',
        [checkId]
      );
      checkId = checkRows.length > 0 ? checkRows[0].parent_id : null;
      depth++;
    }
  }

  const { rows: updated } = await db.query(
    'UPDATE tasks SET completed = $1, title = $2, parent_id = $3, position = $4 WHERE id = $5 RETURNING *',
    [newCompleted, newTitle, newParentId, newPosition, id]
  );
  res.json(updated[0]);
});

// DELETE /tasks/:id — delete a task (cascades to subtasks)
app.delete('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { rows } = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

  await db.query('DELETE FROM tasks WHERE id = $1', [id]);
  res.status(204).send();
});

// POST /tasks/:id/reorder — reorder subtasks
app.post('/tasks/:id/reorder', async (req, res) => {
  const parentId = parseInt(req.params.id, 10);
  const { order } = req.body; // array of task IDs in new order

  if (!Array.isArray(order)) {
    return res.status(400).json({ error: 'order must be an array of task IDs' });
  }

  try {
    // Update position for each task
    for (let i = 0; i < order.length; i++) {
      const taskId = order[i];
      await db.query(
        'UPDATE tasks SET position = $1 WHERE id = $2 AND parent_id = $3',
        [i, taskId, parentId]
      );
    }

    // Return updated tasks
    const { rows } = await db.query(
      'SELECT * FROM tasks WHERE parent_id = $1 ORDER BY position ASC',
      [parentId]
    );
    res.json(rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
