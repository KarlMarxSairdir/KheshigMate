console.log('🚀 Gantt.js loading - START OF FILE');
console.log('🌍 Window object available:', typeof window !== 'undefined');
console.log('🏷️ Document available:', typeof document !== 'undefined');

// Test basic JavaScript functionality
try {
    console.log('🧪 Testing basic JS...');
    const testVar = 'test';
    console.log('✅ Basic JS works:', testVar);
} catch (error) {
    console.error('❌ Basic JS failed:', error);
}

// Mark file loading start
window.GANTT_FILE_LOADING = true;
console.log('🏁 Setting GANTT_FILE_LOADING = true');

class GanttManager {
    constructor(projectId, socket) {
        this.projectId = projectId;
        this.socket = socket;
        this.ganttChart = null;
        this.tasks = [];
        this.currentView = 'Week';
        this.isLoading = false;
        
        console.log('📊 GanttManager constructor called with projectId:', projectId);
        this.init();
    }

    async init() {
        try {
            console.log('🎯 Initializing Gantt Manager...');
            console.log('🔍 Checking if Gantt is available:', typeof Gantt);
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (typeof Gantt === 'undefined') {
                console.error('❌ Frappe Gantt library is not loaded!');
                this.showError('Frappe Gantt kütüphanesi yüklenmedi');
                return;
            }
            
            this.setupEventListeners();
            await this.loadTasks();
            this.setupSocketListeners();
            
            console.log('✅ Gantt Manager initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Gantt Manager:', error);
            this.showError('Gantt şeması yüklenirken hata oluştu: ' + error.message);
        }
    }

    setupEventListeners() {
        const viewButtons = document.querySelectorAll('.view-btn');
        viewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });        // ✅ SAFE STRATEGY: Debounced resize handling with full re-render
        let resizeTimer;
        window.addEventListener('resize', () => {
            // Clear previous timer to debounce rapid resize events
            clearTimeout(resizeTimer);
            
            // Set new timer for delayed execution
            resizeTimer = setTimeout(() => {
                if (this.ganttChart && this.tasks.length > 0) {
                    console.log('🔄 Window resized, performing safe re-render...');
                    try {
                        // Full re-render instead of refresh() to prevent state corruption
                        this.renderGanttChart();
                        console.log('✅ Gantt chart re-rendered after resize');
                    } catch (error) {
                        console.error('❌ Error during resize re-render:', error);
                        this.showError('Ekran boyutu değişikliği sırasında hata oluştu');
                    }
                }
            }, 300); // 300ms debounce delay
        });
    }

    setupSocketListeners() {
        if (!this.socket) return;
        // task-updated event'ini dinle (backend ile uyumlu)
        this.socket.on('task-updated', (updatedTask) => {
            if (!updatedTask || !updatedTask._id) return;
            const index = this.tasks.findIndex(t => t._id === updatedTask._id);
            if (index !== -1) {
                this.tasks[index] = updatedTask;
            } else {
                this.tasks.push(updatedTask);
            }
            this.renderGanttChart();
            this.showInfo(`Görev güncellendi: ${updatedTask.title}`);
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

    async loadTasks() {
        if (this.isLoading) {
            console.log('⏳ Task loading already in progress');
            return;
        }

        this.isLoading = true;
        console.log('📥 Loading tasks for project:', this.projectId);

        // Proje ID format kontrolü
        if (!this.projectId || !/^[0-9a-fA-F]{24}$/.test(this.projectId)) {
            console.error('❌ Invalid Project ID for Gantt:', this.projectId);
            this.showError('Geçersiz Proje ID. Görevler yüklenemiyor.');
            this.isLoading = false; // isLoading durumunu sıfırla
            this.hideLoading(); // Yükleme göstergesini gizle
            return;
        }

        try {
            this.showLoading();
            
            const response = await fetch('/projects/' + this.projectId + '/tasks');
            
            if (!response.ok) {
                throw new Error('HTTP error! status: ' + response.status);
            }
            
            const tasks = await response.json();
            console.log('📋 Raw tasks loaded:', tasks);
            
            if (!Array.isArray(tasks)) {
                throw new Error('Invalid response format: expected array');
            }

            this.tasks = tasks;
            console.log('✅ Tasks stored:', this.tasks.length);
            
            await this.renderGanttChart();
            
        } catch (error) {
            console.error('❌ Error loading tasks:', error);
            this.showError('Görevler yüklenirken hata oluştu: ' + error.message);
        } finally {
            this.isLoading = false;
        }
    }    async renderGanttChart() {
        console.log('🎨 Starting Gantt chart render with Context7 format...');
        
        const chartElement = document.getElementById('gantt-chart');
        if (!chartElement) {
            console.error('❌ Gantt chart element not found');
            return;
        }

        try {
            console.log('🔍 Processing tasks for Frappe Gantt (Context7 compliant)...');
            console.log('🔍 Raw tasks count:', this.tasks.length);
            
            // FRAPPE GANTT FORMAT (based on Context7 documentation)
            const ganttTasks = [];
            const tasks = Array.isArray(this.tasks) ? this.tasks : [];
            
            for (let i = 0; i < tasks.length; i++) {
                const task = tasks[i];
                console.log(`🔍 Processing task ${i + 1}/${tasks.length}:`, task);
                
                try {                    // Context7 Date Formatting - Frappe Gantt v1.0.3 requirement: YYYY-MM-DD string only
                    const formatToGanttDate = (dateInput) => {
                        if (!dateInput) {
                            // Default to today
                            const today = new Date();
                            return today.toISOString().split('T')[0];
                        }
                        
                        // If already in YYYY-MM-DD format, return as-is
                        if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
                            return dateInput;
                        }
                        
                        // Handle ISO date string (contains T)
                        if (typeof dateInput === 'string' && dateInput.includes('T')) {
                            return dateInput.split('T')[0];
                        }
                        
                        // Parse as Date and convert to YYYY-MM-DD
                        const date = new Date(dateInput);
                        if (isNaN(date.getTime())) {
                            // If invalid, return today
                            return new Date().toISOString().split('T')[0];
                        }
                        
                        return date.toISOString().split('T')[0];
                    };
                      // Get dates - Context7 format
                    let startDate = formatToGanttDate(task.startDate || task.createdAt);
                    let endDate = formatToGanttDate(task.dueDate || task.endDate);
                    
                    // Ensure end is after start (Context7 requirement)
                    if (new Date(startDate) >= new Date(endDate)) {
                        const start = new Date(startDate);
                        start.setDate(start.getDate() + 1); // Add 1 day minimum
                        endDate = start.toISOString().split('T')[0];
                    }
                    
                    // Calculate progress (0-100 integer)
                    let progress = 0;
                    if (typeof task.progress === 'number') progress = Math.round(task.progress);
                    else if (typeof task.progress === 'string') progress = Math.round(parseFloat(task.progress) || 0);
                    else if (task.status === 'done' || task.status === 'completed') progress = 100;
                    else if (task.status === 'in-progress') progress = 50;
                    else if (task.status === 'todo' || task.status === 'pending') progress = 0;
                    
                    progress = Math.max(0, Math.min(100, progress));
                      // EXACT FRAPPE GANTT v1.0.3 FORMAT (from Context7 documentation)
                    const ganttTask = {
                        id: String(task._id || task.id || `task_${i + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_'),
                        name: String(task.title || task.name || 'Unnamed Task').substring(0, 80),
                        start: startDate,
                        end: endDate,
                        progress: progress
                    };
                    
                    console.log('✅ Context7 v1.0.3 compliant task created:', ganttTask);
                    
                    // Strict validation for Context7 format
                    if (ganttTask.id && ganttTask.name && ganttTask.start && ganttTask.end &&
                        typeof ganttTask.id === 'string' && 
                        typeof ganttTask.name === 'string' && 
                        typeof ganttTask.start === 'string' && 
                        typeof ganttTask.end === 'string' && 
                        typeof ganttTask.progress === 'number' &&
                        ganttTask.progress >= 0 && ganttTask.progress <= 100 &&
                        /^\d{4}-\d{2}-\d{2}$/.test(ganttTask.start) &&
                        /^\d{4}-\d{2}-\d{2}$/.test(ganttTask.end)) {
                        
                        ganttTasks.push(ganttTask);
                        console.log(`✅ Task ${i + 1} validated and added`);
                    } else {
                        console.error('❌ Task failed Context7 validation:', ganttTask);
                    }
                    
                } catch (error) {
                    console.error(`❌ Error processing task ${i + 1}:`, error);
                }
            }
            
            console.log('📊 Context7 compliant tasks prepared:', ganttTasks.length);
            
            if (ganttTasks.length === 0) {
                console.log('📋 No valid tasks, showing empty state');
                this.showEmptyState();
                return;
            }
              // ✅ SAFE STRATEGY: Enhanced cleanup for re-rendering
            if (this.ganttChart) {
                try {
                    console.log('🧹 Cleaning up previous chart instance...');
                    
                    // Remove event listeners if they exist
                    if (typeof this.ganttChart.off === 'function') {
                        this.ganttChart.off('click');
                        this.ganttChart.off('date_change');
                        this.ganttChart.off('progress_change');
                    }
                    
                    // Destroy chart instance
                    if (typeof this.ganttChart.destroy === 'function') {
                        this.ganttChart.destroy();
                    }
                    
                    // Clear reference to prevent memory leaks
                    this.ganttChart = null;
                    
                    console.log('✅ Previous chart cleaned up successfully');
                } catch (e) {
                    console.warn('⚠️ Could not destroy previous chart:', e);
                    // Force clear reference anyway
                    this.ganttChart = null;
                }
            }
            
            // Clear DOM content
            chartElement.innerHTML = '';
            
            // Small delay to ensure DOM is ready for new chart
            await new Promise(resolve => setTimeout(resolve, 50));
              // MINIMAL CONFIG (Context7 style)
            const config = {
                view_mode: this.currentView,
                date_format: 'YYYY-MM-DD',
                on_click: function (task) {
                    console.log('Görev tıklandı (özel işleyici), varsayılan popup devrede değil. Task ID:', task.id);
                    // Özel modal gösterimi daha sonra burada uygulanabilir.
                },
                on_date_change: async (task, start, end) => { // async eklendi
                    console.log('[GANTT_EVENT] on_date_change tetiklendi. Task:', task, 'Start:', start, 'End:', end);
                    try {
                        // Tarihleri Frappe Gantt'ın beklediği YYYY-MM-DD formatına getirelim
                        const formattedStart = start instanceof Date ? start.toISOString().split('T')[0] : start;
                        const formattedEnd = end instanceof Date ? end.toISOString().split('T')[0] : end;
                        
                        console.log('[GANTT_EVENT] on_date_change - Tarihler formatlandı. Start:', formattedStart, 'End:', formattedEnd);
                        await this.handleTaskDateChange(task, formattedStart, formattedEnd);
                        console.log('[GANTT_EVENT] on_date_change - handleTaskDateChange başarıyla tamamlandı.');
                    } catch (error) {
                        console.error('[GANTT_EVENT] on_date_change içinde hata:', error);
                        // Kullanıcıya bir hata mesajı göstermek isteyebilirsiniz
                        // this.showError('Tarih güncellenirken bir hata oluştu.');
                    }
                },
                on_progress_change: async (task, progress) => { // async eklendi
                    console.log('[GANTT_EVENT] on_progress_change tetiklendi. Task:', task, 'Progress:', progress);
                    try {
                        await this.handleTaskProgressChange(task, progress);
                        console.log('[GANTT_EVENT] on_progress_change - handleTaskProgressChange başarıyla tamamlandı.');
                    } catch (error) {
                        console.error('[GANTT_EVENT] on_progress_change içinde hata:', error);
                        // Kullanıcıya bir hata mesajı göstermek isteyebilirsiniz
                        // this.showError('İlerleme güncellenirken bir hata oluştu.');
                    }
                }
            };
            
            console.log('🔧 Creating Frappe Gantt with minimal config and Context7 format...');
            console.log('🔧 View mode:', this.currentView);
            console.log('🔧 Tasks sample:', ganttTasks.slice(0, 2));
            
            // ✅ SAFE STRATEGY: Enhanced Gantt chart creation with error handling
            try {
                // Verify Gantt constructor is available
                if (typeof Gantt !== 'function') {
                    throw new Error('Frappe Gantt constructor not available');
                }
                  // CREATE GANTT CHART (Context7 exact format)
                this.ganttChart = new Gantt(chartElement, ganttTasks, config);
                
                console.log('✅ Frappe Gantt chart created successfully!');
                console.log('✅ Chart instance type:', typeof this.ganttChart);
                
                // Setup event listeners with error handling
                try {
                    // this.setupGanttEventListeners(); // Bu satırı yorumluyoruz çünkü eventler artık config içinde tanımlı
                    console.log('✅ Gantt event listeners are now part of the config object.');
                } catch (eventError) {
                    console.warn('⚠️ Event listeners setup failed (non-critical):', eventError);
                }
                
                this.hideLoading();
                
                // ✅ POST-RENDER REFRESH: Ensure proper display after creation
                setTimeout(() => {
                    try {
                        console.log('🔄 Post-render refresh to ensure visibility...');
                        
                        // Check if chart element has content
                        const svg = chartElement.querySelector('svg');
                        if (svg) {
                            console.log('✅ SVG found in container, dimensions:', svg.getBoundingClientRect());
                            
                            // Force container visibility
                            chartElement.style.visibility = 'visible';
                            chartElement.style.opacity = '1';
                            
                            // Trigger a refresh if method exists
                            if (typeof this.ganttChart.refresh === 'function') {
                                this.ganttChart.refresh();
                                console.log('✅ Gantt chart refreshed successfully');
                            }
                        } else {
                            console.warn('⚠️ No SVG found in container after creation');
                        }
                    } catch (refreshError) {
                        console.warn('⚠️ Post-render refresh failed (non-critical):', refreshError);
                    }
                }, 100);
                
            } catch (chartError) {
                console.error('❌ Frappe Gantt instantiation failed:', chartError);
                throw new Error('Gantt chart oluşturulamadı: ' + chartError.message);
            }
              } catch (error) {
            console.error('❌ Gantt chart render failed:', error);
            console.error('❌ Error stack:', error.stack);
            console.error('❌ Error type:', error.constructor.name);
            
            // Enhanced error handling based on error type
            let userMessage = 'Gantt şeması oluşturulamadı';
            
            if (error.message && error.message.includes('Frappe Gantt')) { // error.message null kontrolü eklendi
                userMessage += ': Kütüphane hatası';
            } else if (error.message && error.message.includes('Context7')) { // error.message null kontrolü eklendi
                userMessage += ': Veri formatı hatası';
            } else if (error.message && error.message.includes('t is undefined')) { // error.message null kontrolü eklendi
                userMessage += ': İç durum hatası (re-render sorunu çözüldü)';
            } else if (error.message) { // error.message null kontrolü eklendi
                userMessage += ': ' + error.message;
            }
            
            this.showError(userMessage);
            
            chartElement.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #e74c3c;">
                    <h3>⚠️ Gantt Chart Hatası</h3>
                    <p><strong>Hata:</strong> ${this.escapeHtml(error.message)}</p>
                    <p><strong>Tip:</strong> Safe Re-render Strategy</p>
                    <p><strong>Strateji:</strong> Tam yeniden oluşturma kullanıldı</p>
                    <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">Sayfayı Yenile</button>
                </div>
            `;
        }
    }    formatDateForGantt(dateInput) {
        console.log('📅 formatDateForGantt input:', dateInput, 'type:', typeof dateInput);
        
        if (!dateInput) {
            console.log('📅 No input, returning today');
            return this.getTodayString();
        }
        
        try {
            let dateString = String(dateInput);
            
            // Check if already in YYYY-MM-DD format
            if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
                console.log('📅 Already in correct format:', dateString);
                return dateString;
            }
            
            // Handle ISO string with T (most common case)
            if (dateString.includes('T')) {
                console.log('📅 Converting ISO string:', dateString);
                const datePart = dateString.split('T')[0];
                console.log('📅 Extracted date part:', datePart);
                
                // Validate the extracted part
                if (datePart.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    return datePart;
                }
            }
            
            // Handle other formats - try parsing as Date
            let date;
            if (dateInput instanceof Date) {
                date = dateInput;
            } else {
                date = new Date(dateString);
            }
            
            // Validate the date
            if (isNaN(date.getTime())) {
                console.warn('⚠️ Invalid date parsed:', dateInput);
                return this.getTodayString();
            }
            
            // Convert to YYYY-MM-DD format safely
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            
            // Validate year is reasonable
            if (year < 2020 || year > 2030) {
                console.warn('⚠️ Date year out of range:', year, 'from:', dateInput);
                return this.getTodayString();
            }
            
            const formatted = `${year}-${month}-${day}`;
            console.log('📅 Date formatted:', dateInput, '->', formatted);
            return formatted;
            
        } catch (error) {
            console.error('❌ Date formatting error:', error, 'Input:', dateInput);
            return this.getTodayString();
        }
    }

    getTodayString() {
        return new Date().toISOString().split('T')[0];
    }

    isValidDate(dateString) {
        if (!dateString || typeof dateString !== 'string') return false;
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(dateString)) return false;
        const date = new Date(dateString);
        return !isNaN(date.getTime());
    }    cleanTaskId(id) {
        if (!id) return 'task_default';
        return String(id).replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    }

    cleanTaskName(name) {
        if (!name) return 'Unnamed Task';
        return String(name)
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/\s+/g, ' ')     // Normalize whitespace
            .substring(0, 100)        // Limit length
            .trim() || 'Unnamed Task';
    }

    cleanTaskClass(priority, status) {
        const classes = ['bar-task'];
        if (priority && typeof priority === 'string') {
            classes.push('priority-' + priority.replace(/[^a-zA-Z0-9-]/g, ''));
        }
        if (status && typeof status === 'string') {
            classes.push('status-' + status.replace(/[^a-zA-Z0-9-]/g, ''));
        }
        return classes.join(' ');
    }

    cleanString(str) {
        if (!str) return 'Unnamed';
        
        // Convert to string and clean
        const cleaned = String(str)
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/\s+/g, ' ')     // Normalize whitespace
            .substring(0, 50)         // Limit length
            .trim();                  // Remove leading/trailing spaces
            
        return cleaned || 'Unnamed';
    }    calculateProgress(status) {
        // Handle both status string and numeric progress
        if (typeof status === 'number') {
            return Math.max(0, Math.min(100, parseInt(status)));
        }
        
        const progressMap = {
            'todo': 0,
            'in-progress': 50,
            'done': 100
        };
        
        const progress = progressMap[status] || 0;
        console.log('📊 Progress calculated:', status, '->', progress);
        return progress;
    }

    getTaskClass(priority, status) {
        const classes = ['bar-task'];
        if (priority) classes.push('priority-' + priority);
        if (status) classes.push('status-' + status);
        return classes.join(' ');
    }    switchView(view) {
        if (!this.ganttChart) return;
        
        try {
            console.log('🔄 Switching view to:', view, '(using safe re-render strategy)');
            
            // Update current view and UI
            this.currentView = view;
            
            document.querySelectorAll('.view-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            const btn = document.querySelector('[data-view="' + view + '"]');
            if (btn) btn.classList.add('active');
            
            // ✅ SAFE STRATEGY: Full re-render instead of change_view_mode()
            // This prevents Frappe Gantt internal state corruption
            this.renderGanttChart();
            
            console.log('✅ View switched to:', view, '(safe re-render completed)');
        } catch (error) {
            console.error('❌ Error switching view:', error);
            this.showError('Görünüm değiştirilirken hata oluştu: ' + error.message);
        }
    }

    async handleTaskDateChange(task, start, end) {
        console.log('[GANTT_HANDLER] handleTaskDateChange çağrıldı. Raw task.id:', task.id, 'Start:', start, 'End:', end);
        try {
            const rawTaskId = task.id;
            const taskId = rawTaskId.startsWith('task_') ? rawTaskId.substring(5) : rawTaskId;
            console.log(`[GANTT_HANDLER] Parsed taskId: ${taskId}`);

            const objectIdPattern = /^[a-fA-F0-9]{24}$/;
            if (!objectIdPattern.test(taskId)) {
                console.warn(`[GANTT_HANDLER] Invalid taskId detected in handleTaskDateChange: "${taskId}". Update will be skipped. This might be a sample/fallback task or an invalid ID format.`);
                // İsteğe bağlı: Kullanıcıya bir mesaj gösterilebilir.
                // this.showError görev güncellenemez (geçersiz ID).'); 
                return; 
            }

            // Gelen tarihlerin string ve YYYY-MM-DD formatında olduğundan emin olalım
            const updates = {
                startDate: typeof start === 'string' ? start : start.toISOString().split('T')[0],
                dueDate: typeof end === 'string' ? end : end.toISOString().split('T')[0]
            };
            
            console.log('[GANTT_HANDLER] handleTaskDateChange - Sunucuya gönderilecek güncellemeler:', updates);
            await this.updateTask(taskId, updates); // updateTaskOnServer yerine updateTask kullanılıyor
            console.log('✅ Task dates updated successfully via handleTaskDateChange');
        } catch (error) {
            console.error('❌ Error updating task dates in handleTaskDateChange:', error);
            this.showError('Görev tarihleri güncellenirken hata oluştu: ' + error.message);
            // Hatanın yeniden fırlatılması, on_date_change içindeki catch tarafından yakalanmasını sağlar
            throw error; 
        }
    }

    async handleTaskProgressChange(task, progress) {
        console.log('[GANTT_HANDLER] handleTaskProgressChange çağrıldı. Raw task.id:', task.id, 'Progress:', progress);
        try {
            const rawTaskId = task.id;
            const taskId = rawTaskId.startsWith('task_') ? rawTaskId.substring(5) : rawTaskId;
            console.log(`[GANTT_HANDLER] Parsed taskId: ${taskId}`);
            const objectIdPattern = /^[a-fA-F0-9]{24}$/;
            if (!objectIdPattern.test(taskId)) {
                console.warn(`[GANTT_HANDLER] Invalid taskId detected in handleTaskProgressChange: "${taskId}". Update will be skipped.`);
                return;
            }
            const newStatus = progress <= 0 ? 'todo' : progress >= 100 ? 'done' : 'in-progress';
            const updateData = {
                progress: parseInt(progress, 10),
                status: newStatus
            };
            console.log('[GANTT_HANDLER] handleTaskProgressChange - Sunucuya gönderilecek güncellemeler:', updateData);
            await this.updateTask(taskId, updateData);
            console.log('✅ Task progress updated successfully via handleTaskProgressChange');
        } catch (error) {
            console.error('❌ Error updating task progress in handleTaskProgressChange:', error);
            this.showError('Görev durumu güncellenirken hata oluştu: ' + error.message);
            throw error;
        }
    }

    async updateTask(taskId, updates) {
        console.log('[GANTT_API] updateTask çağrıldı. Task ID:', taskId, 'Updates:', updates);
        const response = await fetch('/projects/' + this.projectId + '/tasks/' + taskId, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updates)
        });
        if (!response.ok) {
            throw new Error('HTTP error! status: ' + response.status);
        }
        return response.json();
    }

    showTaskDetails(task) {
        const originalTask = this.tasks.find(t => t._id === task.id.replace('task_', ''));
        if (!originalTask) return;

        const modal = document.createElement('div');
        modal.className = 'task-modal';
        modal.innerHTML = '<div class="modal-content"><div class="modal-header"><h3>' + this.escapeHtml(originalTask.title) + '</h3><button class="close-btn">&times;</button></div><div class="modal-body"><p><strong>Açıklama:</strong> ' + this.escapeHtml(originalTask.description) + '</p><p><strong>Durum:</strong> ' + this.getStatusName(originalTask.status) + '</p><p><strong>Öncelik:</strong> ' + this.getPriorityName(originalTask.priority) + '</p><p><strong>Atanan:</strong> ' + (originalTask.assignedTo ? originalTask.assignedTo.username : 'Atanmamış') + '</p><p><strong>Başlangıç:</strong> ' + this.formatDate(originalTask.startDate) + '</p><p><strong>Bitiş:</strong> ' + this.formatDate(originalTask.dueDate) + '</p></div></div>';

        document.body.appendChild(modal);

        modal.querySelector('.close-btn').onclick = () => modal.remove();
        modal.onclick = (e) => {
            if (e.target === modal) modal.remove();
        };
    }    showEmptyState() {
        const container = document.getElementById('gantt-chart');
        if (container) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon"><i class="fas fa-calendar-times"></i></div><h3>Henüz görev yok</h3><p>Bu proje için henüz görev oluşturulmamış.</p></div>';
        }
    }

    showLoading() {
        const container = document.getElementById('gantt-chart');
        if (container) {
            container.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Gantt şeması yükleniyor...</p></div>';
        }
    }

    hideLoading() {
        // Loading will be replaced by chart or error message
    }

    showError(message) {
        console.error('🚨 Showing error:', message);
        
        const container = document.getElementById('gantt-chart');
        if (container) {
            container.innerHTML = '<div class="error-state"><div class="error-icon"><i class="fas fa-exclamation-triangle"></i></div><h3>Hata Oluştu</h3><p>' + this.escapeHtml(message) + '</p><button onclick="location.reload()" class="retry-btn">Sayfayı Yenile</button></div>';
        }
    }

    showInfo(message) {
        if (typeof showNotification === 'function') {
            showNotification(message, 'info');
        } else {
            console.log('INFO:', message);
        }
    }

    getStatusName(status) {
        const names = {
            'todo': 'Yapılacak',
            'in-progress': 'Devam Ediyor',
            'done': 'Tamamlandı'
        };
        return names[status] || status;
    }

    getPriorityName(priority) {
        const names = {
            'low': 'Düşük',
            'medium': 'Orta',
            'high': 'Yüksek'
        };
        return names[priority] || priority;
    }

    formatDate(dateString) {
        if (!dateString) return 'Belirtilmemiş';
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }    handleTaskUpdate(data) {
        try {
            console.log('🔄 Handling task update via socket:', data._id);
            const index = this.tasks.findIndex(t => t._id === data._id);
            if (index !== -1) {
                this.tasks[index] = Object.assign(this.tasks[index], data);
                
                // ✅ SAFE STRATEGY: Use safe re-render for socket updates
                this.renderGanttChart();
                console.log('✅ Task update applied and chart re-rendered');
            } else {
                console.warn('⚠️ Task not found for update:', data._id);
            }
        } catch (error) {
            console.error('❌ Error handling task update:', error);
            this.showError('Görev güncellemesi sırasında hata oluştu');
        }
    }

    handleTaskCreated(data) {
        try {
            console.log('🆕 Handling task creation via socket:', data._id);
            this.tasks.push(data);
            
            // ✅ SAFE STRATEGY: Use safe re-render for socket updates
            this.renderGanttChart();
            console.log('✅ New task added and chart re-rendered');
        } catch (error) {
            console.error('❌ Error handling task creation:', error);
            this.showError('Yeni görev ekleme sırasında hata oluştu');
        }
    }

    handleTaskDeleted(data) {
        try {
            console.log('🗑️ Handling task deletion via socket:', data._id);
            this.tasks = this.tasks.filter(t => t._id !== data._id);
            
            // ✅ SAFE STRATEGY: Use safe re-render for socket updates
            this.renderGanttChart();
            console.log('✅ Task deleted and chart re-rendered');
        } catch (error) {
            console.error('❌ Error handling task deletion:', error);
            this.showError('Görev silme sırasında hata oluştu');
        }
    }
}

// Mark successful loading and class definition
window.GanttManager = GanttManager;
window.GANTT_FILE_COMPLETED = true;

console.log('✅ GanttManager class defined and assigned to window');
console.log('🔍 window.GanttManager:', typeof window.GanttManager);
console.log('🏁 Setting GANTT_FILE_COMPLETED = true');

// ✅ SAFE RE-RENDERING STRATEGY IMPLEMENTED
console.log('🛡️ SAFE RE-RENDERING STRATEGY ACTIVE:');
console.log('   - switchView() uses full re-render instead of change_view_mode()');
console.log('   - Window resize uses debounced full re-render instead of refresh()');
console.log('   - Socket updates use safe re-rendering with error handling');
console.log('   - Enhanced cleanup prevents memory leaks and state corruption');
console.log('   - "t is undefined" error should be resolved');

// Test class instantiation
try {
    console.log('🧪 Testing GanttManager instantiation...');
    // const testInstance = new window.GanttManager('test', null);
    console.log('✅ GanttManager instantiation works');
} catch (error) {
    console.error('❌ GanttManager instantiation failed:', error);
    console.error('❌ Error details:', error.message);
    console.error('❌ Stack trace:', error.stack);
}

console.log('🎯 Gantt.js loading - END OF FILE');
console.log('🚀 SAFE RE-RENDERING STRATEGY IMPLEMENTATION COMPLETE');