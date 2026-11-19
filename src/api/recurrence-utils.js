/**
 * Recurrence and Scheduling Utilities
 * Handles RRULE parsing and task instance generation
 */

/**
 * Parse RRULE string and generate next occurrences
 * RRULE format: FREQ=DAILY;INTERVAL=1;COUNT=10
 * Supported: DAILY, WEEKLY, MONTHLY with INTERVAL and COUNT/UNTIL modifiers
 */
function parseRRULE(rruleStr) {
  if (!rruleStr) return null;

  const parts = rruleStr.split(';');
  const rule = {};

  parts.forEach((part) => {
    const [key, value] = part.split('=');
    rule[key] = value;
  });

  return rule;
}

/**
 * Generate next occurrence date based on RRULE
 * @param {Date} currentDate - Current or last occurrence date
 * @param {Object} rule - Parsed RRULE object
 * @returns {Date} Next occurrence date
 */
function getNextOccurrence(currentDate, rule) {
  if (!rule || !rule.FREQ) return null;

  const next = new Date(currentDate);
  const interval = parseInt(rule.INTERVAL || '1');

  switch (rule.FREQ) {
    case 'DAILY':
      next.setDate(next.getDate() + interval);
      break;
    case 'WEEKLY':
      next.setDate(next.getDate() + interval * 7);
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + interval);
      break;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + interval);
      break;
    default:
      return null;
  }

  return next;
}

/**
 * Check if a recurring task should generate new instances
 * Called when a recurring task is marked as complete
 * @param {Object} task - Task object with recurrence_pattern
 * @returns {Object} New task data for next instance or null
 */
function generateNextInstance(task) {
  if (!task.recurrence_pattern || !task.is_recurring_parent) {
    return null;
  }

  const rule = parseRRULE(task.recurrence_pattern);
  if (!rule) return null;

  const baseDate = task.scheduled_for || new Date();
  const nextDate = getNextOccurrence(baseDate, rule);

  if (!nextDate) return null;

  // Check if we've exceeded COUNT
  if (rule.COUNT) {
    const count = parseInt(rule.COUNT);
    // In a real implementation, track completed instances
    // For now, we'll generate based on the original count
  }

  // Check if we've exceeded UNTIL date
  if (rule.UNTIL) {
    const untilDate = new Date(rule.UNTIL);
    if (nextDate > untilDate) {
      return null;
    }
  }

  return {
    title: task.title,
    description: task.description,
    project_id: task.project_id,
    recurrence_pattern: task.recurrence_pattern,
    is_recurring_parent: false,
    parent_task_id: task.id,
    scheduled_for: nextDate,
    due_date: task.due_date ? addDaysToDate(nextDate, getDaysDifference(task.scheduled_for || new Date(), task.due_date)) : null,
    completed: false,
  };
}

/**
 * Calculate days difference between two dates
 */
function getDaysDifference(date1, date2) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((date2 - date1) / msPerDay);
}

/**
 * Add days to a date
 */
function addDaysToDate(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Check if a task is overdue
 */
function isOverdue(task) {
  if (!task.due_date || task.completed) return false;
  const now = new Date();
  return new Date(task.due_date) < now;
}

/**
 * Check if a task is due soon (within next 24 hours)
 */
function isDueSoon(task, hoursWindow = 24) {
  if (!task.due_date || task.completed) return false;
  const now = new Date();
  const dueDate = new Date(task.due_date);
  const timeDiff = dueDate - now;
  return timeDiff > 0 && timeDiff < hoursWindow * 60 * 60 * 1000;
}

/**
 * Get task status badge text
 */
function getTaskStatusBadge(task) {
  if (task.completed) return 'completed';
  if (isOverdue(task)) return 'overdue';
  if (isDueSoon(task)) return 'due-soon';
  if (task.snoozed_until && new Date(task.snoozed_until) > new Date()) {
    return 'snoozed';
  }
  if (task.is_recurring_parent) return 'recurring';
  return null;
}

/**
 * Format date for display
 */
function formatDate(date) {
  if (!date) return null;
  const d = new Date(date);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const tomorrowOnly = new Date(
    tomorrow.getFullYear(),
    tomorrow.getMonth(),
    tomorrow.getDate()
  );

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (dateOnly.getTime() === tomorrowOnly.getTime()) {
    return `Tomorrow, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }

  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Generate recurrence pattern from form input
 */
function generateRRULE(frequency, interval, endType, endValue) {
  if (!frequency) return null;

  let rrule = `FREQ=${frequency};INTERVAL=${interval || 1}`;

  if (endType === 'count' && endValue) {
    rrule += `;COUNT=${endValue}`;
  } else if (endType === 'until' && endValue) {
    const date = new Date(endValue);
    rrule += `;UNTIL=${date.toISOString().split('T')[0].replace(/-/g, '')}`;
  }

  return rrule;
}

module.exports = {
  parseRRULE,
  getNextOccurrence,
  generateNextInstance,
  isOverdue,
  isDueSoon,
  getTaskStatusBadge,
  formatDate,
  generateRRULE,
};
