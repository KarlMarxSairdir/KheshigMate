// Calendar JavaScript for Kaşıkmate
// FullCalendar integration with real-time event management

class CalendarManager {
    constructor(projectId, socket) {
        this.projectId = projectId;
        this.socket = socket;
        this.calendar = null;
        this.events = [];
        this.isLoading = false;
        
        console.log('📅 CalendarManager constructor called with projectId:', projectId);
        this.init();
    }

    async init() {
        try {
            console.log('🎯 Initializing Calendar Manager...');
            console.log('🔍 Checking if FullCalendar is available:', typeof FullCalendar);
            
            // Small delay to ensure DOM is ready
            await new Promise(resolve => setTimeout(resolve, 500));
            
            if (typeof FullCalendar === 'undefined') {
                console.error('❌ FullCalendar library is not loaded!');
                this.showError('FullCalendar kütüphanesi yüklenmedi');
                return;
            }
            
            this.setupEventListeners();
            await this.loadEvents();
            this.setupSocketListeners();
            
            console.log('✅ Calendar Manager initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Calendar Manager:', error);
            this.showError('Takvim yüklenirken hata oluştu: ' + error.message);
        }
    }

    setupEventListeners() {
        // View control buttons
        const viewButtons = document.querySelectorAll('.calendar-view-btn');
        viewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });

        // New event button
        const newEventBtn = document.querySelector('.new-event-btn');
        if (newEventBtn) {
            newEventBtn.addEventListener('click', () => {
                this.openEventModal();
            });
        }

        // Window resize handler
        window.addEventListener('resize', () => {
            if (this.calendar) {
                this.calendar.updateSize();
            }
        });
    }

    setupSocketListeners() {
        if (!this.socket) return;

        // Listen for calendar event updates
        this.socket.on('eventUpdated', (data) => {
            console.log('📡 Event updated via socket:', data);
            this.handleEventUpdate(data);
        });

        this.socket.on('eventCreated', (data) => {
            console.log('📡 Event created via socket:', data);
            this.handleEventCreated(data);
        });

        this.socket.on('eventDeleted', (data) => {
            console.log('📡 Event deleted via socket:', data);
            this.handleEventDeleted(data);
        });

        // Listen for task updates (affects calendar deadlines)
        this.socket.on('taskUpdated', (data) => {
            console.log('📡 Task updated via socket (calendar refresh):', data);
            this.refreshEvents();
        });

        this.socket.on('taskCreated', (data) => {
            console.log('📡 Task created via socket (calendar refresh):', data);
            this.refreshEvents();
        });

        this.socket.on('taskDeleted', (data) => {
            console.log('📡 Task deleted via socket (calendar refresh):', data);
            this.refreshEvents();
        });
    }

    // ==================== API CALLS ====================
    async loadEvents() {
        if (this.isLoading) {
            console.log('⏳ Event loading already in progress');
            return;
        }

        this.isLoading = true;
        console.log('📥 Loading events for project:', this.projectId);

        try {
            this.showLoading();
            
            const response = await fetch(`/projects/${this.projectId}/events`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const events = await response.json();
            console.log('📋 Raw events loaded:', events);
            
            if (!Array.isArray(events)) {
                throw new Error('Invalid response format: expected array');
            }

            this.events = events;
            console.log('✅ Events stored:', this.events.length);
            
            this.renderCalendar();
            
        } catch (error) {
            console.error('❌ Error loading events:', error);
            this.showError('Etkinlikler yüklenirken hata oluştu: ' + error.message);
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    async createEvent(eventData) {
        try {
            console.log('📤 Creating event:', eventData);
            
            const response = await fetch(`/projects/${this.projectId}/events`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(eventData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'HTTP error! status: ' + response.status);
            }
            
            const event = await response.json();
            console.log('✅ Event created:', event);
            
            // Add to local events array
            this.events.push(event);
            
            // Update calendar display
            this.refreshCalendar();
            
            this.showInfo('Etkinlik başarıyla oluşturuldu');
            return event;
            
        } catch (error) {
            console.error('❌ Error creating event:', error);
            this.showError('Etkinlik oluşturulurken hata oluştu: ' + error.message);
            throw error;
        }
    }

    async updateEvent(eventId, updates) {
        try {
            console.log('📤 Updating event:', eventId, updates);
            
            const response = await fetch(`/projects/${this.projectId}/events/${eventId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'HTTP error! status: ' + response.status);
            }
            
            const event = await response.json();
            console.log('✅ Event updated:', event);
            
            // Update local events array
            const eventIndex = this.events.findIndex(e => e._id === eventId);
            if (eventIndex !== -1) {
                this.events[eventIndex] = event;
            }
            
            // Update calendar display
            this.refreshCalendar();
            
            this.showInfo('Etkinlik başarıyla güncellendi');
            return event;
            
        } catch (error) {
            console.error('❌ Error updating event:', error);
            this.showError('Etkinlik güncellenirken hata oluştu: ' + error.message);
            throw error;
        }
    }

    async deleteEvent(eventId) {
        try {
            console.log('🗑️ Deleting event:', eventId);
            
            const response = await fetch(`/projects/${this.projectId}/events/${eventId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'HTTP error! status: ' + response.status);
            }
            
            console.log('✅ Event deleted');
            
            // Remove from local events array
            this.events = this.events.filter(e => e._id !== eventId);
            
            // Update calendar display
            this.refreshCalendar();
            
            this.showInfo('Etkinlik başarıyla silindi');
            
        } catch (error) {
            console.error('❌ Error deleting event:', error);
            this.showError('Etkinlik silinirken hata oluştu: ' + error.message);
            throw error;
        }
    }

    // ==================== CALENDAR RENDERING ====================
    renderCalendar() {
        const calendarEl = document.getElementById('calendar');
        if (!calendarEl) {
            console.error('❌ Calendar container not found!');
            return;
        }

        try {
            console.log('🎨 Rendering FullCalendar...');
            
            // Destroy existing calendar if any
            if (this.calendar) {
                this.calendar.destroy();
            }

            // Convert events to FullCalendar format
            const calendarEvents = this.transformEventsForCalendar();
            console.log('📊 Calendar events prepared:', calendarEvents.length);

            // Initialize FullCalendar
            this.calendar = new FullCalendar.Calendar(calendarEl, {
                initialView: 'dayGridMonth',
                headerToolbar: {
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                },
                height: 'auto',
                events: calendarEvents,
                editable: true,
                selectable: true,
                selectMirror: true,
                weekends: true,
                locale: 'tr',
                buttonText: {
                    today: 'Bugün',
                    month: 'Ay',
                    week: 'Hafta',
                    day: 'Gün',
                    list: 'Liste'
                },
                dayMaxEvents: true,
                eventClick: this.handleEventClick.bind(this),
                select: this.handleDateSelect.bind(this),
                eventDrop: this.handleEventDrop.bind(this),
                eventResize: this.handleEventResize.bind(this),
                eventDidMount: this.handleEventDidMount.bind(this)
            });

            this.calendar.render();
            console.log('✅ FullCalendar rendered successfully');

            if (calendarEvents.length === 0) {
                this.showEmptyState();
            }

        } catch (error) {
            console.error('❌ Error rendering calendar:', error);
            this.showError('Takvim görüntülenirken hata oluştu: ' + error.message);
        }
    }

    transformEventsForCalendar() {
        return this.events.map(event => {
            const isTaskEvent = event.isTaskEvent || event.type === 'task-deadline';
            
            return {
                id: event._id,
                title: event.title,
                start: event.startDate,
                end: event.endDate,
                allDay: event.allDay,
                backgroundColor: event.color || '#3498db',
                borderColor: event.color || '#3498db',
                classNames: [
                    'fc-event',
                    `event-type-${event.type || 'event'}`,
                    isTaskEvent ? 'task-event' : 'calendar-event'
                ],
                extendedProps: {
                    description: event.description,
                    type: event.type,
                    createdBy: event.createdBy,
                    attendees: event.attendees,
                    isTaskEvent: isTaskEvent,
                    taskData: event.taskData
                }
            };
        });
    }

    // ==================== EVENT HANDLERS ====================
    handleEventClick(info) {
        console.log('🎯 Event clicked:', info.event);
        
        const event = info.event;
        const isTaskEvent = event.extendedProps.isTaskEvent;
        
        if (isTaskEvent) {
            // For task events, show task details
            this.showTaskEventDetails(event);
        } else {
            // For calendar events, show event modal
            this.openEventModal(event);
        }
    }

    handleDateSelect(selectInfo) {
        console.log('📅 Date selected:', selectInfo);
        
        // Open new event modal with pre-filled dates
        this.openEventModal(null, {
            startDate: selectInfo.start,
            endDate: selectInfo.end,
            allDay: selectInfo.allDay
        });
        
        // Clear selection
        this.calendar.unselect();
    }

    async handleEventDrop(info) {
        console.log('🎯 Event dropped:', info.event);
        
        const event = info.event;
        const isTaskEvent = event.extendedProps.isTaskEvent;
        
        if (isTaskEvent) {
            // Don't allow moving task events
            info.revert();
            this.showError('Görev son tarihlerini takvimden taşıyamazsınız');
            return;
        }
        
        try {
            await this.updateEvent(event.id, {
                startDate: event.start,
                endDate: event.end || event.start
            });
        } catch (error) {
            info.revert();
        }
    }

    async handleEventResize(info) {
        console.log('🔄 Event resized:', info.event);
        
        const event = info.event;
        const isTaskEvent = event.extendedProps.isTaskEvent;
        
        if (isTaskEvent) {
            // Don't allow resizing task events
            info.revert();
            this.showError('Görev son tarihlerini takvimden yeniden boyutlandıramazsınız');
            return;
        }
        
        try {
            await this.updateEvent(event.id, {
                startDate: event.start,
                endDate: event.end
            });
        } catch (error) {
            info.revert();
        }
    }

    handleEventDidMount(info) {
        // Add custom styling based on event type
        const event = info.event;
        const el = info.el;
        
        if (event.extendedProps.isTaskEvent) {
            el.title = `Görev: ${event.title}\nSon Tarih: ${this.formatDate(event.start)}`;
        } else {
            el.title = `${event.title}\n${this.formatDate(event.start)} - ${this.formatDate(event.end)}`;
            if (event.extendedProps.description) {
                el.title += `\n${event.extendedProps.description}`;
            }
        }
    }

    // ==================== UI METHODS ====================
    switchView(view) {
        if (!this.calendar) return;
        
        console.log('🔄 Switching calendar view to:', view);
        this.calendar.changeView(view);
        
        // Update active button
        document.querySelectorAll('.calendar-view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
    }

    openEventModal(event = null, prefilledData = {}) {
        console.log('📝 Opening event modal:', event, prefilledData);
        
        const modal = document.getElementById('eventModal');
        const form = document.getElementById('eventForm');
        
        if (!modal || !form) {
            console.error('❌ Event modal or form not found!');
            return;
        }

        // Reset form
        form.reset();
        
        // Set modal title
        const modalTitle = modal.querySelector('.modal-title');
        if (modalTitle) {
            modalTitle.textContent = event ? 'Etkinliği Düzenle' : 'Yeni Etkinlik';
        }
        
        if (event) {
            // Populate form with event data
            this.populateEventForm(event);
        } else if (prefilledData.startDate) {
            // Populate with pre-filled data
            document.getElementById('eventStartDate').value = this.formatDateTimeLocal(prefilledData.startDate);
            document.getElementById('eventEndDate').value = this.formatDateTimeLocal(prefilledData.endDate || prefilledData.startDate);
            document.getElementById('eventAllDay').checked = prefilledData.allDay || false;
        }
        
        // Show modal
        modal.style.display = 'flex';
        
        // Store current event for form submission
        this.currentEditingEvent = event;
    }

    closeEventModal() {
        const modal = document.getElementById('eventModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.currentEditingEvent = null;
    }

    populateEventForm(event) {
        document.getElementById('eventTitle').value = event.title || '';
        document.getElementById('eventDescription').value = event.extendedProps.description || '';
        document.getElementById('eventStartDate').value = this.formatDateTimeLocal(event.start);
        document.getElementById('eventEndDate').value = this.formatDateTimeLocal(event.end || event.start);
        document.getElementById('eventAllDay').checked = event.allDay || false;
        document.getElementById('eventColor').value = event.backgroundColor || '#3498db';
        document.getElementById('eventType').value = event.extendedProps.type || 'event';
    }

    async handleEventFormSubmit(formData) {
        try {
            if (this.currentEditingEvent) {
                // Update existing event
                await this.updateEvent(this.currentEditingEvent.id, formData);
            } else {
                // Create new event
                await this.createEvent(formData);
            }
            
            this.closeEventModal();
        } catch (error) {
            // Error is already handled in updateEvent/createEvent
        }
    }

    showTaskEventDetails(event) {
        const taskData = event.extendedProps.taskData;
        if (!taskData) return;
        
        alert(`Görev: ${taskData.title}\nDurum: ${this.getStatusName(taskData.status)}\nSon Tarih: ${this.formatDate(event.start)}\n\nDetayları görmek için Kanban görünümüne geçin.`);
    }

    refreshEvents() {
        console.log('🔄 Refreshing calendar events...');
        this.loadEvents();
    }

    refreshCalendar() {
        if (this.calendar) {
            const calendarEvents = this.transformEventsForCalendar();
            this.calendar.removeAllEvents();
            this.calendar.addEventSource(calendarEvents);
        }
    }

    // ==================== SOCKET EVENT HANDLERS ====================
    handleEventUpdate(data) {
        try {
            console.log('📡 Handling event update via socket:', data);
            const eventIndex = this.events.findIndex(e => e._id === data._id);
            if (eventIndex !== -1) {
                this.events[eventIndex] = data;
                this.refreshCalendar();
                console.log('✅ Event updated in calendar');
            }
        } catch (error) {
            console.error('❌ Error handling event update:', error);
        }
    }

    handleEventCreated(data) {
        try {
            console.log('📡 Handling event creation via socket:', data);
            this.events.push(data);
            this.refreshCalendar();
            console.log('✅ Event added to calendar');
        } catch (error) {
            console.error('❌ Error handling event creation:', error);
        }
    }

    handleEventDeleted(data) {
        try {
            console.log('📡 Handling event deletion via socket:', data);
            this.events = this.events.filter(e => e._id !== data._id);
            this.refreshCalendar();
            console.log('✅ Event removed from calendar');
        } catch (error) {
            console.error('❌ Error handling event deletion:', error);
        }
    }

    // ==================== UI HELPERS ====================
    showEmptyState() {
        const container = document.querySelector('.calendar-container');
        if (container && this.events.length === 0) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'calendar-empty';
            emptyDiv.innerHTML = `
                <div class="empty-icon">📅</div>
                <h3>Henüz etkinlik yok</h3>
                <p>Bu projede henüz herhangi bir etkinlik oluşturulmamış.</p>
                <button class="btn btn-primary new-event-btn">
                    <i class="icon">➕</i>
                    İlk Etkinliği Oluştur
                </button>
            `;
            container.appendChild(emptyDiv);
            
            // Add event listener to the button
            emptyDiv.querySelector('.new-event-btn').addEventListener('click', () => {
                this.openEventModal();
            });
        }
    }

    showLoading() {
        const container = document.getElementById('calendar');
        if (container) {
            container.innerHTML = `
                <div class="calendar-loading">
                    <div class="spinner"></div>
                    <span>Etkinlikler yükleniyor...</span>
                </div>
            `;
        }
    }

    hideLoading() {
        // Loading will be hidden when calendar renders
    }

    showError(message) {
        console.error('📅 Calendar Error:', message);
        const container = document.querySelector('.calendar-container');
        if (container) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'alert alert-error';
            errorDiv.innerHTML = `
                <i class="icon">⚠️</i>
                <span>${message}</span>
                <button class="close-btn" onclick="this.parentElement.remove()">×</button>
            `;
            container.insertBefore(errorDiv, container.firstChild);
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                if (errorDiv.parentElement) {
                    errorDiv.remove();
                }
            }, 5000);
        }
    }

    showInfo(message) {
        console.log('📅 Calendar Info:', message);
        const container = document.querySelector('.calendar-container');
        if (container) {
            const infoDiv = document.createElement('div');
            infoDiv.className = 'alert alert-success';
            infoDiv.innerHTML = `
                <i class="icon">✅</i>
                <span>${message}</span>
                <button class="close-btn" onclick="this.parentElement.remove()">×</button>
            `;
            container.insertBefore(infoDiv, container.firstChild);
            
            // Auto-hide after 3 seconds
            setTimeout(() => {
                if (infoDiv.parentElement) {
                    infoDiv.remove();
                }
            }, 3000);
        }
    }

    // ==================== UTILITY METHODS ====================
    formatDate(dateInput) {
        if (!dateInput) return '';
        const date = new Date(dateInput);
        return date.toLocaleDateString('tr-TR');
    }

    formatDateTimeLocal(dateInput) {
        if (!dateInput) return '';
        const date = new Date(dateInput);
        return date.toISOString().slice(0, 16);
    }

    getStatusName(status) {
        const statusMap = {
            'todo': 'Yapılacak',
            'in-progress': 'Devam Ediyor',
            'done': 'Tamamlandı'
        };
        return statusMap[status] || status;
    }

    escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }
}

// ==================== GLOBAL CALENDAR INSTANCE ====================
let calendarManager = null;

// Initialize Calendar Manager
function initCalendar(projectId, socket) {
    if (calendarManager) {
        console.log('⚠️ Calendar Manager already initialized');
        return calendarManager;
    }
    
    console.log('🚀 Initializing new Calendar Manager...');
    calendarManager = new CalendarManager(projectId, socket);
    return calendarManager;
}

// Cleanup Calendar Manager
function destroyCalendar() {
    if (calendarManager) {
        console.log('🗑️ Destroying Calendar Manager...');
        
        // Clean up event listeners and resources
        if (calendarManager.calendar) {
            calendarManager.calendar.destroy();
            calendarManager.calendar = null;
        }
        
        calendarManager = null;
        console.log('✅ Calendar Manager destroyed');
    }
}

// Refresh Calendar
function refreshCalendar() {
    if (calendarManager) {
        console.log('🔄 Refreshing Calendar...');
        calendarManager.refreshEvents();
    } else {
        console.warn('⚠️ Calendar Manager not initialized');
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CalendarManager, initCalendar, destroyCalendar, refreshCalendar };
}

// Make available globally for browser usage
if (typeof window !== 'undefined') {
    window.CalendarManager = CalendarManager;
    window.initCalendar = initCalendar;
    window.destroyCalendar = destroyCalendar;
    window.refreshCalendar = refreshCalendar;
    window.calendarManager = calendarManager;
}
