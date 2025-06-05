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
        submitBtn.disabled = true;

        try {
            const response = await fetch(`/projects/${projectId}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username })
            });

            const data = await response.json();

            if (response.ok) {
                showStatus(data.message, 'success');
                addMemberForm.reset();
                
                // Add new member to the UI
                addMemberToUI(data.member);
                
                // Update member count
                updateMemberCount();
                
            } else {
                showStatus(data.message || 'Üye eklenirken hata oluştu', 'error');
            }

        } catch (error) {
            console.error('Add member error:', error);
            showStatus('Sunucu hatası oluştu', 'error');
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
            }

            // Show loading state
            removeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Çıkarılıyor...';
            removeBtn.disabled = true;

            try {
                const response = await fetch(`/projects/${projectId}/members/${userId}`, {
                    method: 'DELETE'
                });

                const data = await response.json();

                if (response.ok) {
                    showStatus(data.message, 'success');
                    
                    // Remove member from UI
                    const memberItem = removeBtn.closest('.member-item');
                    memberItem.remove();
                    
                    // Update member count
                    updateMemberCount();
                    
                } else {
                    showStatus(data.message || 'Üye çıkarılırken hata oluştu', 'error');
                    // Reset button state
                    removeBtn.innerHTML = '<i class="fas fa-trash"></i> Çıkar';
                    removeBtn.disabled = false;
                }

            } catch (error) {
                console.error('Remove member error:', error);
                showStatus('Sunucu hatası oluştu', 'error');
                // Reset button state
                removeBtn.innerHTML = '<i class="fas fa-trash"></i> Çıkar';
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
    }

    function addMemberToUI(member) {
        const memberHTML = `
            <div class="member-item" data-user-id="${member.user._id}">
                <div class="member-info">
                    <div class="member-avatar">
                        <i class="fas fa-user-circle"></i>
                    </div>
                    <div class="member-details">
                        <div class="member-name">
                            ${member.user.username}
                            <span class="role-badge editor">
                                <i class="fas fa-edit"></i>
                                Editör
                            </span>
                        </div>
                        <div class="member-email">${member.user.email}</div>
                        ${member.user.skills && member.user.skills.length > 0 ? `
                            <div class="member-skills">
                                ${member.user.skills.map(skill => `<span class="skill-tag">${skill}</span>`).join('')}
                            </div>
                        ` : ''}
                    </div>
                </div>
                <div class="member-actions">
                    <button 
                        class="btn-remove-member" 
                        data-user-id="${member.user._id}"
                        data-username="${member.user.username}"
                    >
                        <i class="fas fa-trash"></i>
                        Çıkar
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
