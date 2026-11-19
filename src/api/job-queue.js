/**
 * Job Queue Service for Task Notifications and Recurrence
 * Uses polling mechanism (can be upgraded to Bull/RabbitMQ in production)
 */

const db = require('./db');
const { generateNextInstance, isOverdue } = require('./recurrence-utils');

class JobQueue {
  constructor(intervalMs = 60000) {
    this.intervalMs = intervalMs;
    this.isRunning = false;
  }

  /**
   * Start the job queue processor
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log(`[JobQueue] Started with interval ${this.intervalMs}ms`);
    this.processJobs();
  }

  /**
   * Stop the job queue processor
   */
  stop() {
    this.isRunning = false;
    console.log('[JobQueue] Stopped');
  }

  /**
   * Main job processing loop
   */
  async processJobs() {
    while (this.isRunning) {
      try {
        await this.checkAndCreateNotifications();
        await this.cleanupNotifications();
      } catch (error) {
        console.error('[JobQueue] Error processing jobs:', error);
      }

      // Sleep for the interval
      await new Promise((resolve) => setTimeout(resolve, this.intervalMs));
    }
  }

  /**
   * Check tasks for upcoming due dates and create notifications
   */
  async checkAndCreateNotifications() {
    try {
      const client = await db.connect();

      try {
        // Get overdue tasks without notifications
        const overdueResult = await client.query(`
          SELECT t.id FROM tasks t
          WHERE t.due_date < NOW()
          AND t.completed = false
          AND t.snoozed_until IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.task_id = t.id AND n.type = 'task_overdue' AND n.status = 'pending'
          )
          LIMIT 100
        `);

        for (const row of overdueResult.rows) {
          await client.query(`
            INSERT INTO notifications (task_id, type, status, scheduled_at)
            VALUES ($1, 'task_overdue', 'pending', NOW())
          `, [row.id]);
        }

        // Get tasks due in next 24 hours
        const upcomingResult = await client.query(`
          SELECT t.id FROM tasks t
          WHERE t.due_date > NOW()
          AND t.due_date <= NOW() + INTERVAL '24 hours'
          AND t.completed = false
          AND t.snoozed_until IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM notifications n
            WHERE n.task_id = t.id AND n.type = 'task_due' AND n.status = 'pending'
          )
          LIMIT 100
        `);

        for (const row of upcomingResult.rows) {
          await client.query(`
            INSERT INTO notifications (task_id, type, status, scheduled_at)
            VALUES ($1, 'task_due', 'pending', NOW())
          `, [row.id]);
        }

        console.log(
          `[JobQueue] Created notifications: ${overdueResult.rows.length} overdue, ${upcomingResult.rows.length} upcoming`
        );
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[JobQueue] Error checking notifications:', error);
    }
  }

  /**
   * Clean up old completed/dismissed notifications
   */
  async cleanupNotifications() {
    try {
      const client = await db.connect();

      try {
        const result = await client.query(`
          DELETE FROM notifications
          WHERE status IN ('sent', 'dismissed')
          AND created_at < NOW() - INTERVAL '7 days'
        `);

        if (result.rowCount > 0) {
          console.log(`[JobQueue] Cleaned up ${result.rowCount} old notifications`);
        }
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[JobQueue] Error cleaning up notifications:', error);
    }
  }

  /**
   * Get pending notifications for a task
   */
  static async getPendingNotifications(taskId) {
    try {
      const client = await db.connect();
      try {
        const result = await client.query(
          `SELECT * FROM notifications
           WHERE task_id = $1 AND status = 'pending'
           ORDER BY scheduled_at ASC`,
          [taskId]
        );
        return result.rows;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[JobQueue] Error getting notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as sent
   */
  static async markNotificationSent(notificationId) {
    try {
      const client = await db.connect();
      try {
        await client.query(
          `UPDATE notifications
           SET status = 'sent', sent_at = NOW()
           WHERE id = $1`,
          [notificationId]
        );
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[JobQueue] Error marking notification sent:', error);
    }
  }

  /**
   * Dismiss notification
   */
  static async dismissNotification(notificationId) {
    try {
      const client = await db.connect();
      try {
        await client.query(
          `UPDATE notifications
           SET status = 'dismissed'
           WHERE id = $1`,
          [notificationId]
        );
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[JobQueue] Error dismissing notification:', error);
    }
  }

  /**
   * Create recurring task instances when parent is completed
   */
  static async handleRecurringTaskCompletion(taskId) {
    try {
      const client = await db.connect();
      try {
        // Get the task
        const taskResult = await client.query(
          `SELECT * FROM tasks WHERE id = $1`,
          [taskId]
        );

        if (taskResult.rows.length === 0) return false;

        const task = taskResult.rows[0];
        let parentTask = task;

        // If this is a child task, get the parent
        if (task.parent_task_id) {
          const parentResult = await client.query(
            `SELECT * FROM tasks WHERE id = $1`,
            [task.parent_task_id]
          );
          if (parentResult.rows.length > 0) {
            parentTask = parentResult.rows[0];
          }
        }

        // Generate next instance if this is a recurring task
        if (parentTask.recurrence_pattern) {
          const nextTaskData = generateNextInstance(parentTask);
          if (nextTaskData) {
            const insertResult = await client.query(
              `INSERT INTO tasks (title, description, project_id, recurrence_pattern,
               is_recurring_parent, parent_task_id, scheduled_for, due_date, completed, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
               RETURNING *`,
              [
                nextTaskData.title,
                nextTaskData.description,
                nextTaskData.project_id,
                nextTaskData.recurrence_pattern,
                nextTaskData.is_recurring_parent,
                nextTaskData.parent_task_id,
                nextTaskData.scheduled_for,
                nextTaskData.due_date,
                nextTaskData.completed,
              ]
            );

            console.log(
              `[JobQueue] Created next instance for recurring task ${taskId}:`,
              insertResult.rows[0].id
            );
            return insertResult.rows[0];
          }
        }

        return false;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('[JobQueue] Error handling recurring task completion:', error);
      return false;
    }
  }
}

module.exports = JobQueue;
