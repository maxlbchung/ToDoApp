# Aether Tasks

A premium-feel productivity web app with a dashboard, Kanban board, and calendar view. Built as a zero-build static site — just HTML, CSS, and vanilla JavaScript.

**Live demo:** https://maxlbchung.github.io/ToDoApp/

## Features

- **Dashboard** — at-a-glance stats (To Do / In Progress / Done), "Due Soon" and "Immediate Attention" lists
- **Kanban board** — drag-and-drop tasks across To Do, Doing, Done, and Trash columns
- **Calendar view** — monthly grid with task scheduling and navigation
- **Task modal** — title, description, due date/time, color tags
- **Dark theme** with a glassmorphism aesthetic

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
