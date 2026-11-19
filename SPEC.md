# Feature: Task Categories/Tags

## Overview
Add support for organizing tasks by categories/tags. This allows users to group and filter tasks by custom categories (e.g., "Work", "Personal", "Shopping").

## Requirements

### Database Schema
1. Create a `categories` table with:
   - `id` (serial, primary key)
   - `name` (varchar(100), not null, unique)
   - `color` (varchar(20), optional, for visual distinction)
   - `created_at` (timestamp, default now())

2. Add `category_id` foreign key to `tasks` table:
   - `category_id` (integer, nullable, foreign key to categories.id)

### Backend API
1. **GET /categories** — List all categories
2. **POST /categories** — Create a new category (`{ "name": "Work", "color": "#3B82F6" }`)
3. **GET /tasks** — Support optional `category_id` query param to filter tasks
4. **POST /tasks** — Accept optional `category_id` in request body
5. **PATCH /tasks/:id** — Support updating `category_id`
6. **DELETE /categories/:id** — Delete a category (set tasks' category_id to null)

### Frontend UI
1. Display tasks grouped by category
2. Add category selector dropdown when creating a task
3. Add a "Filter by Category" button/dropdown to view only tasks from selected category
4. Show category label/badge on each task with color
5. Add a sidebar/section to manage categories (create/delete)

### Migration
1. Create database migration to add `categories` table
2. Create migration to add `category_id` to `tasks` table

## Implementation Plan
1. ✅ Create database migrations
2. ✅ Add API endpoints for categories CRUD
3. ✅ Update tasks API to support category_id
4. ✅ Update frontend to display and manage categories
5. ✅ Add category filtering UI

## Status
Not started
