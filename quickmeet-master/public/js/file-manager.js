// File Manager JavaScript
// Proje bazlı dosya yönetimi için JavaScript modülü

console.log('📁 file-manager.js loading...');

class FileManager {
    constructor(projectId, currentUser, socket = null) {
        console.log('📁 FileManager constructor called:', { projectId, currentUser });
        this.projectId = projectId;
        this.currentUser = currentUser;
        this.socket = socket || window.socket; // Use provided socket or global socket
        this.files = [];
        this.isLoading = false;
        this.isUploading = false;
        
        this.init();
    }
      init() {
        console.log('📁 Initializing File Manager for project:', this.projectId);
        this.render();
        this.setupEventListeners();
        this.setupSocketListeners();
        this.loadFiles();
    }
    
    render() {
        const filesTab = document.getElementById('files-tab');
        if (!filesTab) {
            console.error('❌ Files tab not found');
            return;
        }
        
        filesTab.innerHTML = this.getFileManagerHTML();
        console.log('✅ File manager rendered');
    }
    
    getFileManagerHTML() {
        return `
            <div class="file-manager">
                <div class="file-manager-header">
                    <h3 class="file-manager-title">
                        <i class="fas fa-folder-open file-icon"></i>
                        Proje Dosyaları
                    </h3>
                    <div class="file-upload-area">
                        <form class="file-upload-form" id="file-upload-form">
                            <div class="file-input-wrapper">
                                <input type="file" id="file-input" class="file-input" name="file">
                                <label for="file-input" class="file-input-label">
                                    <i class="fas fa-plus upload-icon"></i>
                                    Dosya Seç
                                </label>
                            </div>
                            <div class="selected-file-info" id="selected-file-info"></div>
                            <button type="submit" class="upload-button" id="upload-button" disabled>
                                <i class="fas fa-cloud-upload-alt btn-icon"></i>
                                Yükle
                            </button>
                        </form>
                    </div>
                </div>
                
                <div class="file-list" id="file-list">
                    ${this.getLoadingStateHTML()}
                </div>
                
                <div class="file-upload-progress" id="file-upload-progress" style="display: none;">
                    <div class="progress-info">
                        <span class="progress-text">Dosya yükleniyor...</span>
                        <span class="progress-percentage">0%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: 0%"></div>
                    </div>
                </div>
                
                <div class="file-error" id="file-error" style="display: none;">
                    <i class="fas fa-exclamation-triangle error-icon"></i>
                    <span class="error-message"></span>
                </div>
            </div>
        `;
    }
    
    getLoadingStateHTML() {
        return `
            <div class="file-list-loading">
                <div class="loading-spinner"></div>
                <div>Dosyalar yükleniyor...</div>
            </div>
        `;
    }
    
    getEmptyStateHTML() {
        return `
            <div class="file-list-empty">
                <div class="empty-icon">📁</div>
                <div class="empty-title">Henüz Dosya Yok</div>
                <div class="empty-description">
                    Bu projeye henüz dosya yüklenmemiş. 
                    Yukarıdaki "Dosya Seç" butonunu kullanarak dosya yükleyebilirsiniz.
                </div>
            </div>
        `;
    }
    
    setupEventListeners() {
        console.log('🔧 Setting up file manager event listeners...');
        
        // File input change
        const fileInput = document.getElementById('file-input');
        const uploadButton = document.getElementById('upload-button');
        const selectedFileInfo = document.getElementById('selected-file-info');
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    selectedFileInfo.textContent = `Seçilen: ${file.name} (${this.formatFileSize(file.size)})`;
                    uploadButton.disabled = false;
                } else {
                    selectedFileInfo.textContent = '';
                    uploadButton.disabled = true;
                }
            });
        }
        
        // Upload form submit
        const uploadForm = document.getElementById('file-upload-form');
        if (uploadForm) {
            uploadForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.uploadFile();
            });
        }
        
        // File actions (event delegation)
        document.addEventListener('click', (e) => {
            if (e.target.closest('.download-btn')) {
                const fileId = e.target.closest('.download-btn').dataset.fileId;
                this.downloadFile(fileId);
            }
            
            if (e.target.closest('.delete-btn')) {
                const fileId = e.target.closest('.delete-btn').dataset.fileId;
                const fileName = e.target.closest('.delete-btn').dataset.fileName;
                this.deleteFile(fileId, fileName);
            }
        });
          console.log('✅ File manager event listeners setup completed');
    }
    
    setupSocketListeners() {
        if (!this.socket) {
            console.warn('⚠️ Socket not available for file manager');
            return;
        }
        
        console.log('🔧 Setting up file manager socket listeners...');
        
        // Listen for file upload events from other users
        this.socket.on('fileUploaded', (data) => {
            console.log('📡 File uploaded event received:', data);
            if (data.uploadedBy !== this.currentUser.username) {
                // Only show notification for other users' uploads
                this.showInfo(`📁 ${data.uploadedBy} tarafından yeni dosya yüklendi: ${data.file.originalName}`);
            }
            // Refresh file list to show new file
            this.loadFiles();
        });
        
        // Listen for file deletion events from other users
        this.socket.on('fileDeleted', (data) => {
            console.log('📡 File deleted event received:', data);
            if (data.deletedBy !== this.currentUser.username) {
                // Only show notification for other users' deletions
                this.showInfo(`🗑️ ${data.deletedBy} tarafından dosya silindi: ${data.fileName}`);
            }
            // Refresh file list to remove deleted file
            this.loadFiles();
        });
        
        console.log('✅ File manager socket listeners setup completed');
    }
    
    async loadFiles() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        const fileList = document.getElementById('file-list');
        
        try {
            console.log('📁 Loading files for project:', this.projectId);
            
            const response = await fetch(`/projects/${this.projectId}/files`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }
            
            const data = await response.json();
            this.files = data.files || [];
            
            console.log(`✅ Loaded ${this.files.length} files`);
            
            if (this.files.length === 0) {
                fileList.innerHTML = this.getEmptyStateHTML();
            } else {
                fileList.innerHTML = this.renderFileList();
            }
            
        } catch (error) {
            console.error('❌ Files loading error:', error);
            this.showError('Dosyalar yüklenirken hata oluştu: ' + error.message);
        } finally {
            this.isLoading = false;
        }
    }
    
    renderFileList() {
        return `
            <div class="file-list-header">
                <div>Dosya</div>
                <div>Boyut</div>
                <div>Yükleyen</div>
                <div>Tarih</div>
                <div>İşlemler</div>
            </div>
            ${this.files.map(file => this.renderFileItem(file)).join('')}
        `;
    }
    
    renderFileItem(file) {
        const fileType = this.getFileType(file.mimetype);
        const canDelete = this.canDeleteFile(file);
        
        return `
            <div class="file-item" data-file-id="${file._id}">
                <div class="file-info">
                    <div class="file-type-icon ${fileType.class}">
                        ${fileType.icon}
                    </div>
                    <div class="file-details">
                        <div class="file-name">${this.escapeHtml(file.originalName)}</div>
                        <div class="file-type">${fileType.name}</div>
                    </div>
                </div>
                <div class="file-size">${file.sizeFormatted || this.formatFileSize(file.size || 0)}</div>
                <div class="file-uploader">${this.escapeHtml(file.uploadedBy.username)}</div>
                <div class="file-date">${this.formatDate(file.createdAt)}</div>
                <div class="file-actions">
                    <button class="action-button download-btn" data-file-id="${file._id}" title="Dosyayı İndir">
                        <i class="fas fa-download"></i>
                    </button>
                    ${canDelete ? `
                        <button class="action-button delete-btn" data-file-id="${file._id}" data-file-name="${this.escapeHtml(file.originalName)}" title="Dosyayı Sil">
                            <i class="fas fa-trash"></i>
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }
    
    async uploadFile() {
        if (this.isUploading) return;
        
        const fileInput = document.getElementById('file-input');
        const file = fileInput.files[0];
        
        if (!file) {
            this.showError('Lütfen bir dosya seçin');
            return;
        }
        
        this.isUploading = true;
        const uploadButton = document.getElementById('upload-button');
        const progressContainer = document.getElementById('file-upload-progress');
        const progressFill = progressContainer.querySelector('.progress-fill');
        const progressPercentage = progressContainer.querySelector('.progress-percentage');
        
        try {
            // Show progress
            uploadButton.disabled = true;
            uploadButton.classList.add('uploading');
            uploadButton.innerHTML = '<i class="fas fa-spinner fa-spin btn-icon"></i> Yükleniyor...';
            progressContainer.style.display = 'block';
            this.hideError();
            
            const formData = new FormData();
            formData.append('file', file);
            
            console.log('📤 Uploading file:', file.name);
            
            const response = await fetch(`/projects/${this.projectId}/files`, {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ File uploaded successfully:', data.file.originalName);
            
            // Reset form
            fileInput.value = '';
            document.getElementById('selected-file-info').textContent = '';
            
            // Reload files
            await this.loadFiles();
            
            // Show success message
            this.showSuccess('Dosya başarıyla yüklendi!');
            
        } catch (error) {
            console.error('❌ File upload error:', error);
            this.showError('Dosya yüklenirken hata oluştu: ' + error.message);
        } finally {
            this.isUploading = false;
            uploadButton.disabled = false;
            uploadButton.classList.remove('uploading');
            uploadButton.innerHTML = '<i class="fas fa-cloud-upload-alt btn-icon"></i> Yükle';
            progressContainer.style.display = 'none';
        }
    }
    
    async downloadFile(fileId) {
        try {
            console.log('📥 Downloading file:', fileId);
            
            const response = await fetch(`/projects/${this.projectId}/files/${fileId}/download`);
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            // Get filename from response headers or use default
            const contentDisposition = response.headers.get('content-disposition');
            let filename = 'download';
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="(.+)"/);
                if (match) filename = match[1];
            }
            
            // Create download link
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            
            console.log('✅ File downloaded successfully');
            
        } catch (error) {
            console.error('❌ File download error:', error);
            this.showError('Dosya indirilirken hata oluştu: ' + error.message);
        }
    }
    
    async deleteFile(fileId, fileName) {
        if (!confirm(`"${fileName}" dosyasını silmek istediğinizden emin misiniz?`)) {
            return;
        }
        
        try {
            console.log('🗑️ Deleting file:', fileId);
            
            const response = await fetch(`/projects/${this.projectId}/files/${fileId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            
            console.log('✅ File deleted successfully');
            
            // Reload files
            await this.loadFiles();
            
            this.showSuccess('Dosya başarıyla silindi!');
            
        } catch (error) {
            console.error('❌ File deletion error:', error);
            this.showError('Dosya silinirken hata oluştu: ' + error.message);
        }
    }
    
    // Helper methods
    getFileType(mimetype) {
        if (mimetype.startsWith('image/')) {
            return { class: 'image', icon: 'IMG', name: 'Resim' };
        } else if (mimetype === 'application/pdf') {
            return { class: 'pdf', icon: 'PDF', name: 'PDF' };
        } else if (mimetype.includes('word') || mimetype.includes('document')) {
            return { class: 'document', icon: 'DOC', name: 'Doküman' };
        } else if (mimetype.includes('sheet') || mimetype.includes('excel')) {
            return { class: 'spreadsheet', icon: 'XLS', name: 'Tablo' };
        } else if (mimetype.includes('presentation') || mimetype.includes('powerpoint')) {
            return { class: 'presentation', icon: 'PPT', name: 'Sunum' };
        } else if (mimetype.includes('zip') || mimetype.includes('rar')) {
            return { class: 'archive', icon: 'ZIP', name: 'Arşiv' };
        } else if (mimetype.startsWith('text/')) {
            return { class: 'text', icon: 'TXT', name: 'Metin' };
        } else {
            return { class: 'other', icon: '📄', name: 'Dosya' };
        }
    }
    
    canDeleteFile(file) {
        // Owner can delete any file, uploader can delete their own file
        return this.currentUser.role === 'owner' || 
               file.uploadedBy._id === this.currentUser._id;
    }
    
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('tr-TR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showError(message) {
        const errorContainer = document.getElementById('file-error');
        const errorMessage = errorContainer.querySelector('.error-message');
        errorMessage.textContent = message;
        errorContainer.style.display = 'block';
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }
    
    hideError() {
        const errorContainer = document.getElementById('file-error');
        errorContainer.style.display = 'none';
    }
    
    showSuccess(message) {
        // Create temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'file-success';
        successDiv.style.cssText = `
            margin-top: 1rem; padding: 1rem; 
            background: rgba(16, 185, 129, 0.1); 
            border: 1px solid #10b981; 
            border-radius: 8px; 
            color: #10b981; 
            font-size: 0.875rem;
        `;
        successDiv.innerHTML = `<i class="fas fa-check-circle" style="margin-right: 0.5rem;"></i>${message}`;
        
        const fileManager = document.querySelector('.file-manager');
        fileManager.appendChild(successDiv);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }        }, 3000);
    }
    
    showInfo(message) {
        // Create temporary info message
        const infoDiv = document.createElement('div');
        infoDiv.className = 'file-info-notification';
        infoDiv.style.cssText = `
            margin-top: 1rem; padding: 1rem; 
            background: rgba(59, 130, 246, 0.1); 
            border: 1px solid #3b82f6; 
            border-radius: 8px; 
            color: #3b82f6; 
            font-size: 0.875rem;
        `;
        infoDiv.innerHTML = `<i class="fas fa-info-circle" style="margin-right: 0.5rem;"></i>${message}`;
        
        const fileManager = document.querySelector('.file-manager');
        if (fileManager) {
            fileManager.appendChild(infoDiv);
            
            // Remove after 4 seconds
            setTimeout(() => {
                if (infoDiv.parentNode) {
                    infoDiv.parentNode.removeChild(infoDiv);
                }
            }, 4000);
        }
    }
}

// Global initialization
let fileManager = null;

// Initialize file manager
function initFileManager(projectId, currentUser, socket = null) {
    if (fileManager) {
        console.log('🔄 Reinitializing File Manager');
        fileManager = null;
    }
    
    fileManager = new FileManager(projectId, currentUser, socket);
    window.fileManager = fileManager;
    console.log('✅ File Manager initialized');
    
    return fileManager;
}

// Cleanup file manager
function destroyFileManager() {
    if (fileManager) {
        console.log('🧹 Destroying File Manager');
        fileManager = null;
        window.fileManager = null;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FileManager, initFileManager, destroyFileManager };
}

// Make available globally for browser usage
if (typeof window !== 'undefined') {
    window.FileManager = FileManager;
    window.initFileManager = initFileManager;
    window.destroyFileManager = destroyFileManager;
    console.log('📁 File Manager JavaScript loaded successfully');
}
