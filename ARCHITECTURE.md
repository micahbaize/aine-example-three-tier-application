# Architecture: Task Recurrence & Scheduling

## Overview

This document describes the architectural design of the Task Recurrence & Scheduling feature in a three-tier application.

```
┌─────────────────┐
│    Frontend     │ ← User interactions, calendar view, recurrence UI
│   (Tier 3)      │
└────────┬────────┘
         │
    ┌────┴────┐
    │   API   │ ← REST endpoints, business logic
    │ (Tier 2)│
    └────┬────┘
         │
    ┌────┴────────────────────────┐
    │    Database + Job Queue     │
    │       (Tier 1 + Service)    │
    └─────────────────────────────┘
```

## Data Flow

### 1. Creating a Recurring Task

```
User Input (Web UI)
    ↓
POST /tasks {
  title: "Team Standup",
  recurrencePattern: "FREQ=DAILY",
  dueDate: "2024-12-23T09:00:00Z",
  scheduledFor: "2024-12-20T09:00:00Z"
}
    ↓
API Validation
    ↓
Save to Database:
  - Main task (is_recurring_parent=true)
  - Columns set: recurrence_pattern, scheduled_for, due_date
    ↓
Response to Frontend with task ID
    ↓
UI Updates project task list and calendar
```

### 2. Completing a Recurring Task

```
User Clicks "Complete" on task instance
    ↓
PATCH /tasks/:id {
  completed: true,
  completedInstances: [...]
}
    ↓
API marks task as completed
    ↓
If is_recurring_parent=true, Bull Job Queue triggered
    ↓
Job Queue:
  1. Calculate next occurrence using RRULE
  2. Create new task instance with:
     - Same recurrencePattern
     - parentTaskId pointing to original
     - Next scheduled_for and due_date
     - is_recurring_parent=false
  3. Emit notification event
    ↓
Frontend receives response, removes from list, calendar updates
```

### 3. Snooze Functionality

```
User Clicks "Snooze" on task
    ↓
Select duration: "1 day" → Calculate snoozed_until timestamp
    ↓
PATCH /tasks/:id {
  snoozedUntil: "2024-12-22T14:30:00Z"
}
    ↓
API updates snoozed_until column
    ↓
GET /tasks query filter (WHERE snoozed_until IS NULL OR snoozed_until < now())
    ↓
Task hidden from UI until snoozed_until date arrives
    ↓
Job queue periodically checks (every minute) and un-snoozes
```

### 4. Calendar View

```
User Opens Calendar View
    ↓
URL: ?view=calendar&startDate=2024-12&endDate=2024-12-31
    ↓
GET /calendar/2024-12-01/2024-12-31
    ↓
API Query:
  SELECT * FROM tasks
  WHERE (due_date BETWEEN ? AND ?)
     OR (scheduled_for BETWEEN ? AND ?)
  AND snoozed_until < now()
    ↓
Group results by date
    ↓
Response: {
  "2024-12-20": [task1, task2],
  "2024-12-21": [task3]
}
    ↓
Frontend renders calendar grid with task indicators
```

## Component Architecture

### Frontend (Next.js)

#### Server Component: `page.tsx`
```
Purpose: Initial data fetching, server-side rendering
├─ Fetches projects list
├─ Fetches initial tasks (or calendar data)
└─ Passes to client component
```

#### Client Components

**TaskManager.tsx** (Container)
```
Manages:
├─ View mode toggle (list / calendar)
├─ Project filter state (via useSearchParams)
├─ Task list state
├─ Provides callbacks to child components
Renders:
├─ Project sidebar
├─ Task list or Calendar (based on view mode)
└─ New project / new task forms
```

**TaskItem.tsx** (Task Display)
```
Shows:
├─ Task title and description
├─ Recurrence indicator (if recurring)
├─ Due date with status badge:
│   ├─ Red "OVERDUE" if past due
│   ├─ Yellow "DUE SOON" if within 24h
│   └─ Gray "DUE ..." with exact date
├─ Snooze dropdown menu
├─ Complete checkbox
└─ Delete button
```

**RecurrenceForm.tsx** (RRULE Editor)
```
Allows user to:
├─ Select frequency: Daily, Weekly, Monthly, Yearly, Custom
├─ For Weekly: Select days (MO, TU, WE, ...)
├─ For Monthly: Select day of month (1-31) or "last day"
├─ Set end date (optional)
└─ Preview generated instances (first 5)
```

**Calendar.tsx** (Calendar View)
```
Displays:
├─ Current month/week grid
├─ Tasks grouped by date
├─ Color-coded by project
├─ Click date to filter task list
├─ Navigate months with prev/next
```

### Backend (Express.js + Node.js)

#### API Layer (`index.js`)

**Routes & Handlers**:
```
GET  /tasks
  └─ Query: ?projectId, ?dueBefore, ?scheduledAfter
  └─ Logic: Filter & paginate tasks
  
POST /tasks
  └─ Body: { title, recurrencePattern, dueDate, scheduledFor, ... }
  └─ Logic: Create parent task, validate RRULE
  
PATCH /tasks/:id
  └─ Body: { completed, snoozedUntil, ... }
  └─ Logic: Update task, trigger job queue if recurring
  
DELETE /tasks/:id
  └─ Logic: Soft delete or cascade

GET /calendar/:startDate/:endDate
  └─ Logic: Query tasks in date range, group by date
```

#### Service Layer: `recurrence-utils.js`

**Functions**:
```
parseRRULE(rruleString)
  └─ Returns: { FREQ, BYDAY, BYMONTHDAY, COUNT, UNTIL, ... }

getNextOccurrence(currentDate, rruleString)
  └─ Returns: Date of next recurrence

generateRecurrenceInstances(startDate, rruleString, limit)
  └─ Returns: [Date, Date, ...] (first N instances)

generateNextInstance(task)
  └─ Returns: New task object for next instance
```

#### Job Queue: `job-queue.js`

**Job Types**:

1. **recurrence-generation** (triggered on task completion)
   ```
   Triggered: PATCH /tasks/:id with completed=true
   Input: {taskId, previousDueDate}
   Process:
     ├─ Fetch task
     ├─ Calculate next occurrence
     ├─ Create new task instance
     └─ Save to database
   ```

2. **overdue-check** (periodic, every minute)
   ```
   Process:
     ├─ Find tasks where due_date < now AND completed=false
     ├─ Mark as overdue (or emit event for notification)
     └─ Log for monitoring
   ```

3. **due-notification** (triggered on schedule)
   ```
   Input: {taskId, notificationTime: '5min_before'}
   Intervals: -5min, -10min, -15min before due_date
   Action: Log for notification service
   ```

### Database (PostgreSQL)

#### Tasks Table (Enhanced)

```sql
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  
  -- Recurrence fields
  recurrence_pattern VARCHAR(255),  -- RRULE string
  recurrence_frequency VARCHAR(20), -- DAILY, WEEKLY, MONTHLY, YEARLY
  recurrence_end_date DATE,         -- Stop recurrence on this date
  is_recurring_parent BOOLEAN DEFAULT false,
  parent_task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  completed_instances JSONB,        -- Array of completion times for instances
  
  -- Scheduling fields
  scheduled_for TIMESTAMP,          -- When task becomes active
  due_date TIMESTAMP,               -- When task is due
  snoozed_until TIMESTAMP,          -- Hidden until this time
  
  -- Existing fields
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT now(),
  
  -- Indexes for performance
  INDEX idx_due_date (due_date),
  INDEX idx_scheduled_for (scheduled_for),
  INDEX idx_project_id (project_id),
  INDEX idx_snoozed_until (snoozed_until)
);
```

## State Management Flow

### Frontend State
```
Component Props/State:
├─ selectedProjectId (from URL searchParams)
├─ viewMode ('list' | 'calendar')
├─ tasks: Task[]
├─ projects: Project[]
├─ loading: boolean
└─ error: string | null

User Interaction:
├─ Click project → useRouter.push('?projectId=X')
├─ useSearchParams detects change
├─ useEffect calls getTasks(projectId)
├─ setTasks(response)
└─ Component re-renders
```

### Backend Job Queue State
```
Redis (Bull.js):
├─ Active jobs: Currently processing
├─ Waiting jobs: Queued for processing
├─ Completed jobs: Recent history
├─ Failed jobs: With retry count

Job Lifecycle:
├─ Add → Waiting
├─ Worker picks up → Active
├─ Completion logic runs
├─ Emit 'completed' or 'failed'
└─ Log result
```

## Error Handling

### Frontend
```
Try-catch in useEffect for API calls
├─ Catch network errors
├─ Catch 4xx/5xx responses
├─ Show user-friendly error toast
└─ Log to console/sentry
```

### Backend
```
Express middleware chain:
├─ Validation middleware (RRULE syntax)
├─ Authorization middleware
├─ Route handler (try-catch)
├─ Error response (HTTP status + message)
└─ Error logging (file/service)
```

### Job Queue
```
Job retry logic:
├─ On error, increment retry count
├─ Exponential backoff (1s, 2s, 4s)
├─ Max 3 retries before move to failed queue
├─ Log failed job details
└─ Alert on repeated failures
```

## Performance Optimizations

### Database
- **Indexes** on frequently queried columns (due_date, scheduled_for)
- **Clustering** on project_id for project-specific queries
- **Pagination** for large result sets

### API
- **Response caching** via HTTP ETag/Last-Modified
- **Query filtering** to avoid full table scans
- **Batch processing** for job queue (process multiple jobs per cycle)

### Frontend
- **Server-side rendering** for initial calendar data
- **Client-side filtering** for project selection (already loaded)
- **Lazy loading** for calendar month navigation

## Security Considerations

### Authorization
- Verify user owns project before returning tasks
- Prevent cross-user task access (future: add user_id to tasks)

### Data Validation
- RRULE must match RFC 5545 spec
- Due dates must be valid timestamps
- No negative durations or past-only recurrences

### Injection Prevention
- Parameterized queries (pg library default)
- Escape user input in RRULE parsing
- Validate JSON in completed_instances

## Scalability Path

### Current Architecture
- Single API instance
- Single PostgreSQL database
- Single Redis for job queue
- Suitable for: <10K tasks

### Scalability Improvements (Future)
1. **Horizontal API scaling**: Load balancer + multiple API instances
2. **Database replication**: Read replicas for calendar queries
3. **Job queue sharding**: Multiple Redis instances by hash(projectId)
4. **Caching layer**: Redis cache for frequently accessed projects
5. **Async notifications**: Separate notification service

## Testing Strategy

### Unit Tests
- RRULE parsing and generation (recurrence-utils.test.js)
- Date calculation accuracy
- Edge cases (DST, leap years, end dates)

### Integration Tests
- Full task lifecycle (create → complete → generate next)
- Calendar date range queries
- Job queue processing

### E2E Tests
- UI workflow (create recurring task → complete → see next instance)
- Snooze functionality
- Calendar navigation

## Deployment Considerations

### Environment Variables
```
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
API_PORT=3001
JOB_CHECK_INTERVAL_MS=60000
```

### Health Checks
```
/health endpoint should verify:
├─ Database connectivity
├─ Redis connectivity
└─ Job queue status
```

### Monitoring
```
Metrics to track:
├─ Task creation rate
├─ Recurrence instance generation latency
├─ Job queue depth
├─ Failed jobs count
└─ Calendar query performance
```

## Future Enhancements

1. **Timezone Support**: Store user timezone, convert dates appropriately
2. **Task Templates**: Save common recurrence patterns as templates
3. **Bulk Operations**: Complete multiple tasks, update multiple projects
4. **Analytics**: Dashboard showing task completion trends
5. **Notifications**: Email/SMS/push notifications
6. **iCal Export**: Export tasks as .ics calendar files
7. **Task Dependencies**: Task A must be completed before Task B
8. **Team Collaboration**: Share tasks, assign to team members
