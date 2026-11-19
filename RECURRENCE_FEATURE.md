# Task Recurrence & Scheduling Implementation

## Overview

This implementation adds comprehensive recurring task and scheduling capabilities to the three-tier task management application. Users can create recurring tasks with flexible recurrence patterns, set due dates, schedule tasks for specific times, snooze tasks, and view tasks in a calendar.

## Features

### Core Features

1. **Recurring Tasks**
   - One-time, daily, weekly, monthly, or custom recurrence patterns
   - RRULE (iCalendar format) support for flexible scheduling
   - Automatic instance generation when completing recurring tasks
   - Recurrence end dates to limit recurring task duration
   - Track completed instances of recurring tasks

2. **Task Scheduling**
   - Set specific dates and times for task execution (`scheduled_for`)
   - Set due dates with visual indicators
   - Overdue badges and status indicators
   - Days overdue calculation

3. **Snooze Functionality**
   - Defer tasks to a specific date/time
   - Snoozed tasks hidden until snooze date arrives
   - Quick snooze presets (1 hour, 1 day, 1 week)

4. **Calendar View**
   - View tasks organized by date
   - See upcoming and overdue tasks
   - Filter by project
   - Visual indicators for recurrence and status

5. **Background Job Queue**
   - Automatic recurring instance generation
   - Overdue task notifications
   - Scheduled task alerts
   - Cleanup of old completed instances

## Architecture

### Database Layer (Tier 1)

**Migration**: `src/db/migrations/1718500003000_add-recurrence-scheduling.js`

**New Columns in Tasks Table**:
- `recurrence_pattern` (VARCHAR): RRULE pattern string
- `recurrence_frequency` (VARCHAR): ONCE, DAILY, WEEKLY, MONTHLY, CUSTOM
- `recurrence_end_date` (TIMESTAMP): When recurrence stops
- `scheduled_for` (TIMESTAMP): When task should be executed
- `due_date` (TIMESTAMP): When task is due
- `snoozed_until` (TIMESTAMP): When snoozed task reappears
- `completed_instances` (INTEGER): Count of completed recurring instances
- `is_recurring_parent` (BOOLEAN): Parent recurring task marker
- `parent_task_id` (INTEGER): Link to parent task for instances

**Indexes**:
- `scheduled_for` for efficient date filtering
- `due_date` for due date queries
- `project_id` already indexed from previous feature

### API Layer (Tier 2)

**Core Module**: `src/api/index.js`

**Utility Modules**:
- `src/api/recurrence-utils.js`: RRULE parsing and instance generation
- `src/api/job-queue.js`: Background job processing with Bull

**Enhanced Endpoints**:

```
POST /tasks                          # Create task with recurrence
GET /tasks?filters                   # Filter by date/project/status
POST /tasks/:id/complete             # Complete with recurrence handling
POST /tasks/:id/snooze               # Snooze task
PATCH /tasks/:id/recurrence          # Update recurrence pattern
GET /calendar/:startDate/:endDate     # Get calendar view
```

### Frontend Layer (Tier 3)

**Components**: `src/web/app/components/`

- `TaskManager.tsx`: Main container component with view switching
- `TaskItem.tsx`: Individual task display with recurrence info
- `RecurrenceForm.tsx`: Recurrence pattern configuration
- `Calendar.tsx`: Calendar view component

**Server Actions**: `src/web/app/actions.ts`
- `getTasks()`: Fetch tasks with filtering
- `getCalendar()`: Fetch calendar data
- `createTask()`: Create tasks with recurrence
- `completeTask()`: Complete with recurrence handling
- `snoozeTask()`: Snooze implementation
- `updateTaskRecurrence()`: Update recurrence pattern

**Page**: `src/web/app/page.tsx`
- Initial data fetching
- TaskManager integration

## Usage Examples

### Creating a Recurring Daily Task

**Frontend**:
```typescript
const task = await createTask({
  title: 'Daily Standup',
  projectId: 1,
  scheduledFor: new Date('2024-12-23T09:30:00'),
  dueDate: new Date('2024-12-23T10:00:00'),
  recurrenceFrequency: 'DAILY',
  recurrencePattern: 'FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR',
  recurrenceEndDate: new Date('2025-01-31T10:00:00')
});
```

**API Request**:
```http
POST /tasks HTTP/1.1
Content-Type: application/json

{
  "title": "Daily Standup",
  "projectId": 1,
  "scheduledFor": "2024-12-23T09:30:00Z",
  "dueDate": "2024-12-23T10:00:00Z",
  "recurrenceFrequency": "DAILY",
  "recurrencePattern": "FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR",
  "recurrenceEndDate": "2025-01-31T10:00:00Z"
}
```

### Completing a Recurring Task

When a recurring task is completed, the next instance is automatically generated:

```http
POST /tasks/1/complete HTTP/1.1

Response:
{
  "id": 1,
  "title": "Daily Standup",
  "completed": true,
  "completedAt": "2024-12-23T09:45:00Z",
  "nextInstance": {
    "id": 2,
    "title": "Daily Standup",
    "scheduledFor": "2024-12-24T09:30:00Z",
    "dueDate": "2024-12-24T10:00:00Z",
    "parentTaskId": 1,
    "isRecurringParent": false
  }
}
```

### Snoozing a Task

```http
POST /tasks/1/snooze HTTP/1.1
Content-Type: application/json

{
  "snoozeUntil": "2024-12-24T09:30:00Z"
}
```

### Calendar View

```http
GET /calendar/2024-12-01/2024-12-31 HTTP/1.1

Response:
{
  "startDate": "2024-12-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z",
  "tasksByDate": {
    "2024-12-23": [
      {
        "id": 1,
        "title": "Daily Standup",
        "scheduledFor": "2024-12-23T09:30:00Z",
        "dueDate": "2024-12-23T10:00:00Z",
        "completed": false,
        "isOverdue": false,
        "daysOverdue": 0
      }
    ]
  },
  "summary": {
    "totalTasks": 5,
    "completedTasks": 3,
    "overdueTasks": 1
  }
}
```

## Recurrence Pattern Format

Tasks use the iCalendar RRULE standard for recurrence patterns.

### Common Patterns

```
# Daily
FREQ=DAILY

# Daily, weekdays only
FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR

# Weekly on Monday and Friday
FREQ=WEEKLY;BYDAY=MO,FR

# Monthly on the 15th
FREQ=MONTHLY;BYMONTHDAY=15

# Monthly on first Monday
FREQ=MONTHLY;BYDAY=1MO

# Every other week on Tuesday
FREQ=WEEKLY;INTERVAL=2;BYDAY=TU

# Daily for 10 occurrences
FREQ=DAILY;COUNT=10

# Until end of year
FREQ=DAILY;UNTIL=2024-12-31

# Complex: Weekdays until end of January
FREQ=DAILY;BYDAY=MO,TU,WE,TH,FR;UNTIL=2025-01-31
```

## Background Job Queue

The job queue service uses **Bull** for reliable job processing with Redis backend (or memory fallback).

### Job Types

1. **recurrence-generation**: Creates next instances of recurring tasks
   - Runs every 5 minutes
   - Checks for recurring tasks with end date in future
   - Generates next instance for each recurring task

2. **overdue-check**: Identifies overdue tasks
   - Runs every 10 minutes
   - Marks tasks as overdue if due_date < now
   - Prepares notifications

3. **scheduled-alert**: Sends alerts for approaching tasks
   - Runs every 15 minutes
   - Finds tasks due within next 24 hours
   - Can send email/push notifications

### Configuration

Set environment variables to customize timing:

```bash
RECURRENCE_JOB_INTERVAL=300000  # 5 minutes
OVERDUE_CHECK_INTERVAL=600000   # 10 minutes
ALERT_CHECK_INTERVAL=900000     # 15 minutes
```

## Testing

### Unit Tests

Run recurrence utility tests:
```bash
cd src/api
node recurrence-utils.test.js
```

### Manual Testing

1. Create a daily recurring task
2. View the calendar for the next week
3. Complete the task
4. Verify next instance is created
5. Snooze a task and verify it reappears

## Frontend Components

### TaskManager
Main container component that manages all views:
- Project sidebar
- Task list view
- Calendar view
- Toggle between views

### RecurrenceForm
Configuration form for recurrence patterns:
- Frequency selector (Once, Daily, Weekly, Monthly, Custom)
- RRULE pattern input
- End date picker
- Validation

### Calendar
Calendar grid view showing tasks by date:
- Date cells with task counts
- Color-coded by project
- Overdue highlighting
- Click to view task details

### TaskItem
Individual task display with:
- Recurrence indicator
- Due date badge
- Overdue status
- Quick actions (complete, snooze, edit)

## Error Handling

The implementation includes comprehensive error handling:

- **Invalid RRULE Pattern**: Returns 400 with error message
- **Task Not Found**: Returns 404
- **Invalid Date**: Returns 400 with validation error
- **Database Errors**: Returns 500 with error details
- **Job Queue Errors**: Logged to console, jobs retried

## Performance Considerations

### Indexes
- `scheduled_for` index for calendar queries
- `due_date` index for overdue queries
- `project_id` index for filtering

### Query Optimization
- Pagination support for large task lists
- Limit calendar queries to specific date ranges
- Cache frequently accessed data

### Job Queue
- Bull queue handles concurrent jobs
- Retries failed jobs
- Dead letter queue for persistent failures

## Future Enhancements

- Email notifications for due dates
- SMS alerts for urgent tasks
- Recurring task templates
- Task history/archive
- Analytics on task completion rates
- Integration with calendar apps (iCal export)
- Webhook support for external systems
- AI-powered task scheduling suggestions

## Dependencies

### API
- `express`: HTTP framework
- `pg`: PostgreSQL client
- `bull`: Job queue library
- `rrule`: RRULE parsing and generation

### Web
- `react`: UI framework
- `next`: React framework with SSR
- `typescript`: Type safety

## Files Modified

- `src/db/migrations/1718500003000_add-recurrence-scheduling.js` (new)
- `src/api/index.js` (updated with new endpoints)
- `src/api/recurrence-utils.js` (new)
- `src/api/job-queue.js` (new)
- `src/api/package.json` (updated dependencies)
- `src/web/app/page.tsx` (updated)
- `src/web/app/actions.ts` (updated)
- `src/web/app/components/TaskManager.tsx` (new)
- `src/web/app/components/TaskItem.tsx` (new)
- `src/web/app/components/RecurrenceForm.tsx` (new)
- `src/web/app/components/Calendar.tsx` (new)

## Rollback

To remove this feature:

1. Drop the new columns from tasks table
2. Remove the new files (components, utilities)
3. Revert API endpoints to previous version
4. Restart services

Database rollback migration:
```sql
ALTER TABLE tasks DROP COLUMN recurrence_pattern;
ALTER TABLE tasks DROP COLUMN recurrence_frequency;
ALTER TABLE tasks DROP COLUMN recurrence_end_date;
ALTER TABLE tasks DROP COLUMN scheduled_for;
ALTER TABLE tasks DROP COLUMN due_date;
ALTER TABLE tasks DROP COLUMN snoozed_until;
ALTER TABLE tasks DROP COLUMN completed_instances;
ALTER TABLE tasks DROP COLUMN is_recurring_parent;
ALTER TABLE tasks DROP COLUMN parent_task_id;
```

## Support

For issues, questions, or contributions, refer to the main project repository.
