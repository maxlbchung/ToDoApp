// --- Pure Helpers (reused by later features) ---
// Generate a reasonably unique id from time + randomness.
function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// Guard lucide icon refresh so the app still works when the CDN is unavailable.
function refreshIcons() {
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
        lucide.createIcons();
    }
}

// Ensure a task has all fields the app relies on, filling defaults for any
// that are missing. Preserves existing fields; safe to run on old-shape tasks.
function normalizeTask(task) {
    const t = task || {};
    return {
        id: t.id || uid(),
        title: t.title || '',
        description: t.description || '',
        dueDate: t.dueDate || '',
        color: t.color || '#6c5ce7',
        status: t.status || 'todo',
        createdAt: t.createdAt || new Date().toISOString(),
        priority: t.priority || 'none',
        tags: Array.isArray(t.tags) ? t.tags : [],
        subtasks: Array.isArray(t.subtasks) ? t.subtasks : [],
        recurrence: t.recurrence || 'none',
        pinned: typeof t.pinned === 'boolean' ? t.pinned : false,
        completedAt: t.completedAt || null,
        notes: typeof t.notes === 'string' ? t.notes : ''
    };
}

// App State
let tasks = (JSON.parse(localStorage.getItem('aether_tasks')) || []).map(normalizeTask);
let currentView = 'home';
let calendarDate = new Date();

// Board discovery state: search term, active filters, and sort mode.
// These narrow which cards render per Kanban column without touching the
// underlying tasks array or their status.
let searchTerm = '';
let filterPriority = 'all';
let filterTag = 'all';
let sortBy = 'dueDate';

// One-time migration: persist normalized tasks so existing data gains new fields.
localStorage.setItem('aether_tasks', JSON.stringify(tasks));

// DOM Elements
const views = document.querySelectorAll('.view');
const navLinks = document.querySelectorAll('.nav-links li');
const taskModal = document.getElementById('task-modal');
const taskForm = document.getElementById('task-form');
const newTaskBtn = document.getElementById('new-task-btn');
const closeModalBtns = document.querySelectorAll('.close-modal');

// --- Initialization ---
function init() {
    setupEventListeners();
    renderAll();
    refreshIcons();
}

function setupEventListeners() {
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            switchView(link.getAttribute('data-view'));
        });
    });

    // Modal
    newTaskBtn.addEventListener('click', () => openModal());
    document.querySelectorAll('.new-task-trigger').forEach(btn => {
        btn.addEventListener('click', () => openModal());
    });
    closeModalBtns.forEach(btn => btn.addEventListener('click', closeModal));
    window.addEventListener('click', (e) => {
        if (e.target === taskModal) closeModal();
    });

    // Task Form
    taskForm.addEventListener('submit', handleTaskSubmit);
    document.getElementById('set-today-btn').addEventListener('click', () => {
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('task-date').value = now.toISOString().slice(0, 16);
    });
    document.getElementById('clear-date-btn').addEventListener('click', () => {
        document.getElementById('task-date').value = '';
    });

    // Subtasks: add via button or Enter key in the subtask input
    document.getElementById('add-subtask-btn').addEventListener('click', addSubtaskFromInput);
    document.getElementById('subtask-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addSubtaskFromInput();
        }
    });

    // Board discovery: search, filters, and sort re-render the board only.
    const boardSearch = document.getElementById('board-search');
    if (boardSearch) {
        boardSearch.addEventListener('input', (e) => {
            searchTerm = e.target.value;
            renderBoard();
        });
    }
    const priorityFilter = document.getElementById('board-filter-priority');
    if (priorityFilter) {
        priorityFilter.addEventListener('change', (e) => {
            filterPriority = e.target.value;
            renderBoard();
        });
    }
    const tagFilter = document.getElementById('board-filter-tag');
    if (tagFilter) {
        tagFilter.addEventListener('change', (e) => {
            filterTag = e.target.value;
            renderBoard();
        });
    }
    const sortSelect = document.getElementById('board-sort');
    if (sortSelect) {
        sortSelect.addEventListener('change', (e) => {
            sortBy = e.target.value;
            renderBoard();
        });
    }

    // Quick add: create a todo task from just a title on Enter (Todoist-style).
    const quickAdd = document.getElementById('quick-add-input');
    if (quickAdd) {
        quickAdd.addEventListener('keydown', (e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            const title = quickAdd.value.trim();
            if (!title) return;
            tasks.push(normalizeTask({ title, status: 'todo' }));
            quickAdd.value = '';
            saveAndRender();
        });
    }

    // Calendar Nav
    document.getElementById('prev-month').addEventListener('click', () => {
        calendarDate.setMonth(calendarDate.getMonth() - 1);
        renderCalendar();
    });
    document.getElementById('next-month').addEventListener('click', () => {
        calendarDate.setMonth(calendarDate.getMonth() + 1);
        renderCalendar();
    });
}

// --- View Logic ---
function switchView(viewId) {
    currentView = viewId;
    views.forEach(v => v.classList.remove('active'));
    navLinks.forEach(l => l.classList.remove('active'));

    document.getElementById(`${viewId}-view`).classList.add('active');
    document.querySelector(`[data-view="${viewId}"]`).classList.add('active');

    renderAll();
}

// --- Task Logic ---
function handleTaskSubmit(e) {
    e.preventDefault();
    
    const id = document.getElementById('task-id').value;
    const title = document.getElementById('task-title').value;
    const description = document.getElementById('task-desc').value;
    const dueDate = document.getElementById('task-date').value;
    const color = document.querySelector('input[name="task-color"]:checked').value;

    const priorityInput = document.querySelector('input[name="task-priority"]:checked');
    const priority = priorityInput ? priorityInput.value : 'none';
    const recurrence = document.getElementById('task-recurrence').value;
    const notes = document.getElementById('task-notes').value;
    const tags = document.getElementById('task-tags').value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    const subtasks = collectSubtasksFromModal();

    const existing = id ? tasks.find(t => t.id === id) : null;

    const taskData = normalizeTask({
        ...(existing || {}),
        id: id || uid(),
        title,
        description,
        dueDate,
        color,
        priority,
        recurrence,
        notes,
        tags,
        subtasks,
        status: existing ? existing.status : 'todo',
        createdAt: existing ? existing.createdAt : new Date().toISOString()
    });

    if (id) {
        tasks = tasks.map(t => t.id === id ? taskData : t);
    } else {
        tasks.push(taskData);
    }

    saveAndRender();
    closeModal();
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveAndRender();
}

function openModal(task = null) {
    taskForm.reset();
    clearSubtaskList();
    document.getElementById('subtask-input').value = '';

    if (task) {
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-desc').value = task.description;
        document.getElementById('task-date').value = task.dueDate || '';
        const colorInput = document.querySelector(`input[name="task-color"][value="${task.color}"]`);
        if (colorInput) colorInput.checked = true;

        const priorityInput = document.querySelector(`input[name="task-priority"][value="${task.priority || 'none'}"]`);
        if (priorityInput) priorityInput.checked = true;
        document.getElementById('task-recurrence').value = task.recurrence || 'none';
        document.getElementById('task-tags').value = (task.tags || []).join(', ');
        document.getElementById('task-notes').value = task.notes || '';
        (task.subtasks || []).forEach(sub => addSubtaskRow(sub));

        document.getElementById('modal-title-text').innerText = 'Edit Task';
    } else {
        document.getElementById('task-id').value = '';
        document.getElementById('modal-title-text').innerText = 'Create Task';
        // Set default date to now + 1 hour, localized. Due date stays optional;
        // the user can clear it with the Clear button.
        const now = new Date();
        now.setHours(now.getHours() + 1);
        now.setMinutes(0);
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('task-date').value = now.toISOString().slice(0, 16);
    }
    taskModal.classList.add('active');
}

function closeModal() {
    taskModal.classList.remove('active');
}

// --- Subtask modal helpers ---
// The subtask list is edited directly in the DOM. Each row carries its id and
// checked state as data/attributes so collectSubtasksFromModal can read them back.
function clearSubtaskList() {
    document.getElementById('subtask-list').innerHTML = '';
}

function addSubtaskRow(sub) {
    const list = document.getElementById('subtask-list');
    const row = document.createElement('div');
    row.className = 'subtask-row';
    row.setAttribute('data-id', sub.id || uid());

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'subtask-check';
    checkbox.checked = !!sub.done;

    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'subtask-title';
    titleInput.value = sub.title || '';

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-icon subtask-remove';
    removeBtn.innerHTML = '<i data-lucide="x"></i>';
    removeBtn.addEventListener('click', () => {
        row.remove();
    });

    row.appendChild(checkbox);
    row.appendChild(titleInput);
    row.appendChild(removeBtn);
    list.appendChild(row);
    refreshIcons();
}

function addSubtaskFromInput() {
    const input = document.getElementById('subtask-input');
    const title = input.value.trim();
    if (!title) return;
    addSubtaskRow({ id: uid(), title, done: false });
    input.value = '';
    input.focus();
}

function collectSubtasksFromModal() {
    const rows = document.querySelectorAll('#subtask-list .subtask-row');
    const subtasks = [];
    rows.forEach(row => {
        const title = row.querySelector('.subtask-title').value.trim();
        if (!title) return;
        subtasks.push({
            id: row.getAttribute('data-id') || uid(),
            title,
            done: row.querySelector('.subtask-check').checked
        });
    });
    return subtasks;
}

function saveAndRender() {
    localStorage.setItem('aether_tasks', JSON.stringify(tasks));
    // Small delay to allow SortableJS to finish DOM operations
    setTimeout(() => {
        renderAll();
    }, 10);
}

// --- Rendering Logic ---
function renderAll() {
    renderStats();
    if (currentView === 'home') renderDashboard();
    if (currentView === 'items') renderBoard();
    if (currentView === 'calendar') renderCalendar();
    refreshIcons();
}

function renderStats() {
    document.getElementById('stat-todo').innerText = tasks.filter(t => t.status === 'todo').length;
    document.getElementById('stat-doing').innerText = tasks.filter(t => t.status === 'doing').length;
    document.getElementById('stat-done').innerText = tasks.filter(t => t.status === 'done').length;
}

function renderDashboard() {
    const dueSoonList = document.getElementById('due-soon-list');
    const overdueList = document.getElementById('overdue-list');
    
    const now = new Date();
    
    // Sort tasks by due date (undated tasks sort last)
    const sortedTasks = [...tasks].sort(compareByDueDate);
    
    // Filter overdue (not completed)
    const overdue = sortedTasks.filter(t => isTaskOverdue(t, now));
    
    // Filter due soon (within next 7 days, not completed, not overdue, must have a date)
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(now.getDate() + 7);
    const dueSoon = sortedTasks.filter(t => t.dueDate && t.status !== 'done' && new Date(t.dueDate) >= now && new Date(t.dueDate) <= sevenDaysLater);

    dueSoonList.innerHTML = dueSoon.length ? '' : '<p class="empty-state">No upcoming tasks.</p>';
    dueSoon.slice(0, 5).forEach(task => {
        dueSoonList.appendChild(createTaskListItem(task));
    });

    overdueList.innerHTML = overdue.length ? '' : '<p class="empty-state">All caught up!</p>';
    overdue.forEach(task => {
        overdueList.appendChild(createTaskListItem(task, true));
    });
}

function createTaskListItem(task, isOverdue = false) {
    const div = document.createElement('div');
    div.className = 'task-card-minimal';
    div.style.borderLeft = `4px solid ${task.color}`;
    div.innerHTML = `
        <div class="task-info-mini">
            <h4>${task.title}</h4>
            <span class="task-date-mini ${isOverdue ? 'overdue-text' : ''}">
                <i data-lucide="clock"></i>
                ${formatDate(task.dueDate)}
            </span>
        </div>
        <button class="btn-icon" onclick="openModalById('${task.id}')"><i data-lucide="edit-3"></i></button>
    `;
    return div;
}

// Global helper for onclick
window.openModalById = (id) => {
    const task = tasks.find(t => t.id === id);
    if (task) openModal(task);
};

function renderBoard() {
    const containers = {
        todo: document.getElementById('todo-container'),
        doing: document.getElementById('doing-container'),
        done: document.getElementById('done-container'),
        delete: document.getElementById('delete-container')
    };

    // Keep the tag filter in sync with the current set of tags.
    populateTagFilter();

    // Clear
    Object.values(containers).forEach(c => c.innerHTML = '');

    // Apply search, filters, and sort before rendering.
    const visibleTasks = getVisibleTasks();

    visibleTasks.forEach(task => {
        const card = createTaskCard(task);
        if (containers[task.status]) {
            containers[task.status].appendChild(card);
        }
    });

    // Update counts to reflect the filtered tasks shown in each column.
    ['todo', 'doing', 'done'].forEach(status => {
        const countEl = document.querySelector(`[data-status="${status}"] .task-count`);
        if (countEl) {
            countEl.innerText = visibleTasks.filter(t => t.status === status).length;
        }
    });

    initSortable();
    refreshIcons();
}

function createTaskCard(task) {
    const isOverdue = isTaskOverdue(task);
    const div = document.createElement('div');
    div.className = `task-card ${isOverdue ? 'overdue' : ''}`;
    div.setAttribute('data-id', task.id);

    const priorityBadge = task.priority && task.priority !== 'none'
        ? `<span class="priority-badge priority-${task.priority}"><i data-lucide="flag"></i>${capitalize(task.priority)}</span>`
        : '';

    const tagChips = (task.tags && task.tags.length)
        ? `<div class="task-tags">${task.tags.map(tag => `<span class="tag-chip">${escapeHtml(tag)}</span>`).join('')}</div>`
        : '';

    const total = (task.subtasks || []).length;
    const doneCount = (task.subtasks || []).filter(s => s.done).length;
    const percent = total ? Math.round((doneCount / total) * 100) : 0;
    const subtaskProgress = total
        ? `<div class="subtask-progress">
                <div class="subtask-progress-label"><i data-lucide="check-square"></i> ${doneCount}/${total}</div>
                <div class="subtask-progress-bar"><span style="width: ${percent}%"></span></div>
           </div>`
        : '';

    const recurrenceIcon = task.recurrence && task.recurrence !== 'none'
        ? `<span class="recurrence-indicator" title="Repeats ${escapeHtml(task.recurrence)}"><i data-lucide="repeat"></i></span>`
        : '';

    div.innerHTML = `
        <div class="task-color-bar" style="background: ${task.color}"></div>
        <div class="task-card-top">
            <h4>${escapeHtml(task.title)}</h4>
            ${recurrenceIcon}
        </div>
        ${priorityBadge}
        <p>${escapeHtml(task.description) || 'No description'}</p>
        ${tagChips}
        ${subtaskProgress}
        <div class="task-footer">
            <span class="task-date">
                <i data-lucide="clock"></i>
                ${formatDate(task.dueDate)}
            </span>
            ${isOverdue ? '<span class="overdue-badge">Overdue</span>' : ''}
            <div class="task-actions">
                <button class="btn-icon" onclick="openModalById('${task.id}')"><i data-lucide="edit-3"></i></button>
            </div>
        </div>
    `;
    return div;
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Escape user-provided text before injecting into innerHTML to avoid XSS.
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderCalendar() {
    const monthYear = document.getElementById('calendar-month-year');
    const daysContainer = document.getElementById('calendar-days');
    
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    
    monthYear.innerText = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(calendarDate);
    
    daysContainer.innerHTML = '';
    
    const firstDay = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    
    // Empty slots before first day
    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'calendar-day empty';
        daysContainer.appendChild(emptyDiv);
    }
    
    const now = new Date();
    
    for (let d = 1; d <= lastDate; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayTasks = tasks.filter(t => t.dueDate.startsWith(dateStr));
        
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        if (year === now.getFullYear() && month === now.getMonth() && d === now.getDate()) {
            dayDiv.classList.add('today');
        }
        
        dayDiv.innerHTML = `
            <span class="day-number">${d}</span>
            <div class="day-tasks">
                ${dayTasks.map(t => {
                    const isOverdue = isTaskOverdue(t, now);
                    return `
                        <div class="calendar-task-label ${isOverdue ? 'overdue' : ''}" 
                             style="background: ${t.color}" 
                             onclick="event.stopPropagation(); openModalById('${t.id}')">
                            ${t.title}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        dayDiv.addEventListener('click', () => {
            // Optional: Show tasks for this day in a list or focus board
        });

        daysContainer.appendChild(dayDiv);
    }

    renderUpcomingDeadlines();
}

function renderUpcomingDeadlines() {
    const container = document.getElementById('upcoming-deadlines-list');
    if (!container) return;

    const now = new Date();
    const upcoming = tasks
        .filter(t => t.dueDate && t.status !== 'done' && new Date(t.dueDate) >= now)
        .sort(compareByDueDate)
        .slice(0, 10);

    if (upcoming.length === 0) {
        container.innerHTML = '<p class="empty-state">No upcoming deadlines.</p>';
        return;
    }

    const groups = new Map();
    upcoming.forEach(task => {
        const key = new Date(task.dueDate).toDateString();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(task);
    });

    container.innerHTML = '';
    groups.forEach((items, dateKey) => {
        const date = new Date(dateKey);
        const group = document.createElement('div');
        group.className = 'deadline-group';
        group.innerHTML = `
            <h3 class="deadline-date-header">${formatDateHeading(date)}</h3>
            <div class="deadline-items"></div>
        `;
        const itemsEl = group.querySelector('.deadline-items');
        items.forEach(task => {
            const item = document.createElement('div');
            item.className = 'deadline-item';
            item.style.borderLeft = `4px solid ${task.color}`;
            const time = new Date(task.dueDate).toLocaleString('en-US', {
                hour: '2-digit', minute: '2-digit'
            });
            item.innerHTML = `
                <div class="deadline-info">
                    <h4>${task.title}</h4>
                    <span class="deadline-time"><i data-lucide="clock"></i> ${time}</span>
                </div>
                <button class="btn-icon" onclick="openModalById('${task.id}')"><i data-lucide="edit-3"></i></button>
            `;
            itemsEl.appendChild(item);
        });
        container.appendChild(group);
    });
}

function formatDateHeading(date) {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return date.toLocaleString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

// --- Drag & Drop ---
function initSortable() {
    if (typeof Sortable === 'undefined') return;

    ['todo', 'doing', 'done', 'delete'].forEach(status => {
        const el = document.getElementById(`${status}-container`);
        if (!el) return;
        
        new Sortable(el, {
            group: 'tasks',
            animation: 150,
            ghostClass: 'glass-ghost',
            onEnd: (evt) => {
                const taskId = evt.item.getAttribute('data-id');
                const toContainer = evt.to;
                const newStatus = toContainer.id.replace('-container', '');
                
                if (newStatus === 'delete') {
                    tasks = tasks.filter(t => t.id !== taskId);
                } else {
                    tasks = tasks.map(t => {
                        if (t.id === taskId) {
                            return { ...t, status: newStatus };
                        }
                        return t;
                    });
                }
                
                saveAndRender();
            }
        });
    });
}

// --- Helpers ---
// True only for tasks that have a due date, are not done, and are past due.
// Tasks without a due date are never overdue.
function isTaskOverdue(task, now = new Date()) {
    if (!task.dueDate) return false;
    if (task.status === 'done') return false;
    return new Date(task.dueDate) < now;
}

// Sort comparator that keeps dated tasks (earliest first) ahead of undated ones.
function compareByDueDate(a, b) {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
}

// Numeric rank for priority so higher priorities sort first. Unknown or
// 'none' priorities rank lowest.
function priorityRank(priority) {
    switch (priority) {
        case 'high': return 3;
        case 'medium': return 2;
        case 'low': return 1;
        default: return 0;
    }
}

// Apply the active board search, filters, and sort to the tasks array.
// Returns a new sorted array; does not mutate global state.
function getVisibleTasks() {
    const term = searchTerm.trim().toLowerCase();

    let visible = tasks.filter(task => {
        // Search matches title, description, tags, or notes (case-insensitive).
        if (term) {
            const haystack = [
                task.title,
                task.description,
                (task.tags || []).join(' '),
                task.notes
            ].join(' ').toLowerCase();
            if (!haystack.includes(term)) return false;
        }

        // Priority filter.
        if (filterPriority !== 'all' && task.priority !== filterPriority) return false;

        // Tag filter.
        if (filterTag !== 'all' && !(task.tags || []).includes(filterTag)) return false;

        return true;
    });

    // Sort by the selected mode.
    visible.sort((a, b) => {
        switch (sortBy) {
            case 'priority': {
                const diff = priorityRank(b.priority) - priorityRank(a.priority);
                if (diff !== 0) return diff;
                return compareByDueDate(a, b);
            }
            case 'created':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'title':
                return (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' });
            case 'dueDate':
            default:
                return compareByDueDate(a, b);
        }
    });

    return visible;
}

// Rebuild the tag filter <select> from the union of all tags across every
// task, preserving the current selection when possible.
function populateTagFilter() {
    const select = document.getElementById('board-filter-tag');
    if (!select) return;

    const allTags = new Set();
    tasks.forEach(task => (task.tags || []).forEach(tag => {
        if (tag) allTags.add(tag);
    }));
    const sortedTags = Array.from(allTags).sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: 'base' }));

    // If the currently selected tag no longer exists, fall back to 'all'.
    if (filterTag !== 'all' && !allTags.has(filterTag)) {
        filterTag = 'all';
    }

    let html = '<option value="all">All tags</option>';
    sortedTags.forEach(tag => {
        const selected = tag === filterTag ? ' selected' : '';
        html += `<option value="${escapeHtml(tag)}"${selected}>${escapeHtml(tag)}</option>`;
    });
    select.innerHTML = html;
    select.value = filterTag;
}

function formatDate(dateStr) {
    if (!dateStr) return 'No due date';
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
    });
}

// Run app
init();
