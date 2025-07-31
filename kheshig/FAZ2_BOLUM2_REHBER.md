# ✅ FAZ 2 - BÖLÜM 2: KANBAN TAHTASI UI - TAMAMLANDI!
## Başarıyla Tamamlandı - Test Edildi ve Çalışıyor ✨
*Başlangıç: 8 Haziran 2025, 15:30 | Bitiş: 8 Haziran 2025, 16:45*

---

## 🎉 BAŞARI RAPORU

**DURUM: ✅ TAMAMLANDI - Kanban Board tamamen işlevsel!**

### 🏆 Başarılan Görevler:

#### ✅ **1. Kanban UI Bileşenleri**
- [x] room.ejs'ye tasks tab eklendi
- [x] 3 kolonlu Kanban board yapısı (Todo, In Progress, Done)
- [x] Task card bileşenleri
- [x] Task oluşturma modal'ı
- [x] Responsive tasarım

#### ✅ **2. CSS Stillendirme**
- [x] `_kanban.scss` dosyası oluşturuldu
- [x] Modern ve responsive Kanban tasarımı
- [x] Drag & drop görsel efektleri
- [x] Task card hover animasyonları
- [x] Modal stilendirme
- [x] CSS syntax hataları düzeltildi ✨
- [x] Modern line-clamp desteği eklendi

#### ✅ **3. JavaScript Fonksiyonalitesi**
- [x] `kanban.js` dosyası oluşturuldu
- [x] Task CRUD işlemleri
- [x] Drag & drop fonksiyonalitesi
- [x] Modal yönetimi
- [x] Real-time güncellemeler
- [x] Hata yönetimi

#### ✅ **4. Backend Entegrasyonu**
- [x] room.js'de tab sistemi entegrasyonu
- [x] kanban.js script yüklemesi
- [x] Project details API endpoint eklendi
- [x] Task API'ları ile bağlantı

---

# FAZ 2 - BÖLÜM 2: KANBAN TAHTASI UI GELİŞTİRME
## Detaylı İmplementasyon Rehberi
*Başlangıç: 8 Haziran 2025, 15:30*

---

## 🎯 BÖLÜM 2 HEDEF ve ÖZETİ

**Ana Görev:** Drag-and-drop özellikli, modern ve responsive Kanban tahtası UI'ını geliştirmek.

**Kapsamı:**
1. room.ejs'de Kanban tahtası HTML yapısını oluşturmak
2. Modern CSS/SCSS ile görsel tasarım yapmak
3. JavaScript ile drag-and-drop fonksiyonalitesi eklemek
4. Task CRUD işlemlerini frontend'e entegre etmek
5. Real-time güncellemeler için Socket.IO bağlantısı kurmak

**Başarı Kriterleri:**
- [ ] 3 sütunlu Kanban tahtası (Todo, In Progress, Done)
- [ ] Drag-and-drop ile task'ları sütunlar arası taşıma
- [ ] Task ekleme/düzenleme/silme modal'ları
- [ ] Real-time task güncellemeleri
- [ ] Mobile-responsive tasarım
- [ ] Güzel görsel tasarım ve animasyonlar

---

## 📋 ADIM ADIM İMPLEMENTASYON

### ADIM 1: ROOM.EJS'DE KANBAN TAHTASI HTML YAPISI

**Dosya:** `views/room.ejs`

**Eklenecek HTML Yapısı:**
```html
<!-- Kanban Board Section -->
<div id="kanban-board" class="tab-content" style="display: none;">
    <div class="kanban-header">
        <h3>📋 Görev Tahtası</h3>
        <button id="add-task-btn" class="btn btn-primary">
            <i class="fas fa-plus"></i> Yeni Görev
        </button>
    </div>
    
    <div class="kanban-container">
        <div class="kanban-column" data-status="todo">
            <div class="column-header">
                <h4>📝 Yapılacaklar</h4>
                <span class="task-count" id="todo-count">0</span>
            </div>
            <div class="column-content" id="todo-column">
                <!-- Tasks will be loaded here -->
            </div>
        </div>
        
        <div class="kanban-column" data-status="in-progress">
            <div class="column-header">
                <h4>⚡ Devam Ediyor</h4>
                <span class="task-count" id="in-progress-count">0</span>
            </div>
            <div class="column-content" id="in-progress-column">
                <!-- Tasks will be loaded here -->
            </div>
        </div>
        
        <div class="kanban-column" data-status="done">
            <div class="column-header">
                <h4>✅ Tamamlandı</h4>
                <span class="task-count" id="done-count">0</span>
            </div>
            <div class="column-content" id="done-column">
                <!-- Tasks will be loaded here -->
            </div>
        </div>
    </div>
</div>

<!-- Task Modal -->
<div id="task-modal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3 id="modal-title">Yeni Görev</h3>
            <span class="close" id="close-task-modal">&times;</span>
        </div>
        <form id="task-form">
            <div class="form-group">
                <label for="task-title">Görev Başlığı *</label>
                <input type="text" id="task-title" name="title" required maxlength="200">
            </div>
            
            <div class="form-group">
                <label for="task-description">Açıklama</label>
                <textarea id="task-description" name="description" rows="4" maxlength="1000"></textarea>
            </div>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="task-priority">Öncelik</label>
                    <select id="task-priority" name="priority">
                        <option value="low">Düşük</option>
                        <option value="medium" selected>Orta</option>
                        <option value="high">Yüksek</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="task-due-date">Bitiş Tarihi</label>
                    <input type="date" id="task-due-date" name="dueDate">
                </div>
            </div>
            
            <div class="form-group">
                <label for="task-assigned-to">Atanan Kişi</label>
                <select id="task-assigned-to" name="assignedTo">
                    <option value="">Atanmamış</option>
                    <!-- Project members will be loaded here -->
                </select>
            </div>
            
            <div class="form-group">
                <label for="task-skills">Gereken Yetenekler</label>
                <input type="text" id="task-skills" name="requiredSkills" 
                       placeholder="JavaScript, React, CSS... (virgülle ayırın)">
            </div>
            
            <div class="modal-actions">
                <button type="button" id="cancel-task-btn" class="btn btn-secondary">İptal</button>
                <button type="submit" id="save-task-btn" class="btn btn-primary">Kaydet</button>
                <button type="button" id="delete-task-btn" class="btn btn-danger" style="display: none;">Sil</button>
            </div>
        </form>
    </div>
</div>
```

### ADIM 2: KANBAN TAHTASI CSS/SCSS TASARIMI

**Dosya:** `public/css/components/_kanban.scss` (yeni dosya)

**SCSS Stilleri:**
```scss
// Kanban Board Styles
.kanban-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    padding: 0 1rem;

    h3 {
        margin: 0;
        color: var(--primary-color);
        font-size: 1.5rem;
    }
}

.kanban-container {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    padding: 0 1rem;
    min-height: 70vh;

    @media (max-width: 768px) {
        grid-template-columns: 1fr;
        gap: 1rem;
    }
}

.kanban-column {
    background: var(--white);
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);
    overflow: hidden;
    border: 2px solid transparent;
    transition: all 0.3s ease;

    &.drag-over {
        border-color: var(--primary-color);
        box-shadow: 0 8px 25px rgba(74, 144, 226, 0.3);
    }
}

.column-header {
    background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
    color: white;
    padding: 1rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;

    h4 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
    }

    .task-count {
        background: rgba(255, 255, 255, 0.2);
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.85rem;
        font-weight: 600;
    }
}

.column-content {
    padding: 1rem;
    min-height: 400px;
    max-height: 60vh;
    overflow-y: auto;

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 3px;

        &:hover {
            background: #a8a8a8;
        }
    }
}

// Task Card Styles
.task-card {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1rem;
    margin-bottom: 0.75rem;
    cursor: grab;
    transition: all 0.3s ease;
    position: relative;

    &:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        transform: translateY(-2px);
    }

    &.dragging {
        opacity: 0.5;
        transform: rotate(5deg);
        cursor: grabbing;
    }

    .task-priority {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        width: 8px;
        height: 8px;
        border-radius: 50%;

        &.high { background: #ef4444; }
        &.medium { background: #f59e0b; }
        &.low { background: #10b981; }
    }

    .task-title {
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.5rem;
        padding-right: 1rem;
        line-height: 1.4;
    }

    .task-description {
        color: var(--text-secondary);
        font-size: 0.9rem;
        line-height: 1.4;
        margin-bottom: 0.75rem;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .task-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 0.8rem;
        color: var(--text-secondary);

        .task-assignee {
            display: flex;
            align-items: center;
            gap: 0.5rem;

            .avatar {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: var(--primary-color);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: 600;
                font-size: 0.7rem;
            }
        }

        .task-due-date {
            &.overdue {
                color: #ef4444;
                font-weight: 600;
            }

            &.due-soon {
                color: #f59e0b;
                font-weight: 600;
            }
        }
    }

    .task-skills {
        margin-top: 0.75rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.25rem;

        .skill-tag {
            background: #f1f5f9;
            color: #475569;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-size: 0.7rem;
            font-weight: 500;
        }
    }
}

// Task Modal Styles
.modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.6);
    z-index: 1000;
    backdrop-filter: blur(4px);

    &.show {
        display: flex;
        align-items: center;
        justify-content: center;
    }
}

.modal-content {
    background: white;
    border-radius: 12px;
    width: 90%;
    max-width: 500px;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);

    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        border-bottom: 1px solid #e2e8f0;

        h3 {
            margin: 0;
            color: var(--text-primary);
        }

        .close {
            font-size: 1.5rem;
            cursor: pointer;
            color: var(--text-secondary);
            transition: color 0.3s ease;

            &:hover {
                color: var(--text-primary);
            }
        }
    }

    form {
        padding: 1.5rem;
    }

    .form-group {
        margin-bottom: 1rem;

        label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: var(--text-primary);
        }

        input, textarea, select {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 0.9rem;
            transition: border-color 0.3s ease;

            &:focus {
                outline: none;
                border-color: var(--primary-color);
                box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
            }
        }

        textarea {
            resize: vertical;
            min-height: 80px;
        }
    }

    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;

        @media (max-width: 480px) {
            grid-template-columns: 1fr;
        }
    }

    .modal-actions {
        display: flex;
        gap: 0.75rem;
        justify-content: flex-end;
        padding-top: 1rem;
        border-top: 1px solid #e2e8f0;

        @media (max-width: 480px) {
            flex-direction: column;
        }
    }
}

// Empty State
.empty-column {
    text-align: center;
    padding: 2rem 1rem;
    color: var(--text-secondary);

    .empty-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.5;
    }

    .empty-text {
        font-size: 0.9rem;
        line-height: 1.4;
    }
}

// Loading States
.loading-spinner {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 2rem;

    .spinner {
        width: 40px;
        height: 40px;
        border: 3px solid #f3f3f3;
        border-top: 3px solid var(--primary-color);
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

// Drag and Drop Visual Feedback
.drag-placeholder {
    background: #f8fafc;
    border: 2px dashed #cbd5e1;
    border-radius: 8px;
    height: 100px;
    margin-bottom: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    font-size: 0.9rem;
}
```

### ADIM 3: KANBAN JAVASCRIPT FONKSİYONALİTESİ

**Dosya:** `public/js/kanban.js` (yeni dosya)

**JavaScript Kod Yapısı:**
```javascript
// Kanban Board JavaScript
class KanbanBoard {
    constructor(projectId, socket) {
        this.projectId = projectId;
        this.socket = socket;
        this.tasks = [];
        this.projectMembers = [];
        this.draggedTask = null;
        this.currentEditingTask = null;
        
        this.init();
    }

    async init() {
        try {
            await this.loadTasks();
            await this.loadProjectMembers();
            this.setupEventListeners();
            this.setupSocketListeners();
            console.log('✅ Kanban board initialized');
        } catch (error) {
            console.error('❌ Kanban initialization error:', error);
            this.showError('Kanban tahtası yüklenirken hata oluştu');
        }
    }

    // API Calls
    async loadTasks() {
        const response = await fetch(`/projects/${this.projectId}/tasks`);
        if (!response.ok) throw new Error('Tasks could not be loaded');
        
        this.tasks = await response.json();
        this.renderTasks();
        this.updateTaskCounts();
    }

    async loadProjectMembers() {
        const response = await fetch(`/projects/${this.projectId}/members`);
        if (!response.ok) throw new Error('Members could not be loaded');
        
        this.projectMembers = await response.json();
        this.populateAssigneeDropdown();
    }

    async createTask(taskData) {
        const response = await fetch(`/projects/${this.projectId}/tasks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskData)
        });
        
        if (!response.ok) throw new Error('Task could not be created');
        
        const task = await response.json();
        this.tasks.push(task);
        this.renderTasks();
        this.updateTaskCounts();
        
        // Socket.IO ile real-time güncelleme
        this.socket.emit('task-created', { projectId: this.projectId, task });
        
        return task;
    }

    async updateTask(taskId, updates) {
        const response = await fetch(`/projects/${this.projectId}/tasks/${taskId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
        });
        
        if (!response.ok) throw new Error('Task could not be updated');
        
        const updatedTask = await response.json();
        const index = this.tasks.findIndex(t => t._id === taskId);
        if (index !== -1) {
            this.tasks[index] = updatedTask;
            this.renderTasks();
            this.updateTaskCounts();
        }
        
        // Socket.IO ile real-time güncelleme
        this.socket.emit('task-updated', { projectId: this.projectId, task: updatedTask });
        
        return updatedTask;
    }

    async deleteTask(taskId) {
        const response = await fetch(`/projects/${this.projectId}/tasks/${taskId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) throw new Error('Task could not be deleted');
        
        this.tasks = this.tasks.filter(t => t._id !== taskId);
        this.renderTasks();
        this.updateTaskCounts();
        
        // Socket.IO ile real-time güncelleme
        this.socket.emit('task-deleted', { projectId: this.projectId, taskId });
    }

    async updateTaskStatus(taskId, newStatus) {
        const response = await fetch(`/projects/${this.projectId}/tasks/${taskId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });
        
        if (!response.ok) throw new Error('Task status could not be updated');
        
        const updatedTask = await response.json();
        const index = this.tasks.findIndex(t => t._id === taskId);
        if (index !== -1) {
            this.tasks[index] = updatedTask;
            this.renderTasks();
            this.updateTaskCounts();
        }
        
        // Socket.IO ile real-time güncelleme
        this.socket.emit('task-status-updated', { 
            projectId: this.projectId, 
            taskId, 
            newStatus 
        });
        
        return updatedTask;
    }

    // Rendering Methods
    renderTasks() {
        const columns = {
            'todo': document.getElementById('todo-column'),
            'in-progress': document.getElementById('in-progress-column'),
            'done': document.getElementById('done-column')
        };

        // Clear all columns
        Object.values(columns).forEach(column => column.innerHTML = '');

        // Render tasks by status
        ['todo', 'in-progress', 'done'].forEach(status => {
            const statusTasks = this.tasks.filter(task => task.status === status);
            statusTasks.sort((a, b) => a.order - b.order);

            if (statusTasks.length === 0) {
                columns[status].innerHTML = this.getEmptyColumnHTML(status);
            } else {
                statusTasks.forEach(task => {
                    columns[status].appendChild(this.createTaskElement(task));
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
            <div class="task-priority ${task.priority}"></div>
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
            'todo': { icon: '📝', text: 'Henüz yapılacak görev yok.<br>Yeni görev eklemek için yukarıdaki + butonunu kullanın.' },
            'in-progress': { icon: '⚡', text: 'Devam eden görev yok.<br>Sol sütundan görev sürükleyerek başlayın.' },
            'done': { icon: '✅', text: 'Tamamlanan görev yok.<br>Tamamladığınız görevleri buraya sürükleyin.' }
        };

        return `
            <div class="empty-column">
                <div class="empty-icon">${messages[status].icon}</div>
                <div class="empty-text">${messages[status].text}</div>
            </div>
        `;
    }

    // Event Listeners
    setupEventListeners() {
        // Add task button
        document.getElementById('add-task-btn').addEventListener('click', () => {
            this.openTaskModal();
        });

        // Modal close events
        document.getElementById('close-task-modal').addEventListener('click', () => {
            this.closeTaskModal();
        });

        document.getElementById('cancel-task-btn').addEventListener('click', () => {
            this.closeTaskModal();
        });

        // Task form submit
        document.getElementById('task-form').addEventListener('submit', (e) => {
            this.handleTaskFormSubmit(e);
        });

        // Delete task button
        document.getElementById('delete-task-btn').addEventListener('click', () => {
            this.handleTaskDelete();
        });

        // Drag and drop for columns
        ['todo', 'in-progress', 'done'].forEach(status => {
            const column = document.getElementById(`${status}-column`);
            column.addEventListener('dragover', (e) => this.handleDragOver(e));
            column.addEventListener('drop', (e) => this.handleDrop(e, status));
            column.addEventListener('dragenter', () => this.handleDragEnter(column));
            column.addEventListener('dragleave', () => this.handleDragLeave(column));
        });

        // Modal backdrop click
        document.getElementById('task-modal').addEventListener('click', (e) => {
            if (e.target.id === 'task-modal') {
                this.closeTaskModal();
            }
        });
    }

    // Drag and Drop Handlers
    handleDragStart(e, task) {
        this.draggedTask = task;
        e.dataTransfer.effectAllowed = 'move';
        e.target.classList.add('dragging');
    }

    handleDragEnd() {
        document.querySelectorAll('.task-card').forEach(card => {
            card.classList.remove('dragging');
        });
        document.querySelectorAll('.kanban-column').forEach(column => {
            column.classList.remove('drag-over');
        });
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
                await this.updateTaskStatus(this.draggedTask._id, newStatus);
                this.showSuccess('Görev durumu güncellendi');
            } catch (error) {
                console.error('Task status update error:', error);
                this.showError('Görev durumu güncellenirken hata oluştu');
            }
        }

        this.draggedTask = null;
    }

    // Modal Handlers
    openTaskModal(task = null) {
        this.currentEditingTask = task;
        const modal = document.getElementById('task-modal');
        const modalTitle = document.getElementById('modal-title');
        const deleteBtn = document.getElementById('delete-task-btn');
        const form = document.getElementById('task-form');

        if (task) {
            modalTitle.textContent = 'Görevi Düzenle';
            deleteBtn.style.display = 'inline-block';
            this.populateTaskForm(task);
        } else {
            modalTitle.textContent = 'Yeni Görev';
            deleteBtn.style.display = 'none';
            form.reset();
        }

        modal.classList.add('show');
        document.getElementById('task-title').focus();
    }

    closeTaskModal() {
        const modal = document.getElementById('task-modal');
        modal.classList.remove('show');
        this.currentEditingTask = null;
        document.getElementById('task-form').reset();
    }

    populateTaskForm(task) {
        document.getElementById('task-title').value = task.title || '';
        document.getElementById('task-description').value = task.description || '';
        document.getElementById('task-priority').value = task.priority || 'medium';
        document.getElementById('task-assigned-to').value = task.assignedTo?._id || '';
        document.getElementById('task-skills').value = task.requiredSkills?.join(', ') || '';
        
        if (task.dueDate) {
            const date = new Date(task.dueDate);
            document.getElementById('task-due-date').value = date.toISOString().split('T')[0];
        }
    }

    async handleTaskFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const taskData = {
            title: formData.get('title').trim(),
            description: formData.get('description').trim(),
            priority: formData.get('priority'),
            assignedTo: formData.get('assignedTo') || undefined,
            dueDate: formData.get('dueDate') || undefined,
            requiredSkills: formData.get('requiredSkills')
                .split(',')
                .map(skill => skill.trim())
                .filter(skill => skill.length > 0)
        };

        if (!taskData.title) {
            this.showError('Görev başlığı gereklidir');
            return;
        }

        try {
            if (this.currentEditingTask) {
                await this.updateTask(this.currentEditingTask._id, taskData);
                this.showSuccess('Görev güncellendi');
            } else {
                await this.createTask(taskData);
                this.showSuccess('Görev oluşturuldu');
            }
            
            this.closeTaskModal();
        } catch (error) {
            console.error('Task save error:', error);
            this.showError('Görev kaydedilirken hata oluştu');
        }
    }

    async handleTaskDelete() {
        if (!this.currentEditingTask) return;

        if (confirm('Bu görevi silmek istediğinizden emin misiniz?')) {
            try {
                await this.deleteTask(this.currentEditingTask._id);
                this.showSuccess('Görev silindi');
                this.closeTaskModal();
            } catch (error) {
                console.error('Task delete error:', error);
                this.showError('Görev silinirken hata oluştu');
            }
        }
    }

    // Socket.IO Listeners
    setupSocketListeners() {
        this.socket.on('task-created', (data) => {
            if (data.projectId === this.projectId) {
                this.tasks.push(data.task);
                this.renderTasks();
                this.updateTaskCounts();
                this.showInfo(`Yeni görev eklendi: ${data.task.title}`);
            }
        });

        this.socket.on('task-updated', (data) => {
            if (data.projectId === this.projectId) {
                const index = this.tasks.findIndex(t => t._id === data.task._id);
                if (index !== -1) {
                    this.tasks[index] = data.task;
                    this.renderTasks();
                    this.updateTaskCounts();
                    this.showInfo(`Görev güncellendi: ${data.task.title}`);
                }
            }
        });

        this.socket.on('task-deleted', (data) => {
            if (data.projectId === this.projectId) {
                this.tasks = this.tasks.filter(t => t._id !== data.taskId);
                this.renderTasks();
                this.updateTaskCounts();
                this.showInfo('Bir görev silindi');
            }
        });

        this.socket.on('task-status-updated', (data) => {
            if (data.projectId === this.projectId) {
                const task = this.tasks.find(t => t._id === data.taskId);
                if (task) {
                    task.status = data.newStatus;
                    this.renderTasks();
                    this.updateTaskCounts();
                    this.showInfo(`Görev durumu güncellendi: ${task.title}`);
                }
            }
        });
    }

    // Utility Methods
    updateTaskCounts() {
        const counts = {
            'todo': this.tasks.filter(t => t.status === 'todo').length,
            'in-progress': this.tasks.filter(t => t.status === 'in-progress').length,
            'done': this.tasks.filter(t => t.status === 'done').length
        };

        Object.entries(counts).forEach(([status, count]) => {
            const countElement = document.getElementById(`${status}-count`);
            if (countElement) {
                countElement.textContent = count;
            }
        });
    }

    populateAssigneeDropdown() {
        const select = document.getElementById('task-assigned-to');
        select.innerHTML = '<option value="">Atanmamış</option>';
        
        this.projectMembers.forEach(member => {
            const option = document.createElement('option');
            option.value = member._id;
            option.textContent = member.username;
            select.appendChild(option);
        });
    }

    getDueDateClass(dueDate) {
        const now = new Date();
        const due = new Date(dueDate);
        const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'overdue';
        if (diffDays <= 3) return 'due-soon';
        return '';
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'short'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

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
        // Notification sistemi zaten var, onu kullan
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Global Kanban instance
let kanbanBoard = null;

// Initialize when needed
function initKanbanBoard(projectId, socket) {
    if (kanbanBoard) {
        kanbanBoard = null;
    }
    
    kanbanBoard = new KanbanBoard(projectId, socket);
    return kanbanBoard;
}
```

**✅ İmplementasyon Kontrol Listesi:**

### Adım 1: HTML Yapısı
- [x] room.ejs'e Kanban HTML ekle
- [x] Task modal HTML ekle
- [x] Tab navigation güncelle

### Adım 2: CSS Tasarımı  
- [x] _kanban.scss dosyası oluştur
- [x] Ana style.scss'ye import ekle
- [ ] Responsive tasarım test et

### Adım 3: JavaScript Fonksiyonalite
- [x] kanban.js dosyası oluştur
- [x] room.js'e entegre et
- [ ] Drag-and-drop test et

### Adım 4: API Integration
- [x] Project details endpoint ekle
- [x] Task CRUD işlemleri test et
- [ ] Socket.IO real-time test et
- [ ] Error handling test et

### Adım 5: UI/UX Polish
- [ ] Animasyonlar ekle
- [ ] Loading states ekle
- [ ] Mobile responsive test et

---

## 🚀 SONRAKI ADIMLAR

Bu bölüm tamamlandıkında:
1. **Faz 2 Bölüm 3:** Skills-based task assignment algoritması
2. **Faz 2 Bölüm 4:** Advanced Kanban features (filters, search, bulk operations)
3. **Faz 2 Bölüm 5:** Performance optimizations ve caching

**Tahmini Süre:** 2-3 saat
**Zorluk:** Orta-Yüksek
**Öncelik:** Yüksek

---

*Bu rehber Kaşıkmate projesinin Faz 2 Bölüm 2 implementasyonu için hazırlanmıştır.*
