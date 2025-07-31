// --- ESKİ ODA OLUŞTURMA VE KATILMA KODLARI DEVRE DIŞI BIRAKILDI ---
// const createButton = document.querySelector("#createroom");
// const videoCont = document.querySelector('.video-self');
// const codeCont = document.querySelector('#roomcode');
// const joinBut = document.querySelector('#joinroom');
// const mic = document.querySelector('#mic');
// const cam = document.querySelector('#webcam');
// let micAllowed = 1;
// let camAllowed = 1;
// let mediaConstraints = { video: true, audio: true };
// navigator.mediaDevices.getUserMedia(mediaConstraints)
//     .then(localstream => {
//         videoCont.srcObject = localstream;
//     })
// function uuidv4() {
//     return 'xxyxyxxyx'.replace(/[xy]/g, function (c) {
//         var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
//         return v.toString(16);
//     });
// }
// const createroomtext = 'Creating Room...';
// createButton.addEventListener('click', (e) => {
//     e.preventDefault();
//     createButton.disabled = true;
//     createButton.innerHTML = 'Creating Room';
//     createButton.classList = 'createroom-clicked';
//
//     setInterval(() => {
//         if (createButton.innerHTML < createroomtext) {
//             createButton.innerHTML = createroomtext.substring(0, createButton.innerHTML.length + 1);
//         }
//         else {
//             createButton.innerHTML = createroomtext.substring(0, createButton.innerHTML.length - 3);
//         }
//     }, 500);
//
//     //const name = nameField.value;
//     location.href = `/room.html?room=${uuidv4()}`;
// });
//
// joinBut.addEventListener('click', (e) => {
//     e.preventDefault();
//     if (codeCont.value.trim() == "") {
//         codeCont.classList.add('roomcode-error');
//         return;
//     }
//     const code = codeCont.value;
//     location.href = `/room.html?room=${code}`;
// })
//
// codeCont.addEventListener('change', (e) => {
//     e.preventDefault();
//     if (codeCont.value.trim() !== "") {
//         codeCont.classList.remove('roomcode-error');
//         return;
//     }
// })
//
// cam.addEventListener('click', () => {
//     if (camAllowed) {
//         mediaConstraints = { video: false, audio: micAllowed ? true : false };
//         navigator.mediaDevices.getUserMedia(mediaConstraints)
//             .then(localstream => {
//                 videoCont.srcObject = localstream;
//             })
//
//         cam.classList = "nodevice";
//         cam.innerHTML = `<i class="fas fa-video-slash"></i>`;
//         camAllowed = 0;
//     }
//     else {
//         mediaConstraints = { video: true, audio: micAllowed ? true : false };
//         navigator.mediaDevices.getUserMedia(mediaConstraints)
//             .then(localstream => {
//                 videoCont.srcObject = localstream;
//             })
//
//         cam.classList = "device";
//         cam.innerHTML = `<i class="fas fa-video"></i>`;
//         camAllowed = 1;
//     }
// })
//
// mic.addEventListener('click', () => {
//     if (micAllowed) {
//         mediaConstraints = { video: camAllowed ? true : false, audio: false };
//         navigator.mediaDevices.getUserMedia(mediaConstraints)
//             .then(localstream => {
//                 videoCont.srcObject = localstream;
//             })
//
//         mic.classList = "nodevice";
//         mic.innerHTML = `<i class="fas fa-microphone-slash"></i>`;
//         micAllowed = 0;
//     }
//     else {
//         mediaConstraints = { video: camAllowed ? true : false, audio: true };
//         navigator.mediaDevices.getUserMedia(mediaConstraints)
//             .then(localstream => {
//                 videoCont.srcObject = localstream;
//             })
//
//         mic.innerHTML = `<i class="fas fa-microphone"></i>`;
//         mic.classList = "device";
//         micAllowed = 1;
//     }
// })
// --- FAZ 1 FRONTEND: KULLANICI GİRİŞ/KAYIT VE PROJE YÖNETİMİ ---
const authSection = document.getElementById('auth-section');
const mainSection = document.getElementById('main-section');
const navUser = document.getElementById('nav-user');
const usernameDisplay = document.getElementById('username-display');
const logoutBtn = document.getElementById('logout-btn');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const showRegister = document.getElementById('show-register');
const showLogin = document.getElementById('show-login');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');

// Sayfa yüklendiğinde kullanıcı durumunu kontrol et
checkAuthStatus();

async function checkAuthStatus() {
    try {
        const res = await fetch('/check-auth');
        if (res.ok) {
            const user = await res.json();
            showMainSection(user);
        } else {
            showAuthSection();
        }
    } catch (err) {
        showAuthSection();
    }
}

function showAuthSection() {
    authSection.style.display = 'block';
    mainSection.style.display = 'none';
    navUser.style.display = 'none';
}

function showMainSection(user) {
    authSection.style.display = 'none';
    mainSection.style.display = 'block';
    navUser.style.display = 'flex';
    usernameDisplay.textContent = user.username;
    
    // DOM güncellemesinin tamamlanmasını bekle
    setTimeout(() => {
        loadProjects();
    }, 100);
}

// Logout işlemi
logoutBtn.onclick = async () => {
    try {
        await fetch('/logout', { method: 'POST' });
        showAuthSection();
        clearProjectList();
    } catch (err) {
        console.error('Logout error:', err);
    }
}

function clearProjectList() {
    const listDiv = document.getElementById('project-list');
    if (listDiv) {
        listDiv.innerHTML = '';
    }
}

// Auth switch
showRegister.onclick = () => {
    document.querySelector('.auth-box').style.display = 'none';
    document.getElementById('register-box').style.display = 'block';
}
showLogin.onclick = () => {
    document.querySelector('.auth-box').style.display = 'block';
    document.getElementById('register-box').style.display = 'none';
}

// Kayıt
registerBtn.onclick = async () => {
    registerError.textContent = '';
    const username = document.getElementById('register-username').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    try {
        const res = await fetch('/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
        });
        let data = {};
        try { data = await res.json(); } catch {}
        if (res.ok) {
            alert('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
            showLogin.click();
        } else {
            registerError.textContent = data.message || 'Kayıt başarısız.';
        }
    } catch (err) {
        registerError.textContent = 'Sunucu hatası.';
    }
}

// Giriş
loginBtn.onclick = async () => {
    loginError.textContent = '';
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    
    console.log('🔄 Login attempt for:', email);
    
    try {
        const res = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        console.log('📡 Response status:', res.status);
        const data = await res.json();
        console.log('📄 Response data:', data);
        
        if (res.ok) {
            // localStorage güncelle
            localStorage.setItem('userId', data.user._id);
            localStorage.setItem('username', data.user.username);
            
            showMainSection(data.user);
        } else {
            loginError.textContent = data.message || 'Giriş başarısız.';
        }
    } catch (err) {
        console.error('❌ Login error:', err);
        loginError.textContent = 'Sunucu hatası: ' + err.message;
    }
}

// Proje oluşturma
const createProjectBtn = document.getElementById('create-project');
createProjectBtn.onclick = async () => {
    const nameInput = document.getElementById('project-name');
    const descInput = document.getElementById('project-desc');
    const name = nameInput.value.trim();
    const description = descInput.value.trim();
    
    if (!name) {
        alert('Proje adı gereklidir!');
        return;
    }
    
    try {
        createProjectBtn.disabled = true;
        createProjectBtn.textContent = 'Oluşturuluyor...';
        
        const res = await fetch('/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description })
        });
        
        if (res.ok) {
            // Form alanlarını temizle
            nameInput.value = '';
            descInput.value = '';
            
            // Projeleri yeniden yükle
            await loadProjects();
            alert('Proje başarıyla oluşturuldu!');
        } else {
            const data = await res.json();
            alert(data.message || 'Proje oluşturulamadı!');
        }
    } catch (err) {
        alert('Sunucu hatası oluştu!');
        console.error('Project creation error:', err);
    } finally {
        createProjectBtn.disabled = false;
        createProjectBtn.textContent = 'Proje Oluştur';
    }
}

// Proje listeleme
async function loadProjects() {
    const listDiv = document.getElementById('project-list');
    if (!listDiv) {
        console.error('Project list element not found');
        return;
    }
    
    listDiv.innerHTML = '<div class="loading">Projeler yükleniyor...</div>';
    
    try {
        const res = await fetch('/projects');
        const data = await res.json();
        
        listDiv.innerHTML = ''; // Loading mesajını temizle
        
        if (res.ok && data.projects) {
            if (data.projects.length === 0) {
                listDiv.innerHTML = '<div class="no-projects">Henüz proje bulunmuyor. İlk projenizi oluşturun!</div>';
                return;
            }
            
            data.projects.forEach(p => {
                const el = document.createElement('div');
                el.className = 'project-item';
                el.innerHTML = `
                    <div class="project-info">
                        <h3>${p.name}</h3>
                        <p>${p.description || 'Açıklama yok'}</p>
                        <small>Oluşturulma: ${new Date(p.createdAt).toLocaleDateString('tr-TR')}</small>
                    </div>
                    <button class="join-project-btn" onclick="window.location.href='room.html?project=${p._id}'">
                        Projeye Katıl
                    </button>
                `;
                listDiv.appendChild(el);
            });
        } else {
            listDiv.innerHTML = '<div class="error">Projeler yüklenirken hata oluştu.</div>';
        }
    } catch (err) {        console.error('Load projects error:', err);
        listDiv.innerHTML = '<div class="error">Sunucu hatası. Lütfen sayfayı yenileyin.</div>';
    }
}

// Oturum varsa otomatik giriş
window.onload = () => {
    if (localStorage.getItem('userId') && localStorage.getItem('username')) {
        authSection.style.display = 'none';
        mainSection.style.display = 'block';
        loadProjects();
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Kayıt/Giriş formu geçişi için tüm auth-box'lar arasında geçiş
    const authBoxes = document.querySelectorAll('.auth-box');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');
    if (showRegister) {
        showRegister.onclick = function(e) {
            e.preventDefault();
            authBoxes.forEach(box => box.style.display = 'none');
            document.getElementById('register-box').style.display = 'block';
        };
    }
    if (showLogin) {
        showLogin.onclick = function(e) {
            e.preventDefault();
            authBoxes.forEach(box => box.style.display = 'none');
            document.querySelector('.auth-box').style.display = 'block';
        };
    }
});
