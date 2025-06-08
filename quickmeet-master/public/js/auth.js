// Auth.js - Login ve Register işlemleri

document.addEventListener('DOMContentLoaded', function() {
    // DOM elementleri - Sadece login/register sayfalarında mevcut
    const loginBox = document.getElementById('login-box');
    const registerBox = document.getElementById('register-box');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginError = document.getElementById('login-error');
    const registerError = document.getElementById('register-error');

    // Eğer login/register elementleri yoksa, bu sayfa auth sayfası değil
    if (!loginBox || !registerBox || !showRegister || !showLogin) {
        console.log('🚫 Auth elements not found - not an auth page');
        return;
    }

    console.log('✅ Auth page detected, initializing...');

    // Form geçişleri
    showRegister.onclick = () => {
        loginBox.style.display = 'none';
        registerBox.style.display = 'block';
        clearErrors();
    };

    showLogin.onclick = () => {
        registerBox.style.display = 'none';
        loginBox.style.display = 'block';
        clearErrors();
    };

    // Hata mesajlarını temizle
    function clearErrors() {
        loginError.textContent = '';
        registerError.textContent = '';
    }

    // Eğer kullanıcı zaten giriş yapmışsa dashboard'a yönlendir
    checkAuthStatus();

    // Login form submit
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        await handleLogin();
    };

    // Register form submit
    registerForm.onsubmit = async (e) => {
        e.preventDefault();
        await handleRegister();
    };

    // Giriş kontrolü
    async function checkAuthStatus() {
        try {
            const response = await fetch('/check-auth');
            if (response.ok) {
                window.location.href = '/dashboard.html';
            }
        } catch (error) {
            // Giriş yapılmamış, login sayfasında kal
        }
    }

    // Giriş işlemi
    async function handleLogin() {
        clearErrors();
        const loginBtn = document.getElementById('login-btn');
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (!email || !password) {
            loginError.textContent = 'E-posta ve şifre gereklidir.';
            return;
        }

        try {
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Giriş yapılıyor...';

            console.log('🔄 Login attempt for:', email);

            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            console.log('📡 Response status:', response.status);
            const data = await response.json();
            console.log('📄 Response data:', data);

            if (response.ok) {
                // localStorage güncelle
                localStorage.setItem('userId', data.user._id);
                localStorage.setItem('username', data.user.username);
                localStorage.setItem('userEmail', data.user.email);

                console.log('✅ Login successful, redirecting to dashboard...');
                
                // Dashboard'a yönlendir
                window.location.href = '/dashboard.html';
            } else {
                loginError.textContent = data.message || 'Giriş başarısız.';
            }
        } catch (error) {
            console.error('❌ Login error:', error);
            loginError.textContent = 'Sunucu hatası: ' + error.message;
        } finally {
            loginBtn.disabled = false;
            loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Giriş Yap';
        }
    }

    // Kayıt işlemi
    async function handleRegister() {
        clearErrors();
        const registerBtn = document.getElementById('register-btn');
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;

        if (!username || !email || !password) {
            registerError.textContent = 'Tüm alanları doldurmanız gerekiyor.';
            return;
        }

        if (password.length < 6) {
            registerError.textContent = 'Şifre en az 6 karakter olmalıdır.';
            return;
        }

        try {
            registerBtn.disabled = true;
            registerBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kayıt oluşturuluyor...';

            const response = await fetch('/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Başarılı kayıt
                alert('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
                
                // Login formuna geç ve bilgileri doldur
                showLogin.click();
                document.getElementById('login-email').value = email;
                document.getElementById('login-password').value = password;
                
                // Formu temizle
                registerForm.reset();
            } else {
                registerError.textContent = data.message || 'Kayıt başarısız.';
            }
        } catch (error) {
            console.error('❌ Register error:', error);
            registerError.textContent = 'Sunucu hatası: ' + error.message;
        } finally {
            registerBtn.disabled = false;
            registerBtn.innerHTML = '<i class="fas fa-user-plus"></i> Kayıt Ol';
        }
    }
});
