/**
 * Profile Page JavaScript
 * Handles profile form interactions and validations
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Profile page JavaScript loaded');
    
    // Auto-hide alerts after 5 seconds
    hideAlertsAfterDelay();
    
    // Password form validation
    setupPasswordValidation();
});

/**
 * Toggle edit mode for profile sections
 * @param {string} section - The section to toggle (personal, skills, password)
 */
function toggleEdit(section) {
    const form = document.getElementById(`${section}-form`);
    const display = document.getElementById(`${section}-display`);
    
    if (!form || !display) {
        console.error(`Section ${section} elements not found`);
        return;
    }
    
    if (form.style.display === 'none' || form.style.display === '') {
        // Show form, hide display
        form.style.display = 'block';
        display.style.display = 'none';
        
        // Focus on first input
        const firstInput = form.querySelector('input');
        if (firstInput) {
            firstInput.focus();
        }
        
        // If password section, clear all password fields
        if (section === 'password') {
            form.querySelectorAll('input[type="password"]').forEach(input => {
                input.value = '';
            });
        }
    } else {
        // Hide form, show display
        form.style.display = 'none';
        display.style.display = 'block';
        
        // Reset form if canceling
        if (section === 'password') {
            form.reset();
        }
    }
}

/**
 * Hide alert messages after a delay
 */
function hideAlertsAfterDelay() {
    const alerts = document.querySelectorAll('.alert');
    
    alerts.forEach(alert => {
        setTimeout(() => {
            alert.style.opacity = '0';
            alert.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                alert.style.display = 'none';
            }, 300);
        }, 5000); // Hide after 5 seconds
    });
}

/**
 * Setup password form validation
 */
function setupPasswordValidation() {
    const passwordForm = document.getElementById('password-form');
    
    if (!passwordForm) return;
    
    const newPasswordInput = document.getElementById('newPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');
    
    // Real-time password confirmation validation
    confirmPasswordInput.addEventListener('input', function() {
        const newPassword = newPasswordInput.value;
        const confirmPassword = this.value;
        
        if (confirmPassword && newPassword !== confirmPassword) {
            this.setCustomValidity('Şifreler eşleşmiyor');
            this.style.borderColor = '#dc3545';
        } else {
            this.setCustomValidity('');
            this.style.borderColor = '#e1e5e9';
        }
    });
    
    // Form submission validation
    passwordForm.addEventListener('submit', function(e) {
        const newPassword = newPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (newPassword !== confirmPassword) {
            e.preventDefault();
            showAlert('Yeni şifreler eşleşmiyor.', 'error');
            return false;
        }
        
        if (newPassword.length < 6) {
            e.preventDefault();
            showAlert('Yeni şifre en az 6 karakter olmalıdır.', 'error');
            return false;
        }
        
        // Show loading state
        const submitBtn = this.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Değiştiriliyor...';
            submitBtn.disabled = true;
        }
    });
}

/**
 * Show alert message
 * @param {string} message - The message to show
 * @param {string} type - The type of alert (success, error)
 */
function showAlert(message, type = 'info') {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());
    
    // Create new alert
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    alert.innerHTML = `
        <i class="fas ${icon}"></i>
        ${message}
    `;
    
    // Insert at the top of profile container
    const profileContainer = document.querySelector('.profile-container');
    const firstSection = profileContainer.querySelector('.profile-header');
    profileContainer.insertBefore(alert, firstSection.nextSibling);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        alert.style.opacity = '0';
        alert.style.transform = 'translateY(-10px)';
        setTimeout(() => {
            alert.remove();
        }, 300);
    }, 5000);
}

/**
 * Handle skills input formatting
 */
function formatSkillsInput() {
    const skillsInput = document.getElementById('skills');
    
    if (!skillsInput) return;
    
    skillsInput.addEventListener('blur', function() {
        // Clean up skills formatting
        const skills = this.value
            .split(',')
            .map(skill => skill.trim())
            .filter(skill => skill.length > 0)
            .join(', ');
        
        this.value = skills;
    });
}

// Initialize skills input formatting
document.addEventListener('DOMContentLoaded', formatSkillsInput);

/**
 * Handle keyboard shortcuts
 */
document.addEventListener('keydown', function(e) {
    // Escape key to cancel editing
    if (e.key === 'Escape') {
        const visibleForms = document.querySelectorAll('.profile-section form[style*="block"]');
        visibleForms.forEach(form => {
            const section = form.id.replace('-form', '');
            toggleEdit(section);
        });
    }
    
    // Ctrl+S to save (prevent default and submit visible form)
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        const visibleForm = document.querySelector('.profile-section form[style*="block"]');
        if (visibleForm) {
            visibleForm.requestSubmit();
        }
    }
});

/**
 * Add loading states to all forms
 */
document.addEventListener('DOMContentLoaded', function() {
    const forms = document.querySelectorAll('.profile-section form');
    
    forms.forEach(form => {
        form.addEventListener('submit', function() {
            const submitBtn = this.querySelector('button[type="submit"]');
            if (submitBtn && !submitBtn.disabled) {
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kaydediliyor...';
                submitBtn.disabled = true;
                
                // Re-enable if form submission fails (backup)
                setTimeout(() => {
                    if (submitBtn.disabled) {
                        submitBtn.innerHTML = originalText;
                        submitBtn.disabled = false;
                    }
                }, 10000); // 10 second timeout
            }
        });
    });
});
