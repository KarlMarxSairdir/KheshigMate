// Dashboard.js - Proje yönetimi

document.addEventListener('DOMContentLoaded', function() {
    // DOM elementleri
    const usernameDisplay = document.getElementById('username-display');
    const logoutBtn = document.getElementById('logout-btn');
    const createProjectForm = document.getElementById('create-project-form');
    const projectList = document.getElementById('project-list');
    const projectListLoading = document.getElementById('project-list-loading');
    const projectListEmpty = document.getElementById('project-list-empty');
    const refreshProjectsBtn = document.getElementById('refresh-projects');
    
    // Modal elementleri
    const deleteModal = document.getElementById('delete-modal');
    const confirmDeleteBtn = document.getElementById('confirm-delete');
    const cancelDeleteBtn = document.getElementById('cancel-delete');
    const closeModalBtn = deleteModal.querySelector('.close');

    let currentDeleteId = null;

    // Sayfa yüklendiğinde auth kontrolü ve verileri yükle
    init();

    async function init() {
        await checkAuth();
        await loadProjects();
    }

    // Kimlik doğrulama kontrolü
    async function checkAuth() {
        try {
            const response = await fetch('/check-auth');
            if (!response.ok) {
                // Giriş yapılmamış, login sayfasına yönlendir
                window.location.href = '/login.html';
                return;
            }

            const userData = await response.json();
            usernameDisplay.textContent = userData.username;
            
            // localStorage'ı güncelle
            localStorage.setItem('userId', userData._id);
            localStorage.setItem('username', userData.username);
            localStorage.setItem('userEmail', userData.email);

        } catch (error) {
            console.error('Auth check error:', error);
            window.location.href = '/login.html';
        }
    }

    // Event listeners
    logoutBtn.onclick = logout;
    createProjectForm.onsubmit = createProject;
    refreshProjectsBtn.onclick = loadProjects;
    
    // Modal event listeners
    confirmDeleteBtn.onclick = deleteProject;
    cancelDeleteBtn.onclick = closeModal;
    closeModalBtn.onclick = closeModal;
    
    // Modal dışına tıklayınca kapat
    window.onclick = (event) => {
        if (event.target === deleteModal) {
            closeModal();
        }
    };

    // Çıkış işlemi
    async function logout() {
        try {
            await fetch('/logout', { method: 'POST' });
            localStorage.clear();
            window.location.href = '/login.html';
        } catch (error) {
            console.error('Logout error:', error);
            // Hata olsa da localStorage'ı temizle ve yönlendir
            localStorage.clear();
            window.location.href = '/login.html';
        }
    }

    // Proje oluşturma
    async function createProject(e) {
        e.preventDefault();
        
        const createBtn = document.getElementById('create-project');
        const nameInput = document.getElementById('project-name');
        const descInput = document.getElementById('project-desc');
        const name = nameInput.value.trim();
        const description = descInput.value.trim();

        if (!name) {
            alert('Proje adı gereklidir!');
            nameInput.focus();
            return;
        }

        try {
            createBtn.disabled = true;
            createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Oluşturuluyor...';

            const response = await fetch('/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description })
            });

            const data = await response.json();

            if (response.ok) {
                // Form temizle
                createProjectForm.reset();
                
                // Success message
                showNotification('Proje başarıyla oluşturuldu!', 'success');
                
                // Proje listesini yenile
                await loadProjects();
            } else {
                alert(data.message || 'Proje oluşturulamadı.');
            }
        } catch (error) {
            console.error('Create project error:', error);
            alert('Sunucu hatası: ' + error.message);
        } finally {
            createBtn.disabled = false;
            createBtn.innerHTML = '<i class="fas fa-rocket"></i> Proje Oluştur';
        }
    }    // Projeleri yükle
    async function loadProjects() {
        try {
            projectListLoading.style.display = 'block';
            projectList.style.display = 'none';
            projectListEmpty.style.display = 'none';

            const response = await fetch('/projects');
            if (!response.ok) {
                throw new Error('Projeler yüklenemedi');
            }

            const data = await response.json();
            console.log('📄 Projects response:', data);
            
            // Sunucu { projects: [...] } formatında döndürüyor
            const projects = data.projects || [];
            displayProjects(projects);

        } catch (error) {
            console.error('Load projects error:', error);
            projectList.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Projeler yüklenirken hata oluştu: ${error.message}</p>
                    <button onclick="loadProjects()" class="secondary-btn">Tekrar Dene</button>
                </div>
            `;
            projectList.style.display = 'block';
        } finally {
            projectListLoading.style.display = 'none';
        }
    }

    // Projeleri görüntüle
    function displayProjects(projects) {
        if (projects.length === 0) {
            projectListEmpty.style.display = 'block';
            projectList.style.display = 'none';
            return;
        }

        projectList.innerHTML = projects.map(project => `
            <div class="project-item" data-project-id="${project._id}">
                <div class="project-header">
                    <h3 class="project-name">
                        <i class="fas fa-folder"></i>
                        ${project.name}
                    </h3>
                    <div class="project-actions">
                        <button class="join-btn" onclick="joinProject('${project._id}', '${project.name}')">
                            <i class="fas fa-play"></i>
                            Katıl
                        </button>
                        <button class="delete-btn" onclick="showDeleteModal('${project._id}', '${project.name}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="project-info">
                    <p class="project-desc">${project.description || 'Açıklama bulunmuyor'}</p>
                    <div class="project-meta">
                        <span class="project-date">
                            <i class="fas fa-calendar"></i>
                            ${new Date(project.createdAt).toLocaleDateString('tr-TR')}
                        </span>                        <span class="project-owner">
                            <i class="fas fa-user"></i>
                            ${project.owner.username}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');

        projectList.style.display = 'block';
        projectListEmpty.style.display = 'none';
    }

    // Projeye katıl
    window.joinProject = function(projectId, projectName) {
        // Room ID'yi proje ID'si olarak kullan
        const roomId = projectId;
        
        // localStorage'a room bilgilerini kaydet
        localStorage.setItem('currentRoom', roomId);
        localStorage.setItem('currentProjectId', projectId);
        localStorage.setItem('currentProjectName', projectName);
        
        // Room sayfasına yönlendir
        window.location.href = `/room.html?room=${roomId}`;
    };

    // Silme modalını göster
    window.showDeleteModal = function(projectId, projectName) {
        currentDeleteId = projectId;
        deleteModal.querySelector('.modal-body p').textContent = 
            `"${projectName}" projesini silmek istediğinizden emin misiniz?`;
        deleteModal.style.display = 'block';
    };

    // Modal kapat
    function closeModal() {
        deleteModal.style.display = 'none';
        currentDeleteId = null;
    }    // Proje sil
    async function deleteProject() {
        if (!currentDeleteId) return;

        try {
            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Siliniyor...';

            console.log('🗑️ Deleting project:', currentDeleteId);

            const response = await fetch(`/projects/${currentDeleteId}`, {
                method: 'DELETE'
            });

            console.log('📡 Delete response status:', response.status);

            if (response.ok) {
                const data = await response.json();
                console.log('✅ Delete successful:', data.message);
                showNotification('Proje başarıyla silindi!', 'success');
                await loadProjects();
                closeModal();
            } else {
                let errorMessage = 'Proje silinemedi.';
                try {
                    const data = await response.json();
                    errorMessage = data.message || errorMessage;
                } catch (parseError) {
                    console.error('❌ Error parsing response:', parseError);
                    errorMessage = `Sunucu hatası (${response.status})`;
                }
                alert(errorMessage);
            }
        } catch (error) {
            console.error('❌ Delete project error:', error);
            alert('Ağ hatası: ' + error.message);
        } finally {
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.innerHTML = 'Sil';
        }
    }

    // Bildirim göster
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(notification);
        
        // 3 saniye sonra kaldır
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
});
