# Development Guide

## Project Structure

```
aine-example-three-tier-application/
├── src/
│   ├── db/                 # Tier 1: Database
│   │   ├── migrations/     # Database schema migrations
│   │   └── package.json    # Migration dependencies (node-pg-migrate)
│   │
│   ├── api/                # Tier 2: API/Backend
│   │   ├── index.js        # Express server with all endpoints
│   │   ├── recurrence-utils.js    # RRULE parsing and instance generation
│   │   ├── job-queue.js    # Bull.js background job queue
│   │   ├── package.json    # Dependencies
│   │   ├── jest.config.js  # Test configuration
│   │   └── recurrence-utils.test.js
│   │
│   └── web/                # Tier 3: Frontend
│       ├── app/
│       │   ├── page.tsx    # Server component (data fetching)
│       │   ├── actions.ts  # Server actions (API calls)
│       │   └── components/
│       │       ├── TaskManager.tsx      # Main container
│       │       ├── TaskItem.tsx         # Task display
│       │       ├── RecurrenceForm.tsx   # RRULE UI
│       │       ├── Calendar.tsx         # Date-based view
│       │       └── ...
│       └── package.json
│
├── docker-compose.yml      # Container orchestration
├── TESTING_GUIDE.md        # How to test locally
├── QUICKSTART.md           # Get started in 5 minutes
├── ARCHITECTURE.md         # This file
└── .env.example            # Configuration template
```

## Technology Stack

### Database (Tier 1)
- **PostgreSQL 14**: Primary data store
- **node-pg-migrate**: Schema version control
- **Migrations**: Located in `src/db/migrations/`

### API (Tier 2)
- **Node.js + Express.js 5.x**: HTTP server
- **pg 8.x**: PostgreSQL client
- **Bull 4.x**: Background job queue (requires Redis)
- **RRule 2.x**: Recurrence pattern parsing
- **Jest 29.x**: Unit testing framework

### Frontend (Tier 3)
- **Next.js 14**: React framework with server components
- **TypeScript**: Type-safe frontend
- **React Hooks**: Client-side state management
- **Tailwind CSS**: Styling

## Running Locally

### Option 1: Docker Compose (Recommended)
```bash
docker-compose up -d
cd src/db && npm run migrate
```

Starts:
- PostgreSQL on localhost:5432
- Redis on localhost:6379
- API on localhost:3001 (run manually: `cd src/api && npm start`)
- Frontend on localhost:3000 (run manually: `cd src/web && npm run dev`)

### Option 2: Local Development
Requires: Node.js 18+, PostgreSQL 14+, Redis 7+ (for job queue)

```bash
# Install dependencies
cd src/db && npm install
cd ../api && npm install
cd ../web && npm install

# Migrate database
cd src/db
DATABASE_URL=postgresql://user:pass@localhost:5432/taskdb npm run migrate

# Start API
cd src/api
API_PORT=3001 node index.js

# In another terminal, start frontend
cd src/web
NEXT_PUBLIC_API_URL=http://localhost:3001 npm run dev

# In another terminal, start job queue
cd src/api
node job-queue.js
```

## Key Features Breakdown

### 1. Task Recurrence

**RRULE Support**: RFC 5545 compliant recurrence rules

```
FREQ=DAILY                              # Every day
FREQ=WEEKLY;BYDAY=MO,WE,FR             # Every Monday, Wednesday, Friday
FREQ=MONTHLY;BYMONTHDAY=15             # 15th of each month
FREQ=YEARLY;BYDAY=4TH;BYMONTH=11       # 4th Thursday of November (Thanksgiving)
```

**Database Columns**:
- `recurrence_pattern`: RRULE string (e.g., "FREQ=DAILY")
- `recurrence_frequency`: Shorthand (DAILY, WEEKLY, MONTHLY, YEARLY)
- `recurrence_end_date`: When recurrence stops (optional)
- `is_recurring_parent`: TRUE for original task
- `parent_task_id`: Reference to parent task for instances

**Auto-Generation**: When a recurring task is completed, job queue automatically:
1. Marks current instance as completed
2. Generates next instance with same recurrence pattern
3. Triggers notifications 5/10/15 min before due date

### 2. Task Scheduling

**Columns**:
- `scheduled_for`: Date/time when task becomes active
- `due_date`: When task is due (with visual indicators)
- `snoozed_until`: Hide task until this date/time

**UI Features**:
- Overdue badge (red) if due_date < now
- Due soon badge (yellow) if due_date within 24 hours
- Snooze presets: 1 hour, 1 day, 1 week, custom date

### 3. Calendar View

**Features**:
- Month view with tasks per day
- Week view (future enhancement)
- Day click to filter tasks by date
- Color-coded by project

### 4. Background Jobs

**Bull.js Queue Configuration**:
- Redis-backed task queue
- Scheduled jobs for:
  - Recurrence instance generation (when task completed)
  - Overdue detection (every minute)
  - Due notifications (5/10/15 min before)

**Job Retry Policy**:
- 3 retries on failure
- Exponential backoff

## API Endpoints

### Tasks
- `GET /tasks` - List all tasks (supports ?projectId=X, ?dueBefore=date, ?scheduledAfter=date)
- `POST /tasks` - Create task with recurrence pattern
- `PATCH /tasks/:id` - Update task, complete instance, snooze
- `DELETE /tasks/:id` - Delete task

### Projects
- `GET /projects` - List all projects
- `POST /projects` - Create project
- `PATCH /projects/:id` - Update project
- `DELETE /projects/:id` - Delete project

### Calendar
- `GET /calendar/:startDate/:endDate` - Get tasks in date range (returns array grouped by date)

### Dates Format
- All dates as ISO 8601: `YYYY-MM-DDTHH:mm:ss.sssZ` or `YYYY-MM-DD`

## Debugging Tips

### Task Not Generating Next Instance
1. Check Redis is running: `redis-cli ping`
2. Check job queue logs: `tail -f /tmp/bull-queue.log`
3. Verify `is_recurring_parent=true` for original task
4. Check `recurrence_pattern` is valid RRULE format

### Calendar Showing Wrong Dates
1. Verify timezone in frontend components
2. Check `due_date` and `scheduled_for` timestamps
3. Ensure database time is in UTC

### API Returning 500 Errors
1. Check PostgreSQL connection: `psql $DATABASE_URL -c "SELECT 1"`
2. Check migrations were run: `cd src/db && npm run migrate status`
3. Check all required columns exist in tasks table

### Job Queue Not Processing
1. Verify Redis is running: `redis-cli info`
2. Check node process is running: `ps aux | grep job-queue`
3. Restart job queue: `pkill -f job-queue.js && node src/api/job-queue.js`

## Testing

### Unit Tests
```bash
cd src/api
npm test                    # All tests
npm test recurrence        # Specific test file
npm test -- --watch       # Watch mode
npm test -- --coverage    # With coverage report
```

### Integration Tests
See `TESTING_GUIDE.md` for curl examples and step-by-step procedures.

## Performance Considerations

### Database Indexes
- `tasks(due_date)` - Calendar queries
- `tasks(scheduled_for)` - Scheduling queries
- `tasks(project_id)` - Project filtering
- `tasks(recurrence_pattern)` - Recurring task filtering
- `tasks_completed_instances(created_at)` - Job queue lookups

### Query Optimization
- Use `projectId` filter when possible to reduce results
- Calendar queries should specify date range (not full history)
- Pagination recommended for projects with >1000 tasks

### Job Queue Tuning
- `JOB_CHECK_INTERVAL_MS`: How often to check for completed tasks (default 60s)
- `NOTIFICATION_INTERVALS`: Before due time to send alerts (default 5/10/15 min)
- Redis memory: Monitor for large job queues

## Deployment Checklist

- [ ] Environment variables set (see `.env.example`)
- [ ] PostgreSQL database created
- [ ] Redis instance configured
- [ ] Database migrations run: `npm run migrate`
- [ ] API listening on 0.0.0.0:3001
- [ ] Frontend public API URL set
- [ ] Job queue process running
- [ ] Health checks responding
- [ ] Logs configured and rotated
- [ ] Backups automated

## Common Issues

### "Cannot find module 'bull'"
```bash
cd src/api && npm install
```

### "ECONNREFUSED" to database
Check PostgreSQL is running and `DATABASE_URL` is correct

### "ERR READONLY" from Redis
Redis may be in read-only mode or out of memory. Check Redis logs.

### Frontend 404 on API calls
Ensure API is running on port 3001 and `NEXT_PUBLIC_API_URL` is correct

## Future Enhancements

- [ ] Email notifications
- [ ] iCal export
- [ ] Task templates
- [ ] Recurring task groups
- [ ] Timezone support
- [ ] Analytics dashboard
