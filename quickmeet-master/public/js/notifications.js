/**
 * Notification System Frontend - FAZ 4
 * Modern bildirim sistemi JavaScript mantığı
 */

class NotificationManager {
    constructor() {
        this.socket = null;
        this.notifications = [];
        this.unreadCount = 0;
        this.isDropdownOpen = false;
        
        this.init();
    }
    
    init() {
        this.bindElements();
        this.bindEvents();
        this.loadInitialNotifications();
        this.setupSocketListeners();
        
        console.log('📢 Notification Manager initialized');
    }
    
    bindElements() {
        this.bellElement = document.getElementById('notificationBell');
        this.counterElement = document.getElementById('notificationCounter');
        this.dropdownElement = document.getElementById('notificationDropdown');
        this.listElement = document.getElementById('notificationList');
        this.markAllReadBtn = document.getElementById('markAllReadBtn');
        
        if (!this.bellElement) {
            console.warn('Notification bell element not found');
            return;
        }
    }
    
    bindEvents() {
        if (!this.bellElement) return;
        
        // Bell icon click to toggle dropdown
        this.bellElement.querySelector('.bell-icon').addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleDropdown();
        });
        
        // Mark all as read button
        if (this.markAllReadBtn) {
            this.markAllReadBtn.addEventListener('click', () => {
                this.markAllAsRead();
            });
        }
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.bellElement.contains(e.target) && this.isDropdownOpen) {
                this.closeDropdown();
            }
        });
        
        // Close dropdown on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isDropdownOpen) {
                this.closeDropdown();
            }
        });
    }
    
    setupSocketListeners() {
        // Socket.io connection
        if (typeof io !== 'undefined') {
            // Bağlantı protokolüne göre socket adresini belirle
            const socketUrl = window.location.protocol + '//' + window.location.hostname + ':3000';
            this.socket = io(socketUrl);
            
            // Listen for new notifications
            this.socket.on('new-notification', (notification) => {
                this.handleNewNotification(notification);
            });
            
            console.log('📡 Socket listeners for notifications set up');
        }
    }
    
    async loadInitialNotifications() {
        try {
            const response = await fetch('/notifications?limit=10', {
                method: 'GET',
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.notifications = data.notifications || [];
                this.unreadCount = data.unreadCount || 0;
                
                this.updateCounter();
                this.renderNotifications();
                
                console.log(`📋 Loaded ${this.notifications.length} notifications, ${this.unreadCount} unread`);
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }
    
    handleNewNotification(notification) {
        // Add to notifications array
        this.notifications.unshift(notification);
        
        // Update unread count
        if (!notification.isRead) {
            this.unreadCount++;
        }
        
        // Update UI
        this.updateCounter();
        this.renderNotifications();
        
        // Show toast notification
        this.showToast(notification);
        
        // Add visual effect to bell
        this.animateBell();
        
        console.log('📢 New notification received:', notification.type);
    }
    
    toggleDropdown() {
        if (this.isDropdownOpen) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }
    
    openDropdown() {
        if (!this.dropdownElement) return;
        
        this.dropdownElement.classList.add('show');
        this.isDropdownOpen = true;
        
        // Load fresh notifications when dropdown opens
        this.loadInitialNotifications();
    }
    
    closeDropdown() {
        if (!this.dropdownElement) return;
        
        this.dropdownElement.classList.remove('show');
        this.isDropdownOpen = false;
    }
    
    updateCounter() {
        if (!this.counterElement) return;
        
        if (this.unreadCount > 0) {
            this.counterElement.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
            this.counterElement.style.display = 'flex';
            this.counterElement.classList.add('has-notifications');
        } else {
            this.counterElement.style.display = 'none';
            this.counterElement.classList.remove('has-notifications');
        }
    }
    
    renderNotifications() {
        if (!this.listElement) return;
        
        if (this.notifications.length === 0) {
            this.listElement.innerHTML = `
                <div class="no-notifications">
                    <i class="fas fa-bell-slash"></i>
                    <p>Henüz bildirim yok</p>
                </div>
            `;
            return;
        }
        
        const notificationsHtml = this.notifications.map(notification => 
            this.createNotificationHTML(notification)
        ).join('');
        
        this.listElement.innerHTML = notificationsHtml;
        
        // Bind click events to notification items
        this.bindNotificationEvents();
    }
    
    createNotificationHTML(notification) {
        const iconMap = {
            'new-task-assigned': 'fas fa-tasks',
            'due-date-reminder': 'fas fa-clock',
            'chat-mention': 'fas fa-at',
            'file-uploaded': 'fas fa-file-upload',
            'task-completed': 'fas fa-check-circle',
            'project-updated': 'fas fa-project-diagram'
        };
        
        const icon = iconMap[notification.type] || 'fas fa-bell';
        const unreadClass = notification.isRead ? '' : 'unread';
        
        return `
            <div class="notification-item ${unreadClass}" data-id="${notification._id}" data-link="${notification.link}">
                <div class="notification-content">
                    <div class="notification-icon ${notification.type}">
                        <i class="${icon}"></i>
                    </div>
                    <div class="notification-details">
                        <div class="notification-message">${notification.message}</div>
                        <div class="notification-meta">
                            <span class="notification-time">${notification.timeAgo}</span>
                            ${notification.project ? `<span class="notification-project">${notification.project.name}</span>` : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    bindNotificationEvents() {
        const notificationItems = this.listElement.querySelectorAll('.notification-item');
        
        notificationItems.forEach(item => {
            item.addEventListener('click', () => {
                const notificationId = item.dataset.id;
                const link = item.dataset.link;
                
                // Mark as read if unread
                if (item.classList.contains('unread')) {
                    this.markAsRead([notificationId]);
                }
                
                // Navigate to link
                if (link) {
                    window.location.href = link;
                }
                
                this.closeDropdown();
            });
        });
    }
    
    async markAsRead(notificationIds) {
        try {
            const response = await fetch('/notifications/mark-as-read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ notificationIds })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.unreadCount = data.unreadCount;
                
                // Update UI
                notificationIds.forEach(id => {
                    const item = this.listElement.querySelector(`[data-id="${id}"]`);
                    if (item) {
                        item.classList.remove('unread');
                    }
                    
                    // Update in notifications array
                    const notification = this.notifications.find(n => n._id === id);
                    if (notification) {
                        notification.isRead = true;
                    }
                });
                
                this.updateCounter();
            }
        } catch (error) {
            console.error('Error marking notifications as read:', error);
        }
    }
    
    async markAllAsRead() {
        try {
            const response = await fetch('/notifications/mark-as-read', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ markAll: true })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.unreadCount = 0;
                
                // Update all notifications as read
                this.notifications.forEach(notification => {
                    notification.isRead = true;
                });
                
                // Update UI
                this.updateCounter();
                this.renderNotifications();
                
                this.showToast({
                    type: 'success',
                    message: 'Tüm bildirimler okundu olarak işaretlendi'
                });
            }
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            this.showToast({
                type: 'error',
                message: 'Bildirimler güncellenirken hata oluştu'
            });
        }
    }
    
    showToast(notification, type = 'info') {
        const toastType = notification.type === 'success' || notification.type === 'error' ? notification.type : type;
        const message = notification.message || 'Yeni bildirim alındı';
        
        const iconMap = {
            'success': 'fas fa-check',
            'error': 'fas fa-times',
            'info': 'fas fa-info',
            'warning': 'fas fa-exclamation-triangle'
        };
        
        const icon = iconMap[toastType] || 'fas fa-bell';
        
        const toast = document.createElement('div');
        toast.className = `toast-notification ${toastType}`;
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-icon ${toastType}">
                    <i class="${icon}"></i>
                </div>
                <div class="toast-message">${message}</div>
                <button class="toast-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Bind close button
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.hideToast(toast);
        });
        
        // Auto hide after 5 seconds
        setTimeout(() => this.hideToast(toast), 5000);
    }
    
    hideToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
    
    animateBell() {
        if (!this.bellElement) return;
        
        const bellIcon = this.bellElement.querySelector('.bell-icon');
        bellIcon.style.animation = 'none';
        
        setTimeout(() => {
            bellIcon.style.animation = 'notificationPulse 1s ease';
        }, 10);
        
        setTimeout(() => {
            bellIcon.style.animation = 'none';
        }, 1000);
    }
}

// Initialize notification manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if notification bell exists
    if (document.getElementById('notificationBell')) {
        window.notificationManager = new NotificationManager();
    }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NotificationManager;
}
