/**
 * ========================================
 * 🎨 QUILL.JS GELİŞMİŞ NOT EDİTÖRÜ SİSTEMİ
 * ========================================
 * 
 * FAZ 3 - BÖLÜM 2.5: Advanced Rich Text Note Editor
 * 
 * Özellikler:
 * - Rich text editing (bold, italic, lists, headers)
 * - Role-based permissions (Owner/Editor/Member)
 * - Real-time collaboration ready
 * - Modern responsive UI design
 * - Delta format support for complex formatting
 * 
 * Rol-Tabanlı İzinler:
 * - Owner: Tüm notları okuyabilir, düzenleyebilir, silebilir
 * - Editor: Kendi notlarını düzenleyebilir/silebilir, diğerlerini sadece okuyabilir
 * - Member: Sadece okuyabilir (not ekleyemez)
 */

// Ensure QuillNotesManager is defined only once
if (typeof QuillNotesManager === 'undefined') {
    class QuillNotesManager {
        constructor(projectId, socket, currentUser) {
            console.log('🎨 QuillNotesManager constructor called with projectId:', projectId, 'currentUser:', currentUser); // EKLENDİ
            this.projectId = projectId;
            this.socket = socket;
            this.currentUser = currentUser;
            this.currentProjectData = null;
            this.quillEditor = null;
            this.currentEditingNoteId = null;
            
            // DOM Elements
            this.elements = {
                addNoteBtn: document.getElementById('add-note-btn-quill'),
                notesList: document.getElementById('notes-list-quill'),
                editorModal: document.getElementById('quill-editor-modal'),
                editorContainer: document.getElementById('quill-editor-container'),
                titleInput: document.getElementById('note-title-input'),
                saveBtn: document.getElementById('save-quill-note-btn'),
                cancelBtn: document.getElementById('cancel-quill-note-btn'),
                modalTitle: document.getElementById('editor-modal-title')
            };
            console.log('🎨 QuillNotesManager constructor: addNoteBtn element:', this.elements.addNoteBtn); // EKLENDİ

            this.init();
        }

        init() {
            console.log('[QuillNotesManager INIT] Starting initialization...');
            
            console.log('[QuillNotesManager INIT] Calling setupEventListeners...');
            this.setupEventListeners();
            console.log('[QuillNotesManager INIT] setupEventListeners COMPLETE.');
            
            console.log('[QuillNotesManager INIT] Calling initializeQuillEditor...');
            this.initializeQuillEditor();
            console.log('[QuillNotesManager INIT] initializeQuillEditor COMPLETE.');
            
            console.log('[QuillNotesManager INIT] Calling setupSocketEvents...');
            this.setupSocketEvents();
            console.log('[QuillNotesManager INIT] setupSocketEvents COMPLETE.');
            
            console.log('[QuillNotesManager INIT] Calling loadNotes...');
            this.loadNotes();
            console.log('[QuillNotesManager INIT] loadNotes COMPLETE (async).');
            
            console.log('[QuillNotesManager INIT] Initialization process finished.');
        }

        setupEventListeners() {
            console.log('🎨 setupEventListeners called.'); // EKLENDİ
            // Add Note Button
            if (this.elements.addNoteBtn) {
                console.log('🎨 Attaching click listener to addNoteBtn:', this.elements.addNoteBtn); // EKLENDİ
                this.elements.addNoteBtn.addEventListener('click', () => {
                    console.log('🎨 "Yeni Not Ekle" button clicked!'); // EKLENDİ
                    if (this.canCreateNote()) {
                        console.log('🎨 User has permission. Calling openNoteEditor().'); // EKLENDİ
                        this.openNoteEditor();
                    } else {
                        console.log('🎨 User does NOT have permission. Calling showPermissionDeniedMessage().'); // EKLENDİ
                        this.showPermissionDeniedMessage();
                    }
                });
            } else {
                console.error('❌ QuillNotesManager: addNoteBtn element not found!'); // EKLENDİ
            }

            // Save Button
            if (this.elements.saveBtn) {
                this.elements.saveBtn.addEventListener('click', () => {
                    this.saveNote();
                });
                console.log('    - Event listener for saveBtn ADDED.');
            } else {
                console.warn('    - saveBtn element not found, listener NOT ADDED.');
            }

            // Cancel Button
            if (this.elements.cancelBtn) {
                this.elements.cancelBtn.addEventListener('click', () => {
                    this.closeNoteEditor();
                });
                console.log('    - Event listener for cancelBtn ADDED.');
            } else {
                console.warn('    - cancelBtn element not found, listener NOT ADDED.');
            }

            // Modal outside click
            if (this.elements.editorModal) {
                this.elements.editorModal.addEventListener('click', (e) => {
                    if (e.target === this.elements.editorModal) {
                        this.closeNoteEditor();
                    }
                });
                console.log('    - Event listener for editorModal outside click ADDED.');
            } else {
                console.warn('    - editorModal element not found, listener for outside click NOT ADDED.');
            }
            console.log('[QuillNotesManager setupEventListeners] Listeners setup COMPLETE.');
        }

        initializeQuillEditor() {
            if (!window.Quill) {
                console.error('❌ Quill.js not loaded!');
                return;
            }

            // Quill toolbar configuration
            const toolbarOptions = [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'color': [] }, { 'background': [] }],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'indent': '-1'}, { 'indent': '+1' }],
                ['blockquote', 'code-block'],
                ['link'],
                [{ 'align': [] }],
                ['clean']
            ];

            // Initialize Quill editor
            this.quillEditor = new Quill(this.elements.editorContainer, {
                theme: 'snow',
                modules: {
                    toolbar: toolbarOptions
                },
                placeholder: 'Notunuzu buraya yazın...',
                readOnly: false
            });

            console.log('✅ Quill editor initialized');
        }

        setupSocketEvents() {
            if (!this.socket) return;

            // Listen for note updates from other users
            this.socket.on('noteUpdated', (data) => {
                console.log('📝 Note updated by another user:', data);
                this.loadNotes(); // Refresh notes list
            });

            this.socket.on('noteCreated', (data) => {
                console.log('➕ New note created by another user:', data);
                this.loadNotes(); // Refresh notes list
            });

            this.socket.on('noteDeleted', (data) => {
                console.log('🗑️ Note deleted by another user:', data);
                this.loadNotes(); // Refresh notes list
            });
        }

        async loadNotes() {
            if (!this.projectId) return;

            try {
                this.showLoadingState();
                
                const response = await fetch(`/projects/${this.projectId}/notes`, {
                    credentials: 'include'
                });

                const data = await response.json();
                
                if (response.ok) {
                    this.currentProjectData = data;
                    this.renderNotes(data.notes);
                } else {
                    console.error('Failed to load notes:', data.message);
                    this.showErrorState('Notlar yüklenemedi');
                }
            } catch (error) {
                console.error('Error loading notes:', error);
                this.showErrorState('Bağlantı hatası');
            }
        }

        renderNotes(notes) {
            if (!this.elements.notesList) return;

            this.elements.notesList.innerHTML = '';

            if (!notes || notes.length === 0) {
                this.showEmptyState();
                return;
            }

            notes.forEach(note => {
                const noteElement = this.createNoteElement(note);
                this.elements.notesList.appendChild(noteElement);
            });
        }

        createNoteElement(note) {
            const noteDiv = document.createElement('div');
            noteDiv.className = 'note-item-quill';
            noteDiv.dataset.noteId = note._id;

            const canEdit = this.canEditNote(note);
            const canDelete = this.canDeleteNote(note);

            // Get HTML content (fallback to plain text if no HTML)
            const noteContent = note.htmlContent || this.escapeHtml(note.content);
            const noteTitle = note.title || 'Başlıksız Not';

            noteDiv.innerHTML = `
                <div class="note-header-quill">
                    <div class="note-meta">
                        <div class="note-author">
                            <i class="fas fa-user"></i>
                            <span>${this.escapeHtml(note.user.username)}</span>
                            ${this.getUserRoleBadge(note.user)}
                        </div>
                        <div class="note-date">
                            ${new Date(note.createdAt).toLocaleDateString('tr-TR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </div>
                    </div>
                    <div class="note-actions-quill">
                        ${canEdit ? `
                            <button class="note-action-btn-quill edit" onclick="window.quillNotesManager?.editNote('${note._id}')">
                                <i class="fas fa-edit"></i>
                                Düzenle
                            </button>
                        ` : ''}
                        ${canDelete ? `
                            <button class="note-action-btn-quill delete" onclick="window.quillNotesManager?.deleteNote('${note._id}')">
                                <i class="fas fa-trash"></i>
                                Sil
                            </button>
                        ` : ''}
                    </div>
                </div>
                ${noteTitle !== 'Başlıksız Not' ? `
                    <div class="note-title-display">
                        <h4>${this.escapeHtml(noteTitle)}</h4>
                    </div>
                ` : ''}
                <div class="note-content-quill">
                    <div class="ql-editor">${noteContent}</div>
                </div>
            `;

            return noteDiv;
        }

        getUserRoleBadge(user) {
            if (!this.currentProjectData) return '';
            
            // Find user's role in the project
            const projectMember = this.currentProjectData.members?.find(m => m.user._id === user._id);
            const role = projectMember?.role || 'member';
            
            const roleLabels = {
                owner: 'Sahip',
                editor: 'Editör',
                member: 'Üye'
            };

            return `<span class="note-permission-badge ${role}">${roleLabels[role]}</span>`;
        }

        openNoteEditor(noteData = null) {
            this.currentEditingNoteId = noteData?._id || null;
            
            // Set modal title
            this.elements.modalTitle.textContent = noteData ? 'Notu Düzenle' : 'Yeni Not';
            
            // Set title input
            this.elements.titleInput.value = noteData?.title || '';
            
            // Set editor content
            if (noteData && noteData.deltaContent) {
                // Load delta content if available
                this.quillEditor.setContents(noteData.deltaContent);
            } else if (noteData && noteData.content) {
                // Fallback to plain text
                this.quillEditor.setText(noteData.content);
            } else {
                // Clear editor for new note
                this.quillEditor.setText('');
            }
            
            // Show modal
            this.elements.editorModal.style.display = 'flex';
            
            // Focus editor
            setTimeout(() => {
                this.quillEditor.focus();
            }, 100);
        }

        closeNoteEditor() {
            this.currentEditingNoteId = null;
            this.elements.editorModal.style.display = 'none';
            this.elements.titleInput.value = '';
            this.quillEditor.setText('');
        }

        async saveNote() {
            const title = this.elements.titleInput.value.trim();
            const delta = this.quillEditor.getContents();
            const htmlContent = this.quillEditor.root.innerHTML;
            const plainText = this.quillEditor.getText().trim();

            if (!plainText) {
                alert('Not içeriği boş olamaz!');
                return;
            }

            try {
                const noteData = {
                    title: title || '',
                    content: plainText, // Plain text fallback
                    deltaContent: delta, // Rich text delta
                    htmlContent: htmlContent // HTML representation
                };

                let response;
                if (this.currentEditingNoteId) {
                    // Update existing note
                    response = await fetch(`/projects/${this.projectId}/notes/${this.currentEditingNoteId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(noteData),
                        credentials: 'include'
                    });
                } else {
                    // Create new note
                    response = await fetch(`/projects/${this.projectId}/notes`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(noteData),
                        credentials: 'include'
                    });
                }

                if (response.ok) {
                    this.closeNoteEditor();
                    this.loadNotes();
                    
                    // Emit socket event for real-time updates
                    if (this.socket) {
                        this.socket.emit(this.currentEditingNoteId ? 'noteUpdated' : 'noteCreated', {
                            projectId: this.projectId,
                            noteId: this.currentEditingNoteId
                        });
                    }
                    
                    this.showSuccessMessage(this.currentEditingNoteId ? 'Not güncellendi!' : 'Not oluşturuldu!');
                } else {
                    const error = await response.json();
                    this.showErrorMessage('Not kaydedilemedi: ' + (error.message || 'Bilinmeyen hata'));
                }
            } catch (error) {
                console.error('Error saving note:', error);
                this.showErrorMessage('Bağlantı hatası: ' + error.message);
            }
        }

        async editNote(noteId) {
            try {
                const response = await fetch(`/projects/${this.projectId}/notes/${noteId}`, {
                    credentials: 'include'
                });

                if (response.ok) {
                    const noteData = await response.json();
                    this.openNoteEditor(noteData);
                } else {
                    this.showErrorMessage('Not yüklenemedi');
                }
            } catch (error) {
                console.error('Error loading note for edit:', error);
                this.showErrorMessage('Not yükleme hatası');
            }
        }

        async deleteNote(noteId) {
            if (!confirm('Bu notu silmek istediğinizden emin misiniz?')) return;

            try {
                const response = await fetch(`/projects/${this.projectId}/notes/${noteId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });

                if (response.ok) {
                    this.loadNotes();
                    
                    // Emit socket event for real-time updates
                    if (this.socket) {
                        this.socket.emit('noteDeleted', {
                            projectId: this.projectId,
                            noteId: noteId
                        });
                    }
                    
                    this.showSuccessMessage('Not silindi!');
                } else {
                    const error = await response.json();
                    this.showErrorMessage('Not silinemedi: ' + (error.message || 'Bilinmeyen hata'));
                }
            } catch (error) {
                console.error('Error deleting note:', error);
                this.showErrorMessage('Not silme hatası');
            }
        }

        // Permission checking methods
        canCreateNote() {
            if (!this.currentProjectData) {
                console.log('🎨 canCreateNote: currentProjectData is null/undefined at the time of check.'); // EKLENDİ
                return false;
            }
            const currentUserMember = this.currentProjectData.members?.find(m => m.user._id === this.currentUser.id);
            const role = currentUserMember?.role || 'member';
            return role === 'owner' || role === 'editor';
        }

        canEditNote(note) {
            if (!this.currentProjectData) return false;
            const currentUserMember = this.currentProjectData.members?.find(m => m.user._id === this.currentUser.id);
            const role = currentUserMember?.role || 'member';
            
            // Owner can edit all notes
            if (role === 'owner') return true;
            
            // Editor can only edit their own notes
            if (role === 'editor') return note.user._id === this.currentUser.id;
            
            // Members cannot edit
            return false;
        }

        canDeleteNote(note) {
            if (!this.currentProjectData) return false;
            const currentUserMember = this.currentProjectData.members?.find(m => m.user._id === this.currentUser.id);
            const role = currentUserMember?.role || 'member';
            
            // Owner can delete all notes
            if (role === 'owner') return true;
            
            // Editor can only delete their own notes
            if (role === 'editor') return note.user._id === this.currentUser.id;
            
            // Members cannot delete
            return false;
        }

        // UI State Methods
        showLoadingState() {
            if (!this.elements.notesList) return;
            this.elements.notesList.innerHTML = `
                <div class="notes-loading">
                    <div class="loading-spinner"></div>
                    <p>Notlar yükleniyor...</p>
                </div>
            `;
        }

        showEmptyState() {
            if (!this.elements.notesList) return;
            this.elements.notesList.innerHTML = `
                <div class="notes-empty-state">
                    <i class="fas fa-sticky-note"></i>
                    <h3>Henüz Not Yok</h3>
                    <p>İlk notunuzu eklemek için "Yeni Not Ekle" butonuna tıklayın.</p>
                </div>
            `;
        }

        showErrorState(message) {
            if (!this.elements.notesList) return;
            this.elements.notesList.innerHTML = `
                <div class="notes-empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Hata</h3>
                    <p>${this.escapeHtml(message)}</p>
                </div>
            `;
        }

        showPermissionDeniedMessage() {
            alert('Bu işlem için yetkiniz bulunmuyor. Sadece proje sahipleri ve editörleri not ekleyebilir.');
        }

        showSuccessMessage(message) {
            // You can replace this with a more sophisticated notification system
            console.log('✅', message);
            // Temporary simple alert - replace with toast notification later
            if (window.showNotification) {
                window.showNotification(message, 'success');
            }
        }

        showErrorMessage(message) {
            console.error('❌', message);
            alert(message);
        }

        // Utility Methods
        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    }

    // Global initialization when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🎨 DOMContentLoaded event fired.'); // EKLENDİ
        // Only initialize if we're on the room page and have the required elements
        const notesListQuillElement = document.getElementById('notes-list-quill');
        const roomIdExists = typeof ROOM_ID !== 'undefined'; // DEĞİŞTİRİLDİ: window.ROOM_ID -> ROOM_ID
        const userIdExists = typeof USER_ID !== 'undefined'; // DEĞİŞTİRİLDİ: window.USER_ID -> USER_ID
        const userUsernameExists = typeof USER_USERNAME !== 'undefined'; // EKLENDİ

        if (notesListQuillElement && roomIdExists && userIdExists && userUsernameExists) { // userUsernameExists EKLENDİ
            // Ensure the instance is created only once
            if (!window.quillNotesManager) {
                console.log('🚀 DOMContentLoaded: Initializing QuillNotesManager instance with ROOM_ID:', ROOM_ID, 'USER_ID:', USER_ID, 'USER_USERNAME:', USER_USERNAME); // Güncellenmiş log
                window.quillNotesManager = new QuillNotesManager(ROOM_ID, window.socket, { 
                    id: USER_ID, 
                    username: USER_USERNAME 
                }); // DEĞİŞTİRİLDİ: window.ROOM_ID -> ROOM_ID, window.USER_ID -> USER_ID, window.USER_USERNAME -> USER_USERNAME
            } else {
                console.log('🤔 DOMContentLoaded: QuillNotesManager instance already exists.');
            }
        } else {
            console.log('🤔 DOMContentLoaded: QuillNotesManager prerequisites not met. Not initializing.');
            if (!notesListQuillElement) {
                console.log('    - Prerequisite Fail: Element with ID "notes-list-quill" not found.');
            }
            if (!roomIdExists) {
                console.log('    - Prerequisite Fail: ROOM_ID is not defined.'); // DEĞİŞTİRİLDİ
            }
            if (!userIdExists) {
                console.log('    - Prerequisite Fail: USER_ID is not defined.'); // DEĞİŞTİRİLDİ
            }
            if (!userUsernameExists) { // EKLENDİ
                console.log('    - Prerequisite Fail: USER_USERNAME is not defined.'); // EKLENDİ
            }
        }
    });
} else {
    console.warn('⚠️ QuillNotesManager class is already defined. Skipping re-definition.');
    // Potentially re-run initialization if needed, or ensure the existing instance is used.
    // This part might need adjustment based on how scripts are loaded and re-loaded.
    // For now, we assume if the class is defined, the DOMContentLoaded listener for it also ran.
}
