// Project Reporting JavaScript
// Chart.js tabanlı proje raporlama modülü

console.log('📊 reporting.js loading...');

class ReportingManager {
    constructor(projectId) {
        console.log('📊 ReportingManager constructor called:', { projectId });
        this.projectId = projectId;
        this.charts = {};
        this.reportData = null;
        this.isLoading = false;
        
        this.init();
    }
    
    init() {
        console.log('📊 Initializing Reporting Manager for project:', this.projectId);
        this.render();
        this.loadReportData();
    }
    
    render() {
        const reportsTab = document.getElementById('reports-tab');
        if (!reportsTab) {
            console.error('❌ Reports tab not found');
            return;
        }
        
        reportsTab.innerHTML = this.getReportingHTML();
        console.log('✅ Reporting manager rendered');
    }
    
    getReportingHTML() {
        return `
            <div class="reporting-manager">
                <div class="reporting-header">
                    <h3 class="reporting-title">
                        <i class="fas fa-chart-bar report-icon"></i>
                        Proje Raporları
                    </h3>
                    <div class="report-actions">
                        <button class="refresh-button" id="refresh-report-btn">
                            <i class="fas fa-sync-alt"></i>
                            Yenile
                        </button>
                        <button class="export-button" id="export-report-btn">
                            <i class="fas fa-download"></i>
                            Dışa Aktar
                        </button>
                    </div>
                </div>
                
                <div class="report-content" id="report-content">
                    ${this.getLoadingStateHTML()}
                </div>
                
                <div class="report-error" id="report-error" style="display: none;">
                    <i class="fas fa-exclamation-triangle error-icon"></i>
                    <span class="error-message"></span>
                </div>
            </div>
        `;
    }
    
    getLoadingStateHTML() {
        return `
            <div class="report-loading">
                <div class="loading-spinner"></div>
                <div>Rapor hazırlanıyor...</div>
            </div>
        `;
    }
    
    getEmptyStateHTML() {
        return `
            <div class="report-empty">
                <div class="empty-icon">📊</div>
                <div class="empty-title">Henüz Veri Yok</div>
                <div class="empty-description">
                    Bu projede henüz yeterli veri bulunmuyor. 
                    Görevler oluşturup dosyalar yükledikten sonra raporları görüntüleyebilirsiniz.
                </div>
            </div>
        `;
    }
    
    async loadReportData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        const reportContent = document.getElementById('report-content');
        
        try {
            console.log('📊 Loading report data for project:', this.projectId);
            
            const response = await fetch(`/projects/${this.projectId}/report`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }
            
            this.reportData = await response.json();
            console.log('✅ Report data loaded:', this.reportData);
            
            if (this.reportData.taskStatistics.totalTasks === 0) {
                reportContent.innerHTML = this.getEmptyStateHTML();
            } else {
                this.renderReportDashboard();
                this.setupEventListeners();
            }
            
        } catch (error) {
            console.error('❌ Report loading error:', error);
            this.showError('Rapor yüklenirken hata oluştu: ' + error.message);
        } finally {
            this.isLoading = false;
        }
    }
    
    renderReportDashboard() {
        const reportContent = document.getElementById('report-content');
        const data = this.reportData;
        
        reportContent.innerHTML = `
            <div class="report-dashboard">
                <!-- İstatistik Kartları -->
                <div class="stats-cards">
                    <div class="stat-card primary">
                        <div class="stat-icon">
                            <i class="fas fa-tasks"></i>
                        </div>
                        <div class="stat-info">
                            <div class="stat-value">${data.taskStatistics.totalTasks}</div>
                            <div class="stat-label">Toplam Görev</div>
                        </div>
                    </div>
                    
                    <div class="stat-card success">
                        <div class="stat-icon">
                            <i class="fas fa-percentage"></i>
                        </div>
                        <div class="stat-info">
                            <div class="stat-value">${data.taskStatistics.overallProgress}%</div>
                            <div class="stat-label">Tamamlama Oranı</div>
                        </div>
                    </div>
                    
                    <div class="stat-card info">
                        <div class="stat-icon">
                            <i class="fas fa-users"></i>
                        </div>
                        <div class="stat-info">
                            <div class="stat-value">${data.projectInfo.memberCount}</div>
                            <div class="stat-label">Takım Üyesi</div>
                        </div>
                    </div>
                    
                    <div class="stat-card warning">
                        <div class="stat-icon">
                            <i class="fas fa-folder"></i>
                        </div>
                        <div class="stat-info">
                            <div class="stat-value">${data.fileStatistics.totalFiles}</div>
                            <div class="stat-label">Dosya Sayısı</div>
                        </div>
                    </div>
                </div>
                
                <!-- Grafikler -->
                <div class="charts-container">
                    <div class="chart-row">
                        <div class="chart-card">
                            <div class="chart-header">
                                <h4>Görev Durum Dağılımı</h4>
                            </div>
                            <div class="chart-body">
                                <canvas id="status-chart" width="400" height="300"></canvas>
                            </div>
                        </div>
                        
                        <div class="chart-card">
                            <div class="chart-header">
                                <h4>Öncelik Dağılımı</h4>
                            </div>
                            <div class="chart-body">
                                <canvas id="priority-chart" width="400" height="300"></canvas>
                            </div>
                        </div>
                    </div>
                    
                    <div class="chart-row full-width">
                        <div class="chart-card">
                            <div class="chart-header">
                                <h4>Üye Bazında Görev Dağılımı</h4>
                            </div>
                            <div class="chart-body">
                                <canvas id="member-chart" width="800" height="400"></canvas>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Proje Detayları -->
                <div class="project-details">
                    <div class="details-card">
                        <h4>Proje Bilgileri</h4>
                        <div class="detail-item">
                            <span class="detail-label">Proje Adı:</span>
                            <span class="detail-value">${this.escapeHtml(data.projectInfo.name)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Açıklama:</span>
                            <span class="detail-value">${this.escapeHtml(data.projectInfo.description || 'Açıklama yok')}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Oluşturulma Tarihi:</span>
                            <span class="detail-value">${this.formatDate(data.projectInfo.createdAt)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Son Aktivite:</span>
                            <span class="detail-value">${this.formatDate(data.projectInfo.lastActivity)}</span>
                        </div>
                        <div class="detail-item">
                            <span class="detail-label">Toplam Dosya Boyutu:</span>
                            <span class="detail-value">${this.formatFileSize(data.fileStatistics.totalSize)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Grafikleri oluştur
        setTimeout(() => {
            this.createCharts();
        }, 100);
    }
    
    createCharts() {
        // Mevcut grafikleri temizle
        this.destroyCharts();
        
        try {
            this.createStatusChart();
            this.createPriorityChart();
            this.createMemberChart();
        } catch (error) {
            console.error('❌ Chart creation error:', error);
        }
    }
    
    createStatusChart() {
        const ctx = document.getElementById('status-chart');
        if (!ctx) return;
        
        const statusData = this.reportData.taskStatistics.statusCounts;
        const statusLabels = {
            'todo': 'Yapılacak',
            'in-progress': 'Devam Ediyor',
            'completed': 'Tamamlandı',
            'on-hold': 'Beklemede'
        };
        
        const labels = Object.keys(statusData).map(status => statusLabels[status] || status);
        const data = Object.values(statusData);
        const colors = ['#ef4444', '#f59e0b', '#10b981', '#6b7280'];
        
        this.charts.statusChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((context.parsed / total) * 100);
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    createPriorityChart() {
        const ctx = document.getElementById('priority-chart');
        if (!ctx) return;
        
        const priorityData = this.reportData.taskStatistics.priorityCounts;
        const priorityLabels = {
            'low': 'Düşük',
            'medium': 'Orta',
            'high': 'Yüksek',
            'urgent': 'Acil'
        };
        
        const labels = Object.keys(priorityData).map(priority => priorityLabels[priority] || priority);
        const data = Object.values(priorityData);
        const colors = ['#22c55e', '#eab308', '#f97316', '#dc2626'];
        
        this.charts.priorityChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: '#ffffff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((context.parsed / total) * 100);
                                return `${context.label}: ${context.parsed} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    createMemberChart() {
        const ctx = document.getElementById('member-chart');
        if (!ctx) return;
        
        const memberData = this.reportData.memberStatistics;
        if (!memberData || memberData.length === 0) {
            ctx.getContext('2d').fillText('Üye verisi bulunamadı', 50, 50);
            return;
        }
        
        const labels = memberData.map(member => member.username || 'Bilinmeyen');
        const totalTasks = memberData.map(member => member.taskCount);
        const completedTasks = memberData.map(member => member.completedTasks);
        
        this.charts.memberChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Toplam Görev',
                        data: totalTasks,
                        backgroundColor: '#3b82f6',
                        borderColor: '#1d4ed8',
                        borderWidth: 1
                    },
                    {
                        label: 'Tamamlanan Görev',
                        data: completedTasks,
                        backgroundColor: '#10b981',
                        borderColor: '#059669',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                if (context.datasetIndex === 0) {
                                    const completed = completedTasks[context.dataIndex];
                                    const total = context.parsed.y;
                                    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
                                    return `Tamamlanma: ${percentage}%`;
                                }
                                return '';
                            }
                        }
                    }
                }
            }
        });
    }
    
    setupEventListeners() {
        // Yenile butonu
        const refreshBtn = document.getElementById('refresh-report-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadReportData();
            });
        }
        
        // Dışa aktar butonu
        const exportBtn = document.getElementById('export-report-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportReport();
            });
        }
    }
      exportReport() {
        try {
            // PDF export için html2pdf kullan
            const reportElement = document.getElementById('report-content');
            if (!reportElement) {
                this.showError('Rapor içeriği bulunamadı');
                return;
            }            // Export butonunu geçici olarak gizle
            const exportBtn = document.getElementById('export-report-btn');
            const refreshBtn = document.getElementById('refresh-report-btn');
            if (exportBtn) exportBtn.style.display = 'none';
            if (refreshBtn) refreshBtn.style.display = 'none';

            // PDF export için özel CSS class'ı ekle
            const reportDashboard = reportElement.querySelector('.report-dashboard');
            if (reportDashboard) {
                reportDashboard.classList.add('html2pdf-optimized');
            }// PDF ayarları - A1 Landscape Format
            const opt = {
                margin: 0.5, // Daha küçük margin
                filename: `proje-raporu-${this.reportData.projectInfo.name}-${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { 
                    scale: 1.5, // Biraz daha düşük scale A1 için
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    width: 3370, // A1 genişliği (pixels)
                    height: 2384 // A1 yüksekliği (pixels)
                },
                jsPDF: { 
                    unit: 'mm', 
                    format: 'a1', // A1 format
                    orientation: 'landscape' // Yatay düzen
                }
            };

            // Loading göster
            this.showLoading('PDF oluşturuluyor...');            // PDF oluştur ve indir
            html2pdf().set(opt).from(reportElement).save().then(() => {
                this.showSuccess('Rapor PDF olarak başarıyla dışa aktarıldı');
                
                // Butonları geri göster
                if (exportBtn) exportBtn.style.display = 'flex';
                if (refreshBtn) refreshBtn.style.display = 'flex';
                
                // PDF CSS class'ını kaldır
                if (reportDashboard) {
                    reportDashboard.classList.remove('html2pdf-optimized');
                }
                
                // Loading'i gizle
                this.hideLoading();
            }).catch((error) => {
                console.error('❌ PDF Export error:', error);
                this.showError('PDF oluşturulurken hata oluştu');
                
                // Butonları geri göster
                if (exportBtn) exportBtn.style.display = 'flex';
                if (refreshBtn) refreshBtn.style.display = 'flex';
                
                // PDF CSS class'ını kaldır
                if (reportDashboard) {
                    reportDashboard.classList.remove('html2pdf-optimized');
                }
                
                // Loading'i gizle
                this.hideLoading();
            });

        } catch (error) {
            console.error('❌ Export error:', error);
            this.showError('Rapor dışa aktarılırken hata oluştu');
        }
    }
    
    destroyCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts = {};
    }
    
    // Helper methods
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
    
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    showError(message) {
        const errorContainer = document.getElementById('report-error');
        const errorMessage = errorContainer.querySelector('.error-message');
        errorMessage.textContent = message;
        errorContainer.style.display = 'block';
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }
    
    hideError() {
        const errorContainer = document.getElementById('report-error');
        errorContainer.style.display = 'none';
    }
      showSuccess(message) {
        // Create temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'report-success';
        successDiv.style.cssText = `
            margin-top: 1rem; padding: 1rem; 
            background: rgba(16, 185, 129, 0.1); 
            border: 1px solid #10b981; 
            border-radius: 8px; 
            color: #10b981; 
            font-size: 0.875rem;
            position: fixed; top: 20px; right: 20px; z-index: 1000;
        `;
        successDiv.innerHTML = `<i class="fas fa-check-circle" style="margin-right: 0.5rem;"></i>${message}`;
        
        document.body.appendChild(successDiv);
        
        // Remove after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }
    
    showLoading(message = 'İşlem yapılıyor...') {
        // Create loading overlay
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'pdf-loading-overlay';
        loadingDiv.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.7); backdrop-filter: blur(5px);
            display: flex; align-items: center; justify-content: center;
            z-index: 10000; color: white; font-size: 1.1rem;
        `;
        loadingDiv.innerHTML = `
            <div style="text-align: center;">
                <div style="width: 40px; height: 40px; border: 4px solid #ffffff30; border-top: 4px solid #ffffff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 1rem;"></div>
                <div>${message}</div>
            </div>
        `;
        
        // Add CSS animation
        if (!document.querySelector('#spin-animation-style')) {
            const style = document.createElement('style');
            style.id = 'spin-animation-style';
            style.textContent = '@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }';
            document.head.appendChild(style);
        }
        
        document.body.appendChild(loadingDiv);
    }
    
    hideLoading() {
        const loadingDiv = document.getElementById('pdf-loading-overlay');
        if (loadingDiv && loadingDiv.parentNode) {
            loadingDiv.parentNode.removeChild(loadingDiv);
        }
    }
}

// Global initialization
let reportingManager = null;

// Initialize reporting manager
function initReportingManager(projectId) {
    if (reportingManager) {
        console.log('🔄 Reinitializing Reporting Manager');
        reportingManager.destroyCharts();
        reportingManager = null;
    }
    
    reportingManager = new ReportingManager(projectId);
    window.reportingManager = reportingManager;
    console.log('✅ Reporting Manager initialized');
    
    return reportingManager;
}

// Cleanup reporting manager
function destroyReportingManager() {
    if (reportingManager) {
        console.log('🧹 Destroying Reporting Manager');
        reportingManager.destroyCharts();
        reportingManager = null;
        window.reportingManager = null;
    }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ReportingManager, initReportingManager, destroyReportingManager };
}

// Make available globally for browser usage
if (typeof window !== 'undefined') {
    window.ReportingManager = ReportingManager;
    window.initReportingManager = initReportingManager;
    window.destroyReportingManager = destroyReportingManager;
    console.log('📊 Reporting Manager JavaScript loaded successfully');
}
