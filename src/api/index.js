const express = require('express');
const db = require('./db');
const JobQueue = require('./job-queue');
const { generateRRULE, formatDate } = require('./recurrence-utils');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize job queue
const jobQueue = new JobQueue(60000); // Check every minute
jobQueue.start();

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// ============ TASKS ENDPOINTS ============

// GET /tasks — list all tasks with optional filtering
app.get('/tasks', async (req, res) => {
  try {
    const { projectId, onlyScheduled, onlyRecurring, includeSnoozed } = req.query;

    let query = `
      SELECT t.*, 
             p.name as project_name,
             p.color as project_color,
             (SELECT COUNT(*) FROM tasks WHERE parent_task_id = t.id) as instances_count
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (projectId) {
      query += ` AND t.project_id = $${params.length + 1}`;
      params.push(parseInt(projectId));
    }

    if (onlyScheduled === 'true') {
      query += ` AND t.scheduled_for IS NOT NULL`;
    }

    if (onlyRecurring === 'true') {
      query += ` AND t.is_recurring_parent = true`;
    }

    if (includeSnoozed !== 'true') {
      query += ` AND (t.snoozed_until IS NULL OR t.snoozed_until <= NOW())`;
    }

    query += ` ORDER BY 
      CASE WHEN t.snoozed_until > NOW() THEN 1 ELSE 0 END,
      t.due_date ASC NULLS LAST,
      t.scheduled_for ASC NULLS LAST,
      t.created_at ASC
    `;

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /tasks — create a task with optional recurrence and scheduling
app.post('/tasks', async (req, res) => {
  try {
    const {
      title,
      description,
      projectId,
      recurrence,
      scheduledFor,
      dueDate,
    } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }

    let recurrencePattern = null;
    let isRecurringParent = false;

    // Generate RRULE if recurrence is provided
    if (recurrence) {
      recurrencePattern = generateRRULE(
        recurrence.frequency,
        recurrence.interval,
        recurrence.endType,
        recurrence.endValue
      );
      isRecurringParent = !!recurrencePattern;
    }

    const query = `
      INSERT INTO tasks (
        title, description, project_id, recurrence_pattern,
        is_recurring_parent, scheduled_for, due_date, completed, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, false, NOW())
      RETURNING *
    `;

    const values = [
      title.trim(),
      description || null,
      projectId || null,
      recurrencePattern,
      isRecurringParent,
      scheduledFor || null,
      dueDate || null,
    ];

    const { rows } = await db.query(query, values);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /tasks/:id — update a task
app.patch('/tasks/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const {
      completed,
      title,
      description,
      projectId,
      scheduledFor,
      dueDate,
      snoozedUntil,
    } = req.body;

    const { rows } = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    const current = rows[0];

    // Prepare update values
    const updates = {};
    if (completed !== undefined) {
      updates.completed = Boolean(completed);
    }
    if (title !== undefined) {
      updates.title = title.trim();
    }
    if (description !== undefined) {
      updates.description = description;
    }
    if (projectId !== undefined) {
      updates.project_id = projectId;
    }
    if (scheduledFor !== undefined) {
      updates.scheduled_for = scheduledFor;
    }
    if (dueDate !== undefined) {
      updates.due_date = dueDate;
    }
    if (snoozedUntil !== undefined) {
      updates.snoozed_until = snoozedUntil;
    }

    // Build dynamic update query
    const setClauses = [];
    const values = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      setClauses.push(`${key} = $${paramCount}`);
      values.push(value);
      paramCount++;
    });

    if (setClauses.length === 0) {
      return res.json(current);
    }

    values.push(id);
    const query = `
      UPDATE tasks 
      SET ${setClauses.join(', ')} 
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const { rows: updated } = await db.query(query, values);

    // Handle recurring task completion - generate next instance
    if (updated[0].completed && current.recurrence_pattern) {
      JobQueue.handleRecurringTaskCompletion(id).catch((err) =>
        console.error('Error handling recurring task:', err)
      );
    }

    res.json(updated[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /tasks/:id — delete a task
app.delete('/tasks/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const { rows } = await db.query('SELECT * FROM tasks WHERE id = $1', [id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    await db.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ NOTIFICATIONS ENDPOINTS ============

// GET /notifications — get notifications for a task
app.get('/tasks/:taskId/notifications', async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId, 10);
    const { rows } = await db.query(
      `SELECT * FROM notifications 
       WHERE task_id = $1 
       ORDER BY created_at DESC`,
      [taskId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /notifications/:id/dismiss — dismiss a notification
app.patch('/notifications/:id/dismiss', async (req, res) => {
  try {
    const notificationId = parseInt(req.params.id, 10);
    await JobQueue.dismissNotification(notificationId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error dismissing notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ PROJECTS ENDPOINTS ============

// GET /projects — list all projects
app.get('/projects', async (_req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM projects ORDER BY created_at ASC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /projects — create a project
app.post('/projects', async (req, res) => {
  try {
    const { name, description, color } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const { rows } = await db.query(
      `INSERT INTO projects (name, description, color, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [name.trim(), description || null, color || '#3b82f6']
    );

    res.status(201).json(rows[0]);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /projects/:id — update a project
app.patch('/projects/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, description, color } = req.body;

    const { rows: current } = await db.query(
      'SELECT * FROM projects WHERE id = $1',
      [id]
    );

    if (current.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    const { rows } = await db.query(
      `UPDATE projects 
       SET name = $1, description = $2, color = $3
       WHERE id = $4
       RETURNING *`,
      [
        name || current[0].name,
        description !== undefined ? description : current[0].description,
        color || current[0].color,
        id,
      ]
    );

    res.json(rows[0]);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /projects/:id — delete a project
app.delete('/projects/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const { rows } = await db.query('SELECT * FROM projects WHERE id = $1', [
      id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    await db.query('DELETE FROM projects WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ CALENDAR ENDPOINTS ============

// GET /calendar — get tasks organized by date
app.get('/calendar', async (req, res) => {
  try {
    const { startDate, endDate, projectId } = req.query;

    let query = `
      SELECT 
        DATE(COALESCE(t.scheduled_for, t.due_date)) as date,
        COUNT(*) as task_count,
        SUM(CASE WHEN t.completed = true THEN 1 ELSE 0 END) as completed_count,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', t.id,
            'title', t.title,
            'completed', t.completed,
            'due_date', t.due_date,
            'scheduled_for', t.scheduled_for
          )
        ) as tasks
      FROM tasks t
      WHERE (t.scheduled_for IS NOT NULL OR t.due_date IS NOT NULL)
      AND t.snoozed_until IS NULL
    `;

    const params = [];

    if (projectId) {
      query += ` AND t.project_id = $${params.length + 1}`;
      params.push(parseInt(projectId));
    }

    if (startDate) {
      query += ` AND COALESCE(t.scheduled_for, t.due_date) >= $${params.length + 1}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND COALESCE(t.scheduled_for, t.due_date) <= $${params.length + 1}`;
      params.push(endDate);
    }

    query += ` GROUP BY DATE(COALESCE(t.scheduled_for, t.due_date))
              ORDER BY date ASC`;

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Error fetching calendar:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  jobQueue.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  jobQueue.stop();
  process.exit(0);
});
