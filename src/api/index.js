const express = require('express');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// GET /categories — list all categories
app.get('/categories', async (_req, res) => {
  const { rows } = await db.query('SELECT * FROM categories ORDER BY created_at ASC');
  res.json(rows);
});

// POST /categories — create a category
app.post('/categories', async (req, res) => {
  const { name, color } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  const categoryColor = color || '#6366F1';
  const { rows } = await db.query(
    'INSERT INTO categories (name, color) VALUES ($1, $2) RETURNING *',
    [name.trim(), categoryColor]
  );
  res.status(201).json(rows[0]);
});

// DELETE /categories/:id — delete a category (sets tasks' category_id to null)
app.delete('/categories/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { rows } = await db.query('SELECT * FROM categories WHERE id = $1', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

  // Set all tasks with this category to null
  await db.query('UPDATE tasks SET category_id = NULL WHERE category_id = $1', [id]);
  // Delete the category
  await db.query('DELETE FROM categories WHERE id = $1', [id]);
  
  res.json({ message: 'Category deleted' });
});

// GET /tasks — list all tasks (with optional category_id filter)
app.get('/tasks', async (req, res) => {
  const { category_id } = req.query;
  
  let query = `
    SELECT t.*, c.name as category_name, c.color as category_color
    FROM tasks t
    LEFT JOIN categories c ON t.category_id = c.id
  `;
  let params = [];

  if (category_id !== undefined) {
    query += ' WHERE t.category_id = $1';
    params = [parseInt(category_id, 10)];
  }

  query += ' ORDER BY t.created_at ASC';
  
  const { rows } = await db.query(query, params);
  res.json(rows);
});

// POST /tasks — create a task (with optional category_id)
app.post('/tasks', async (req, res) => {
  const { title, category_id } = req.body;
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  
  const { rows } = await db.query(
    `INSERT INTO tasks (title, category_id) VALUES ($1, $2)
     RETURNING t.*, c.name as category_name, c.color as category_color
     FROM tasks t
     LEFT JOIN categories c ON t.category_id = c.id
     WHERE t.id = (SELECT currval(pg_get_serial_sequence('tasks', 'id')))`,
    [title.trim(), category_id || null]
  );
  
  // Simpler approach: just return the inserted task with category info if available
  const insertRes = await db.query(
    'INSERT INTO tasks (title, category_id) VALUES ($1, $2) RETURNING *',
    [title.trim(), category_id || null]
  );
  
  let finalRes = insertRes.rows[0];
  
  if (category_id) {
    const catRes = await db.query('SELECT name, color FROM categories WHERE id = $1', [category_id]);
    if (catRes.rows.length > 0) {
      finalRes.category_name = catRes.rows[0].name;
      finalRes.category_color = catRes.rows[0].color;
    }
  }
  
  res.status(201).json(finalRes);
});

// PATCH /tasks/:id — update a task (complete/uncomplete, rename, or change category)
app.patch('/tasks/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { completed, title, category_id } = req.body;

  const { rows } = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
  if (rows.length === 0) return res.status(404).json({ error: 'Not found' });

  const current = rows[0];
  const newCompleted = completed !== undefined ? Boolean(completed) : current.completed;
  const newTitle = title !== undefined ? title.trim() : current.title;
  const newCategoryId = category_id !== undefined ? (category_id || null) : current.category_id;

  const { rows: updated } = await db.query(
    'UPDATE tasks SET completed = $1, title = $2, category_id = $3 WHERE id = $4 RETURNING *',
    [newCompleted, newTitle, newCategoryId, id]
  );
  
  let result = updated[0];
  
  if (result.category_id) {
    const catRes = await db.query('SELECT name, color FROM categories WHERE id = $1', [result.category_id]);
    if (catRes.rows.length > 0) {
      result.category_name = catRes.rows[0].name;
      result.category_color = catRes.rows[0].color;
    }
  }
  
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
