exports.up = (pgm) => {
  // Add recurrence and scheduling columns to tasks table
  pgm.addColumn('tasks', {
    recurrence_pattern: {
      type: 'text',
      notNull: false,
      default: null,
      comment: 'RRULE format for recurring tasks (e.g., FREQ=DAILY;INTERVAL=1)',
    },
    scheduled_for: {
      type: 'timestamp',
      notNull: false,
      default: null,
      comment: 'When this task instance is scheduled to occur',
    },
    due_date: {
      type: 'timestamp',
      notNull: false,
      default: null,
      comment: 'When this task is due',
    },
    parent_task_id: {
      type: 'integer',
      notNull: false,
      default: null,
      references: 'tasks(id)',
      onDelete: 'CASCADE',
      comment: 'Reference to parent recurring task if this is a generated instance',
    },
    is_recurring_parent: {
      type: 'boolean',
      notNull: true,
      default: false,
      comment: 'Whether this task is a parent recurring task',
    },
    snoozed_until: {
      type: 'timestamp',
      notNull: false,
      default: null,
      comment: 'When a snoozed task will reappear',
    },
  });

  // Create index for efficient querying
  pgm.createIndex('tasks', 'scheduled_for', { name: 'idx_tasks_scheduled_for' });
  pgm.createIndex('tasks', 'due_date', { name: 'idx_tasks_due_date' });
  pgm.createIndex('tasks', 'parent_task_id', { name: 'idx_tasks_parent_task_id' });
  pgm.createIndex('tasks', 'snoozed_until', { name: 'idx_tasks_snoozed_until' });

  // Create notifications table for job queue
  pgm.createTable('notifications', {
    id: { type: 'serial', primaryKey: true },
    task_id: {
      type: 'integer',
      notNull: true,
      references: 'tasks(id)',
      onDelete: 'CASCADE',
    },
    type: {
      type: 'varchar(50)',
      notNull: true,
      default: 'task_due',
      comment: 'Type of notification: task_due, task_overdue, task_scheduled, etc.',
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'pending',
      comment: 'Status: pending, sent, failed, dismissed',
    },
    scheduled_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('now()'),
      comment: 'When the notification should be sent',
    },
    sent_at: {
      type: 'timestamp',
      notNull: false,
      default: null,
      comment: 'When the notification was actually sent',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  // Index for efficient job queue queries
  pgm.createIndex('notifications', ['status', 'scheduled_at'], {
    name: 'idx_notifications_pending',
  });
  pgm.createIndex('notifications', 'task_id', {
    name: 'idx_notifications_task_id',
  });
};

exports.down = (pgm) => {
  // Drop indices
  pgm.dropIndex('notifications', 'idx_notifications_pending');
  pgm.dropIndex('notifications', 'idx_notifications_task_id');
  pgm.dropIndex('tasks', 'idx_tasks_scheduled_for');
  pgm.dropIndex('tasks', 'idx_tasks_due_date');
  pgm.dropIndex('tasks', 'idx_tasks_parent_task_id');
  pgm.dropIndex('tasks', 'idx_tasks_snoozed_until');

  // Drop tables
  pgm.dropTable('notifications');

  // Drop columns
  pgm.dropColumn('tasks', [
    'recurrence_pattern',
    'scheduled_for',
    'due_date',
    'parent_task_id',
    'is_recurring_parent',
    'snoozed_until',
  ]);
};
