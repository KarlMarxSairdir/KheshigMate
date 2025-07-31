// Gantt Chart JavaScript for Kaşıkmate
// Frappe Gantt integration with real-time task management

class GanttManager {
    constructor(projectId, socket) {
        this.projectId = projectId;
        this.socket = socket;
        this.ganttChart = null;
        this.tasks = [];
        this.currentView = 'Week';
        this.isLoading = false;
        
        this.init();
    }

    async init() {
        try {
            console.log('🎯 Initializing Gantt Manager...');
            
            this.setupEventListeners();
            await this.loadTasks();
            this.setupSocketListeners();
            
            console.log('✅ Gantt Manager initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Gantt Manager:', error);
            this.showError('Gantt şeması yüklenirken hata oluştu');
        }
    }

    // ==================== EVENT LISTENERS ====================
    setupEventListeners() {
        // View control buttons
        const viewButtons = document.querySelectorAll('.view-btn');
        viewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });

        // Window resize handler
        window.addEventListener('resize', () => {
            if (this.ganttChart) {
                this.ganttChart.refresh();
            }
        });
    }

    setupSocketListeners() {
        if (!this.socket) return;

        // Listen for task updates
        this.socket.on('taskUpdated', (data) => {
            console.log('📡 Task updated via socket:', data);
            this.handleTaskUpdate(data);
        });

        this.socket.on('taskCreated', (data) => {
            console.log('📡 Task created via socket:', data);
            this.handleTaskCreated(data);
        });

        this.socket.on('taskDeleted', (data) => {
            console.log('📡 Task deleted via socket:', data);
            this.handleTaskDeleted(data);
        });
    }

    // ==================== API CALLS ====================
    async loadTasks() {
        try {
            console.log('🔄 Loading tasks for project:', this.projectId);
            this.setLoading(true);
            
            const response = await fetch(`/projects/${this.projectId}/tasks`);
            console.log('📡 API Response status:', response.status);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📦 Raw API response:', data);
            
            this.tasks = data || [];
            
            console.log('📋 Tasks loaded for Gantt:', this.tasks);
            console.log('📊 Task count:', this.tasks.length);
            this.renderGanttChart();
            
        } catch (error) {
            console.error('❌ Failed to load tasks:', error);
            this.showError('Görevler yüklenirken hata oluştu');
        } finally {
            this.setLoading(false);
        }
    }

    // ==================== GANTT RENDERING ====================
    renderGanttChart() {
        const container = document.getElementById('gantt-chart-container');
        const chartElement = document.getElementById('gantt-chart');
        
        if (!container || !chartElement) {
            console.error('❌ Gantt chart container not found');
            return;
        }

        // Transform tasks to Frappe Gantt format
        const ganttTasks = this.transformTasksForGantt();
        
        console.log('📊 Gantt tasks prepared:', ganttTasks.length);

        try {
            // Clear previous chart if exists
            if (this.ganttChart) {
                this.ganttChart = null;
            }
            
            // Clear the SVG element
            chartElement.innerHTML = '';
            
            if (ganttTasks.length === 0) {
                this.showEmptyState();
                return;
            }
            
            // Create new Gantt chart
            this.ganttChart = new Gantt(chartElement, ganttTasks, {
                header_height: 50,
                column_width: 30,
                step: 24,
                view_modes: ['Quarter Day', 'Half Day', 'Day', 'Week', 'Month', 'Year'],
                bar_height: 20,
                bar_corner_radius: 3,
                arrow_curve: 5,
                padding: 18,
                view_mode: this.currentView,
                date_format: 'DD.MM.YYYY',
                popup_trigger: 'click',
                custom_popup_html: (task) => this.generateTaskPopup(task),
                on_click: (task) => this.handleTaskClick(task),
                on_date_change: (task, start, end) => this.handleTaskDateChange(task, start, end),
                on_progress_change: (task, progress) => this.handleTaskProgressChange(task, progress),
                on_view_change: (mode) => console.log('📊 View changed to:', mode),
                language: 'tr'
            });

            container.classList.remove('loading', 'empty');
            this.updateStatusBar();
            
            console.log('✅ Gantt chart rendered successfully with', ganttTasks.length, 'tasks');
            
        } catch (error) {
            console.error('❌ Failed to render Gantt chart:', error);
            this.showError('Gantt şeması oluşturulurken hata oluştu: ' + error.message);
        }
    }

    transformTasksForGantt() {
        console.log('🔄 Transforming tasks for Gantt:', this.tasks);
        console.log('📊 Task count:', this.tasks.length);
        
        // Log tasks with date information
        this.tasks.forEach(task => {
            console.log(`Task "${task.title}":`, {
                startDate: task.startDate,
                dueDate: task.dueDate,
                hasStartDate: !!task.startDate,
                hasDueDate: !!task.dueDate
            });
        });
        
        // Show all tasks - assign default dates if missing
        return this.tasks.map(task => {
            const startDate = task.startDate ? new Date(task.startDate) : new Date();
            const endDate = task.dueDate ? new Date(task.dueDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
            
            // Ensure end date is after start date
            if (endDate <= startDate) {
                endDate.setTime(startDate.getTime() + 24 * 60 * 60 * 1000);
            }
            
            const ganttTask = {
                id: task._id,
                name: task.title,
                start: this.formatDate(startDate),
                end: this.formatDate(endDate),
                progress: this.getTaskProgress(task),
                dependencies: '',
                custom_class: this.getTaskCustomClass(task),
                task: task
            };
            
            console.log('📈 Gantt task created:', ganttTask);
            return ganttTask;
        });
    }

    getTaskProgress(task) {
        return {
            'todo': 0,
            'in-progress': 50,
            'done': 100
        }[task.status] || 0;
    }

    getTaskCustomClass(task) {
        let classes = ['bar-task'];
        
        if (task.priority === 'high') {
            classes.push('bar-critical');
        } else if (task.priority === 'low') {
            classes.push('bar-low');
        }
        
        classes.push(`bar-${task.status}`);
        
        return classes.join(' ');
    }

    formatDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // ==================== EVENT HANDLERS ====================
    switchView(view) {
        if (this.currentView === view) return;
        
        this.currentView = view;
        
        // Update button states
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        // Update Gantt chart view
        if (this.ganttChart) {
            this.ganttChart.change_view_mode(view);
        }
        
        console.log('📊 Gantt view switched to:', view);
    }

    handleTaskClick(task) {
        console.log('🎯 Task clicked in Gantt:', task);
        
        // Emit event to open task modal if kanban is available
        if (window.roomKanbanBoard && typeof window.roomKanbanBoard.openTaskModal === 'function') {
            const originalTask = this.tasks.find(t => t._id === task.id);
            if (originalTask) {
                window.roomKanbanBoard.openTaskModal(originalTask);
            }
        }
    }

    async handleTaskDateChange(task, start, end) {
        try {
            console.log('📅 Task date changed:', { task: task.name, start, end });
            
            const updates = {
                startDate: start,
                dueDate: end
            };
            
            await this.updateTask(task.id, updates);
            this.showSuccess('Görev tarihleri güncellendi');
            
        } catch (error) {
            console.error('❌ Failed to update task dates:', error);
            this.showError('Görev tarihleri güncellenirken hata oluştu');
            
            // Refresh chart to revert changes
            await this.loadTasks();
        }
    }

    async handleTaskProgressChange(task, progress) {
        try {
            console.log('📈 Task progress changed:', { task: task.name, progress });
            
            // Convert progress to status
            let status = 'todo';
            if (progress >= 100) {
                status = 'done';
            } else if (progress > 0) {
                status = 'in-progress';
            }
            
            await this.updateTask(task.id, { status });
            this.showSuccess('Görev durumu güncellendi');
            
        } catch (error) {
            console.error('❌ Failed to update task progress:', error);
            this.showError('Görev durumu güncellenirken hata oluştu');
            
            // Refresh chart to revert changes
            await this.loadTasks();
        }
    }

    async updateTask(taskId, updates) {
        const response = await fetch(`/projects/${this.projectId}/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return response.json();
    }

    // ==================== SOCKET EVENT HANDLERS ====================
    handleTaskUpdate(data) {
        const taskIndex = this.tasks.findIndex(t => t._id === data.task._id);
        if (taskIndex !== -1) {
            this.tasks[taskIndex] = data.task;
            this.renderGanttChart();
        }
    }

    handleTaskCreated(data) {
        this.tasks.push(data.task);
        this.renderGanttChart();
    }

    handleTaskDeleted(data) {
        this.tasks = this.tasks.filter(t => t._id !== data.taskId);
        this.renderGanttChart();
    }

    // ==================== UI HELPERS ====================
    generateTaskPopup(task) {
        const originalTask = this.tasks.find(t => t._id === task.id);
        if (!originalTask) return '';
        
        return `
            <div class="gantt-tooltip">
                <div class="tooltip-title">${this.escapeHtml(originalTask.title)}</div>
                <div class="tooltip-content">
                    ${originalTask.description ? `<div class="tooltip-item">
                        <span class="label">Açıklama:</span>
                        <span class="value">${this.escapeHtml(originalTask.description)}</span>
                    </div>` : ''}
                    <div class="tooltip-item">
                        <span class="label">Durum:</span>
                        <span class="value">${this.getStatusDisplayName(originalTask.status)}</span>
                    </div>
                    <div class="tooltip-item">
                        <span class="label">Öncelik:</span>
                        <span class="value">${this.getPriorityDisplayName(originalTask.priority)}</span>
                    </div>
                    ${originalTask.assignedTo ? `<div class="tooltip-item">
                        <span class="label">Atanan:</span>
                        <span class="value">${this.escapeHtml(originalTask.assignedTo.username)}</span>
                    </div>` : ''}
                    ${originalTask.startDate ? `<div class="tooltip-item">
                        <span class="label">Başlangıç:</span>
                        <span class="value">${this.formatDisplayDate(originalTask.startDate)}</span>
                    </div>` : ''}
                    ${originalTask.dueDate ? `<div class="tooltip-item">
                        <span class="label">Bitiş:</span>
                        <span class="value">${this.formatDisplayDate(originalTask.dueDate)}</span>
                    </div>` : ''}
                </div>
            </div>
        `;
    }

    setLoading(loading) {
        this.isLoading = loading;
        const container = document.getElementById('gantt-chart-container');
        const statusText = document.querySelector('.gantt-status .status-text');
        
        if (container) {
            if (loading) {
                container.classList.add('loading');
                container.classList.remove('empty');
            } else {
                container.classList.remove('loading');
            }
        }
        
        if (statusText) {
            statusText.textContent = loading ? 'Gantt şeması yükleniyor...' : 'Hazır';
        }
    }

    showEmptyState() {
        const container = document.getElementById('gantt-chart-container');
        if (container) {
            container.classList.add('empty');
            container.classList.remove('loading');
            container.innerHTML = `
                <div class="empty-icon">
                    <i class="fas fa-chart-gantt"></i>
                </div>
                <div class="empty-text">Henüz görev yok</div>
                <div class="empty-description">
                    Kanban ekranından görev oluşturarak Gantt şemasını görüntüleyebilirsiniz.
                </div>
            `;
        }
        
        this.updateStatusBar();
    }

    updateStatusBar() {
        const statusText = document.querySelector('.gantt-status .status-text');
        if (statusText && !this.isLoading) {
            const taskCount = this.tasks.length;
            const datedTaskCount = this.tasks.filter(t => t.startDate || t.dueDate).length;
            
            if (taskCount === 0) {
                statusText.textContent = 'Görev bulunamadı';
            } else {
                statusText.textContent = `${taskCount} görev gösteriliyor (${datedTaskCount} tanesinde tarih var)`;
            }
        }
    }

    // ==================== UTILITY METHODS ====================
    getStatusDisplayName(status) {
        const names = {
            'todo': 'Yapılacaklar',
            'in-progress': 'Devam Ediyor',
            'done': 'Tamamlandı'
        };
        return names[status] || status;
    }

    getPriorityDisplayName(priority) {
        const names = {
            'low': 'Düşük',
            'medium': 'Orta',
            'high': 'Yüksek'
        };
        return names[priority] || priority;
    }

    formatDisplayDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // ==================== NOTIFICATION METHODS ====================
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        // Use existing notification system if available
        if (typeof showNotification === 'function') {
            showNotification(message, type);
        } else {
            // Fallback notification
            console.log(`${type.toUpperCase()}: ${message}`);
            
            // Simple toast notification
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            toast.textContent = message;
            toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
                color: white;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                z-index: 10001;
                transform: translateX(100%);
                transition: transform 0.3s ease;
            `;
            
            document.body.appendChild(toast);
            
            // Animate in
            setTimeout(() => {
                toast.style.transform = 'translateX(0)';
            }, 100);
            
            // Remove after delay
            setTimeout(() => {
                toast.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (toast.parentNode) {
                        document.body.removeChild(toast);
                    }
                }, 300);
            }, 3000);
        }
    }
}

// ==================== GLOBAL GANTT INSTANCE ====================
let ganttManager = null;

// Initialize Gantt Manager
function initGanttChart(projectId, socket) {
    if (ganttManager) {
        console.log('⚠️ Gantt Manager already initialized');
        return ganttManager;
    }
    
    console.log('🚀 Initializing new Gantt Manager...');
    ganttManager = new GanttManager(projectId, socket);
    return ganttManager;
}

// Cleanup Gantt Manager
function destroyGanttChart() {
    if (ganttManager) {
        console.log('🗑️ Destroying Gantt Manager...');
        
        // Clean up event listeners and resources
        if (ganttManager.ganttChart) {
            ganttManager.ganttChart = null;
        }
        
        ganttManager = null;
        console.log('✅ Gantt Manager destroyed');
    }
}

// Refresh Gantt Chart
function refreshGanttChart() {
    if (ganttManager) {
        console.log('🔄 Refreshing Gantt Chart...');
        ganttManager.loadTasks();
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GanttManager, initGanttChart, destroyGanttChart, refreshGanttChart };
}

// Make available globally for browser usage
if (typeof window !== 'undefined') {
    window.GanttManager = GanttManager;
    window.initGanttChart = initGanttChart;
    window.destroyGanttChart = destroyGanttChart;
    window.refreshGanttChart = refreshGanttChart;
}
