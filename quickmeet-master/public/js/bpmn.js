/**
 * BPMN.io Workflow Editor Module
 * Kaşıkmate Project - FAZ 2 BPMN Integration
 */

class BPMNWorkflowManager {
    constructor() {
        this.modeler = null;
        this.currentDiagram = null;
        this.socket = null;
        this.projectId = null;
        this.userId = null;
        this.isInitialized = false;
        this.collaborationMode = true;
        
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
    }

    async init(socket, projectId, userId) {
        this.socket = socket;
        this.projectId = projectId;
        this.userId = userId;
        
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
        const container = document.getElementById('bpmn-canvas');
        if (!container) {
            throw new Error('BPMN canvas container not found');
        }

        // Initialize BPMN.io modeler
        this.modeler = new BpmnJS({
            container: container,
            width: '100%',
            height: '500px',
            keyboard: {
                bindTo: window
            }
        });

        // Import default XML
        await this.modeler.importXML(this.defaultXML);
        
        // Setup modeler event listeners
        this.modeler.on('commandStack.changed', () => {
            this.handleDiagramChange();
        });

        this.modeler.on('selection.changed', (event) => {
            this.handleSelectionChange(event);
        });
    }

    setupEventListeners() {
        // New diagram button
        document.getElementById('new-diagram-btn')?.addEventListener('click', () => {
            this.createNewDiagram();
        });

        // Save diagram button
        document.getElementById('save-diagram-btn')?.addEventListener('click', () => {
            this.saveDiagram();
        });

        // Load diagram button
        document.getElementById('load-diagram-btn')?.addEventListener('click', () => {
            this.toggleDiagramList();
        });

        // Export diagram button
        document.getElementById('export-diagram-btn')?.addEventListener('click', () => {
            this.exportDiagram();
        });

        // Toggle diagram list
        document.getElementById('toggle-diagram-list')?.addEventListener('click', () => {
            this.toggleDiagramList();
        });
    }

    setupSocketListeners() {
        if (!this.socket) return;

        // Listen for real-time diagram changes
        this.socket.on('bpmn-diagram-updated', (data) => {
            if (data.diagramId === this.currentDiagram?.id && data.userId !== this.userId) {
                this.handleRemoteDiagramUpdate(data);
            }
        });

        // Listen for collaboration events
        this.socket.on('bpmn-user-joined', (data) => {
            this.addCollaborationIndicator(data.user);
        });

        this.socket.on('bpmn-user-left', (data) => {
            this.removeCollaborationIndicator(data.userId);
        });
    }

    async createNewDiagram() {
        const title = prompt('Diyagram başlığı girin:');
        if (!title) return;

        const description = prompt('Diyagram açıklaması (opsiyonel):') || '';

        try {
            this.updateStatus('Yeni diyagram oluşturuluyor...');
            
            const response = await fetch('/api/bpmn-diagrams', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    projectId: this.projectId,
                    title: title,
                    description: description,
                    xmlData: this.defaultXML
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const newDiagram = await response.json();
            this.currentDiagram = newDiagram;
            
            await this.modeler.importXML(this.defaultXML);
            await this.loadDiagramList();
            
            this.updateStatus(`Yeni diyagram oluşturuldu: ${title}`);
            this.enableSaveButton();
            
            // Join diagram room for collaboration
            this.socket?.emit('join-bpmn-diagram', {
                diagramId: newDiagram.id,
                projectId: this.projectId
            });
            
        } catch (error) {
            console.error('Error creating new diagram:', error);
            this.updateStatus('Diyagram oluşturulamadı: ' + error.message, 'error');
        }
    }

    async saveDiagram() {
        if (!this.currentDiagram) {
            this.updateStatus('Kaydedilecek diyagram yok', 'error');
            return;
        }

        try {
            this.updateStatus('Diyagram kaydediliyor...');
            
            const { xml } = await this.modeler.saveXML({ format: true });
            
            const response = await fetch(`/api/bpmn-diagrams/${this.currentDiagram.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    xmlData: xml,
                    lastModified: new Date().toISOString()
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const updatedDiagram = await response.json();
            this.currentDiagram = updatedDiagram;
            
            this.updateStatus('Diyagram başarıyla kaydedildi');
            
            // Emit real-time update
            this.socket?.emit('bpmn-diagram-update', {
                diagramId: this.currentDiagram.id,
                projectId: this.projectId,
                xmlData: xml,
                userId: this.userId
            });
            
        } catch (error) {
            console.error('Error saving diagram:', error);
            this.updateStatus('Diyagram kaydedilemedi: ' + error.message, 'error');
        }
    }

    async loadDiagramList() {
        try {
            const response = await fetch(`/api/bpmn-diagrams?projectId=${this.projectId}`);
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
        }

        diagrams.forEach(diagram => {
            const diagramItem = document.createElement('div');
            diagramItem.className = 'diagram-item';
            diagramItem.innerHTML = `
                <div class="diagram-info">
                    <h5>${diagram.title}</h5>
                    <p>${diagram.description || 'Açıklama yok'}</p>
                    <small>Son güncelleme: ${new Date(diagram.lastModified).toLocaleString('tr-TR')}</small>
                </div>
                <div class="diagram-actions">
                    <button class="btn btn-sm btn-primary" onclick="bpmnManager.loadDiagram('${diagram._id}')">
                        <i class="fas fa-folder-open"></i> Yükle
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
            
            const response = await fetch(`/api/bpmn-diagrams/${diagramId}/xml`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const diagram = await response.json();
            this.currentDiagram = diagram;
            
            await this.modeler.importXML(diagram.xmlData);
            
            this.updateStatus(`Diyagram yüklendi: ${diagram.title}`);
            this.enableSaveButton();
            this.enableExportButton();
            
            // Join diagram room for collaboration
            this.socket?.emit('join-bpmn-diagram', {
                diagramId: diagram._id,
                projectId: this.projectId
            });
            
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
            const response = await fetch(`/api/bpmn-diagrams/${diagramId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            await this.loadDiagramList();
            this.updateStatus('Diyagram silindi');
            
            if (this.currentDiagram?.id === diagramId) {
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
        }
    }

    handleSelectionChange(event) {
        const selection = event.newSelection;
        // Handle element selection for properties panel
        console.log('Selection changed:', selection);
    }

    handleRemoteDiagramUpdate(data) {
        if (this.collaborationMode) {
            // Apply remote changes
            this.modeler.importXML(data.xmlData);
            this.updateStatus(`Diyagram güncellendi (${data.userName})`);
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
        if (saveBtn) {
            saveBtn.disabled = false;
        }
    }

    disableSaveButton() {
        const saveBtn = document.getElementById('save-diagram-btn');
        if (saveBtn) {
            saveBtn.disabled = true;
        }
    }

    enableExportButton() {
        const exportBtn = document.getElementById('export-diagram-btn');
        if (exportBtn) {
            exportBtn.disabled = false;
        }
    }

    disableExportButton() {
        const exportBtn = document.getElementById('export-diagram-btn');
        if (exportBtn) {
            exportBtn.disabled = true;
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
    }

    destroy() {
        if (this.modeler) {
            this.modeler.destroy();
            this.modeler = null;
        }
        this.isInitialized = false;
    }
}

// Global instance
window.bpmnManager = new BPMNWorkflowManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BPMNWorkflowManager;
}
