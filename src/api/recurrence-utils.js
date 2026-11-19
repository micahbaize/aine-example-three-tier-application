/**
 * Recurrence and Scheduling Utilities
 * Handles RRULE parsing and task instance generation
 */

/**
 * Day name to day of week mapping (0=Sunday, 1=Monday, etc.)
 */
const dayNameMap = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6
};

/**
 * Parse RRULE string and return object with pattern details
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
 * Alias for parseRRULE to match test expectations
 */
function parseRecurrencePattern(rruleStr) {
  const rule = parseRRULE(rruleStr);
  if (!rule || !rule.FREQ) {
    throw new Error('Invalid recurrence pattern');
  }
  
  return {
    freq: rule.FREQ,
    interval: parseInt(rule.INTERVAL || '1'),
    count: rule.COUNT ? parseInt(rule.COUNT) : null,
    until: rule.UNTIL || null,
    byDay: rule.BYDAY ? rule.BYDAY.split(',') : [],
    byMonthDay: rule.BYMONTHDAY ? parseInt(rule.BYMONTHDAY) : null,
  };
}

/**
 * Get next occurrence for a specific day of week (BYDAY)
 * Returns the soonest upcoming day from the list
 */
function getNextDayOfWeek(currentDate, dayNames) {
  if (!dayNames || dayNames.length === 0) return null;

  const targetDays = dayNames.map(name => dayNameMap[name]).filter(d => d !== undefined);
  if (targetDays.length === 0) return null;

  let soonest = null;

  // Find the soonest day in the list
  for (let daysAhead = 1; daysAhead <= 13; daysAhead++) {
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + daysAhead);
    
    if (targetDays.includes(nextDate.getDay())) {
      soonest = nextDate;
      break;
    }
  }

  return soonest;
}

/**
 * Get next occurrence for a specific day of month (BYMONTHDAY)
 */
function getNextMonthDay(currentDate, dayOfMonth) {
  if (!dayOfMonth) return null;

  let next = new Date(currentDate);
  next.setDate(dayOfMonth);

  // If that date is in the past this month, move to next month
  if (next <= currentDate) {
    next.setMonth(next.getMonth() + 1);
    next.setDate(dayOfMonth);
  }

  return next;
}

/**
 * Generate next occurrence date based on RRULE string
 * @param {Date} currentDate - Current or last occurrence date
 * @param {String} rruleStr - RRULE string (e.g., "FREQ=DAILY;INTERVAL=1")
 * @returns {Date} Next occurrence date or null
 */
function getNextOccurrence(currentDate, rruleStr) {
  const rule = parseRRULE(rruleStr);
  if (!rule || !rule.FREQ) return null;

  const interval = parseInt(rule.INTERVAL || '1');
  let next = null;

  switch (rule.FREQ) {
    case 'DAILY':
      next = new Date(currentDate);
      next.setDate(next.getDate() + interval);
      break;

    case 'WEEKLY':
      // If BYDAY is specified, find next occurrence of those days
      if (rule.BYDAY) {
        next = getNextDayOfWeek(currentDate, rule.BYDAY.split(','));
      } else {
        // Default to same day of week + interval weeks
        next = new Date(currentDate);
        next.setDate(next.getDate() + interval * 7);
      }
      break;

    case 'MONTHLY':
      // If BYMONTHDAY is specified, use that day
      if (rule.BYMONTHDAY) {
        next = getNextMonthDay(currentDate, parseInt(rule.BYMONTHDAY));
      } else {
        // Default to same day of month + interval months
        next = new Date(currentDate);
        next.setMonth(next.getMonth() + interval);
      }
      break;

    case 'YEARLY':
      next = new Date(currentDate);
      next.setFullYear(next.getFullYear() + interval);
      break;

    default:
      return null;
  }

  if (!next) return null;

  // Check if we've exceeded UNTIL date
  if (rule.UNTIL) {
    const untilDate = new Date(rule.UNTIL);
    if (next > untilDate) {
      return null;
    }
  }

  return next;
}

/**
 * Check if a recurring task should generate new instances
 * Called when a recurring task is marked as complete
 * @param {Object} task - Task object with recurrence_pattern or recurrencePattern (camelCase)
 * @returns {Object} New task data for next instance or null
 */
function generateNextInstance(task) {
  // Support both snake_case and camelCase
  const pattern = task.recurrence_pattern || task.recurrencePattern;
  const scheduledFor = task.scheduled_for || task.scheduledFor;
  const endDate = task.recurrence_end_date || task.recurrenceEndDate;

  if (!pattern) {
    return null;
  }

  const rule = parseRRULE(pattern);
  if (!rule) return null;

  const baseDate = scheduledFor || new Date();
  const nextDate = getNextOccurrence(baseDate, pattern);

  if (!nextDate) return null;

  // Check if we've exceeded recurrence_end_date
  if (endDate) {
    const end = new Date(endDate);
    if (nextDate > end) {
      return null;
    }
  }

  const dueDate = task.due_date || task.dueDate;

  return {
    title: task.title,
    description: task.description,
    project_id: task.project_id || task.projectId,
    recurrence_pattern: pattern,
    is_recurring_parent: false,
    parent_task_id: task.id,
    parentTaskId: task.id, // Support camelCase in response
    scheduled_for: nextDate,
    scheduledFor: nextDate, // Support camelCase in response
    due_date: dueDate ? addDaysToDate(nextDate, getDaysDifference(baseDate, new Date(dueDate))) : null,
    dueDate: dueDate ? addDaysToDate(nextDate, getDaysDifference(baseDate, new Date(dueDate))) : null,
    completed: false,
  };
}

/**
 * Generate multiple recurrence instances
 * @param {Date} startDate - Start date for recurrence
 * @param {String} rruleStr - RRULE string
 * @param {Number} limit - Maximum number of instances to generate
 * @returns {Array<Date>} Array of occurrence dates
 */
function generateRecurrenceInstances(startDate, rruleStr, limit) {
  const rule = parseRRULE(rruleStr);
  
  // For WEEKLY with BYDAY, check if startDate matches
  // If not, find the first matching date
  let first = new Date(startDate);
  
  if (rule && rule.FREQ === 'WEEKLY' && rule.BYDAY) {
    const targetDays = rule.BYDAY.split(',').map(name => dayNameMap[name]).filter(d => d !== undefined);
    
    // If start date doesn't match one of the target days, find the next one
    if (!targetDays.includes(first.getDay())) {
      const nextDate = getNextDayOfWeek(startDate, rule.BYDAY.split(','));
      if (nextDate) {
        first = nextDate;
      }
    }
  }
  
  const instances = [new Date(first)];
  let current = new Date(first);

  while (instances.length < limit) {
    const next = getNextOccurrence(current, rruleStr);
    if (!next) break;
    instances.push(new Date(next));
    current = next;
  }

  return instances;
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
  parseRecurrencePattern,
  getNextOccurrence,
  generateNextInstance,
  generateRecurrenceInstances,
  isOverdue,
  isDueSoon,
  getTaskStatusBadge,
  formatDate,
  generateRRULE,
};
