// Project Settings JavaScript

document.addEventListener('DOMContentLoaded', function() {
    const addMemberForm = document.getElementById('add-member-form');
    const memberStatus = document.getElementById('member-status');
    const membersList = document.getElementById('members-list');

    // Get project ID from URL
    const projectId = window.location.pathname.split('/')[2];

    // Add Member Form Submit
    addMemberForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(addMemberForm);
        const username = formData.get('username').trim();

        if (!username) {
            showStatus('Kullanıcı adı boş olamaz', 'error');
            return;
        }

        // Show loading state
        const submitBtn = addMemberForm.querySelector('button[type="submit"]');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Ekleniyor...';
        submitBtn.disabled = true;        try {
            console.log('🔍 Adding member:', username);
            console.log('🔍 Project ID:', projectId);
            
            const response = await fetch(`/projects/${projectId}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username })
            });

            console.log('📡 Response status:', response.status);
            console.log('📡 Response headers:', response.headers);

            const data = await response.json();
            console.log('📦 Response data:', data);

            if (response.ok) {
                showStatus(data.message, 'success');
                addMemberForm.reset();
                
                // Add new member to the UI
                addMemberToUI(data.member);
                
                // Update member count
                updateMemberCount();
                  } else {
                console.error('❌ Server error:', data);
                showStatus(data.message || data.error || 'Üye eklenirken hata oluştu', 'error');
            }

        } catch (error) {
            console.error('❌ Frontend error:', error);
            console.error('❌ Error details:', error.message);
            showStatus('Sunucu bağlantı hatası oluştu', 'error');
        } finally {
            // Reset button state
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    });

    // Remove Member Buttons
    membersList.addEventListener('click', async function(e) {
        if (e.target.closest('.btn-remove-member')) {
            const removeBtn = e.target.closest('.btn-remove-member');
            const userId = removeBtn.dataset.userId;
            const username = removeBtn.dataset.username;

            // Confirm removal
            if (!confirm(`${username} kullanıcısını projeden çıkarmak istediğinizden emin misiniz?`)) {
                return;
            }            // Show loading state
            const originalBtnContent = removeBtn.innerHTML;
            removeBtn.innerHTML = '<span class="btn-content"><i class="fas fa-spinner fa-spin"></i><span>Çıkarılıyor...</span></span><div class="btn-glow"></div>';
            removeBtn.disabled = true;try {
                console.log('🔍 Removing member with ID:', userId);
                console.log('🔍 DELETE URL:', `/projects/${projectId}/members/${userId}`);
                
                const response = await fetch(`/projects/${projectId}/members/${userId}`, {
                    method: 'DELETE'
                });

                console.log('📡 DELETE Response status:', response.status);
                const data = await response.json();
                console.log('📦 DELETE Response data:', data);                if (response.ok) {
                    showStatus(data.message, 'success');
                    
                    // Remove member from UI - Updated for new HTML structure
                    const memberCard = removeBtn.closest('.member-card');
                    if (memberCard) {
                        memberCard.remove();
                    } else {
                        console.warn('Member card not found, trying fallback selector');
                        // Fallback: try to find by data attribute
                        const userId = removeBtn.getAttribute('data-user-id');
                        const memberElement = document.querySelector(`[data-user-id="${userId}"]`);
                        if (memberElement) {
                            memberElement.remove();
                        }
                    }
                    
                    // Update member count
                    updateMemberCount();
                      } else {
                    console.error('❌ DELETE Server error:', data);
                    showStatus(data.message || 'Üye çıkarılırken hata oluştu', 'error');
                    // Reset button state
                    removeBtn.innerHTML = originalBtnContent;
                    removeBtn.disabled = false;
                }            } catch (error) {
                console.error('Remove member error:', error);
                showStatus('Sunucu hatası oluştu', 'error');
                // Reset button state
                removeBtn.innerHTML = originalBtnContent;
                removeBtn.disabled = false;
            }
        }
    });

    // Helper Functions
    function showStatus(message, type) {
        memberStatus.className = `status-message ${type}`;
        memberStatus.innerHTML = `
            <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-triangle'}"></i>
            ${message}
        `;
        memberStatus.style.display = 'block';

        // Auto hide after 5 seconds
        setTimeout(() => {
            memberStatus.style.display = 'none';
        }, 5000);
    }    function addMemberToUI(member) {
        const memberHTML = `
            <div class="member-card" data-user-id="${member.user._id}">
                <div class="member-avatar-section">
                    <div class="member-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                </div>
                <div class="member-info-section">
                    <div class="member-primary">
                        <h4 class="member-name">${member.user.username}</h4>
                        <div class="member-role">
                            <span class="role-badge editor">
                                <i class="fas fa-shield-alt"></i>
                                Elite Savaşçı
                            </span>
                        </div>
                    </div>
                    <div class="member-secondary">
                        <div class="member-email">
                            <i class="fas fa-envelope"></i>
                            ${member.user.email}
                        </div>
                        ${member.user.skills && member.user.skills.length > 0 ? `
                            <div class="member-skills">
                                ${member.user.skills.map(skill => `
                                    <span class="skill-tag">
                                        <i class="fas fa-star"></i>
                                        ${skill}
                                    </span>
                                `).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="member-actions-section">
                    <button 
                        class="premium-btn danger btn-remove-member" 
                        data-user-id="${member.user._id}"
                        data-username="${member.user.username}"
                    >
                        <span class="btn-content">
                            <i class="fas fa-user-times"></i>
                            <span>Ordudan Çıkar</span>
                        </span>
                        <div class="btn-glow"></div>
                    </button>
                </div>
            </div>
        `;

        membersList.insertAdjacentHTML('beforeend', memberHTML);
    }

    function updateMemberCount() {
        const memberCount = document.querySelector('.member-count');
        const currentCount = membersList.children.length;
        memberCount.textContent = `${currentCount} üye`;
    }

    // Auto-focus on username input
    document.getElementById('member-username').focus();
});
