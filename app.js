// App State
let tasks = JSON.parse(localStorage.getItem('aether_tasks')) || [];
let currentView = 'home';
let calendarDate = new Date();

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
    lucide.createIcons();
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

    const taskData = {
        id: id || Date.now().toString(),
        title,
        description,
        dueDate,
        color,
        status: id ? tasks.find(t => t.id === id).status : 'todo',
        createdAt: id ? tasks.find(t => t.id === id).createdAt : new Date().toISOString()
    };

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
    if (task) {
        document.getElementById('task-id').value = task.id;
        document.getElementById('task-title').value = task.title;
        document.getElementById('task-desc').value = task.description;
        document.getElementById('task-date').value = task.dueDate;
        document.querySelector(`input[name="task-color"][value="${task.color}"]`).checked = true;
        document.getElementById('modal-title-text').innerText = 'Edit Task';
    } else {
        document.getElementById('task-id').value = '';
        document.getElementById('modal-title-text').innerText = 'Create Task';
        // Set default date to now + 1 hour, localized
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
    lucide.createIcons();
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
    
    // Sort tasks by due date
    const sortedTasks = [...tasks].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    // Filter overdue (not completed)
    const overdue = sortedTasks.filter(t => t.status !== 'done' && new Date(t.dueDate) < now);
    
    // Filter due soon (within next 7 days, not completed, not overdue)
    const sevenDaysLater = new Date();
    sevenDaysLater.setDate(now.getDate() + 7);
    const dueSoon = sortedTasks.filter(t => t.status !== 'done' && new Date(t.dueDate) >= now && new Date(t.dueDate) <= sevenDaysLater);

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

    // Clear
    Object.values(containers).forEach(c => c.innerHTML = '');

    // Sort tasks by due date (earliest first)
    const sortedTasks = [...tasks].sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    sortedTasks.forEach(task => {
        const card = createTaskCard(task);
        if (containers[task.status]) {
            containers[task.status].appendChild(card);
        }
    });

    // Update counts
    ['todo', 'doing', 'done'].forEach(status => {
        const countEl = document.querySelector(`[data-status="${status}"] .task-count`);
        if (countEl) {
            countEl.innerText = tasks.filter(t => t.status === status).length;
        }
    });

    initSortable();
}

function createTaskCard(task) {
    const isOverdue = task.status !== 'done' && new Date(task.dueDate) < new Date();
    const div = document.createElement('div');
    div.className = `task-card ${isOverdue ? 'overdue' : ''}`;
    div.setAttribute('data-id', task.id);
    
    div.innerHTML = `
        <div class="task-color-bar" style="background: ${task.color}"></div>
        <h4>${task.title}</h4>
        <p>${task.description || 'No description'}</p>
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
                    const isOverdue = t.status !== 'done' && new Date(t.dueDate) < now;
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
}

// --- Drag & Drop ---
function initSortable() {
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
function formatDate(dateStr) {
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
