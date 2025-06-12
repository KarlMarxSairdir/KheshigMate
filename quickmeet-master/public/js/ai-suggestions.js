// AI Task Suggestions JavaScript
class AITaskSuggestions {
    constructor(projectId, roomKanbanBoard) {
        this.projectId = projectId;
        this.kanbanBoard = roomKanbanBoard;
        this.suggestions = [];
        this.isLoading = false;
        
        this.init();
    }

    init() {
        console.log('🤖 Initializing AI Task Suggestions for project:', this.projectId);
        this.render();
        this.setupEventListeners();
    }

    render() {
        const tasksTab = document.getElementById('tasks-tab');
        if (!tasksTab) {
            console.error('❌ Tasks tab not found for AI suggestions');
            return;
        }

        // AI öneriler panelini Kanban board'dan sonra ekle
        const kanbanBoard = tasksTab.querySelector('#kanban-board');
        if (!kanbanBoard) {
            console.error('❌ Kanban board not found for AI suggestions');
            return;
        }

        // Eğer zaten varsa kaldır
        const existingPanel = tasksTab.querySelector('.ai-suggestions-panel');
        if (existingPanel) {
            existingPanel.remove();
        }

        // AI öneriler panelini oluştur
        const aiPanel = document.createElement('div');
        aiPanel.className = 'ai-suggestions-panel';
        aiPanel.innerHTML = this.getAIPanelHTML();

        // Kanban board'dan sonra ekle
        kanbanBoard.insertAdjacentElement('afterend', aiPanel);
        
        console.log('✅ AI suggestions panel rendered');
    }

    getAIPanelHTML() {
        return `
            <div class="ai-suggestions-header">
                <h3 class="ai-title">
                    <span class="ai-icon">✨</span>
                    Akıllı Görev Önerileri
                </h3>
                <div class="ai-actions">
                    <button class="refresh-btn" id="refresh-ai-suggestions">
                        <i class="fas fa-sync-alt"></i>
                        Yenile
                    </button>
                </div>
            </div>
            <div class="ai-suggestions-content">
                <div id="ai-suggestions-container">
                    ${this.getEmptyStateHTML()}
                </div>
            </div>
        `;
    }

    getEmptyStateHTML() {
        return `
            <div class="ai-suggestions-empty">
                <div class="empty-icon">🤖</div>
                <div class="empty-title">Henüz Öneri Yok</div>
                <div class="empty-description">
                    Proje notlarınız ve chat mesajlarınız analiz edilerek 
                    otomatik görev önerileri oluşturulacak. 
                    Öneriler almak için "Yenile" butonuna tıklayın.
                </div>
            </div>
        `;
    }

    getLoadingStateHTML() {
        return `
            <div class="ai-suggestions-loading">
                <div class="loading-spinner"></div>
                <div class="loading-text">AI önerileri analiz ediliyor...</div>
            </div>
        `;
    }

    getErrorStateHTML(error) {
        return `
            <div class="ai-suggestions-error">
                <div class="error-icon">⚠️</div>
                <div class="error-title">Öneriler Yüklenemedi</div>
                <div class="error-description">${error}</div>
                <button class="retry-btn" onclick="window.aiTaskSuggestions?.loadSuggestions()">
                    Tekrar Dene
                </button>
            </div>
        `;
    }    setupEventListeners() {
        console.log('🔧 Setting up AI suggestions event listeners...');
        
        // Yenile butonu
        document.addEventListener('click', (e) => {
            if (e.target.closest('#refresh-ai-suggestions')) {
                console.log('🔄 Refresh AI suggestions button clicked!');
                e.preventDefault();
                this.loadSuggestions();
            }
        });

        // Görev ekle butonları (event delegation)
        document.addEventListener('click', async (e) => {
            if (e.target.closest('.add-task-btn[data-suggestion-index]')) {
                console.log('➕ Add task from suggestion button clicked!');
                e.preventDefault();
                const button = e.target.closest('.add-task-btn[data-suggestion-index]');
                const suggestionIndex = parseInt(button.dataset.suggestionIndex);
                await this.addTaskFromSuggestion(suggestionIndex, button);
            }
        });
        
        console.log('✅ AI suggestions event listeners setup completed');
    }

    async loadSuggestions() {
        if (this.isLoading) return;

        this.isLoading = true;
        const container = document.getElementById('ai-suggestions-container');
        const refreshBtn = document.getElementById('refresh-ai-suggestions');
        const panel = document.querySelector('.ai-suggestions-panel');

        if (!container) return;

        // Loading state
        container.innerHTML = this.getLoadingStateHTML();
        if (refreshBtn) refreshBtn.disabled = true;
        if (panel) panel.classList.add('loading');

        try {
            console.log('🔄 Loading AI suggestions...');
            const response = await fetch(`/projects/${this.projectId}/ai-suggestions`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorData}`);
            }

            const data = await response.json();
            this.suggestions = data.suggestions || [];
            
            console.log(`✅ Loaded ${this.suggestions.length} AI suggestions`);
            
            if (this.suggestions.length === 0) {
                container.innerHTML = this.getEmptyStateHTML();
            } else {
                container.innerHTML = this.renderSuggestionsList();
            }

        } catch (error) {
            console.error('❌ AI suggestions error:', error);
            container.innerHTML = this.getErrorStateHTML(error.message);
        } finally {
            this.isLoading = false;
            if (refreshBtn) refreshBtn.disabled = false;
            if (panel) panel.classList.remove('loading');
        }
    }

    renderSuggestionsList() {
        if (!this.suggestions || this.suggestions.length === 0) {
            return this.getEmptyStateHTML();
        }

        return `
            <div class="ai-suggestions-list">
                ${this.suggestions.map((suggestion, index) => this.renderSuggestionCard(suggestion, index)).join('')}
            </div>
        `;
    }    renderSuggestionCard(suggestion, index) {
        const confidence = this.getConfidenceLevel(suggestion.confidence);
        const priorityClass = (suggestion.priority || 'medium').toLowerCase();
        const skillMatchScore = Math.round((suggestion.skillMatchScore || 0) * 100);
        
        return `
            <div class="ai-suggestion-card" data-suggestion-index="${index}">
                <div class="suggestion-header">
                    <h4 class="suggestion-title">${this.escapeHtml(suggestion.title)}</h4>
                    <span class="priority-badge ${priorityClass}">${this.getPriorityText(suggestion.priority)}</span>
                </div>
                
                <div class="suggestion-description">
                    ${this.escapeHtml(suggestion.description)}
                </div>
                
                ${suggestion.suggestedAssigneeUsername ? `
                    <div class="suggested-assignee">
                        <div class="assignee-info">
                            <i class="fas fa-user-check"></i>
                            <span class="assignee-name">Önerilen: ${this.escapeHtml(suggestion.suggestedAssigneeUsername)}</span>
                            ${suggestion.skillMatchScore ? `
                                <span class="skill-match-score" title="Yetenek Uyumu">
                                    ${skillMatchScore}% uyum
                                </span>
                            ` : ''}
                        </div>
                        ${suggestion.assignmentReason ? `
                            <div class="assignment-reason">
                                <i class="fas fa-info-circle"></i>
                                ${this.escapeHtml(suggestion.assignmentReason)}
                            </div>
                        ` : ''}
                    </div>
                ` : ''}
                
                ${suggestion.requiredSkills && suggestion.requiredSkills.length > 0 ? `
                    <div class="suggestion-skills">
                        <span class="skills-label">
                            <i class="fas fa-tools"></i>
                            Gereken Yetenekler:
                        </span>
                        <div class="skills-list">
                            ${suggestion.requiredSkills.map(skill => 
                                `<span class="skill-tag">${this.escapeHtml(skill)}</span>`
                            ).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="suggestion-footer">
                    <div class="suggestion-actions">
                        <button class="add-task-btn" data-suggestion-index="${index}">
                            <i class="fas fa-plus btn-icon"></i>
                            Görevi Ekle
                        </button>
                    </div>
                    
                    <div class="suggestion-metrics">
                        <div class="confidence-metric">
                            <span class="metric-label">Güven:</span>
                            <span class="metric-value">${Math.round((suggestion.confidence || 0.5) * 100)}%</span>
                            <div class="confidence-bar ${confidence}"></div>
                        </div>
                        ${suggestion.skillMatchScore ? `
                            <div class="skill-metric">
                                <span class="metric-label">Yetenek Uyumu:</span>
                                <span class="metric-value">${skillMatchScore}%</span>
                                <div class="skill-bar ${this.getSkillMatchLevel(suggestion.skillMatchScore)}"></div>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    async addTaskFromSuggestion(suggestionIndex, buttonElement) {
        const suggestion = this.suggestions[suggestionIndex];
        if (!suggestion) return;

        const card = buttonElement.closest('.ai-suggestion-card');
        
        try {
            // UI feedback
            buttonElement.disabled = true;
            buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin btn-icon"></i> Ekleniyor...';
            card.classList.add('adding');

            // Kanban board'a görev ekle
            if (!this.kanbanBoard) {
                throw new Error('Kanban board bulunamadı');
            }            // Önerilen kullanıcının ID'sini bul
            let assignedUserId = undefined;
            if (suggestion.suggestedAssigneeUsername) {
                // Proje üyelerinden önerilen kullanıcıyı bul
                const projectMembers = this.kanbanBoard.projectMembers || [];
                const assignedUser = projectMembers.find(member => 
                    member.username === suggestion.suggestedAssigneeUsername
                );
                if (assignedUser) {
                    assignedUserId = assignedUser._id;
                    console.log(`👤 AI önerisi: ${suggestion.suggestedAssigneeUsername} (${assignedUserId}) kullanıcısına atanacak`);
                } else {
                    console.warn(`⚠️ Önerilen kullanıcı bulunamadı: ${suggestion.suggestedAssigneeUsername}`);
                }
            }

            // Görev verisini hazırla
            const taskData = {
                title: suggestion.title,
                description: suggestion.description,
                priority: suggestion.priority || 'medium',
                assignedTo: assignedUserId,
                requiredSkills: suggestion.requiredSkills || [],
                status: 'todo'
            };

            // Tarih alanlarını ekle
            if (suggestion.deadline) {
                taskData.dueDate = suggestion.deadline;
            }

            console.log('📝 Adding task from AI suggestion:', taskData);

            // Kanban board üzerinden görev oluştur
            await this.kanbanBoard.createTask(taskData);

            // Başarı mesajı
            this.showSuccess(`"${suggestion.title}" görevi başarıyla eklendi!`);

            // Kartı gizle
            card.style.opacity = '0.5';
            card.style.pointerEvents = 'none';
            
            // Öneriden kaldır
            setTimeout(() => {
                this.suggestions.splice(suggestionIndex, 1);
                this.renderSuggestionsAfterAdd();
            }, 1000);

        } catch (error) {
            console.error('❌ Task creation from suggestion failed:', error);
            this.showError(`Görev eklenirken hata: ${error.message}`);
            
            // UI'yi geri getir
            buttonElement.disabled = false;
            buttonElement.innerHTML = '<i class="fas fa-plus btn-icon"></i> Görevi Ekle';
            card.classList.remove('adding');
        }
    }

    renderSuggestionsAfterAdd() {
        const container = document.getElementById('ai-suggestions-container');
        if (!container) return;

        if (this.suggestions.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
        } else {
            container.innerHTML = this.renderSuggestionsList();
        }    }

    getSkillMatchLevel(score) {
        if (!score || isNaN(score)) return 'unknown';
        if (score >= 0.8) return 'high';
        if (score >= 0.5) return 'medium';
        return 'low';
    }

    // Utility methods
    getConfidenceLevel(confidence) {
        const conf = confidence || 0.5; // Varsayılan değer
        if (conf >= 0.8) return 'high';
        if (conf >= 0.6) return 'medium';
        return 'low';
    }

    getPriorityText(priority) {
        const priorities = {
            high: 'Yüksek',
            medium: 'Orta',
            low: 'Düşük'
        };
        return priorities[priority] || 'Orta';
    }

    formatDate(dateString) {
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

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showNotification(message, type) {
        // Existing notification system
        if (window.showNotification) {
            window.showNotification(message, type);
        } else if (this.kanbanBoard?.showNotification) {
            this.kanbanBoard.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
}

// Global initialization
let aiTaskSuggestions = null;

// Initialize AI suggestions when kanban board is ready
function initAITaskSuggestions(projectId, kanbanBoard) {
    if (aiTaskSuggestions) {
        console.log('🔄 Reinitializing AI Task Suggestions');
        aiTaskSuggestions = null;
    }

    aiTaskSuggestions = new AITaskSuggestions(projectId, kanbanBoard);
    window.aiTaskSuggestions = aiTaskSuggestions;
    console.log('✅ AI Task Suggestions initialized');
    
    return aiTaskSuggestions;
}

// Cleanup AI suggestions
function destroyAITaskSuggestions() {
    if (aiTaskSuggestions) {
        console.log('🧹 Destroying AI Task Suggestions');
        
        // Panel'i kaldır
        const panel = document.querySelector('.ai-suggestions-panel');
        if (panel) {
            panel.remove();
        }
        
        aiTaskSuggestions = null;
        window.aiTaskSuggestions = null;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AITaskSuggestions, initAITaskSuggestions, destroyAITaskSuggestions };
}

// Make available globally for browser usage
if (typeof window !== 'undefined') {
    window.AITaskSuggestions = AITaskSuggestions;
    window.initAITaskSuggestions = initAITaskSuggestions;
    window.destroyAITaskSuggestions = destroyAITaskSuggestions;
    console.log('🤖 AI Suggestions JavaScript loaded successfully');
    console.log('🔧 Available functions:', {
        AITaskSuggestions: typeof window.AITaskSuggestions,
        initAITaskSuggestions: typeof window.initAITaskSuggestions,
        destroyAITaskSuggestions: typeof window.destroyAITaskSuggestions
    });
}
