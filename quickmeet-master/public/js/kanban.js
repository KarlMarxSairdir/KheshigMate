// Kanban Board JavaScript - Modern Task Management
class KanbanBoard {
    constructor(projectId, socket) {
        this.projectId = projectId;
        this.socket = socket;
        this.tasks = [];
        this.projectMembers = [];
        this.draggedTask = null;
        this.currentEditingTask = null;
        
        this.init();
    }    async init() {
        try {
            console.log('🚀 Initializing Kanban board for project:', this.projectId);
            
            // Ensure modal is closed at startup and add multiple safeguards
            this.ensureModalClosed();
            
            // Additional safety - force hide modal multiple times
            setTimeout(() => this.ensureModalClosed(), 100);
            setTimeout(() => this.ensureModalClosed(), 500);
            setTimeout(() => this.ensureModalClosed(), 1000);
              await this.loadTasks();
            await this.loadProjectMembers();
            this.setupEventListeners();
            this.setupSocketListeners();
            console.log('✅ Kanban board initialized successfully');
            
            // Initialize AI suggestions after kanban board is fully ready
            this.initializeAISuggestions();
        } catch (error) {
            console.error('❌ Kanban initialization error:', error);
            this.showError('Kanban tahtası yüklenirken hata oluştu');
        }
    }    // Ensure modal is closed on initialization
    ensureModalClosed() {
        const modal = document.getElementById('task-modal');
        if (modal) {
            modal.classList.remove('show');
            modal.style.display = 'none'; // Force hide modal
            modal.style.visibility = 'hidden'; // Additional safety
            modal.style.opacity = '0'; // Additional safety
            console.log('🔒 Modal ensured closed on initialization with multiple safeguards');
        } else {
            console.warn('⚠️ Task modal element not found during ensureModalClosed');
        }
    }

    // ==================== API CALLS ====================
    async loadTasks() {
        try {
            const response = await fetch(`/projects/${this.projectId}/tasks`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            this.tasks = await response.json();
            console.log(`📋 Loaded ${this.tasks.length} tasks`);
            this.renderTasks();
            this.updateTaskCounts();
        } catch (error) {
            console.error('Task loading error:', error);
            this.showError('Görevler yüklenirken hata oluştu');
            // Show empty states
            this.renderTasks();
        }
    }

    async loadProjectMembers() {
        try {
            // Get project details to access members
            const response = await fetch(`/projects/${this.projectId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const project = await response.json();
            this.projectMembers = project.members.map(member => member.user);
            console.log(`👥 Loaded ${this.projectMembers.length} project members`);
            this.populateAssigneeDropdown();
        } catch (error) {
            console.error('Project members loading error:', error);
            this.projectMembers = [];
            this.populateAssigneeDropdown();        }
    }

    populateAssigneeDropdown() {
        const assigneeSelect = document.getElementById('task-assigned-to');
        if (!assigneeSelect) return;

        // Clear existing options except the first one
        assigneeSelect.innerHTML = '<option value="">Atanmamış</option>';

        // Add project members as options
        this.projectMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member._id;
            option.textContent = member.username;
            assigneeSelect.appendChild(option);
        });
    }

    async createTask(taskData) {
        try {
            const response = await fetch(`/projects/${this.projectId}/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Task could not be created');
            }
            
            const task = await response.json();
            this.tasks.push(task);
            this.renderTasks();
            this.updateTaskCounts();
            // this.socket.emit('task-created', { projectId: this.projectId, task: task }); // ARTIK GEREKSİZ
            console.log('✅ Task created:', task.title);
            return task;
        } catch (error) {
            console.error('Task creation error:', error);
            throw error;
        }
    }

    async updateTask(taskId, updates) {
        try {
            const response = await fetch(`/projects/${this.projectId}/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Task could not be updated');
            }
            
            const updatedTask = await response.json();
            const index = this.tasks.findIndex(t => t._id === taskId);
            if (index !== -1) {
                this.tasks[index] = updatedTask;
                this.renderTasks();
                this.updateTaskCounts();
            }
            // this.socket.emit('task-updated', { projectId: this.projectId, task: updatedTask }); // ARTIK GEREKSİZ
            console.log('✅ Task updated:', updatedTask.title);
            return updatedTask;
        } catch (error) {
            console.error('Task update error:', error);
            throw error;
        }
    }

    async deleteTask(taskId) {
        try {
            const response = await fetch(`/projects/${this.projectId}/tasks/${taskId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Task could not be deleted');
            }
            
            this.tasks = this.tasks.filter(t => t._id !== taskId);
            this.renderTasks();
            this.updateTaskCounts();
            // this.socket.emit('task-deleted', { projectId: this.projectId, taskId: taskId }); // ARTIK GEREKSİZ
            console.log('✅ Task deleted:', taskId);
        } catch (error) {
            console.error('Task deletion error:', error);
            throw error;
        }
    }

    // ==================== RENDERING METHODS ====================
    renderTasks() {
        const columns = {
            'todo': document.getElementById('todo-column'),
            'in-progress': document.getElementById('in-progress-column'),
            'done': document.getElementById('done-column')
        };

        // Clear all columns
        Object.values(columns).forEach(column => {
            if (column) column.innerHTML = '';
        });

        // Render tasks by status
        ['todo', 'in-progress', 'done'].forEach(status => {
            const column = columns[status];
            if (!column) return;

            const statusTasks = this.tasks.filter(task => task.status === status);
            statusTasks.sort((a, b) => (a.order || 0) - (b.order || 0));

            if (statusTasks.length === 0) {
                column.innerHTML = this.getEmptyColumnHTML(status);
            } else {
                statusTasks.forEach(task => {
                    column.appendChild(this.createTaskElement(task));
                });
            }
        });
    }

    createTaskElement(task) {
        const taskElement = document.createElement('div');
        taskElement.className = 'task-card';
        taskElement.draggable = true;
        taskElement.dataset.taskId = task._id;
        
        taskElement.innerHTML = `
            <div class="task-priority ${task.priority || 'medium'}"></div>
            <div class="task-title">${this.escapeHtml(task.title)}</div>
            ${task.description ? `<div class="task-description">${this.escapeHtml(task.description)}</div>` : ''}
            <div class="task-meta">
                <div class="task-assignee">
                    ${task.assignedTo ? `
                        <div class="avatar">${task.assignedTo.username.charAt(0).toUpperCase()}</div>
                        <span>${task.assignedTo.username}</span>
                    ` : '<span>Atanmamış</span>'}
                </div>
                ${task.dueDate ? `
                    <div class="task-due-date ${this.getDueDateClass(task.dueDate)}">
                        ${this.formatDate(task.dueDate)}
                    </div>
                ` : ''}
            </div>
            ${task.requiredSkills && task.requiredSkills.length > 0 ? `
                <div class="task-skills">
                    ${task.requiredSkills.map(skill => 
                        `<span class="skill-tag">${this.escapeHtml(skill)}</span>`
                    ).join('')}
                </div>
            ` : ''}
        `;

        // Add event listeners
        taskElement.addEventListener('click', () => this.openTaskModal(task));
        taskElement.addEventListener('dragstart', (e) => this.handleDragStart(e, task));
        taskElement.addEventListener('dragend', () => this.handleDragEnd());

        return taskElement;
    }

    getEmptyColumnHTML(status) {
        const messages = {
            'todo': { 
                icon: '📝', 
                text: 'Henüz yapılacak görev yok.<br>Yeni görev eklemek için yukarıdaki + butonunu kullanın.' 
            },
            'in-progress': { 
                icon: '⚡', 
                text: 'Devam eden görev yok.<br>Sol sütundan görev sürükleyerek başlayın.' 
            },
            'done': { 
                icon: '✅', 
                text: 'Tamamlanan görev yok.<br>Tamamladığınız görevleri buraya sürükleyin.' 
            }
        };

        return `
            <div class="empty-column">
                <div class="empty-icon">${messages[status].icon}</div>
                <div class="empty-text">${messages[status].text}</div>
            </div>
        `;
    }    // ==================== EVENT LISTENERS ====================
    setupEventListeners() {
        console.log('🔧 Setting up Kanban event listeners...');
          // Add task button
        const addTaskBtn = document.getElementById('add-task-btn');
        if (addTaskBtn) {
            addTaskBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🆕 Add task button clicked');
                this.openTaskModal();
            }, { once: false });
            console.log('✅ Add task button event listener added');
        }

        // Modal close events
        const closeBtn = document.getElementById('close-task-modal');
        if (closeBtn) {
            closeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔄 Close button clicked');
                this.closeTaskModal();
            }, { once: false });
            console.log('✅ Close button event listener added');
        } else {
            console.error('❌ Close button not found!');
        }        const cancelBtn = document.getElementById('cancel-task-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔄 Cancel button clicked');
                this.closeTaskModal();
            }, { once: false });
            console.log('✅ Cancel button event listener added');        } else {
            console.error('❌ Cancel button not found!');
        }        // Save task button
        const saveBtn = document.getElementById('save-task-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('💾 Save button clicked');
                // Trigger form submit manually
                this.handleTaskFormSubmit(e);
            }, { once: false });
            console.log('✅ Save button event listener added');
        } else {
            console.error('❌ Save button not found!');
        }

        // Task form submit
        const taskForm = document.getElementById('task-form');
        if (taskForm) {
            taskForm.addEventListener('submit', (e) => {
                this.handleTaskFormSubmit(e);
            });
        }

        // Delete task button
        const deleteBtn = document.getElementById('delete-task-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.handleTaskDelete();
            });
        }

        // Drag and drop for columns
        ['todo', 'in-progress', 'done'].forEach(status => {
            const column = document.getElementById(`${status}-column`);
            if (column) {
                column.addEventListener('dragover', (e) => this.handleDragOver(e));
                column.addEventListener('drop', (e) => this.handleDrop(e, status));
                column.addEventListener('dragenter', () => this.handleDragEnter(column));
                column.addEventListener('dragleave', () => this.handleDragLeave(column));
            }
        });        // Modal backdrop click
        const modal = document.getElementById('task-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                // Only close if clicking directly on the modal overlay (not on modal content)
                if (e.target === modal && !e.target.closest('.modal-content')) {
                    console.log('🔄 Modal backdrop clicked');
                    this.closeTaskModal();
                }
            }, { once: false });
            console.log('✅ Modal backdrop event listener added');
        }

        // Prevent modal content clicks from closing the modal
        const modalContent = document.querySelector('#task-modal .modal-content');
        if (modalContent) {
            modalContent.addEventListener('click', (e) => {
                e.stopPropagation();
            }, { once: false });
            console.log('✅ Modal content event listener added');
        }
    }

    // ==================== DRAG AND DROP HANDLERS ====================
    handleDragStart(e, task) {
        this.draggedTask = task;
        e.dataTransfer.effectAllowed = 'move';
        e.target.classList.add('dragging');
        console.log('🔥 Drag started for task:', task.title);
    }

    handleDragEnd() {
        document.querySelectorAll('.task-card').forEach(card => {
            card.classList.remove('dragging');
        });
        document.querySelectorAll('.kanban-column').forEach(column => {
            column.classList.remove('drag-over');
        });
        console.log('🏁 Drag ended');
    }

    handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDragEnter(column) {
        column.parentElement.classList.add('drag-over');
    }

    handleDragLeave(column) {
        column.parentElement.classList.remove('drag-over');
    }

    async handleDrop(e, newStatus) {
        e.preventDefault();
        
        if (!this.draggedTask) return;

        const column = e.currentTarget;
        column.parentElement.classList.remove('drag-over');

        if (this.draggedTask.status !== newStatus) {
            try {
                console.log(`🎯 Dropping task ${this.draggedTask.title} to ${newStatus}`);
                await this.updateTask(this.draggedTask._id, { status: newStatus });
                this.showSuccess(`Görev "${this.draggedTask.title}" durumu "${this.getStatusDisplayName(newStatus)}" olarak güncellendi`);
            } catch (error) {
                console.error('Task status update error:', error);
                this.showError('Görev durumu güncellenirken hata oluştu');
                this.renderTasks();
            }
        }

        this.draggedTask = null;
    }    // ==================== MODAL HANDLERS ====================
    openTaskModal(task = null) {
        console.log('🎯 Opening task modal...');
        this.currentEditingTask = task;
        const modal = document.getElementById('task-modal');
        const modalTitle = document.getElementById('modal-title');
        const deleteBtn = document.getElementById('delete-task-btn');
        const saveBtn = document.getElementById('save-task-btn');
        const cancelBtn = document.getElementById('cancel-task-btn');
        const modalActions = document.querySelector('#task-modal .modal-actions');
        const form = document.getElementById('task-form');

        // Debug: Check all modal elements
        console.log('📋 Modal elements check:', {
            modal: !!modal,
            modalTitle: !!modalTitle,
            deleteBtn: !!deleteBtn,
            saveBtn: !!saveBtn,
            cancelBtn: !!cancelBtn,
            modalActions: !!modalActions,
            form: !!form
        });

        if (modalActions) {
            console.log('📐 Modal actions computed style:', window.getComputedStyle(modalActions));
            console.log('📦 Modal actions children:', modalActions.children);
        }

        // Debug save button specifically
        if (saveBtn) {
            console.log('💾 Save button details:', {
                element: saveBtn,
                display: window.getComputedStyle(saveBtn).display,
                visibility: window.getComputedStyle(saveBtn).visibility,
                opacity: window.getComputedStyle(saveBtn).opacity,
                position: window.getComputedStyle(saveBtn).position,
                zIndex: window.getComputedStyle(saveBtn).zIndex,
                width: window.getComputedStyle(saveBtn).width,
                height: window.getComputedStyle(saveBtn).height,
                backgroundColor: window.getComputedStyle(saveBtn).backgroundColor,
                color: window.getComputedStyle(saveBtn).color,
                offsetParent: saveBtn.offsetParent,
                offsetTop: saveBtn.offsetTop,
                offsetLeft: saveBtn.offsetLeft,
                clientRect: saveBtn.getBoundingClientRect()
            });
        }

        if (!modal || !modalTitle || !deleteBtn || !form) {
            console.error('❌ Modal elements not found');
            return;
        }        if (task) {
            modalTitle.textContent = 'Görevi Düzenle';
            deleteBtn.style.display = 'inline-block';
            this.populateTaskForm(task);
        } else {
            modalTitle.textContent = 'Yeni Görev';
            deleteBtn.style.display = 'none';
            form.reset();
        }        // Add small delay to prevent event conflicts
        setTimeout(() => {
            modal.classList.add('show');
            console.log('✅ Modal show class added with delay');
              // Debug again after modal is shown
            setTimeout(() => {
                const saveBtn = document.getElementById('save-task-btn');
                const modalActions = document.querySelector('#task-modal .modal-actions');
                const modal = document.getElementById('task-modal');
                const modalContent = document.querySelector('#task-modal .modal-content');
                
                console.log('🔍 Post-modal-show debugging:');
                console.log('Modal visible:', modal ? window.getComputedStyle(modal).display : 'N/A');
                console.log('Modal opacity:', modal ? window.getComputedStyle(modal).opacity : 'N/A');
                console.log('Modal z-index:', modal ? window.getComputedStyle(modal).zIndex : 'N/A');
                console.log('Modal content visible:', modalContent ? window.getComputedStyle(modalContent).display : 'N/A');
                console.log('Modal actions visible:', modalActions ? window.getComputedStyle(modalActions).display : 'N/A');
                console.log('Modal actions z-index:', modalActions ? window.getComputedStyle(modalActions).zIndex : 'N/A');
                console.log('Save button visible:', saveBtn ? window.getComputedStyle(saveBtn).display : 'N/A');
                console.log('Save button rect:', saveBtn ? saveBtn.getBoundingClientRect() : 'N/A');
                console.log('Save button z-index:', saveBtn ? window.getComputedStyle(saveBtn).zIndex : 'N/A');
                
                // Force ensure button is visible
                if (saveBtn) {
                    saveBtn.style.display = 'inline-block';
                    saveBtn.style.visibility = 'visible';
                    saveBtn.style.opacity = '1';
                    saveBtn.style.zIndex = '9999';
                    console.log('🔧 Forced save button visibility styles');
                }
                
                const titleField = document.getElementById('task-title');
                if (titleField) titleField.focus();
            }, 100);
        }, 10);
    }    closeTaskModal() {
        console.log('🔄 Closing task modal...');
        
        const modal = document.getElementById('task-modal');
        if (modal) {
            modal.classList.remove('show');
            console.log('✅ Modal class "show" removed');
            
            // Double check - force hide if still visible
            setTimeout(() => {
                if (modal.classList.contains('show')) {
                    modal.classList.remove('show');
                    console.log('🔄 Force removed show class');
                }
            }, 100);
        } else {
            console.error('❌ Task modal element not found!');
        }
        
        this.currentEditingTask = null;
        
        const form = document.getElementById('task-form');
        if (form) {
            form.reset();
            console.log('✅ Task form reset');
        } else {
            console.warn('⚠️ Task form not found for reset');
        }
        
        console.log('🔄 Task modal close completed');
    }

    populateTaskForm(task) {
        const fields = {
            'task-title': task.title || '',
            'task-description': task.description || '',
            'task-priority': task.priority || 'medium',
            'task-assigned-to': task.assignedTo?._id || '',
            'task-skills': task.requiredSkills?.join(', ') || ''
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.value = value;
            }
        });
        // Handle startDate separately
        if (task.startDate) {
            const startDateField = document.getElementById('task-start-date');
            if (startDateField) {
                const date = new Date(task.startDate);
                startDateField.value = date.toISOString().split('T')[0];
            }
        }
        // Handle due date separately
        if (task.dueDate) {
            const dateField = document.getElementById('task-due-date');
            if (dateField) {
                const date = new Date(task.dueDate);
                dateField.value = date.toISOString().split('T')[0];
            }
        }
    }    async handleTaskFormSubmit(e) {
        e.preventDefault();
        
        console.log('📝 Form submit started');
        
        // Get the form element directly, not from e.target which might be a button
        const form = document.getElementById('task-form');
        if (!form) {
            console.error('❌ Task form not found');
            this.showError('Form bulunamadı');
            return;
        }
        
        console.log('✅ Form found:', form);
        
        const formData = new FormData(form);
        console.log('✅ FormData created');
        
        // Debug: Log all form data
        console.log('📋 Form data entries:');
        for (let [key, value] of formData.entries()) {
            console.log(`  ${key}: ${value}`);
        }
        
        const taskData = {
            title: formData.get('title')?.trim(),
            description: formData.get('description')?.trim(),
            priority: formData.get('priority'),
            assignedTo: formData.get('assignedTo') || undefined,
            startDate: formData.get('startDate') || undefined,
            dueDate: formData.get('dueDate') || undefined,
            requiredSkills: formData.get('requiredSkills')
                ?.split(',')
                .map(skill => skill.trim())
                .filter(skill => skill.length > 0) || []
        };
        
        console.log('📊 Processed task data:', taskData);

        // Validation
        if (!taskData.title) {
            this.showError('Görev başlığı gereklidir');
            return;
        }

        try {
            if (this.currentEditingTask) {
                await this.updateTask(this.currentEditingTask._id, taskData);
                this.showSuccess('Görev başarıyla güncellendi');
            } else {
                await this.createTask(taskData);
                this.showSuccess('Yeni görev başarıyla oluşturuldu');
            }
            
            this.closeTaskModal();
        } catch (error) {
            console.error('Task save error:', error);
            this.showError(error.message || 'Görev kaydedilirken hata oluştu');
        }
    }

    async handleTaskDelete() {
        if (!this.currentEditingTask) return;

        const taskTitle = this.currentEditingTask.title;
        if (confirm(`"${taskTitle}" görevini silmek istediğinizden emin misiniz?`)) {
            try {
                await this.deleteTask(this.currentEditingTask._id);
                this.showSuccess(`"${taskTitle}" görevi başarıyla silindi`);
                this.closeTaskModal();
            } catch (error) {
                console.error('Task delete error:', error);
                this.showError(error.message || 'Görev silinirken hata oluştu');
            }
        }
    }

    // ==================== SOCKET.IO LISTENERS ====================
    setupSocketListeners() {
        if (!this.socket) {
            console.warn('Socket not available for real-time updates');
            return;
        }
        // task-updated event'ini dinle (backend ile uyumlu)
        this.socket.on('task-updated', (updatedTask) => {
            if (!updatedTask || !updatedTask._id) return;
            const index = this.tasks.findIndex(t => t._id === updatedTask._id);
            if (index !== -1) {
                this.tasks[index] = updatedTask;
            } else {
                this.tasks.push(updatedTask);
            }
            this.renderTasks();
            this.updateTaskCounts();
            this.showInfo(`Görev güncellendi: ${updatedTask.title}`);
        });
        // ...diğer eski eventler (task-created, task-deleted, task-status-updated) gerekirse kaldırılabilir...
    }

    // ==================== AI INTEGRATION ====================
    initializeAISuggestions() {
        // AI suggestions'ı bu kanban instance'ı ile initialize et
        if (window.AITaskSuggestions && window.initAITaskSuggestions) {
            setTimeout(() => {
                try {
                    console.log('🤖 Kanban-triggered AI initialization starting...');
                    window.initAITaskSuggestions(this.projectId, this);
                    console.log('✅ Kanban-triggered AI initialization completed');
                } catch (error) {
                    console.error('❌ Kanban-triggered AI initialization failed:', error);
                }
            }, 100); // Kısa bir delay ile AI'yi başlat
        } else {
            console.warn('⚠️ AI Task Suggestions not available yet');
        }
    }

    // ==================== NOTIFICATION METHODS ====================
    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showInfo(message) {
        this.showNotification(message, 'info');
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
                }, 300);            }, 3000);
        }
    }

    // Utility methods
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'short'
        });
    }

    getDueDateClass(dueDate) {
        const today = new Date();
        const due = new Date(dueDate);
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) return 'overdue';
        if (diffDays <= 1) return 'due-soon';
        if (diffDays <= 3) return 'due-warning';
        return 'due-normal';
    }

    getStatusDisplayName(status) {
        const names = {
            'todo': 'Yapılacaklar',
            'in-progress': 'Devam Ediyor',
            'done': 'Tamamlandı'
        };
        return names[status] || status;
    }

    updateTaskCounts() {
        const counts = {
            todo: this.tasks.filter(t => t.status === 'todo').length,
            'in-progress': this.tasks.filter(t => t.status === 'in-progress').length,
            done: this.tasks.filter(t => t.status === 'done').length
        };

        Object.entries(counts).forEach(([status, count]) => {
            const countEl = document.getElementById(`${status}-count`);
            if (countEl) countEl.textContent = count;
        });
    }
}

// ==================== GLOBAL KANBAN INSTANCE ====================
// Using window.roomKanbanBoard to avoid conflicts with room.ejs

// Initialize Kanban Board
function initKanbanBoard(projectId, socket) {
    if (window.roomKanbanBoard) {
        console.log('🔄 Reinitializing Kanban board');
        window.roomKanbanBoard = null;
    }
      window.roomKanbanBoard = new KanbanBoard(projectId, socket);
    return window.roomKanbanBoard;
}

// Cleanup Kanban Board
function destroyKanbanBoard() {    if (window.roomKanbanBoard) {
        console.log('🧹 Destroying Kanban board');
        window.roomKanbanBoard = null;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { KanbanBoard, initKanbanBoard, destroyKanbanBoard };
}

// Make available globally for browser usage
if (typeof window !== 'undefined') {
    window.KanbanBoard = KanbanBoard;
    window.initKanbanBoard = initKanbanBoard;
    window.destroyKanbanBoard = destroyKanbanBoard;
}
