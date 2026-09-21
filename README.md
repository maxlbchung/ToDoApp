# Aether Tasks

A premium-feel productivity web app with a dashboard, Kanban board, and calendar view. Built as a zero-build static site — just HTML, CSS, and vanilla JavaScript.

**Live demo:** https://maxlbchung.github.io/ToDoApp/

## Features

- **Dashboard** with at-a-glance stats (To Do / In Progress / Done), plus:
  - **Productivity insights** panel: completion rate ring, tasks completed in the last 7 days, and an active-task priority breakdown
  - **Today focus list** showing everything due today plus overdue undone tasks
  - **Due Soon** and **Immediate Attention** lists, now enriched with priority and tag context
- **Kanban board** with drag-and-drop across To Do, Doing, Done, and a Trash drop zone
- **Board search, filter, and sort** by title/description/tags/notes, priority, tag, and sort mode (due date, priority, created, title)
- **Quick add** to create a task from just a title by pressing Enter
- **Calendar view** with a monthly grid, month navigation, priority-accented labels, and grouped upcoming deadlines that show priority and tags
- **Rich task modal** with title, description, optional due date/time, color tag, priority (None / Low / Medium / High), comma-separated tags/labels, checklist subtasks with progress, recurrence (daily / weekly / monthly), and free-form notes
- **Recurring tasks** that automatically spawn the next occurrence when completed
- **Subtasks / checklists** with a visual completion progress bar on each card
- **Undo delete** via a transient toast after removing a task
- **Light and dark themes** with a glassmorphism aesthetic, remembered across sessions
- **Keyboard shortcuts**: `n` to create a task, `Escape` to close the modal, `/` to jump to board search
- **JSON export / import** to back up and restore your tasks
- **Offline-friendly and resilient**: state persists to `localStorage`, and the app degrades gracefully when CDN assets (icons, drag-and-drop) are unavailable

## Tech stack

- HTML / CSS / vanilla JS — no build step, no framework
- [Lucide](https://lucide.dev/) icons (CDN)
- [SortableJS](https://sortablejs.github.io/Sortable/) for drag-and-drop (CDN)
- Google Fonts (Outfit)

## Run locally

It's a static site, so any local web server works. Pick one:

```bash
# Python 3
python -m http.server 8000

# Node (if you have it)
npx serve .
```

Then open http://localhost:8000.

> Opening `index.html` directly with `file://` mostly works, but a local server avoids quirks with fonts and CDN scripts.

## Deployment

Hosted via GitHub Pages from the `main` branch root. Pushing to `main` triggers a redeploy automatically.

## Project structure

```
.
├── index.html   # Markup + view containers + modal
├── style.css    # Theme, layout, glass effects
└── app.js       # State, rendering, drag-and-drop, calendar logic
```
