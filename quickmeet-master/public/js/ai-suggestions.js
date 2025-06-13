// AI Task Suggestions JavaScript
class AITaskSuggestions {
    constructor(projectId, roomKanbanBoard) {
        this.projectId = projectId;
        this.kanbanBoard = roomKanbanBoard; // Kanban board referansı, görev eklemek için
        this.suggestions = [];
        this.isLoading = false;
        this.isPanelOpen = false;

        // Yeni panel elementleri için seçiciler
        this.slidePanel = document.getElementById('aiSuggestionsSlidePanel'); // ID ile seçildi
        this.suggestionsContainer = document.getElementById('ai-suggestions-container-slide'); // Düzeltilmiş ID
        this.toggleButton = document.getElementById('toggle-ai-panel-btn');
        this.closeButton = document.querySelector('.close-ai-panel-btn'); // Bu class ile kalabilir veya ID: close-ai-slide-panel-btn
        this.refreshButtonSlide = document.getElementById('refresh-ai-suggestions-slide');
        
        this.init();
    }

    init() {
        if (!this.slidePanel || !this.suggestionsContainer || !this.toggleButton || !this.closeButton || !this.refreshButtonSlide) {
            console.error('❌ AI Slide Panel: Gerekli DOM elementlerinden biri veya birkaçı bulunamadı. Kontrol edilecekler: #aiSuggestionsSlidePanel, #ai-suggestions-container-slide, #toggle-ai-panel-btn, .close-ai-panel-btn (veya #close-ai-slide-panel-btn), #refresh-ai-suggestions-slide');
            // Hangi elementin null olduğunu loglayalım
            if (!this.slidePanel) console.error('Missing: #aiSuggestionsSlidePanel');
            if (!this.suggestionsContainer) console.error('Missing: #ai-suggestions-container-slide');
            if (!this.toggleButton) console.error('Missing: #toggle-ai-panel-btn');
            if (!this.closeButton) console.error('Missing: .close-ai-panel-btn or #close-ai-slide-panel-btn');
            if (!this.refreshButtonSlide) console.error('Missing: #refresh-ai-suggestions-slide');
            return;
        }
        console.log('🤖 Initializing AI Task Suggestions for slide panel for project:', this.projectId);
        this.setupEventListeners();
        // Panel varsayılan olarak kapalı olduğu için başlangıçta önerileri yüklemiyoruz.
        // Kullanıcı paneli açtığında yüklenecek.
    }

    // render() metodu artık panel HTML'ini oluşturmuyor, çünkü o room.ejs'de.
    // Sadece başlangıç durumunu ayarlayabiliriz.
    renderInitialState() {
        if (this.suggestionsContainer) {
            this.suggestionsContainer.innerHTML = this.getEmptyStateHTML();
        }
    }

    // getAIPanelHTML() metodu kaldırıldı.

    getEmptyStateHTML() {
        return `
            <div class="ai-suggestions-empty">
                <div class="empty-icon">🤖</div>
                <div class="empty-title">Henüz Öneri Yok</div>
                <div class="empty-description">
                    Proje notlarınız ve chat mesajlarınız analiz edilerek 
                    otomatik görev önerileri oluşturulacak. 
                    Öneriler almak için "Yenile" butonuna tıklayın veya paneli açın.
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
                <div class="error-description">${this.escapeHtml(error)}</div>
                <button class="retry-btn" id="retry-load-suggestions-slide">
                    Tekrar Dene
                </button>
            </div>
        `;
    }

    setupEventListeners() {
        console.log('🔧 Setting up AI slide panel event listeners...');

        if (this.toggleButton) {
            this.toggleButton.addEventListener('click', () => {
                console.log('🔘 Toggle AI slide panel button clicked!');
                this.togglePanel();
            });
        }

        if (this.closeButton) {
            this.closeButton.addEventListener('click', () => {
                console.log('❌ Close AI slide panel button clicked!');
                this.closePanel();
            });
        }
        
        if (this.refreshButtonSlide) {
            this.refreshButtonSlide.addEventListener('click', (e) => {
                console.log('🔄 Refresh AI suggestions button (slide panel) clicked!');
                e.preventDefault();
                this.loadSuggestions();
            });
        }

        // Görev ekle, reddet ve tekrar dene butonları için event delegation (suggestionsContainer üzerinde)
        if (this.suggestionsContainer) {
            this.suggestionsContainer.addEventListener('click', async (e) => {
                const addTaskBtn = e.target.closest('.add-task-btn[data-suggestion-index]');
                const dismissBtn = e.target.closest('.dismiss-suggestion-btn[data-suggestion-index]');
                const retryBtn = e.target.closest('#retry-load-suggestions-slide');

                if (addTaskBtn) {
                    console.log('➕ Add task from suggestion button (slide panel) clicked!');
                    e.preventDefault();
                    const suggestionIndex = parseInt(addTaskBtn.dataset.suggestionIndex);
                    await this.addTaskFromSuggestion(suggestionIndex, addTaskBtn);
                } else if (dismissBtn) {
                    console.log('🗑️ Dismiss suggestion button (slide panel) clicked!');
                    e.preventDefault();
                    const suggestionIndex = parseInt(dismissBtn.dataset.suggestionIndex);
                    this.dismissSuggestion(suggestionIndex, dismissBtn);
                } else if (retryBtn) {
                    console.log('🔁 Retry load suggestions (slide panel) button clicked!');
                    e.preventDefault();
                    this.loadSuggestions();
                }
            });
        }
        
        console.log('✅ AI slide panel event listeners setup completed');
    }

    togglePanel() {
        this.isPanelOpen = !this.isPanelOpen;
        if (this.slidePanel) {
            this.slidePanel.classList.toggle('open', this.isPanelOpen);
        }
        if (this.toggleButton) {
            this.toggleButton.classList.toggle('active', this.isPanelOpen);
            this.toggleButton.setAttribute('aria-expanded', this.isPanelOpen.toString());
        }

        if (this.isPanelOpen && this.suggestions.length === 0 && !this.isLoading) {
            // Panel açıldığında ve içinde öneri yoksa (ve yükleme işlemi yoksa) önerileri yükle
            console.log('Panel açıldı, öneriler yükleniyor...'); // Hintçe olan mesaj Türkçe ile değiştirildi.
            this.loadSuggestions();
        }
    }

    openPanel() {
        if (!this.isPanelOpen) {
            this.isPanelOpen = true;
            if (this.slidePanel) this.slidePanel.classList.add('open');
            if (this.toggleButton) {
                this.toggleButton.classList.add('active');
                this.toggleButton.setAttribute('aria-expanded', 'true');
            }
            if (this.suggestions.length === 0 && !this.isLoading) {
                this.loadSuggestions();
            }
        }
    }

    closePanel() {
        if (this.isPanelOpen) {
            this.isPanelOpen = false;
            if (this.slidePanel) this.slidePanel.classList.remove('open');
            if (this.toggleButton) {
                this.toggleButton.classList.remove('active');
                this.toggleButton.setAttribute('aria-expanded', 'false');
            }
        }
    }

    async loadSuggestions() {
        if (this.isLoading) return;
        if (!this.suggestionsContainer) return;

        this.isLoading = true;
        this.suggestionsContainer.innerHTML = this.getLoadingStateHTML();
        if (this.refreshButtonSlide) this.refreshButtonSlide.disabled = true;
        // Panel class'ına 'loading' eklemek yerine, içerik alanında gösteriyoruz.

        try {
            console.log('🔄 Loading AI suggestions for slide panel...');
            const response = await fetch(`/projects/${this.projectId}/ai-suggestions`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.ok) {
                const errorData = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorData}`);
            }

            const data = await response.json();
            this.suggestions = data.suggestions || [];
            
            console.log(`✅ Loaded ${this.suggestions.length} AI suggestions for slide panel`);
            
            if (this.suggestions.length === 0) {
                this.suggestionsContainer.innerHTML = this.getEmptyStateHTML();
            } else {
                this.suggestionsContainer.innerHTML = this.renderSuggestionsList();
            }

        } catch (error) {
            console.error('❌ AI suggestions error (slide panel):', error);
            this.suggestionsContainer.innerHTML = this.getErrorStateHTML(error.message);
        } finally {
            this.isLoading = false;
            if (this.refreshButtonSlide) this.refreshButtonSlide.disabled = false;
        }
    }

    renderSuggestionsList() {
        if (!this.suggestions || this.suggestions.length === 0) {
            return this.getEmptyStateHTML();
        }
        // .ai-suggestions-list class'ı zaten panelin HTML'inde var, direkt kartları basıyoruz.
        return this.suggestions.map((suggestion, index) => this.renderSuggestionCard(suggestion, index)).join('');
    }
    
    renderSuggestionCard(suggestion, index) {
        const confidence = this.getConfidenceLevel(suggestion.confidence);
        const priorityClass = (suggestion.priority || 'medium').toLowerCase();
        const skillMatchScore = Math.round((suggestion.skillMatchScore || 0) * 100);
        
        // HTML yapısı CSS ile uyumlu olmalı (_ai-suggestions.scss içindeki .ai-suggestion-card)
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

                <div class="suggestion-actions">
                    <button class="add-task-btn" data-suggestion-index="${index}">
                        <i class="fas fa-plus btn-icon"></i>
                        Görevi Ekle
                    </button>
                    <button class="dismiss-suggestion-btn" data-suggestion-index="${index}" title="Bu öneriyi reddet">
                        <i class="fas fa-times btn-icon"></i>
                        Reddet
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
        `;
    }

    async addTaskFromSuggestion(suggestionIndex, buttonElement) {
        const suggestion = this.suggestions[suggestionIndex];
        if (!suggestion) return;

        const card = buttonElement.closest('.ai-suggestion-card');
        
        try {
            buttonElement.disabled = true;
            buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin btn-icon"></i> Ekleniyor...';
            if(card) card.classList.add('adding');

            if (!this.kanbanBoard) {
                throw new Error('Kanban board referansı bulunamadı. Görev eklenemiyor.');
            }
            
            let assignedUserId = undefined;
            if (suggestion.suggestedAssigneeUsername) {
                const projectMembers = this.kanbanBoard.projectMembers || [];
                const assignedUser = projectMembers.find(member => 
                    member.username === suggestion.suggestedAssigneeUsername
                );
                if (assignedUser) {
                    assignedUserId = assignedUser._id;
                } else {
                    console.warn(`⚠️ Önerilen kullanıcı bulunamadı: ${suggestion.suggestedAssigneeUsername}`);
                }
            }

            const taskData = {
                title: suggestion.title,
                description: suggestion.description,
                priority: suggestion.priority || 'medium',
                assignedTo: assignedUserId,
                requiredSkills: suggestion.requiredSkills || [],
                status: 'todo', // Varsayılan olarak 'todo' sütununa
                dueDate: suggestion.deadline // Eğer varsa
            };

            console.log('📝 Adding task from AI suggestion (slide panel):', taskData);
            await this.kanbanBoard.createTask(taskData);

            this.showSuccess(`"${this.escapeHtml(suggestion.title)}" görevi başarıyla eklendi!`);

            if(card) {
                card.style.opacity = '0.5';
                card.style.pointerEvents = 'none';
            }
            
            setTimeout(() => {
                this.suggestions.splice(suggestionIndex, 1);
                this.renderSuggestionsAfterUpdate();
            }, 1000);

        } catch (error) {
            console.error('❌ Task creation from suggestion failed (slide panel):', error);
            this.showError(`Görev eklenirken hata: ${this.escapeHtml(error.message)}`);
            
            buttonElement.disabled = false;
            buttonElement.innerHTML = '<i class="fas fa-plus btn-icon"></i> Görevi Ekle';
            if(card) card.classList.remove('adding');
        }
    }
    
    dismissSuggestion(suggestionIndex, buttonElement) {
        const suggestion = this.suggestions[suggestionIndex];
        if (!suggestion) return;

        const card = buttonElement.closest('.ai-suggestion-card');
        
        if(card) {
            card.style.transition = 'all 0.3s ease';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            card.style.pointerEvents = 'none';
        }
        
        setTimeout(() => {
            this.suggestions.splice(suggestionIndex, 1);
            this.renderSuggestionsAfterUpdate();
        }, 300);

        console.log(`🗑️ Öneri kaldırıldı (slide panel): ${this.escapeHtml(suggestion.title)}`);
    }

    renderSuggestionsAfterUpdate() {
        // Eskiden renderSuggestionsAfterAdd idi, şimdi daha genel.
        if (!this.suggestionsContainer) return;

        if (this.suggestions.length === 0) {
            this.suggestionsContainer.innerHTML = this.getEmptyStateHTML();
        } else {
            // Direkt kartları basıyoruz, .ai-suggestions-list wrapper'ı HTML'de sabit.
            this.suggestionsContainer.innerHTML = this.suggestions.map((s, i) => this.renderSuggestionCard(s, i)).join('');
        }
    }

    getSkillMatchLevel(score) {
        if (!score || isNaN(score)) return 'unknown';
        if (score >= 0.8) return 'high';
        if (score >= 0.5) return 'medium';
        return 'low';
    }

    getConfidenceLevel(confidence) {
        const conf = confidence || 0.5;
        if (conf >= 0.8) return 'high';
        if (conf >= 0.6) return 'medium';
        return 'low';
    }

    getPriorityText(priority) {
        const priorities = { high: 'Yüksek', medium: 'Orta', low: 'Düşük' };
        return priorities[priority] || 'Orta';
    }

    escapeHtml(text) {
        if (text === null || typeof text === 'undefined') return '';
        if (typeof text !== 'string') text = String(text);
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showSuccess(message) { this.showNotification(message, 'success'); }
    showError(message) { this.showNotification(message, 'error'); }

    showNotification(message, type) {
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
let aiTaskSuggestionsInstance = null; // Değişken adı güncellendi

function initAITaskSuggestions(projectId, kanbanBoard) {
    if (aiTaskSuggestionsInstance) {
        console.log('🔄 Reinitializing AI Task Suggestions (slide panel)');
        // Eski instance ile ilgili temizlik işlemleri (event listener kaldırma vb.) yapılabilir.
        // Şimdilik basitçe null yapıyoruz.
        aiTaskSuggestionsInstance = null; 
    }

    aiTaskSuggestionsInstance = new AITaskSuggestions(projectId, kanbanBoard);
    window.aiTaskSuggestionsInstance = aiTaskSuggestionsInstance; // Global referans güncellendi
    console.log('✅ AI Task Suggestions (slide panel) initialized and assigned to window.aiTaskSuggestionsInstance');
    
    // Başlangıçta panel kapalı olduğu için renderInitialState çağrılabilir.
    aiTaskSuggestionsInstance.renderInitialState();
    
    return aiTaskSuggestionsInstance;
}

function destroyAITaskSuggestions() {
    if (aiTaskSuggestionsInstance) {
        console.log('🧹 Destroying AI Task Suggestions (slide panel)');
        
        // Event listener'ları kaldırmak ideal olurdu, ama şimdilik instance'ı null yapıyoruz.
        // Panel DOM'dan kaldırılmıyor çünkü statik.
        
        aiTaskSuggestionsInstance = null;
        window.aiTaskSuggestionsInstance = null;
    }
}

// Export for module usage (if any)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AITaskSuggestions, initAITaskSuggestions, destroyAITaskSuggestions };
}

// Make available globally for browser usage
if (typeof window !== 'undefined') {
    window.AITaskSuggestions = AITaskSuggestions; // Class'ı global yap
    window.initAITaskSuggestions = initAITaskSuggestions;
    window.destroyAITaskSuggestions = destroyAITaskSuggestions;
    console.log('🤖 AI Suggestions JavaScript (for slide panel) loaded successfully');
}
