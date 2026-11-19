# Task Recurrence & Scheduling API Documentation

## Overview

This document describes the new API endpoints and features for task recurrence and scheduling in the Task Management application.

## Database Schema

### New Columns in Tasks Table

- `recurrence_pattern` (VARCHAR): RRULE pattern string (e.g., "FREQ=DAILY;COUNT=10")
- `recurrence_frequency` (VARCHAR): Frequency type (ONCE, DAILY, WEEKLY, MONTHLY, CUSTOM)
- `recurrence_end_date` (TIMESTAMP): When the recurrence should stop
- `scheduled_for` (TIMESTAMP): When the task should be scheduled for execution
- `due_date` (TIMESTAMP): When the task is due
- `snoozed_until` (TIMESTAMP): When the task should reappear (after snooze)
- `completed_instances` (INTEGER): Count of completed recurring instances
- `is_recurring_parent` (BOOLEAN): Whether this is a parent recurring task
- `parent_task_id` (INTEGER): Reference to parent task if this is a recurring instance

### Indexes

- Index on `scheduled_for` for efficient date-based queries
- Index on `due_date` for due date filtering
- Index on `project_id` for project filtering

## API Endpoints

### Create Task with Recurrence

```http
POST /tasks
Content-Type: application/json

{
  "title": "Daily Standup",
  "description": "Team sync meeting",
  "projectId": 1,
  "dueDate": "2024-12-20T10:00:00Z",
  "scheduledFor": "2024-12-20T09:30:00Z",
  "recurrenceFrequency": "DAILY",
  "recurrencePattern": "FREQ=DAILY;COUNT=30;BYDAY=MO,TU,WE,TH,FR",
  "recurrenceEndDate": "2025-01-20T10:00:00Z"
}

Response: 201
{
  "id": 1,
  "title": "Daily Standup",
  "description": "Team sync meeting",
  "projectId": 1,
  "completed": false,
  "dueDate": "2024-12-20T10:00:00Z",
  "scheduledFor": "2024-12-20T09:30:00Z",
  "recurrenceFrequency": "DAILY",
  "recurrencePattern": "FREQ=DAILY;COUNT=30;BYDAY=MO,TU,WE,TH,FR",
  "recurrenceEndDate": "2025-01-20T10:00:00Z",
  "isRecurringParent": true,
  "parentTaskId": null,
  "completedInstances": 0,
  "createdAt": "2024-12-20T10:00:00Z"
}
```

### List Tasks with Filters

```http
GET /tasks?projectId=1&dueDate=2024-12-20&scheduledFor=2024-12-20&overdue=true

Response: 200
[
  {
    "id": 1,
    "title": "Daily Standup",
    "completed": false,
    "dueDate": "2024-12-20T10:00:00Z",
    "scheduledFor": "2024-12-20T09:30:00Z",
    "recurrenceFrequency": "DAILY",
    "isRecurringParent": true,
    "daysOverdue": 0,
    "isOverdue": false
  }
]
```

### Complete a Task (with Recurrence Handling)

```http
POST /tasks/:id/complete

Response: 200
{
  "id": 1,
  "title": "Daily Standup",
  "completed": true,
  "completedAt": "2024-12-20T10:15:00Z",
  "nextInstance": {
    "id": 2,
    "title": "Daily Standup",
    "scheduledFor": "2024-12-21T09:30:00Z",
    "dueDate": "2024-12-21T10:00:00Z",
    "parentTaskId": 1
  }
}
```

### Snooze a Task

```http
POST /tasks/:id/snooze
Content-Type: application/json

{
  "snoozeUntil": "2024-12-22T10:00:00Z"
}

Response: 200
{
  "id": 1,
  "title": "Daily Standup",
  "snoozedUntil": "2024-12-22T10:00:00Z",
  "message": "Task snoozed until 2024-12-22T10:00:00Z"
}
```

### Update Task Recurrence

```http
PATCH /tasks/:id/recurrence
Content-Type: application/json

{
  "recurrencePattern": "FREQ=WEEKLY;BYDAY=MO,WE,FR",
  "recurrenceEndDate": "2025-02-01T10:00:00Z"
}

Response: 200
{
  "id": 1,
  "recurrencePattern": "FREQ=WEEKLY;BYDAY=MO,WE,FR",
  "recurrenceEndDate": "2025-02-01T10:00:00Z",
  "message": "Recurrence updated successfully"
}
```

### Get Calendar View

```http
GET /calendar/2024-12-01/2024-12-31

Response: 200
{
  "startDate": "2024-12-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z",
  "tasksByDate": {
    "2024-12-20": [
      {
        "id": 1,
        "title": "Daily Standup",
        "scheduledFor": "2024-12-20T09:30:00Z",
        "dueDate": "2024-12-20T10:00:00Z",
        "completed": false,
        "isOverdue": false
      }
    ]
  },
  "summary": {
    "totalTasks": 1,
    "completedTasks": 0,
    "overdueTasks": 0,
    "tasksByProject": {
      "1": 1
    }
  }
}
```

## Recurrence Patterns

### Pattern Format: iCalendar RRULE

Tasks use the [iCalendar RRULE](https://icalendar.org/rrule-tool.html) standard for recurrence patterns.

#### One-Time Tasks
```
No recurrence pattern needed
```

#### Daily
```
FREQ=DAILY
FREQ=DAILY;COUNT=10  # 10 daily occurrences
FREQ=DAILY;UNTIL=2024-12-31  # Daily until end of year
```

#### Weekly
```
FREQ=WEEKLY  # Every week on the same day
FREQ=WEEKLY;BYDAY=MO,WE,FR  # Every week on Mon, Wed, Fri
FREQ=WEEKLY;INTERVAL=2  # Every other week
```

#### Monthly
```
FREQ=MONTHLY  # First of each month (depends on start date)
FREQ=MONTHLY;BYMONTHDAY=15  # 15th of each month
FREQ=MONTHLY;BYDAY=3MO  # Third Monday of each month
```

#### Custom
```
FREQ=MONTHLY;BYDAY=1MO,-1FR  # First Monday and last Friday of month
FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR;UNTIL=2025-01-31  # Weekdays only
```

## Background Job Queue

The job queue service handles:

1. **Recurring Task Generation**: Creates next instances of recurring tasks
2. **Overdue Notifications**: Checks for tasks with due dates in the past
3. **Scheduled Task Alerts**: Sends notifications for tasks coming due soon
4. **Cleanup**: Removes completed recurring instances after retention period

### Job Queue Configuration

- Jobs run every 5 minutes for recurring task generation
- Overdue check runs every 10 minutes
- Scheduled alerts check runs every 15 minutes
- All job timing is configurable via environment variables

## Error Handling

### Invalid Recurrence Pattern
```http
POST /tasks
Content-Type: application/json

{
  "title": "Invalid Task",
  "recurrencePattern": "FREQ=INVALID"
}

Response: 400
{
  "error": "Invalid recurrence pattern",
  "message": "RRULE parsing error: Invalid frequency"
}
```

### Task Not Found
```http
GET /tasks/999/complete

Response: 404
{
  "error": "Task not found",
  "message": "Task with ID 999 does not exist"
}
```

## Examples

### Example 1: Daily Team Standup

Create a recurring daily task for team standup meetings:

```javascript
const task = await createTask({
  title: 'Daily Standup',
  description: 'Team synchronization meeting',
  projectId: 1,
  scheduledFor: new Date('2024-12-23T09:30:00'),
  dueDate: new Date('2024-12-23T10:00:00'),
  recurrenceFrequency: 'DAILY',
  recurrencePattern: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR',
  recurrenceEndDate: new Date('2025-01-31T10:00:00')
});

// After completing: automatically generates 2024-12-24 instance
```

### Example 2: Weekly Report Due Friday

Create a weekly report task:

```javascript
const task = await createTask({
  title: 'Weekly Report',
  projectId: 2,
  dueDate: new Date('2024-12-27T17:00:00'),  // Friday
  recurrenceFrequency: 'WEEKLY',
  recurrencePattern: 'FREQ=WEEKLY;BYDAY=FR',
  recurrenceEndDate: new Date('2025-03-31T17:00:00')
});
```

### Example 3: Snooze Until Tomorrow

```javascript
await snoozeTask(taskId, {
  snoozeUntil: new Date(new Date().getTime() + 24 * 60 * 60 * 1000)
});
```

### Example 4: Get Overdue Tasks

```javascript
const overdueTasks = await getTasks({
  overdue: true,
  projectId: 1
});
```

## Frontend Integration

The frontend provides UI components for:

1. **RecurrenceForm**: Configure recurrence patterns
2. **Calendar**: View tasks by date
3. **TaskItem**: Display recurrence info and overdue status
4. **TaskManager**: Manage all recurrence features

See component documentation in `src/web/app/components/`.
