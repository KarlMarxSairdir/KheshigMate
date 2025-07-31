/**
 * BPMN.io Workflow Editor Module
 * Kaşıkmate Project - FAZ 2 BPMN Integration
 */

class BPMNWorkflowManager {    constructor() {
        this.modeler = null;
        this.currentDiagram = null;
        this.socket = null;
        this.projectId = null;
        this.userId = null;
        this.isInitialized = false;
        this.collaborationMode = true;
        this.editingDiagramId = null;
        
        // BPMN default XML template
        this.defaultXML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn" exporter="bpmn-js" exporterVersion="17.7.1">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="79" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
    }    async init(socket, projectId, userId, userName) {
        this.socket = socket;
        this.projectId = projectId;
        this.userId = userId;
        this.userName = userName;
        
        try {
            await this.initializeBPMNModeler();
            this.setupEventListeners();
            this.setupSocketListeners();
            await this.loadDiagramList();
            
            this.isInitialized = true;
            this.updateStatus('BPMN editörü hazır');
            console.log('BPMN Workflow Manager initialized successfully');
        } catch (error) {
            console.error('BPMN initialization failed:', error);
            this.updateStatus('Editör başlatılamadı: ' + error.message, 'error');
        }
    }
    
    async initializeBPMNModeler() {
        // Ana editör için canvas container'ı kullan
        const container = document.getElementById('bpmn-main-canvas');
        if (!container) {
            console.warn('Main BPMN canvas container not found, trying fallback...');
            const fallbackContainer = document.getElementById('bpmn-canvas');
            if (!fallbackContainer) {
                throw new Error('BPMN canvas container not found');
            }
            // Initialize with fallback container - BpmnJS is the full modeler with palette
            this.modeler = new BpmnJS({
                container: fallbackContainer,
                keyboard: {
                    bindTo: window
                }
            });
        } else {
            // Initialize with main container - BpmnJS is the full modeler with palette
            this.modeler = new BpmnJS({
                container: container,
                keyboard: {
                    bindTo: window
                }
            });
        }

        console.log('BPMN Modeler initialized:', this.modeler);
        
        // Import default XML
        try {
            const result = await this.modeler.importXML(this.defaultXML);
            console.log('Default XML imported successfully:', result);
            
            // Force palette to be visible after import
            setTimeout(() => {
                this.forcePaletteVisibility();
            }, 500);
            
        } catch (err) {
            console.error('Error importing default XML:', err);
            throw err;
        }
          // Setup modeler event listeners
        this.modeler.on('commandStack.changed', () => {
            this.handleDiagramChange();
        });        this.modeler.on('selection.changed', (event) => {
            this.handleSelectionChange(event);
        });
        
        // Setup mouse movement tracking for real-time collaboration
        this.setupMouseTracking();
        
        // Force canvas resize and ensure palette is visible
        setTimeout(() => {
            this.resizeCanvas();
            this.ensurePaletteVisible();
        }, 200);
        
        // Additional resize on window resize
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }

    resizeCanvas() {
        if (this.modeler && this.modeler.get) {
            try {
                const canvas = this.modeler.get('canvas');
                if (canvas && canvas.resized) {
                    canvas.resized();
                    console.log('Canvas resized successfully');
                }
            } catch (error) {
                console.warn('Canvas resize failed:', error);
            }
        }
    }

    ensurePaletteVisible() {
        if (this.modeler && this.modeler.get) {
            try {
                const palette = this.modeler.get('palette');
                if (palette) {
                    // Force palette to be visible
                    palette.open();
                    console.log('Palette opened successfully');
                } else {
                    console.warn('Palette module not found');
                }            } catch (error) {
                console.warn('Could not access palette:', error);
            }
        }
    }
    
    setupMouseTracking() {
        if (!this.modeler || !this.modeler.get) return;
        
        try {
            const canvas = this.modeler.get('canvas');
            const container = canvas.getContainer();
            
            // Throttled mouse move handler to prevent too many emissions
            const throttledMouseMove = this.throttle((event) => {
                if (this.socket && this.collaborationMode && this.currentDiagram) {
                    const rect = container.getBoundingClientRect();
                    const x = event.clientX - rect.left;
                    const y = event.clientY - rect.top;
                    
                    this.socket.emit('bpmn:cursor-move', this.currentDiagram._id, {
                        x: x,
                        y: y,
                        userId: this.userId,
                        userName: this.userName || 'Anonymous'
                    });
                }
            }, 100); // Throttle to max 10 emissions per second
            
            // Add mouse move listener to canvas container
            container.addEventListener('mousemove', throttledMouseMove);
            
            // Store reference for cleanup
            this.mouseTrackingHandler = throttledMouseMove;
            
        } catch (error) {
            console.warn('Error setting up mouse tracking:', error);
        }
    }
    
    setupEventListeners() {
        // Sidebar control panel buttons
        document.getElementById('open-bpmn-editor-btn')?.addEventListener('click', () => {
            this.openMainEditor();
        });
        
        document.getElementById('refresh-diagram-list')?.addEventListener('click', () => {
            this.loadDiagramList();
        });

        // New diagram button (both sidebar and main editor)
        document.getElementById('new-diagram-btn')?.addEventListener('click', () => {
            this.createNewDiagram();
        });

        // Main editor control buttons
        document.getElementById('save-main-diagram-btn')?.addEventListener('click', () => {
            this.saveDiagram();
        });

        document.getElementById('export-main-diagram-btn')?.addEventListener('click', () => {
            this.exportDiagram();
        });
        
        document.getElementById('fullscreen-bpmn-btn')?.addEventListener('click', () => {
            this.toggleFullscreen();
        });
        
        document.getElementById('close-bpmn-editor-btn')?.addEventListener('click', () => {
            this.closeMainEditor();
        });

        // Zoom controls
        document.getElementById('zoom-in-btn')?.addEventListener('click', () => {
            this.zoomIn();
        });
        
        document.getElementById('zoom-out-btn')?.addEventListener('click', () => {
            this.zoomOut();
        });
        
        document.getElementById('zoom-fit-btn')?.addEventListener('click', () => {
            this.zoomToFit();
        });

        // Legacy buttons (for backward compatibility)
        document.getElementById('save-diagram-btn')?.addEventListener('click', () => {
            this.saveDiagram();
        });

        document.getElementById('load-diagram-btn')?.addEventListener('click', () => {
            this.toggleDiagramList();
        });

        document.getElementById('export-diagram-btn')?.addEventListener('click', () => {
            this.exportDiagram();
        });        document.getElementById('toggle-diagram-list')?.addEventListener('click', () => {
            this.toggleDiagramList();
        });
        
        // BPMN Create Modal Event Listeners
        document.getElementById('close-bpmn-create-modal')?.addEventListener('click', () => {
            this.hideCreateDiagramModal();
        });
        
        document.getElementById('cancel-bpmn-create-btn')?.addEventListener('click', () => {
            this.hideCreateDiagramModal();
        });
        
        document.getElementById('create-bpmn-diagram-btn')?.addEventListener('click', () => {
            this.submitCreateDiagram();
        });
        
        // Modal form Enter key handling
        document.getElementById('bpmn-create-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitCreateDiagram();
        });        // ESC key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const createModal = document.getElementById('bpmn-create-modal');
                const editModal = document.getElementById('bpmn-edit-modal');
                
                if (createModal && createModal.style.display === 'flex') {
                    this.hideCreateDiagramModal();
                } else if (editModal && editModal.style.display === 'flex') {
                    this.hideEditDiagramModal();
                }
            }
        });
          // Modal backdrop click to close
        document.getElementById('bpmn-create-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'bpmn-create-modal') {
                this.hideCreateDiagramModal();
            }
        });
        
        // Edit Modal Event Listeners
        document.getElementById('close-bpmn-edit-modal')?.addEventListener('click', () => {
            this.hideEditDiagramModal();
        });
        
        document.getElementById('cancel-bpmn-edit-btn')?.addEventListener('click', () => {
            this.hideEditDiagramModal();
        });
        
        document.getElementById('update-bpmn-diagram-btn')?.addEventListener('click', () => {
            this.submitEditDiagram();
        });
        
        // Edit Modal form Enter key handling
        document.getElementById('bpmn-edit-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitEditDiagram();
        });
        
        // Edit Modal backdrop click to close
        document.getElementById('bpmn-edit-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'bpmn-edit-modal') {
                this.hideEditDiagramModal();
            }
        });
    }    setupSocketListeners() {
        if (!this.socket) return;

        // Listen for real-time diagram changes
        this.socket.on('bpmn:diagram-changed', (data) => {
            if (data.diagramId === this.currentDiagram?._id && data.changedBy?.userId !== this.userId) {
                this.handleRemoteDiagramUpdate(data);
            }
        });

        // Listen for collaboration events
        this.socket.on('bpmn:user-joined', (data) => {
            console.log('BPMN: User joined diagram', data);
            this.addCollaborationIndicator({
                id: data.userId,
                name: data.userName,
                socketId: data.socketId
            });
        });

        this.socket.on('bpmn:user-left', (data) => {
            console.log('BPMN: User left diagram', data);
            this.removeCollaborationIndicator(data.userId);
        });

        // Listen for cursor movements
        this.socket.on('bpmn:cursor-move', (data) => {
            if (data.userId !== this.userId) {
                this.handleRemoteCursorMove(data);
            }
        });

        // Listen for selection changes
        this.socket.on('bpmn:selection-changed', (data) => {
            if (data.userId !== this.userId) {
                this.handleRemoteSelectionChange(data);
            }
        });

        // Listen for synchronization requests
        this.socket.on('bpmn:sync-request', (data) => {
            if (this.currentDiagram && data.diagramId === this.currentDiagram._id) {
                this.sendSyncResponse(data);
            }
        });

        // Listen for synchronization responses
        this.socket.on('bpmn:sync-response', (data) => {
            if (data.diagramId === this.currentDiagram?._id) {
                this.applySyncResponse(data);
            }
        });        // Listen for BPMN errors
        this.socket.on('bpmn:error', (data) => {
            console.error('BPMN Error:', data);
            this.updateStatus(`BPMN Hatası: ${data.message}`, 'error');
        });

        // Listen for diagram list updates (for real-time list refresh)
        this.socket.on('bpmn:diagram-created', (data) => {
            if (data.projectId === this.projectId) {
                console.log('BPMN: New diagram created, refreshing list');
                this.loadDiagramList();
            }
        });

        this.socket.on('bpmn:diagram-updated', (data) => {
            if (data.projectId === this.projectId) {
                console.log('BPMN: Diagram updated, refreshing list');
                this.loadDiagramList();
            }
        });

        this.socket.on('bpmn:diagram-deleted', (data) => {
            if (data.projectId === this.projectId) {
                console.log('BPMN: Diagram deleted, refreshing list');
                this.loadDiagramList();
            }
        });
    }
    
    async createNewDiagram() {
        // Modal'ı göster
        this.showCreateDiagramModal();
    }      showCreateDiagramModal() {
        console.log('🆕 showCreateDiagramModal called');
        const modal = document.getElementById('bpmn-create-modal');
        console.log('🔍 Create Modal element found:', modal);
        
        if (modal) {
            console.log('🎨 Setting create modal display to flex...');
            modal.style.display = 'flex';
            
            // Verify modal is actually visible
            const computedStyle = window.getComputedStyle(modal);
            console.log('📊 Create Modal computed display:', computedStyle.display);
            console.log('📊 Create Modal computed visibility:', computedStyle.visibility);
            console.log('📊 Create Modal computed opacity:', computedStyle.opacity);
            console.log('📊 Create Modal computed z-index:', computedStyle.zIndex);
            
            // Form'u temizle
            document.getElementById('bpmn-diagram-name').value = '';
            document.getElementById('bpmn-diagram-description').value = '';
            document.getElementById('bpmn-diagram-category').value = 'general';
            
            // Focus isim alanına
            setTimeout(() => {
                document.getElementById('bpmn-diagram-name').focus();
            }, 100);
        } else {
            console.error('❌ Create Modal element not found!');
        }
    }
      hideCreateDiagramModal() {
        const modal = document.getElementById('bpmn-create-modal');
        if (modal) {
            modal.style.display = 'none';
        }    }
    
    async submitCreateDiagram() {
        const nameInput = document.getElementById('bpmn-diagram-name');
        const descriptionInput = document.getElementById('bpmn-diagram-description');
        const categoryInput = document.getElementById('bpmn-diagram-category');
        
        const title = nameInput.value.trim();
        if (!title) {
            nameInput.focus();
            this.updateStatus('Diyagram adı gereklidir', 'error');
            return;
        }
        
        const description = descriptionInput.value.trim();
        const category = categoryInput.value;
        
        try {
            this.updateStatus('Diyagram oluşturuluyor...');
            
            // Leave previous diagram room if socket is available and there's a current diagram
            if (this.socket && this.currentDiagram) {
                this.socket.emit('bpmn:leave-diagram', this.currentDiagram._id);
                console.log(`BPMN: Left previous diagram room ${this.currentDiagram._id} before creating new diagram`);
            }
            
            // Get current modeler XML data to save
            const { xml } = await this.modeler.saveXML({ format: true });
            
            // Create new diagram
            const response = await fetch(`/projects/${this.projectId}/bpmn`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: title,
                    description: description,
                    category: category,
                    xmlData: xml
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const newDiagram = await response.json();
            this.currentDiagram = newDiagram;
            
            this.updateStatus(`Diyagram oluşturuldu: ${title}`);
            
            // Update buttons
            this.disableSaveButton(); // Yeni oluşturulan diyagram saved state'de
            this.enableExportButton();
            this.updateMainEditorButtons();
            
            // Close modal
            this.hideCreateDiagramModal();
            
            // Refresh diagram list
            await this.loadDiagramList();
            
            // Join new diagram room for collaboration
            this.socket?.emit('bpmn:join-diagram', newDiagram._id, this.projectId);
            
            // Open main editor if not already open
            const mainEditor = document.getElementById('bpmn-main-editor');
            if (mainEditor && mainEditor.style.display === 'none') {
                this.openMainEditor();
            }
            
        } catch (error) {
            console.error('Error creating diagram:', error);
            this.updateStatus('Diyagram oluşturulamadı: ' + error.message, 'error');
        }
    }
    
    // ==================== EDIT DIAGRAM MODAL FUNCTIONS ====================
    async editDiagram(diagramId) {
        console.log('🎯 editDiagram called with diagramId:', diagramId);
        
        if (!diagramId) {
            console.error('❌ No diagram ID provided to editDiagram');
            this.updateStatus('Diyagram ID bulunamadı', 'error');
            return;
        }
        
        try {
            // Diyagram bilgilerini getir
            const response = await fetch(`/projects/${this.projectId}/bpmn/${diagramId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const diagram = await response.json();
            console.log('📊 Received diagram data:', diagram);
            this.showEditDiagramModal(diagram);
              } catch (error) {
            console.error('Error loading diagram for edit:', error);
            this.updateStatus('Diyagram düzenleme için yüklenemedi: ' + error.message, 'error');
        }
    }
      showEditDiagramModal(diagram) {
        console.log('🔧 showEditDiagramModal called with diagram:', diagram);
        const modal = document.getElementById('bpmn-edit-modal');
        console.log('🔍 Modal element found:', modal);
        
        if (modal) {
            console.log('🎨 Setting modal display to flex...');
            modal.style.display = 'flex';
            
            // Verify modal is actually visible
            const computedStyle = window.getComputedStyle(modal);
            console.log('📊 Modal computed display:', computedStyle.display);
            console.log('📊 Modal computed visibility:', computedStyle.visibility);
            console.log('📊 Modal computed opacity:', computedStyle.opacity);
            console.log('📊 Modal computed z-index:', computedStyle.zIndex);
            
            // Form'u diyagram verileriyle doldur
            document.getElementById('bpmn-edit-diagram-name').value = diagram.title || '';
            document.getElementById('bpmn-edit-diagram-description').value = diagram.description || '';
            document.getElementById('bpmn-edit-diagram-category').value = diagram.category || 'general';
            
            // Düzenlenen diyagram ID'sini sakla
            this.editingDiagramId = diagram._id;
            console.log('💾 editingDiagramId set to:', this.editingDiagramId);
            
            // Focus isim alanına
            setTimeout(() => {
                document.getElementById('bpmn-edit-diagram-name').focus();
            }, 100);
        } else {
            console.error('❌ Modal element not found!');
        }
    }
    
    hideEditDiagramModal() {
        const modal = document.getElementById('bpmn-edit-modal');
        if (modal) {
            modal.style.display = 'none';
            this.editingDiagramId = null;
        }    }
    
    async submitEditDiagram() {
        console.log('🚀 submitEditDiagram called, editingDiagramId:', this.editingDiagramId);
        
        const nameInput = document.getElementById('bpmn-edit-diagram-name');
        const descriptionInput = document.getElementById('bpmn-edit-diagram-description');
        const categoryInput = document.getElementById('bpmn-edit-diagram-category');
        
        const title = nameInput.value.trim();
        if (!title) {
            nameInput.focus();
            this.updateStatus('Diyagram adı gereklidir', 'error');
            return;
        }
        
        const description = descriptionInput.value.trim();
        const category = categoryInput.value;
        
        if (!this.editingDiagramId) {
            console.error('❌ editingDiagramId is null or undefined');
            this.updateStatus('Düzenlenecek diyagram ID bulunamadı', 'error');
            return;
        }
        
        console.log('📝 Update data:', { title, description, category, editingDiagramId: this.editingDiagramId });
          try {
            this.updateStatus('Diyagram güncelleniyor...');
            
            // Diyagram metadata'sını güncelle
            const url = `/projects/${this.projectId}/bpmn/${this.editingDiagramId}/metadata`;
            console.log('🌐 API URL:', url);
            
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: title,
                    description: description,
                    category: category
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const updatedDiagram = await response.json();
            
            // Eğer şu anda yüklü diyagram düzenleniyorsa, currentDiagram'ı güncelle
            if (this.currentDiagram && this.currentDiagram._id === this.editingDiagramId) {
                this.currentDiagram = updatedDiagram;
                this.updateMainEditorButtons();
            }
              this.updateStatus(`Diyagram güncellendi: ${title}`);
            
            // Modal'ı kapat ve ID'yi temizle
            this.hideEditDiagramModal();
            
            // Diyagram listesini yenile
            await this.loadDiagramList();
            
        } catch (error) {
            console.error('Error updating diagram:', error);
            this.updateStatus('Diyagram güncellenemedi: ' + error.message, 'error');
        }
    }
    
    async saveDiagram() {
        try {
            this.updateStatus('Diyagram kaydediliyor...');
            
            const { xml } = await this.modeler.saveXML({ format: true });
            
            if (!this.currentDiagram) {
                this.updateStatus('Kaydedilecek diyagram yok', 'error');
                return;
            }
              // Mevcut diyagramı güncelle
            const response = await fetch(`/projects/${this.projectId}/bpmn/${this.currentDiagram._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    xmlData: xml
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const updatedDiagram = await response.json();
            this.currentDiagram = updatedDiagram;
            
            this.updateStatus('Diyagram başarıyla kaydedildi');
            this.updateMainEditorButtons();
            this.disableSaveButton(); // Kaydetme sonrası buton deaktif
            this.enableExportButton(); // Export etmeye hazır
              
            // Emit real-time update
            this.socket?.emit('bpmn:diagram-changed', this.currentDiagram._id, xml, {
                projectId: this.projectId,
                userId: this.userId,
                version: this.currentDiagram.version || 1
            });
            
        } catch (error) {
            console.error('Error saving diagram:', error);
            this.updateStatus('Diyagram kaydedilemedi: ' + error.message, 'error');
        }
    }
    
    async loadDiagramList() {
        try {
            const response = await fetch(`/projects/${this.projectId}/bpmn`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const diagrams = await response.json();
            this.renderDiagramList(diagrams);
            
        } catch (error) {
            console.error('Error loading diagram list:', error);
            this.updateStatus('Diyagram listesi yüklenemedi', 'error');
        }
    }

    renderDiagramList(diagrams) {
        const listContainer = document.getElementById('diagram-list');
        if (!listContainer) return;

        listContainer.innerHTML = '';

        if (diagrams.length === 0) {
            listContainer.innerHTML = '<div class="no-diagrams">Henüz diyagram yok</div>';
            return;
        }        diagrams.forEach(diagram => {
            console.log('Diagram data:', { 
                title: diagram.title, 
                category: diagram.category,
                categoryDisplay: this.getCategoryDisplayName(diagram.category)
            });
            
            const diagramItem = document.createElement('div');
            diagramItem.className = 'diagram-item';            diagramItem.innerHTML = `
                <div class="diagram-info">
                    <div class="diagram-header">
                        <h5>${diagram.title}</h5>
                        <span class="diagram-category">${this.getCategoryDisplayName(diagram.category)}</span>
                    </div>
                    <p>${diagram.description || 'Açıklama yok'}</p>
                    <small>Son güncelleme: ${diagram.updatedAt ? this.formatDate(diagram.updatedAt) : (diagram.createdAt ? this.formatDate(diagram.createdAt) : 'Bilinmiyor')}</small>
                </div>                <div class="diagram-actions">
                    <button class="btn btn-sm btn-primary" onclick="bpmnManager.loadDiagram('${diagram._id}')">
                        <i class="fas fa-folder-open"></i> Yükle
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="bpmnManager.editDiagram('${diagram._id}')">
                        <i class="fas fa-edit"></i> Düzenle
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="bpmnManager.deleteDiagram('${diagram._id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            listContainer.appendChild(diagramItem);
        });
    }
      async loadDiagram(diagramId) {
        try {
            this.updateStatus('Diyagram yükleniyor...');
            
            // Leave previous diagram room if socket is available and there's a current diagram
            if (this.socket && this.currentDiagram && this.currentDiagram._id !== diagramId) {
                this.socket.emit('bpmn:leave-diagram', this.currentDiagram._id);
                console.log(`BPMN: Left previous diagram room ${this.currentDiagram._id}`);
            }
            
            // Önce diyagram bilgilerini al
            const diagramResponse = await fetch(`/projects/${this.projectId}/bpmn/${diagramId}`);
            if (!diagramResponse.ok) {
                throw new Error(`HTTP error! status: ${diagramResponse.status}`);
            }
            
            const diagramData = await diagramResponse.json();
            this.currentDiagram = diagramData;
            
            // XML verisini al ve yükle
            const xmlResponse = await fetch(`/projects/${this.projectId}/bpmn/${diagramId}/xml`);
            if (!xmlResponse.ok) {
                throw new Error(`HTTP error! status: ${xmlResponse.status}`);
            }

            const xmlData = await xmlResponse.text();
            
            // XML'i import et - error handling ile
            try {
                const result = await this.modeler.importXML(xmlData);
                console.log('Diagram loaded successfully:', result);
                
                // Canvas'ı yeniden düzenle
                setTimeout(() => {
                    this.resizeCanvas();
                    this.forcePaletteVisibility();
                }, 300);
                
            } catch (xmlError) {
                console.error('XML import error:', xmlError);
                
                // Eğer XML invalid ise, default XML ile yeniden dene
                console.warn('Invalid XML detected, falling back to default...');
                await this.modeler.importXML(this.defaultXML);
                
                this.updateStatus('Diyagram XML hatası nedeniyle varsayılan şablonla açıldı', 'warning');
            }
            
            this.updateStatus(`Diyagram yüklendi: ${diagramData.title}`);
            this.disableSaveButton(); // Yükleme sonrası kaydetme butonu deaktif
            this.enableExportButton();
            this.updateMainEditorButtons();
            
            // Ana editörü aç (eğer kapalıysa)
            const mainEditor = document.getElementById('bpmn-main-editor');
            if (mainEditor && mainEditor.style.display === 'none') {
                this.openMainEditor();
            }
            
            // Join diagram room for collaboration
            this.socket?.emit('bpmn:join-diagram', diagramId, this.projectId);
            
        } catch (error) {
            console.error('Error loading diagram:', error);
            this.updateStatus('Diyagram yüklenemedi: ' + error.message, 'error');
        }
    }
    
    async deleteDiagram(diagramId) {
        if (!confirm('Bu diyagramı silmek istediğinizden emin misiniz?')) {
            return;
        }

        try {
            const response = await fetch(`/projects/${this.projectId}/bpmn/${diagramId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }            await this.loadDiagramList();
            this.updateStatus('Diyagram silindi');
            
            if (this.currentDiagram?._id === diagramId) {
                // Leave diagram room before clearing current diagram
                if (this.socket) {
                    this.socket.emit('bpmn:leave-diagram', diagramId);
                    console.log(`BPMN: Left diagram room ${diagramId} after deletion`);
                }
                
                this.currentDiagram = null;
                await this.modeler.importXML(this.defaultXML);
                this.disableSaveButton();
                this.disableExportButton();
            }
            
        } catch (error) {
            console.error('Error deleting diagram:', error);
            this.updateStatus('Diyagram silinemedi: ' + error.message, 'error');
        }
    }

    async exportDiagram() {
        if (!this.currentDiagram) {
            this.updateStatus('Dışa aktarılacak diyagram yok', 'error');
            return;
        }

        try {
            const { xml } = await this.modeler.saveXML({ format: true });
            const { svg } = await this.modeler.saveSVG();
            
            // Create download link for XML
            const xmlBlob = new Blob([xml], { type: 'application/xml' });
            const xmlUrl = URL.createObjectURL(xmlBlob);
            
            const xmlLink = document.createElement('a');
            xmlLink.href = xmlUrl;
            xmlLink.download = `${this.currentDiagram.title}.bpmn`;
            document.body.appendChild(xmlLink);
            xmlLink.click();
            document.body.removeChild(xmlLink);
            
            URL.revokeObjectURL(xmlUrl);
            
            this.updateStatus('Diyagram dışa aktarıldı');
            
        } catch (error) {
            console.error('Error exporting diagram:', error);
            this.updateStatus('Diyagram dışa aktarılamadı: ' + error.message, 'error');
        }
    }
      handleDiagramChange() {
        if (this.currentDiagram) {
            this.enableSaveButton();
            this.enableExportButton();
            this.hasUnsavedChanges = true;
            
            // Emit real-time diagram changes for collaboration
            if (this.socket && this.collaborationMode) {
                this.throttledEmitDiagramChange();
            }
        }
    }

    // Throttled function to prevent too many socket emissions
    throttledEmitDiagramChange = this.throttle(async () => {
        if (!this.currentDiagram || !this.socket) return;
        
        try {
            const { xml } = await this.modeler.saveXML({ format: true });
            
            this.socket.emit('bpmn:diagram-changed', this.currentDiagram._id, xml, {
                projectId: this.projectId,
                userId: this.userId,
                version: this.currentDiagram.version || 1,
                timestamp: Date.now()
            });
            
            console.log('BPMN: Real-time diagram change emitted');
        } catch (error) {
            console.error('Error emitting diagram change:', error);
        }
    }, 1000); // Throttle to max 1 emission per second

    handleSelectionChange(event) {
        const selection = event.newSelection;
        console.log('Selection changed:', selection);
        
        // Emit selection changes for collaboration
        if (this.socket && this.collaborationMode && this.currentDiagram) {
            this.socket.emit('bpmn:selection-changed', this.currentDiagram._id, selection.map(element => element.id));
        }
    }

    handleRemoteDiagramUpdate(data) {
        if (this.collaborationMode && data.xmlData) {
            console.log('BPMN: Applying remote diagram update from', data.changedBy?.userName);
            
            // Temporarily disable local change handlers to prevent feedback loop
            this.collaborationMode = false;
            
            try {
                this.modeler.importXML(data.xmlData);
                this.updateStatus(`Diyagram güncellendi (${data.changedBy?.userName || 'Bilinmeyen kullanıcı'})`);
            } catch (error) {
                console.error('Error applying remote diagram update:', error);
                this.updateStatus('Uzak diyagram güncellemesi uygulanamadı', 'error');
            } finally {
                // Re-enable collaboration mode after a short delay
                setTimeout(() => {
                    this.collaborationMode = true;
                }, 500);
            }
        }
    }    // Handle remote cursor movements
    handleRemoteCursorMove(data) {
        // Show remote user cursor on canvas
        console.log(`Remote cursor from ${data.userName}:`, data.x, data.y);
        
        if (!this.modeler || !this.modeler.get) return;
        
        try {
            const canvas = this.modeler.get('canvas');
            const container = canvas.getContainer();
            
            // Remove existing cursor for this user
            const existingCursor = container.querySelector(`[data-remote-cursor="${data.userId}"]`);
            if (existingCursor) {
                existingCursor.remove();
            }
            
            // Create new cursor element
            const cursor = document.createElement('div');
            cursor.setAttribute('data-remote-cursor', data.userId);
            cursor.className = 'remote-cursor';
            cursor.style.cssText = `
                position: absolute;
                left: ${data.x}px;
                top: ${data.y}px;
                width: 12px;
                height: 16px;
                background: ${data.userColor || '#007bff'};
                border-radius: 0 0 4px 0;
                pointer-events: none;
                z-index: 1000;
                transition: all 0.1s ease;
            `;
            
            // Add user name label
            const label = document.createElement('span');
            label.textContent = data.userName;
            label.style.cssText = `
                position: absolute;
                left: 15px;
                top: -5px;
                background: ${data.userColor || '#007bff'};
                color: white;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 10px;
                white-space: nowrap;
                font-family: Arial, sans-serif;
            `;
            cursor.appendChild(label);
            
            container.appendChild(cursor);
            
            // Auto-remove cursor after 5 seconds of inactivity
            setTimeout(() => {
                const stillThere = container.querySelector(`[data-remote-cursor="${data.userId}"]`);
                if (stillThere === cursor) {
                    cursor.remove();
                }
            }, 5000);
            
        } catch (error) {
            console.error('Error showing remote cursor:', error);
        }
    }

    // Handle remote selection changes
    handleRemoteSelectionChange(data) {
        console.log(`Remote selection from ${data.userName}:`, data.selectedElements);
        
        if (!this.modeler || !this.modeler.get || !data.selectedElements) return;
        
        try {
            const elementRegistry = this.modeler.get('elementRegistry');
            const graphicsFactory = this.modeler.get('graphicsFactory');
            const canvas = this.modeler.get('canvas');
            
            // Remove existing remote selections for this user
            const container = canvas.getContainer();
            const existingSelections = container.querySelectorAll(`[data-remote-selection="${data.userId}"]`);
            existingSelections.forEach(selection => selection.remove());
            
            // Add selection indicators for each selected element
            data.selectedElements.forEach(elementId => {
                const element = elementRegistry.get(elementId);
                if (element) {
                    const gfx = elementRegistry.getGraphics(element);
                    if (gfx) {
                        const bbox = gfx.getBBox();
                        
                        // Create selection overlay
                        const selectionOverlay = document.createElement('div');
                        selectionOverlay.setAttribute('data-remote-selection', data.userId);
                        selectionOverlay.style.cssText = `
                            position: absolute;
                            left: ${bbox.x - 2}px;
                            top: ${bbox.y - 2}px;
                            width: ${bbox.width + 4}px;
                            height: ${bbox.height + 4}px;
                            border: 2px dashed ${data.userColor || '#007bff'};
                            pointer-events: none;
                            z-index: 100;
                            opacity: 0.7;
                        `;
                        
                        // Add user label
                        const userLabel = document.createElement('span');
                        userLabel.textContent = data.userName;
                        userLabel.style.cssText = `
                            position: absolute;
                            top: -20px;
                            left: 0;
                            background: ${data.userColor || '#007bff'};
                            color: white;
                            padding: 2px 6px;
                            border-radius: 3px;
                            font-size: 10px;
                            white-space: nowrap;
                            font-family: Arial, sans-serif;
                        `;
                        selectionOverlay.appendChild(userLabel);
                        
                        container.appendChild(selectionOverlay);
                    }
                }
            });
            
            // Auto-remove selections after 10 seconds
            setTimeout(() => {
                const stillThereSelections = container.querySelectorAll(`[data-remote-selection="${data.userId}"]`);
                stillThereSelections.forEach(selection => selection.remove());
            }, 10000);
            
        } catch (error) {
            console.error('Error showing remote selection:', error);
        }
    }

    // Send sync response to requesting user
    sendSyncResponse(requestData) {
        if (!this.currentDiagram || !this.socket) return;
        
        this.modeler.saveXML({ format: true }).then(({ xml }) => {
            this.socket.emit('bpmn:sync-response', this.currentDiagram._id, xml, requestData.requestedBy);
            console.log('BPMN: Sync response sent to', requestData.requestedBy);
        }).catch(error => {
            console.error('Error sending sync response:', error);
        });
    }

    // Apply sync response
    applySyncResponse(data) {
        if (!data.xmlData) return;
        
        console.log('BPMN: Applying sync response');
        this.collaborationMode = false;
        
        try {
            this.modeler.importXML(data.xmlData);
            this.updateStatus('Diyagram senkronize edildi');
        } catch (error) {
            console.error('Error applying sync response:', error);
            this.updateStatus('Senkronizasyon hatası', 'error');
        } finally {
            setTimeout(() => {
                this.collaborationMode = true;
            }, 500);
        }
    }

    // Utility throttle function
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        }
    }

    toggleDiagramList() {
        const listSection = document.getElementById('diagram-list-section');
        const toggleBtn = document.getElementById('toggle-diagram-list');
        
        if (listSection.classList.contains('collapsed')) {
            listSection.classList.remove('collapsed');
            toggleBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
        } else {
            listSection.classList.add('collapsed');
            toggleBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
        }
    }

    updateStatus(message, type = 'info') {
        const statusElement = document.querySelector('#workflow-status .status-text');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status-text ${type}`;
        }
        console.log(`[BPMN Status] ${message}`);
    }
    
    enableSaveButton() {
        const saveBtn = document.getElementById('save-diagram-btn');
        const mainSaveBtn = document.getElementById('save-main-diagram-btn');
        if (saveBtn) {
            saveBtn.disabled = false;
        }
        if (mainSaveBtn) {
            mainSaveBtn.disabled = false;
        }
        this.hasUnsavedChanges = true;
    }

    disableSaveButton() {
        const saveBtn = document.getElementById('save-diagram-btn');
        const mainSaveBtn = document.getElementById('save-main-diagram-btn');
        if (saveBtn) {
            saveBtn.disabled = true;
        }
        if (mainSaveBtn) {
            mainSaveBtn.disabled = true;
        }
        this.hasUnsavedChanges = false;
    }

    enableExportButton() {
        const exportBtn = document.getElementById('export-diagram-btn');
        const mainExportBtn = document.getElementById('export-main-diagram-btn');
        if (exportBtn) {
            exportBtn.disabled = false;
        }
        if (mainExportBtn) {
            mainExportBtn.disabled = false;
        }
    }

    disableExportButton() {
        const exportBtn = document.getElementById('export-diagram-btn');
        const mainExportBtn = document.getElementById('export-main-diagram-btn');
        if (exportBtn) {
            exportBtn.disabled = true;
        }
        if (mainExportBtn) {
            mainExportBtn.disabled = true;
        }
    }

    addCollaborationIndicator(user) {
        const indicatorsContainer = document.getElementById('collaboration-indicators');
        if (!indicatorsContainer) return;

        const indicator = document.createElement('div');
        indicator.className = 'collaboration-indicator';
        indicator.id = `collab-${user.id}`;
        indicator.innerHTML = `
            <div class="user-avatar" style="background-color: ${user.color || '#007bff'}">
                ${user.name.charAt(0).toUpperCase()}
            </div>
            <span class="user-name">${user.name}</span>
        `;
        
        indicatorsContainer.appendChild(indicator);
    }
    
    removeCollaborationIndicator(userId) {
        const indicator = document.getElementById(`collab-${userId}`);
        if (indicator) {
            indicator.remove();
        }
    }    // ==================== CANVAS CONTROLS ====================
    
    resetModeler() {
        try {
            if (this.modeler) {
                // Modeler'ı temizle
                this.modeler.clear();
                console.log('BPMN modeler cleared');
                
                // Default XML'i import et
                setTimeout(async () => {
                    try {
                        await this.modeler.importXML(this.defaultXML);
                        console.log('Default XML imported after reset');
                        
                        // Canvas ve palette'i yeniden ayarla
                        setTimeout(() => {
                            this.resizeCanvas();
                            this.forcePaletteVisibility();
                        }, 200);
                        
                    } catch (error) {
                        console.error('Error importing default XML after reset:', error);
                    }
                }, 100);
            }
        } catch (error) {
            console.error('Error resetting modeler:', error);
        }
    }
    
    resizeCanvas() {
        if (this.modeler && this.modeler.get) {
            try {
                const canvas = this.modeler.get('canvas');
                if (canvas && canvas.resized) {
                    canvas.resized();
                    console.log('Canvas resized successfully');
                }
            } catch (error) {
                console.warn('Error resizing canvas:', error);
            }
        }
    }
    
    ensurePaletteVisible() {
        if (this.modeler && this.modeler.get) {
            try {
                const palette = this.modeler.get('palette');
                if (palette) {
                    palette.open();
                    console.log('Palette opened successfully');
                    
                    // CSS ile de zorla görünür yapalım
                    setTimeout(() => {
                        this.forcePaletteVisibility();
                    }, 100);
                }
            } catch (error) {
                console.warn('Error ensuring palette visibility:', error);
            }
        }
    }
    
    forcePaletteVisibility() {
        // Palette elementini bul ve zorla görünür yap
        const paletteElement = document.querySelector('.djs-palette');
        if (paletteElement) {
            paletteElement.style.display = 'block !important';
            paletteElement.style.visibility = 'visible !important';
            paletteElement.style.opacity = '1 !important';
            paletteElement.style.position = 'absolute !important';
            paletteElement.style.top = '20px !important';
            paletteElement.style.left = '20px !important';
            paletteElement.style.zIndex = '100 !important';
            paletteElement.style.background = '#ffffff !important';
            paletteElement.style.border = '1px solid #ccc !important';
            paletteElement.style.borderRadius = '4px !important';
            paletteElement.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15) !important';
            paletteElement.style.padding = '5px !important';
            
            console.log('Palette forced visible with enhanced CSS');
            
            // Palette entries'leri de kontrol et
            const paletteEntries = paletteElement.querySelectorAll('.entry');
            paletteEntries.forEach(entry => {
                entry.style.display = 'block !important';
                entry.style.visibility = 'visible !important';
                entry.style.opacity = '1 !important';
                entry.style.margin = '2px !important';
                entry.style.padding = '8px !important';
                entry.style.cursor = 'pointer !important';
                entry.style.borderRadius = '2px !important';
                entry.style.transition = 'background-color 0.2s !important';
            });
            
            return true;
        }
        
        console.warn('Palette element not found in DOM');
        return false;
    }    destroy() {
        // Leave current diagram room if socket is available and diagram is loaded
        if (this.socket && this.currentDiagram) {
            this.socket.emit('bpmn:leave-diagram', this.currentDiagram._id);
            console.log(`BPMN: Left diagram room on destroy ${this.currentDiagram._id}`);
        }
        
        // Clean up mouse tracking handler
        if (this.mouseTrackingHandler && this.modeler && this.modeler.get) {
            try {
                const canvas = this.modeler.get('canvas');
                const container = canvas.getContainer();
                container.removeEventListener('mousemove', this.mouseTrackingHandler);
                console.log('BPMN: Mouse tracking handler cleaned up');
            } catch (error) {
                console.warn('Error cleaning up mouse tracking:', error);
            }
        }
        
        if (this.modeler) {
            this.modeler.destroy();
            this.modeler = null;
        }
        this.isInitialized = false;
        this.currentDiagram = null;
        this.socket = null;
        this.mouseTrackingHandler = null;
        this.userName = null;
    }
    
    // ==================== MAIN EDITOR CONTROLS ====================
    
    openMainEditor() {
        const mainEditor = document.getElementById('bpmn-main-editor');
        if (mainEditor) {
            mainEditor.style.display = 'block';
            
            // Ana canvas'a modeler'ı taşı
            const mainCanvas = document.getElementById('bpmn-main-canvas');
            if (mainCanvas && this.modeler) {
                try {
                    // Yeni container'a modeler'ı yeniden attach et
                    this.modeler.attachTo(mainCanvas);
                    console.log('BPMN modeler attached to main canvas');
                    
                    // Canvas boyutunu yeniden hesapla ve palette'i göster - birden fazla kez dene
                    setTimeout(() => {
                        this.resizeCanvas();
                        this.ensurePaletteVisible();
                        this.forcePaletteVisibility();
                    }, 100);
                    
                    setTimeout(() => {
                        this.forcePaletteVisibility();
                    }, 500);
                    
                    setTimeout(() => {
                        this.forcePaletteVisibility();
                    }, 1000);
                    
                } catch (error) {
                    console.error('Error attaching modeler to main canvas:', error);
                }
            }
            
            this.updateStatus('Ana editör açıldı');
            this.updateMainEditorButtons();
        }
    }
      closeMainEditor() {
        const mainEditor = document.getElementById('bpmn-main-editor');
        if (mainEditor) {
            mainEditor.style.display = 'none';
            this.updateStatus('Ana editör kapatıldı');
            
            // Leave current diagram room if socket is available and diagram is loaded
            if (this.socket && this.currentDiagram) {
                this.socket.emit('bpmn:leave-diagram', this.currentDiagram._id);
                console.log(`BPMN: Left diagram room ${this.currentDiagram._id}`);
            }
        }
    }
    
    toggleFullscreen() {
        const overlay = document.querySelector('.bpmn-editor-overlay');
        if (overlay) {
            overlay.classList.toggle('fullscreen-mode');
            
            // Canvas boyutunu yeniden hesapla
            setTimeout(() => {
                if (this.modeler && this.modeler.get) {
                    const canvas = this.modeler.get('canvas');
                    if (canvas && canvas.resized) {
                        canvas.resized();
                    }
                }
            }, 100);
        }
    }
      updateMainEditorButtons() {
        const saveBtn = document.getElementById('save-main-diagram-btn');
        const exportBtn = document.getElementById('export-main-diagram-btn');
        const currentNameSpan = document.getElementById('current-diagram-name');
        
        if (this.currentDiagram) {
            if (saveBtn) saveBtn.disabled = !this.hasUnsavedChanges;
            if (exportBtn) exportBtn.disabled = false;
            if (currentNameSpan) {
                const categoryText = this.getCategoryDisplayName(this.currentDiagram.category);
                currentNameSpan.textContent = `${this.currentDiagram.title} (${categoryText})`;
            }
        } else {
            if (saveBtn) saveBtn.disabled = true;
            if (exportBtn) exportBtn.disabled = false;
            if (currentNameSpan) currentNameSpan.textContent = 'Yeni Diyagram';
        }
    }
    
    // ==================== HELPER METHODS ====================
      formatDate(dateString) {
        try {
            if (!dateString) return 'Bilinmiyor';
            
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                console.warn('Invalid date received:', dateString);
                return 'Geçersiz tarih';
            }
            
            return date.toLocaleString('tr-TR', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (error) {
            console.error('Date formatting error:', error);
            return 'Hatalı tarih';
        }
    }    getCategoryDisplayName(category) {
        console.log('getCategoryDisplayName called with:', category);
        
        const categoryMap = {
            'general': 'Genel İş Akışı',
            'approval': 'Onay Süreci',
            'development': 'Geliştirme Süreci',
            'testing': 'Test Süreci',
            'deployment': 'Dağıtım Süreci',
            'other': 'Diğer'
        };
        
        const result = categoryMap[category] || 'Genel İş Akışı';
        console.log('Category mapping result:', { input: category, output: result });
        return result;
    }
    
    // ==================== ZOOM CONTROLS ====================
    zoomIn() {
        if (this.modeler && this.modeler.get) {
            const zoomScroll = this.modeler.get('zoomScroll');
            if (zoomScroll) {
                zoomScroll.stepZoom(1);
                this.updateStatus('Yakınlaştırıldı');
            }
        }
    }
    
    zoomOut() {
        if (this.modeler && this.modeler.get) {
            const zoomScroll = this.modeler.get('zoomScroll');
            if (zoomScroll) {
                zoomScroll.stepZoom(-1);
                this.updateStatus('Uzaklaştırıldı');
            }
        }
    }
    
    zoomToFit() {
        if (this.modeler && this.modeler.get) {
            const canvas = this.modeler.get('canvas');
            if (canvas && canvas.zoom) {
                canvas.zoom('fit-viewport');
                this.updateStatus('Diyagram ekrana sığdırıldı');
            }
        }
    }
}

// Global instance
window.bpmnManager = new BPMNWorkflowManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BPMNWorkflowManager;
}
