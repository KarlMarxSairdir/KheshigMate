// Dashboard.js - Proje yönetimi

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Dashboard script loaded');
    
    // DOM elementleri - Debugging ile
    var usernameDisplay = document.getElementById('username-display');
    var logoutBtn = document.getElementById('logout-btn');
    var createProjectForm = document.getElementById('create-project-form');
    var projectList = document.getElementById('project-list');
    var projectListLoading = document.getElementById('project-list-loading');
    var projectListEmpty = document.getElementById('project-list-empty');
    var refreshProjectsBtn = document.getElementById('refresh-projects');
    
    // Modal elementleri
    var deleteModal = document.getElementById('delete-modal');
    var confirmDeleteBtn = document.getElementById('confirm-delete');
    var cancelDeleteBtn = document.getElementById('cancel-delete');
    var closeModalBtn = deleteModal ? deleteModal.querySelector('.close') : null;

    var currentDeleteId = null;
    
    // Element kontrolü
    console.log('🔍 Element check:');
    console.log('- logoutBtn:', logoutBtn);
    console.log('- deleteModal:', deleteModal);
    console.log('- confirmDeleteBtn:', confirmDeleteBtn);
    console.log('- projectList:', projectList);

    // Sayfa yüklendiğinde auth kontrolü ve verileri yükle
    init();    function init() {
        checkAuth().then(function() {
            // Server-side render edilen projeler varsa, onları korumak için
            // sadece boş liste durumunda client-side yükleme yap
            var existingProjects = document.querySelectorAll('.modern-project-item');
            if (existingProjects.length === 0) {
                return loadProjects();
            } else {
                // Mevcut projeler varsa sadece event listener'ları ekle
                attachProjectEventListeners();
                console.log('✅ Using server-side rendered projects');
            }
        }).catch(function(error) {
            console.error('Init error:', error);
        });
    }

    // Kimlik doğrulama kontrolü
    function checkAuth() {
        return fetch('/check-auth')
            .then(function(response) {
                if (!response.ok) {
                    // Giriş yapılmamış, ana sayfaya yönlendir
                    window.location.href = '/';
                    return;
                }
                return response.json();
            })
            .then(function(userData) {
                if (userData && usernameDisplay) {
                    var username = userData.user ? userData.user.username : (userData.username || 'Kullanıcı');
                    usernameDisplay.textContent = username;
                }
                
                // localStorage'ı güncelle
                if (userData) {
                    var userId = userData.user ? userData.user._id : userData._id;
                    var username = userData.user ? userData.user.username : userData.username;
                    var userEmail = userData.user ? userData.user.email : userData.email;
                    
                    localStorage.setItem('userId', userId);
                    localStorage.setItem('username', username);
                    localStorage.setItem('userEmail', userEmail);
                }
            })
            .catch(function(error) {
                console.error('Auth check error:', error);
                window.location.href = '/';
            });
    }    // Event listeners
    if (logoutBtn) {
        console.log('✅ Logout button found, attaching event');
        logoutBtn.onclick = function(e) {
            console.log('🔥 Logout button clicked');
            logout();
        };
    } else {
        console.error('❌ Logout button NOT found');
    }
      if (createProjectForm) {
        console.log('✅ Create project form found, attaching event');
        createProjectForm.onsubmit = createProject;
    } else {
        console.error('❌ Create project form NOT found');
    }
    if (refreshProjectsBtn) {
        refreshProjectsBtn.onclick = function() {
            loadProjects();
        };
    }
    
    // Modal event listeners
    if (confirmDeleteBtn) {
        console.log('✅ Confirm delete button found, attaching event');
        confirmDeleteBtn.onclick = function(e) {
            console.log('🔥 Confirm delete button clicked');
            deleteProject();
        };
    } else {
        console.error('❌ Confirm delete button NOT found');
    }
    
    if (cancelDeleteBtn) {
        cancelDeleteBtn.onclick = closeModal;
    }
    if (closeModalBtn) {
        closeModalBtn.onclick = closeModal;
    }
    
    // Modal dışına tıklayınca kapat
    window.onclick = function(event) {
        if (event.target === deleteModal) {
            closeModal();
        }
    };    // Çıkış işlemi
    function logout() {
        console.log('🚪 Logout function called');
        // Sunucudaki /logout (POST) endpoint'ine istek gönder
        fetch('/logout', { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include'
        }).then(function(response) {
            console.log('📡 Logout response:', response.status);
            // Başarılı çıkış veya hata durumunda da temizle ve yönlendir
            localStorage.clear();
            window.location.href = '/';
        }).catch(function(error) {
            console.error('❌ Logout error:', error);
            // Hata olsa da localStorage'ı temizle ve yönlendir
            localStorage.clear();
            window.location.href = '/';
        });
    }    // Proje oluşturma
    function createProject(e) {
        e.preventDefault();
        
        console.log('🚀 Create project function called');
        
        var createBtn = document.getElementById('create-project');
        var nameInput = document.getElementById('project-name');
        var descInput = document.getElementById('project-desc');
        var name = nameInput.value.trim();
        var description = descInput.value.trim();

        console.log('📝 Project data:', { name: name, description: description });

        if (!name) {
            alert('Proje adı gereklidir!');
            nameInput.focus();
            return;
        }

        createBtn.disabled = true;
        createBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Oluşturuluyor...';

        console.log('📡 Sending create project request...');

        fetch('/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, description: description })
        }).then(function(response) {
            console.log('📡 Create project response status:', response.status);
            return response.json().then(function(data) {
                return { response: response, data: data };
            });
        }).then(function(result) {
            console.log('📄 Create project response data:', result.data);
            
            if (result.response.ok) {
                // Form temizle
                createProjectForm.reset();
                
                // Success message
                showNotification('Proje başarıyla oluşturuldu!', 'success');
                
                // Proje listesini yenile
                return loadProjects();
            } else {
                console.error('❌ Create project failed:', result.data.message);
                alert(result.data.message || 'Proje oluşturulamadı.');
            }
        }).catch(function(error) {
            console.error('❌ Create project error:', error);
            alert('Sunucu hatası: ' + error.message);
        }).finally(function() {
            createBtn.disabled = false;
            createBtn.innerHTML = '<i class="fas fa-rocket"></i> Proje Oluştur';
        });
    }

    // Projeleri yükle
    function loadProjects() {
        if (projectListLoading) projectListLoading.style.display = 'block';
        if (projectList) projectList.style.display = 'none';
        if (projectListEmpty) projectListEmpty.style.display = 'none';

        return fetch('/projects')
            .then(function(response) {
                if (!response.ok) {
                    throw new Error('Projeler yüklenemedi');
                }
                return response.json();
            })            .then(function(data) {
                console.log('📄 Projects response:', data);
                console.log('📄 Raw projects array:', data.projects);
                var projects = data.projects || [];
                
                // Her projeyi debug et
                projects.forEach(function(project, index) {
                    console.log(`📋 Project ${index + 1}: "${project.name}"`);
                    console.log(`  - ID: ${project._id}`);
                    console.log(`  - Owner:`, project.owner);
                    console.log(`  - Members:`, project.members);
                    console.log(`  - Created:`, project.createdAt);
                });
                
                displayProjects(projects);
            })
            .catch(function(error) {
                console.error('Load projects error:', error);
                if (projectList) {
                    projectList.innerHTML = 
                        '<div class="error-message">' +
                        '<i class="fas fa-exclamation-triangle"></i>' +
                        '<p>Projeler yüklenirken hata oluştu: ' + error.message + '</p>' +
                        '<button onclick="loadProjects()" class="secondary-btn">Tekrar Dene</button>' +
                        '</div>';
                    projectList.style.display = 'block';
                }
                if (projectListEmpty) projectListEmpty.style.display = 'none';
            })
            .finally(function() {
                if (projectListLoading) projectListLoading.style.display = 'none';
            });
    }    // Projeleri görüntüle
    function displayProjects(projects) {
        if (!projectList || !projectListEmpty) {
            console.error("projectList or projectListEmpty element not found in displayProjects");
            return;
        }

        if (projects.length === 0) {
            projectListEmpty.style.display = 'block';
            projectList.style.display = 'none';
            projectList.innerHTML = '';
            return;
        }

        projectListEmpty.style.display = 'none';
        projectList.style.display = 'block';        // Kullanıcı ID'sini global değişkenden al (server-side'dan gelir)
        var currentUserId = window.CURRENT_USER_ID || localStorage.getItem('userId');
        console.log('🔍 Current user ID:', currentUserId);
        console.log('🔍 Available global vars:', { 
            CURRENT_USER_ID: window.CURRENT_USER_ID, 
            CURRENT_USERNAME: window.CURRENT_USERNAME 
        });

        if (!currentUserId) {
            console.error('❌ Current user ID not found! Cannot determine ownership.');
            return;
        }

        var projectsHTML = '';
        for (var i = 0; i < projects.length; i++) {
            var project = projects[i];
            var createdDate = new Date(project.createdAt).toLocaleDateString('tr-TR');
              // Owner kontrolü yap - detaylı debug
            var isOwner = false;
            if (project.owner && project.owner._id && currentUserId) {
                var ownerIdStr = project.owner._id.toString();
                var currentUserIdStr = currentUserId.toString();
                isOwner = ownerIdStr === currentUserIdStr;
                
                console.log('🔍 Ownership check for project "' + project.name + '":');
                console.log('  - Owner ID (from project):', ownerIdStr);
                console.log('  - Current User ID:', currentUserIdStr);
                console.log('  - Are they equal?', isOwner);
                console.log('  - Project.owner object:', project.owner);
            } else {
                console.log('❌ Missing data for ownership check:', {
                    hasOwner: !!project.owner,
                    hasOwnerId: !!(project.owner && project.owner._id),
                    hasCurrentUserId: !!currentUserId
                });
            }
            
            console.log('📋 Project:', project.name, '- Is owner:', isOwner, '- Owner ID:', project.owner ? project.owner._id : 'null');
            
            // Status badge - owner ise "SAHİBİ", değilse "Aktif"
            var statusBadge = isOwner ? 
                '<span class="status-badge owner" style="background: red !important; color: white !important; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem; font-weight: bold; text-transform: uppercase; display: inline-block;">SAHİBİ</span>' :
                '<span class="status-badge active">Aktif</span>';
            
            // Project actions - owner ise settings button ve delete button, değilse sadece katıl
            var projectActions = '';
            if (isOwner) {
                projectActions = 
                    '<a href="/room/' + project._id + '" class="modern-primary-btn join-btn">' +
                    '    <i class="fas fa-video"></i>' +
                    '    <span>Katıl</span>' +
                    '</a>' +
                    '<a href="/projects/' + project._id + '/settings" class="modern-secondary-btn settings-btn" ' +
                    '   style="background: blue !important; color: white !important; padding: 0.5rem 1rem; border-radius: 8px; text-decoration: none; display: inline-block; margin: 0 0.25rem;" ' +
                    '   title="Proje Ayarları">' +
                    '    <i class="fas fa-cog"></i>' +
                    '    AYARLAR' +
                    '</a>' +
                    '<button class="modern-danger-btn delete-btn delete-project-btn" ' +
                    '        data-project-id="' + project._id + '" ' +
                    '        title="Projeyi Sil">' +
                    '    <i class="fas fa-trash"></i>' +
                    '</button>';
            } else {
                projectActions = 
                    '<a href="/room/' + project._id + '" class="modern-primary-btn join-btn">' +
                    '    <i class="fas fa-video"></i>' +
                    '    <span>Katıl</span>' +
                    '</a>';
            }
            
            projectsHTML += 
                '<div class="modern-project-item" data-project-id="' + project._id + '">' +
                '    <div class="project-header">' +
                '        <div class="project-icon">' +
                '            <i class="fas fa-project-diagram"></i>' +
                '        </div>' +
                '        <div class="project-status">' +
                            statusBadge +
                '        </div>' +
                '    </div>' +
                '    <div class="project-info">' +
                '        <h3>' + project.name + '</h3>' +
                '        <p>' + (project.description || 'Açıklama eklenmemiş') + '</p>' +
                '        <div class="project-meta">' +
                '            <span class="meta-item">' +
                '                <i class="fas fa-calendar"></i>' +
                '                ' + createdDate +
                '            </span>' +
                '            <span class="meta-item">' +
                '                <i class="fas fa-users"></i>' +
                '                ' + (project.members ? project.members.length : 1) + ' Üye' +
                '            </span>' +
                '        </div>' +
                '    </div>' +
                '    <div class="project-actions">' +
                        projectActions +
                '    </div>' +
                '</div>';
        }

        projectList.innerHTML = projectsHTML;        // Silme butonlarına event listener ekle
        var deleteButtons = document.querySelectorAll('.delete-project-btn');
        console.log('🔍 Found', deleteButtons.length, 'delete buttons');
        
        for (var i = 0; i < deleteButtons.length; i++) {
            deleteButtons[i].onclick = function(e) {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔥 Delete button clicked');
                var button = e.target.closest('.delete-project-btn');
                currentDeleteId = button.dataset.projectId;
                console.log('📝 Project ID to delete:', currentDeleteId);
                openModal();
            };
        }
    }    // Silme butonlarına event listener ekle
    function attachProjectEventListeners() {
        console.log('🔗 Attaching event listeners to existing projects');
        
        // Delete butonlarına event listener ekle
        var deleteButtons = document.querySelectorAll('.delete-project-btn');
        deleteButtons.forEach(function(button) {
            button.onclick = function(e) {
                e.preventDefault();
                var projectId = this.getAttribute('data-project-id');
                var projectItem = this.closest('.modern-project-item');
                var projectName = projectItem ? projectItem.querySelector('h3').textContent : 'Bu proje';
                
                currentDeleteId = projectId;
                if (deleteModal) {
                    var modalBody = deleteModal.querySelector('.modal-body p');
                    if (modalBody) {
                        modalBody.textContent = '"' + projectName + '" projesini silmek istediğinizden emin misiniz?';
                    }
                    openModal();
                }
            };
        });
        
        console.log('✅ Event listeners attached to', deleteButtons.length, 'delete buttons');
    }    // Silme modalını aç
    function openModal() {
        console.log('🔓 Opening delete modal');
        if (deleteModal) {
            deleteModal.style.display = 'block';
            console.log('✅ Modal opened');
        } else {
            console.error('❌ Delete modal not found');
        }
    }

    // Modal kapat
    function closeModal() {
        console.log('🔒 Closing delete modal');
        if (deleteModal) {
            deleteModal.style.display = 'none';
        }
        currentDeleteId = null;
    }

    // Proje sil
    function deleteProject() {
        if (!currentDeleteId) return;

        confirmDeleteBtn.disabled = true;
        confirmDeleteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Siliniyor...';

        console.log('🗑️ Deleting project:', currentDeleteId);        fetch('/projects/' + currentDeleteId, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(function(response) {
            console.log('📡 Delete response status:', response.status);
            
            if (response.ok) {
                return response.json().then(function(data) {
                    console.log('✅ Delete successful:', data.message);
                    showNotification('Proje başarıyla silindi!', 'success');
                    return loadProjects().then(function() {
                        closeModal();
                    });
                });
            } else {
                var errorMessage = 'Proje silinemedi.';
                return response.json().then(function(data) {
                    errorMessage = data.message || errorMessage;
                    alert(errorMessage);
                }).catch(function(parseError) {
                    console.error('❌ Error parsing response:', parseError);
                    alert('Sunucu hatası (' + response.status + ')');
                });
            }
        }).catch(function(error) {
            console.error('❌ Delete project error:', error);
            alert('Ağ hatası: ' + error.message);
        }).finally(function() {
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.innerHTML = 'Sil';
        });
    }

    // Bildirim göster
    function showNotification(message, type) {
        type = type || 'info';
        var notification = document.createElement('div');
        notification.className = 'notification ' + type;
        
        var iconClass = type === 'success' ? 'fa-check-circle' : 'fa-info-circle';
        notification.innerHTML = 
            '<i class="fas ' + iconClass + '"></i>' +
            '<span>' + message + '</span>';
        
        document.body.appendChild(notification);
        
        // 3 saniye sonra kaldır
        setTimeout(function() {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    // Global fonksiyonlar (eski kodlarla uyumluluk için)
    window.joinProject = function(projectId, projectName) {
        var roomId = projectId;
        localStorage.setItem('currentRoom', roomId);
        localStorage.setItem('currentProjectId', projectId);
        localStorage.setItem('currentProjectName', projectName);
        window.location.href = '/room/' + roomId;
    };

    window.showDeleteModal = function(projectId, projectName) {
        currentDeleteId = projectId;
        if (deleteModal) {
            var modalBody = deleteModal.querySelector('.modal-body p');
            if (modalBody) {
                modalBody.textContent = '"' + projectName + '" projesini silmek istediğinizden emin misiniz?';
            }
            deleteModal.style.display = 'block';
        }
    };

    // loadProjects fonksiyonunu global yap (refresh butonu için)
    window.loadProjects = loadProjects;
});
