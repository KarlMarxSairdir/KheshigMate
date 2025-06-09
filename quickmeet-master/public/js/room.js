// Initialize Socket.IO client connection
const socket = io({
    secure: true, // Ensures connection is wss when on https
    withCredentials: true // Add this for session/cookie handling
});

// Global değişkenler room.ejs\'den geliyor: ROOM_ID, USER_USERNAME, USER_ID
const roomId = ROOM_ID; // Alias for clarity, using global ROOM_ID
const userName = USER_USERNAME; // Alias for clarity, using global USER_USERNAME
const userId = USER_ID; // Alias for clarity, using global USER_ID

// DOM elementleri - DOMContentLoaded içinde tanımlanacak
let myvideo, chatRoom, sendButton, messageField, videoContainer;
let videoButt, audioButt, cutCall, screenShareButt, whiteboardButt;
let userMap = {}; // Kullanıcı ID'lerini ve adlarını eşleştirmek için

// Kullanıcı bilgileri doğrudan EJS'den gelen global değişkenlerden alınır.
// ROOM_ID, USER_USERNAME, USER_ID zaten global olarak tanımlı.

console.log('Oda ID:', ROOM_ID);
console.log('Kullanıcı Adı:', USER_USERNAME);
console.log('Kullanıcı ID:', USER_ID);

// PeerJS değişkenleri
let peer;
let peerId; // To store our own peer ID when connection is open
let localStream;
let peerReady = false;
let socketReady = false;
let localMediaStarted = false; // Flag to track if local media has been started

// Sunucudan gelen odadaki mevcut kullanıcıların listesi
socket.on('project-users-list', (usersInRoom) => {
    console.log('Odadaki kullanıcılar:', usersInRoom);
    // Kullanıcı listesini güncelle
    userMap = {}; // Mevcut kullanıcı haritasını temizle
    usersInRoom.forEach(user => {
        if (user.id && user.name) {
            userMap[user.id] = user.name;
        }
    });
    // Katılımcılar sekmesini yükle
    if (document.getElementById('attendees-tab')?.classList.contains('active')) {
        loadAttendees();
    }
});

// --- TAB SİSTEMİ ve NOT YÖNETİMİ ---
// DOM elementleri - DOMContentLoaded içinde tanımlanacak
let tabs, tabContents;
let currentEditingNoteId = null;
let addNoteBtn, noteEditor, saveNoteBtn, cancelNoteBtn, noteContent, notesList;
let currentProjectData = null; // Proje ve kullanıcı bilgilerini saklar

// BPMN Manager entegrasyonu
let bpmnInitialized = false;

async function loadNotes() {
    if (!ROOM_ID) return;
    try {
        const response = await fetch(`/projects/${ROOM_ID}/notes`, { credentials: 'include' });
        const data = await response.json();
        if (response.ok) {
            currentProjectData = data; // Proje bilgilerini kaydet
            renderNotes(data.notes);
        } else {
            console.error('Notlar yüklenemedi:', data.message);
        }
    } catch (err) {
        console.error('Not yükleme hatası:', err);
    }
}

function renderNotes(notes) {
    if (!notesList) return;
    notesList.innerHTML = '';
    if (!notes || notes.length === 0) {
        notesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-sticky-note"></i>
                <h3>Henüz Not Yok</h3>
                <p>İlk notunuzu eklemek için "Yeni Not Ekle" butonuna tıklayın.</p>
            </div>
        `;
        return;
    }
    notes.forEach(note => {
        const noteEl = document.createElement('div');
        noteEl.className = 'note-item';
        
        // Yetki kontrolü
        const canEdit = currentProjectData && (currentProjectData.currentUser.isOwner || currentProjectData.currentUser.isMember);
        const canDelete = currentProjectData && (currentProjectData.currentUser.isOwner || note.user._id === currentProjectData.currentUser._id);
        
        noteEl.innerHTML = `
            <div class="note-header">
                <div class="note-author">
                    <i class="fas fa-user"></i>
                    <span>${note.user.username}</span>
                </div>
                <div class="note-date">${new Date(note.createdAt).toLocaleDateString()}</div>
                <div class="note-actions">
                    ${canEdit ? `<button class="note-action-btn edit-note-btn" onclick="editNote('${note._id}', \`${escapeAttributeForJS(note.content)}\`)" title="Düzenle">
                        <i class="fas fa-edit"></i>
                    </button>` : ''}
                    ${canDelete ? `<button class="note-action-btn delete-note-btn" onclick="deleteNote('${note._id}')" title="Sil">
                        <i class="fas fa-trash"></i>
                    </button>` : ''}
                </div>
            </div>
            <div class="note-content">${escapeHTML(note.content)}</div>
        `;
        notesList.appendChild(noteEl);
    });
}

function escapeHTML(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, function (s) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[s];
    });
}

// JavaScript dizesi içinde kullanılacak öznitelik değerlerini kaçırmak için yeni fonksiyon
function escapeAttributeForJS(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/\\/g, '\\\\') // Önce ters eğik çizgileri kaçır
              .replace(/`/g, '\\`')   // Backtick'leri kaçır
              .replace(/'/g, '\\\'')  // Tek tırnakları kaçır
              .replace(/"/g, '\\"');  // Çift tırnakları kaçır
}


async function createNote(content) {
    const response = await fetch(`/projects/${ROOM_ID}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        credentials: 'include'
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Not oluşturulamadı');
    }
}

async function updateNote(noteId, content) {
    const response = await fetch(`/projects/${ROOM_ID}/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
        credentials: 'include'
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Not güncellenemedi');
    }
}

async function deleteNote(noteId) {
    if (!confirm('Bu notu silmek istediğinizden emin misiniz?')) return;
    try {
        const response = await fetch(`/projects/${ROOM_ID}/notes/${noteId}`, { 
            method: 'DELETE',
            credentials: 'include' 
        });
        if (response.ok) {
            loadNotes();
        } else {
            const error = await response.json();
            alert('Not silme hatası: ' + (error.message || 'Bilinmeyen hata'));
        }
    } catch (err) {
        alert('Not silme hatası: ' + err.message);
    }
}

function editNote(noteId, content) {
    currentEditingNoteId = noteId;
    noteContent.value = content; 
    noteEditor.style.display = 'flex';
}

function loadAttendees() {
    const attendeesList = document.getElementById('attendees-list');
    if (!attendeesList) return;
    attendeesList.innerHTML = ''; 

    // Kendimizi ekle
    const myAttendee = document.createElement('div');
    myAttendee.className = 'attendee-item';
    myAttendee.innerHTML = `
        <div class="attendee-avatar">${USER_USERNAME.charAt(0).toUpperCase()}</div>
        <div class="attendee-info">
            <div class="attendee-name">${escapeHTML(USER_USERNAME)} (Siz)</div>
            <div class="attendee-status">Çevrimiçi</div>
        </div>
    `;
    attendeesList.appendChild(myAttendee);    let otherAttendeesFound = false;
    for (const peerId in userMap) {
        if (Object.prototype.hasOwnProperty.call(userMap, peerId) && peerId !== USER_ID) {
            otherAttendeesFound = true;
            const username = userMap[peerId];
            const attendeeEl = document.createElement('div');
            attendeeEl.className = 'attendee-item';
            attendeeEl.id = `attendee-${peerId}`;
            attendeeEl.innerHTML = `
                <div class="attendee-avatar">${username.charAt(0).toUpperCase()}</div>
                <div class="attendee-info">
                    <div class="attendee-name">${escapeHTML(username)}</div>
                    <div class="attendee-status">Çevrimiçi</div>
                </div>
            `;
            attendeesList.appendChild(attendeeEl);
        }
    }

    if (!otherAttendeesFound) {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <i class="fas fa-users"></i>
            <h3>Henüz Kimse Katılmadı</h3>
            <p>Diğer kullanıcıların katılmasını bekleyin.</p>
        `;
        attendeesList.appendChild(emptyState);
    }
    if (!otherAttendeesFound && Object.keys(userMap).length === 0) { // userMap boşsa ve başkası yoksa
        const noOthers = document.createElement('p');
        noOthers.className = 'empty-list-message';
        noOthers.textContent = 'Odada başka katılımcı yok.';
        attendeesList.appendChild(noOthers);
    }
}

//whiteboard js start
// Canvas elementleri - DOMContentLoaded içinde tanımlanacak
let whiteboardSection, canvas, ctx;

let boardVisible = false;
let isDrawing = 0;
let x = 0;
let y = 0;
let color = "black";
let drawsize = 3;
// colorRemote ve drawsizeRemote global değişkenleri kaldırıldı, data objesinden alınacak.

function fitToContainer(canvasElement) { // Parametre adı düzeltildi
    canvasElement.style.width = '100%';
    canvasElement.style.height = '100%';
    canvasElement.width = canvasElement.offsetWidth;
    canvasElement.height = canvasElement.offsetHeight;
}

function setColor(newcolor) {
    color = newcolor;
    drawsize = 3;
    console.log('Canvas renk değiştirildi:', newcolor);
}

function setEraser() {
    color = "white"; 
    drawsize = 10;
    console.log('Silgi modu aktif edildi');
}

function clearBoard() {
    if (window.confirm('Tahtayı temizlemek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
        if (ctx && canvas) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            socket.emit('store canvas', canvas.toDataURL()); 
            socket.emit('clearBoard'); 
            console.log('Canvas temizlendi');
        }
    }
}

// Global fonksiyonları window objesine ekle (HTML onclick eventleri için)
window.setColor = setColor;
window.setEraser = setEraser;
window.clearBoard = clearBoard;

function draw(newx, newy, oldx, oldy) {
    if (!ctx) return; // Safety check
    ctx.strokeStyle = color;
    ctx.lineWidth = drawsize;
    ctx.beginPath();
    ctx.moveTo(oldx, oldy);
    ctx.lineTo(newx, newy);
    ctx.stroke();
    ctx.closePath();
}

function drawRemote(newx, newy, oldx, oldy, remoteColor, remoteSize) {
    if (!ctx) return; // Safety check
    ctx.strokeStyle = remoteColor;
    ctx.lineWidth = remoteSize;
    ctx.beginPath();
    ctx.moveTo(oldx, oldy);
    ctx.lineTo(newx, newy);
    ctx.stroke();
    ctx.closePath();
}
//whiteboard js end

// PeerJS başlatma fonksiyonu
function initializePeer() {
    if (peer) {
        console.log('PeerJS already initialized or initialization in progress.');
        return;
    }
    console.log(`Peer başlatılıyor, kullanıcı: ${userId}`);
    try {
        peer = new Peer(userId, {
            host: window.location.hostname,
            port: window.location.port || (window.location.protocol === 'https:' ? 443 : 80),
            path: '/peerjs',
            secure: window.location.protocol === 'https:',
            debug: 3,
            config: {'iceServers': [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]}
        });

        console.log(`PeerJS sunucusuna bağlanılıyor: host=${peer.options.host}, port=${peer.options.port}, path=${peer.options.path}, secure=${peer.options.secure}`);

        peer.on('open', (id) => {
            console.log('PeerJS bağlantısı açıldı. ID: ' + id);
            peerId = id; 
            peerReady = true;
            if (socketReady) {
                console.log('PeerJS ready, socket already connected. Attempting to join project and start media.');
                attemptStartLocalMediaAndJoin();
            } else {
                console.log('PeerJS ready, waiting for Socket.IO to connect.');
            }
        });

        peer.on('call', (call) => {
            const remoteUserId = call.peer;
            const remoteUsername = userMap[remoteUserId] || `Kullanıcı ${remoteUserId.substring(0,6)}`;
            console.log(`Gelen arama: ${remoteUsername} (${remoteUserId})`);            
            if (localStream) {
                call.answer(localStream);
                setupCallEvents(call, remoteUsername, remoteUserId); // remoteUserId eklendi
            } else {
                navigator.mediaDevices.getUserMedia({ video: true, audio: true })
                    .then((stream) => {
                        localStream = stream;
                        myvideo.srcObject = stream;
                        myvideo.muted = true; // Kendi videomuzu sessize al
                        call.answer(localStream);
                        setupCallEvents(call, remoteUsername, remoteUserId); // remoteUserId eklendi
                    })
                    .catch((err) => {
                        console.error('Aramayı cevaplamak için local stream alınamadı:', err);
                        alert('Kamera/mikrofon erişimi reddedildi.');
                    });
            }
        });

        peer.on('error', (err) => {
            console.error('PeerJS Hatası:', err);
            if (err.type === 'unavailable-id') {
                alert('Bu kullanıcı IDsi zaten kullanımda. Lütfen sayfayı yenileyin veya farklı bir ID ile giriş yapmayı deneyin.');
            } else if (err.type === 'peer-unavailable') {
                console.warn('Aranan peer bulunamadı:', err.message);
                // İlgili kullanıcı için video elementini kaldırabiliriz
                const unavailablePeerId = err.message.match(/Could not connect to peer (.*)/);
                if (unavailablePeerId && unavailablePeerId[1]) {
                    removeRemoteVideo(unavailablePeerId[1]);
                }
            } else if (err.type === 'network') {
                console.error('PeerJS ağ hatası. Bağlantı kopmuş olabilir.', err);
            } else if (err.type === 'webrtc') {
                console.error('PeerJS WebRTC hatası:', err);
            } else {
                console.error('Bilinmeyen PeerJS hatası:', err.type, err);
            }
        });

        peer.on('disconnected', () => {
            console.warn('PeerJS sunucusundan bağlantı kesildi. Yeniden bağlanmaya çalışılıyor...');
            // PeerJS otomatik yeniden bağlanmayı dener. Gerekirse manuel:
            // setTimeout(() => { if (peer && !peer.destroyed && !peer.open) peer.reconnect(); }, 3000);
        });

        peer.on('close', () => {
            console.log('PeerJS bağlantısı tamamen kapandı.');
        });

    } catch (error) {
        console.error("PeerJS başlatılırken kritik hata oluştu:", error);
        alert('Video konferans altyapısı başlatılamadı. Lütfen sayfayı yenileyin.');
    }
}

// attemptStartLocalMedia fonksiyonu kaldırılacak veya yorum satırı yapılacak.
// function attemptStartLocalMedia() {
// if (peerReady && socketReady && !localStream) { 
// console.log("CLIENT: PeerJS ve Socket.IO hazır, local media başlatılıyor.");
// startLocalMedia();
// }
// }

async function attemptStartLocalMediaAndJoin() {
    if (!socketReady || !peerReady) {
        console.log('CLIENT: Socket veya PeerJS henüz hazır değil, medya başlatma veya katılma denemesi yapılamaz.');
        return;
    }

    console.log(`CLIENT: Yerel medya başlatma ve katılma denemesi. localMediaStarted: ${localMediaStarted}, socketReady: ${socketReady}, peerReady: ${peerReady}`);

    try {
        console.log('CLIENT: startLocalMedia() çağrılıyor...');
        await startLocalMedia(); // Bu fonksiyon, localStream zaten varsa durumu yönetir.
        localMediaStarted = true; // startLocalMedia başarılı olduktan sonra true olarak ayarla
        console.log('CLIENT: Yerel medya başarıyla başlatıldı/onaylandı. "join project" yayınlanıyor.');
        socket.emit('join project', roomId, userName, userId);
    } catch (error) {
        console.error('CLIENT: attemptStartLocalMediaAndJoin içinde yerel medya başlatılamadı:', error);
        // startLocalMedia'nın catch bloğu zaten UI güncellemelerini (örn. video/ses düğmelerini devre dışı bırakma) yönetir.
    }
}


async function startLocalMedia() {
    if (localStream) { 
        console.log("Local media zaten aktif.");
        await callExistingPeers(); // Ensure this is awaited if it becomes async
        return Promise.resolve(); // Return a resolved promise
    }
    console.log('Yerel medya (kamera/mikrofon) başlatılıyor...');
    return navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then(async stream => { // Added async here
            localStream = stream;
            myvideo.srcObject = stream;
            myvideo.muted = true;
            console.log('Yerel medya başarıyla başlatıldı.');
            await callExistingPeers(); // Ensure this is awaited
        })
        .catch(err => {
            console.error("Yerel medya alınamadı:", err);
            alert("Kamera veya mikrofonunuza erişilemedi. Lütfen tarayıcı izinlerini kontrol edin ve sayfayı yenileyin.");
            if(videoButt) videoButt.disabled = true;
            if(audioButt) audioButt.disabled = true;
            return Promise.reject(err); // Propagate the error
        });
}

function callExistingPeers() {
    if (!peer || !peer.open || !localStream) {
        console.log("Mevcut peerler aranamıyor: PeerJS hazır değil veya local stream yok.");
        return;
    }
    console.log("Mevcut peerler aranıyor (userMap):", userMap);
    for (const peerIdToCall in userMap) {        if (Object.prototype.hasOwnProperty.call(userMap, peerIdToCall) && peerIdToCall !== USER_ID) {
            // Zaten bir bağlantı var mı kontrol et (isteğe bağlı, peer.connections üzerinden)
            if (!peer.connections[peerIdToCall] || peer.connections[peerIdToCall].length === 0) {
                 callPeer(peerIdToCall, userMap[peerIdToCall]);
            } else {
                console.log(`${userMap[peerIdToCall]} ile zaten bağlantı var veya kuruluyor.`);
            }
        }
    }
}


function callPeer(peerIdToCall, usernameToCall) {
    if (!localStream) {
        console.warn(`Local stream yok, ${usernameToCall} aranamıyor.`);
        // Belki local stream'i başlatmayı dene? Veya kullanıcıya bildir.
        // startLocalMedia(); // Bu döngüye sokabilir, dikkatli ol.
        return;
    }
    if (peer && peer.open && peerIdToCall !== USER_ID) {
        console.log(`${usernameToCall} (${peerIdToCall}) aranıyor...`);
        const call = peer.call(peerIdToCall, localStream);
        if (call) {
            setupCallEvents(call, usernameToCall, peerIdToCall); // remoteUserId eklendi
        } else {
            console.error(`${usernameToCall} aranamadı (call objesi null). Peer durumu:`, peer);
        }
    } else {
        console.warn(`Peer ${usernameToCall} (${peerIdToCall}) aranamıyor. Peer açık değil veya kendi ID'miz.`);
    }
}


function setupCallEvents(call, remoteUsername, remoteUserId) { // remoteUserId eklendi
    console.log(`Arama (${remoteUsername} - ${remoteUserId}) için eventler ayarlanıyor.`);
    call.on('stream', (remoteStream) => {
        console.log(`Uzak stream (${remoteUsername} - ${remoteUserId}) alındı.`);
        addRemoteVideo(remoteStream, remoteUserId, remoteUsername); // remoteUserId kullanıldı
    });
    call.on('close', () => {
        console.log(`Arama (${remoteUsername} - ${remoteUserId}) kapandı.`);
        removeRemoteVideo(remoteUserId); // remoteUserId kullanıldı
    });
    call.on('error', (err) => {
        console.error(`Arama (${remoteUsername} - ${remoteUserId}) hatası:`, err);
        removeRemoteVideo(remoteUserId); // remoteUserId kullanıldı
    });
}

function addRemoteVideo(stream, peerId, peerUsername) {
    if (document.getElementById(`peer-${peerId}`)) {
        console.log(`${peerUsername} (${peerId}) için video zaten mevcut.`);
        // Varolan videonun stream'ini güncellemek gerekebilir, eğer değiştiyse.
        // const existingVideo = document.querySelector(`#peer-${peerId} video`);
        // if (existingVideo && existingVideo.srcObject !== stream) existingVideo.srcObject = stream;
        return;
    }
    
    const vidCont = document.createElement('div');
    const video = document.createElement('video');
    const nameTag = document.createElement('div');
    
    vidCont.id = `peer-${peerId}`;
    vidCont.className = "video-box remote-video-box";
    
    video.srcObject = stream;
    video.autoplay = true;
    video.playsInline = true; // iOS için önemli
    video.className = "video-frame";
    video.addEventListener('loadedmetadata', () => { // Video oynatılmaya hazır olduğunda
        video.play().catch(e => console.error("Uzak video oynatma hatası:", e));
    });
    
    nameTag.className = "nametag";
    nameTag.innerHTML = escapeHTML(peerUsername) || `Kullanıcı ${peerId.substring(0, 6)}`; 
    
    vidCont.appendChild(video);
    vidCont.appendChild(nameTag);
    videoContainer.appendChild(vidCont);
    console.log(`${peerUsername} (${peerId}) için video eklendi.`);
}

function removeRemoteVideo(peerId) {
    const videoElement = document.getElementById(`peer-${peerId}`);
    if (videoElement) {
        const videoFrame = videoElement.querySelector('video');
        if (videoFrame && videoFrame.srcObject) {
            videoFrame.srcObject.getTracks().forEach(track => track.stop()); // Stream'i durdur
        }
        videoElement.remove();
        console.log(`Kullanıcı ${peerId} için video kaldırıldı.`);
    }
}

socket.on('connect', () => {
    socketReady = true;
    console.log(`CLIENT: Socket.IO sunucusuna başarıyla bağlanıldı. Socket ID: ${socket.id}`);
    if (peerReady) { 
        console.log('CLIENT: Socket connected, PeerJS already ready. Attempting to join project and start media.');
        attemptStartLocalMediaAndJoin();
    } else {
        console.log('CLIENT: Socket connected, waiting for PeerJS to be ready.');
    }
});

// Handle reconnection attempts and successful reconnections
socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`CLIENT: Socket reconnect attempt ${attemptNumber}`);
});

socket.on('reconnect_error', (error) => {
    console.error('CLIENT: Socket reconnect error:', error);
});

socket.on('reconnect_failed', () => {
    console.error('CLIENT: Socket reconnect failed after multiple attempts.');
});

socket.on('reconnect', (attemptNumber) => {
    // The 'connect' event will also fire on successful reconnection.
    // Re-joining the project is handled by the 'connect' event listener.
    console.log(`CLIENT: Socket yeniden bağlandı (${socket.id}), attempt: ${attemptNumber}. (Join project handled by 'connect' event)`);
});

socket.on('user-joined', (data) => { // data should be { id, name, socketId }
    const newUserId = data.id;
    const newUsername = data.name;
    console.log(`Yeni kullanıcı odaya katıldı: ${newUsername} (ID: ${newUserId}, Socket: ${data.socketId})`);
    if (newUserId !== userId) { // Use aliased userId
        if (!userMap[newUserId]) {
            userMap[newUserId] = newUsername; 
            console.log(`User map güncellendi (yeni katılan): ${newUsername}`, userMap);
            if (document.getElementById('attendees-tab')?.classList.contains('active')) {
                loadAttendees(); 
            }
        }
        if (localStream && peer && peer.open) {
            callPeer(newUserId, newUsername);
        } else {
            console.log(`Local stream veya peer hazır değil, ${newUsername} aranamıyor (user-joined).`);
        }
    }
});

socket.on('user-left', (data) => { // data should be { id, name, socketId }
    const leftUserId = data.id;
    const leftUsername = userMap[leftUserId] || data.name || leftUserId;
    console.log(`Kullanıcı ${leftUsername} (${leftUserId}, Socket: ${data.socketId}) odadan ayrıldı.`);
    removeRemoteVideo(leftUserId);
    if (userMap[leftUserId]) {
        delete userMap[leftUserId];
        console.log(`User map güncellendi (ayrılan ${leftUsername}):`, userMap);
        const attendeeElement = document.getElementById(`attendee-${leftUserId}`);
        if (attendeeElement) {
            attendeeElement.remove();
        } else if (document.getElementById('attendees-tab')?.classList.contains('active')) {
            loadAttendees(); 
        }
        // Eğer katılımcı kalmadıysa mesaj göster
        if (Object.keys(userMap).length === 0 && document.getElementById('attendees-tab')?.classList.contains('active')) {
            loadAttendees(); // Bu, "başka katılımcı yok" mesajını gösterecektir.
        }
    }
});

socket.on('project message', (data) => {
    // data = { user: { _id, username }, message, createdAt }
    appendMessage(data.user.username, data.message, data.createdAt, data.user._id === USER_ID);
});

if (sendButton) {
    sendButton.addEventListener('click', () => {
        const msg = messageField.value;
        if (msg.trim() === '') return;
        // USER_ID sunucu tarafında socket'ten alınacak, USER_USERNAME de oradan alınabilir.
        socket.emit('project message', ROOM_ID, msg); 
        messageField.value = '';
    });
}

if (messageField) {
    messageField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { 
            e.preventDefault(); 
            sendButton.click();
        }
    });
}

function appendMessage(sender, message, timestamp, isMe) {
    if (!chatRoom) return;
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('chat-message');
    if (isMe) {
        msgDiv.classList.add('my-message');
    }
    
    const senderSpan = document.createElement('span');
    senderSpan.className = 'sender';
    senderSpan.textContent = isMe ? 'Siz' : escapeHTML(sender);
    
    const timeSpan = document.createElement('span');
    timeSpan.className = 'timestamp';
    timeSpan.textContent = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const contentP = document.createElement('p');
    // Mesaj içeriği sunucudan güvenli geliyorsa (sanitize edilmişse) doğrudan atanabilir.
    // Emin değilseniz: contentP.textContent = escapeHTML(message);
    contentP.textContent = message; 
    
    msgDiv.appendChild(senderSpan);
    msgDiv.appendChild(timeSpan);
    msgDiv.appendChild(contentP);
    chatRoom.appendChild(msgDiv);
    chatRoom.scrollTop = chatRoom.scrollHeight;
}

let isAudioOn = true;
let isVideoOn = true;

if (audioButt) {
    audioButt.addEventListener('click', () => {
        isAudioOn = !isAudioOn;
        audioButt.innerHTML = isAudioOn ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
        if (localStream) {
            localStream.getAudioTracks().forEach(track => track.enabled = isAudioOn);
        }
    });
}

if (videoButt) {
    videoButt.addEventListener('click', () => {
        isVideoOn = !isVideoOn;
        videoButt.innerHTML = isVideoOn ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>';
        if (localStream) {
            localStream.getVideoTracks().forEach(track => track.enabled = isVideoOn);
        }
        const myVideoOffElement = document.getElementById('myvideooff');
        if (myVideoOffElement) {
            myVideoOffElement.style.display = isVideoOn ? 'none' : 'block';
        }
    });
}

if (cutCall) {
    cutCall.addEventListener('click', () => {
        if (peer) {
            peer.destroy(); // Tüm bağlantıları kapatır ve PeerServer'dan kaydı siler
        }
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        // socket.emit('leave project', ROOM_ID, USER_ID); // Sunucuya ayrılma bilgisi (isteğe bağlı, socket disconnect de yeterli olabilir)
        window.location.href = '/dashboard';
    });
}

let screenStream = null;
let isScreenSharing = false;
let originalVideoTrack = null; // Orijinal kamera track'ini saklamak için

if (screenShareButt) {
    screenShareButt.addEventListener('click', async () => {
        if (isScreenSharing) {
            await stopScreenSharing();
        } else {
            await startScreenSharing();
        }
    });
}

async function startScreenSharing() {
    if (!localStream || !peer || !peer.open) {
        alert("Ekran paylaşımı için önce kamera ve mikrofon bağlantısının kurulması gerekmektedir.");
        return;
    }
    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" }, audio: false });
        
        const screenVideoTrack = screenStream.getVideoTracks()[0];
        
        // Orijinal kamera track'ini sakla (eğer varsa)
        if (localStream.getVideoTracks().length > 0) {
            originalVideoTrack = localStream.getVideoTracks()[0].clone(); // Klonla ki orijinali etkilenmesin
        } else {
            originalVideoTrack = null; // Kamera kapalıysa veya yoksa
        }        // Mevcut video track'lerini değiştir (tüm peer bağlantıları için)
        for (const peerId in peer.connections) {
            if (Object.prototype.hasOwnProperty.call(peer.connections, peerId)) {
                peer.connections[peerId].forEach(connection => {
                    const sender = connection.peerConnection?.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(screenVideoTrack).catch(e => console.error("Ekran paylaşımı için replaceTrack hatası:", e));
                    }
                });
            }
        }
        
        // Kendi lokal video track'ini de güncelle (eğer kamera açıksa)
        if (localStream.getVideoTracks().length > 0) {
            localStream.removeTrack(localStream.getVideoTracks()[0]); // Eski kamera track'ini kaldır
        }
        localStream.addTrack(screenVideoTrack); // Ekran track'ini ekle
        
        // Kendi video elementini güncelle (sadece ekran görüntüsü, ses devam eder)
        const tempStream = new MediaStream();
        tempStream.addTrack(screenVideoTrack);
        if (localStream.getAudioTracks().length > 0) { // Ses varsa ekle
            tempStream.addTrack(localStream.getAudioTracks()[0]);
        }
        myvideo.srcObject = tempStream;


        isScreenSharing = true;
        screenShareButt.classList.add('sharing');
        screenShareButt.innerHTML = '<i class="fas fa-stop-circle"></i> Paylaşımı Durdur';

        screenVideoTrack.onended = () => { 
            stopScreenSharing(true); // Kullanıcı tarayıcıdan paylaşımı durdurursa
        };
        console.log('Ekran paylaşımı başlatıldı.');
        
    } catch (err) {
        console.error("Ekran paylaşımı hatası:", err);
        if (err.name === "NotAllowedError") {
            alert('Ekran paylaşımı izni verilmedi.');
        } else {
            alert('Ekran paylaşılamadı. Lütfen tekrar deneyin.');
        }
        isScreenSharing = false; 
    }
}

async function stopScreenSharing(stoppedByBrowser = false) {
    if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        screenStream = null;
    }

    if (localStream && peer && peer.open) {
        // Ekran track'ini localStream'den kaldır
        const screenTrack = localStream.getVideoTracks().find(t => t.label.includes("screen")); // Veya daha güvenilir bir yöntem
        if (screenTrack) {
            localStream.removeTrack(screenTrack);
        }

        // Orijinal kamera track'ine geri dön (eğer saklanmışsa)
        if (originalVideoTrack) {
            localStream.addTrack(originalVideoTrack); // Saklanan kamera track'ini ekle
            
            for (const peerId in peer.connections) {                if (Object.prototype.hasOwnProperty.call(peer.connections, peerId)) {
                    peer.connections[peerId].forEach(connection => {
                        const sender = connection.peerConnection?.getSenders().find(s => s.track?.kind === 'video');
                        if (sender) {
                            sender.replaceTrack(originalVideoTrack).catch(e => console.error("Kameraya geri dönmek için replaceTrack hatası:", e));
                        }
                    });
                }
            }
            myvideo.srcObject = localStream; // Tam stream'i (kamera + ses) ata
            originalVideoTrack = null; // Saklanan track'i temizle
        } else {
            // Kamera track'i yoksa (belki başlangıçta kapalıydı), videoyu kapat
            myvideo.srcObject = localStream; // Sadece ses varsa onu gösterir veya boş
            if (localStream.getVideoTracks().length === 0 && isVideoOn) { // Video açıktı ama track yok
                 // Kullanıcıya video kaynağı olmadığını belirtmek için UI güncellemesi yapılabilir.
                 // Örneğin, video butonunu "video-slash" durumuna getir.
                if(videoButt) {
                    videoButt.innerHTML = '<i class="fas fa-video-slash"></i>';
                    isVideoOn = false;
                    const myVideoOffElement = document.getElementById('myvideooff');
                    if (myVideoOffElement) myVideoOffElement.style.display = 'block';
                }
            }
        }
    }

    isScreenSharing = false;
    if (screenShareButt) {
        screenShareButt.classList.remove('sharing');
        screenShareButt.innerHTML = '<i class="fas fa-desktop"></i> Ekran Paylaş';
    }
    console.log('Ekran paylaşımı durduruldu.');
    if (stoppedByBrowser) {
        alert("Ekran paylaşımı tarayıcı tarafından durduruldu.");
    }
}


socket.on('project chat history', (messages) => {
    if (!chatRoom) return;
    chatRoom.innerHTML = ''; 
    messages.forEach(msg => { // Fixed: Added parentheses around msg
        appendMessage(msg.user.username, msg.message, msg.createdAt, msg.user._id === USER_ID); // Fixed: USER_ID instead of userId
    });
    console.log('Proje chat geçmişi yüklendi.', messages.length, 'mesaj');
    chatRoom.scrollTop = chatRoom.scrollHeight; // Mesajlar yüklendikten sonra en alta kaydır
});

socket.on('project drawing history', (drawings) => {
    console.log('Proje çizim geçmişi alınıyor...', drawings ? drawings.length : 0, 'çizim');
    if (boardVisisble && whiteboardCont.style.visibility === 'visible') {
        // 'getCanvas' zaten en son durumu yükleyecektir.
        // Eğer geçmişteki her adımı çizmek gerekiyorsa (genellikle gerekmez):
        // if (drawings && drawings.length > 0 && ctx) {
        //     ctx.clearRect(0, 0, canvas.width, canvas.height); 
        //     drawings.forEach(drawing => {
        //         if (drawing.data) { // Sunucudan gelen formatı kontrol et
        //             drawRemote(drawing.data.newX, drawing.data.newY, drawing.data.prevX, drawing.data.prevY, drawing.data.color, drawing.data.size);
        //         }
        //     });
        //     console.log('Çizim geçmişi canvasa yüklendi.');
        // }
        socket.emit('getCanvas'); // Sunucudan son durumu iste, bu daha verimli
    }
});

console.log('room.js yüklendi ve çalışmaya hazır.');

function initializeRoom() {
    console.log('CLIENT: Initializing room...');
    if (!USER_ID || !ROOM_ID) {
        console.error("CLIENT: User ID or Room ID is missing. Cannot initialize room.");
        alert("Oda bilgileri eksik, lütfen sayfayı yenileyin.");
        return;
    }
    
    console.log(`CLIENT: Room ID: ${ROOM_ID}, User ID: ${USER_ID}, Username: ${USER_USERNAME}`);
    
    initializePeer(); // PeerJS bağlantısını başlat

    // Sohbet geçmişini yükle
    if (socket.connected) {
        console.log('CLIENT: Socket already connected in initializeRoom. Fetching chat history.');
        socket.emit('get project chat history', ROOM_ID);
    } else {
        socket.once('connect', () => { 
            console.log('CLIENT: Socket connected (handler in initializeRoom). Fetching chat history.');
            socket.emit('get project chat history', ROOM_ID);
        });
    }
}

// Sayfa kapanırken veya yenilenirken kullanıcıyı odadan ayır
window.addEventListener('beforeunload', () => {
    console.log('CLIENT: beforeunload event triggered.');
    if (socket && socket.connected) {
        // Sunucu, socket.disconnect olayında temizliği halletmelidir.
    }
    if (peer && !peer.destroyed) {
        console.log('CLIENT: Destroying PeerJS connection.');
        peer.destroy();
    }
});

// DOM hazır olduğunda odayı başlat
document.addEventListener('DOMContentLoaded', () => {
    console.log('CLIENT: DOM fully loaded and parsed. Initializing DOM elements...');
    
    // DOM elementlerini tanımla
    myvideo = document.querySelector("#vd1");
    chatRoom = document.querySelector('.chat-messages');
    sendButton = document.querySelector('.chat-send-btn');
    messageField = document.querySelector('.chat-input-modern');
    videoContainer = document.querySelector('#vcont');
    videoButt = document.querySelector('.video-btn');
    audioButt = document.querySelector('.audio-btn');
    cutCall = document.querySelector('.disconnect-btn');
    screenShareButt = document.querySelector('.screenshare-btn');
    whiteboardButt = document.querySelector('.whiteboard-btn');
    
    // Canvas elementlerini tanımla
    whiteboardSection = document.querySelector('.whiteboard-section');
    canvas = document.querySelector("#whiteboard");
    if (canvas) {
        ctx = canvas.getContext('2d');
        whiteboardSection.style.display = 'none';
        
        // Canvas boyutunu ayarla
        fitToContainer(canvas);
        
        // Canvas event listener'larını ekle
        canvas.addEventListener('mousedown', e => {
            x = e.offsetX;
            y = e.offsetY;
            isDrawing = 1;
        });

        canvas.addEventListener('mousemove', e => {
            if (isDrawing) {
                draw(e.offsetX, e.offsetY, x, y);
                socket.emit('project draw', ROOM_ID, {
                    newX: e.offsetX, newY: e.offsetY, 
                    prevX: x, prevY: y, 
                    color: color, size: drawsize 
                });
                x = e.offsetX;
                y = e.offsetY;
            }
        });        canvas.addEventListener('mouseup', e => {
            if (isDrawing) {
                isDrawing = 0;
                socket.emit('store canvas', canvas.toDataURL()); 
            }
        });
        
        // Canvas ile ilgili socket event listener'larını ekle
        socket.on('getCanvas', url => {
            if (!url) {
                console.log('Canvas URL yok, temiz canvas.');
                if (ctx && canvas) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height); // URL yoksa temizle
                }
                return;
            }
            let img = new Image();
            img.onload = function() { 
                if (ctx && canvas) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height); 
                    ctx.drawImage(img, 0, 0);
                    console.log('Canvas yüklendi (URL ile)');
                }
            };
            img.onerror = function() {
                console.error('Canvas resmi yüklenemedi:', url);
            };
            img.src = url;
        });

        socket.on('project draw', (eventData) => {
            // eventData = { user: emittingUserId, data: { newX, newY, prevX, prevY, color, size } }
            if (eventData.user !== USER_ID) { 
                console.log('Uzak çizim alındı:', eventData);
                drawRemote(eventData.data.newX, eventData.data.newY, eventData.data.prevX, eventData.data.prevY, eventData.data.color, eventData.data.size);
            }
        });

        socket.on('canvasUpdate', url => { 
            console.log("'canvasUpdate' eventi alındı. URL:", url ? 'Mevcut' : 'Yok');
            if (url && ctx && canvas) {
                let img = new Image();
                img.onload = function() {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                };
                img.src = url;
            } else if (!url && ctx && canvas) {
                ctx.clearRect(0, 0, canvas.width, canvas.height); // URL yoksa temizle
            }
        });

        socket.on('clearBoard', () => {
            if (ctx && canvas) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                console.log('Beyaz tahta uzak bir kullanıcı tarafından temizlendi.');
            }
        });
        
        console.log('Canvas elementleri başarıyla başlatıldı');
    } else {
        console.error('Canvas elementi bulunamadı!');
    }
    
    // Tab sistemi elementlerini tanımla
    tabs = document.querySelectorAll('.sidebar-tab');
    tabContents = document.querySelectorAll('.tab-panel');
    
    // Tab event listener'larını ekle
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            
            tab.classList.add('active');
            const targetTab = tab.getAttribute('data-tab');
            const targetContent = document.getElementById(`${targetTab}-tab`);
            if (targetContent) {
                targetContent.classList.add('active');
            }

            // --- YENİ EKLENEN KISIM: Gantt tam ekran modu için --- 
            const videoArea = document.querySelector('.video-section'); // .video-area yerine .video-section kullanıldı
            const mainContentGrid = document.querySelector('.modern-room-container'); // .main-content-grid yerine .modern-room-container kullanıldı

            if (targetTab === 'gantt') {
                if(videoArea) videoArea.classList.add('hidden');
                if(mainContentGrid) mainContentGrid.classList.add('gantt-mode'); 
            } else {
                if(videoArea) videoArea.classList.remove('hidden');
                if(mainContentGrid) mainContentGrid.classList.remove('gantt-mode');
            }
            // --- YENİ EKLENEN KISIM SONU ---

              if (targetTab === 'notes') {
                loadNotes();
            } else if (targetTab === 'attendees') {
                loadAttendees();            } else if (targetTab === 'tasks') {
                // Initialize Kanban board when tasks tab is opened
                if (!window.kanbanBoard) {
                    console.log('🚀 Initializing Kanban board...');
                    window.kanbanBoard = initKanbanBoard(ROOM_ID, socket);
                }            } else if (targetTab === 'gantt') {
                // Initialize Gantt chart when gantt tab is opened
                console.log('🎯 GANTT TAB CLICKED - STARTING COMPREHENSIVE INITIALIZATION');
                
                if (!window.ganttManager) {
                    const initializeGanttComprehensive = async () => {
                        console.log('🚀 Comprehensive Gantt Chart Initialization Started...');
                        console.log('🔍 Current timestamp:', new Date().toISOString());
                        console.log('🔍 Project ID (ROOM_ID):', ROOM_ID);
                        console.log('🔍 Socket available:', !!socket);
                        console.log('🔍 Socket connected:', socket?.connected);
                        
                        // Check all gantt-related availability
                        console.log('📊 GANTT AVAILABILITY REPORT:');
                        console.log('  - Frappe Gantt library:', typeof Gantt);
                        console.log('  - GanttManager class:', typeof window.GanttManager);
                        console.log('  - initGanttChart function:', typeof window.initGanttChart);
                        console.log('  - GANTT_FILE_LOADING:', window.GANTT_FILE_LOADING);
                        console.log('  - GANTT_FILE_COMPLETED:', window.GANTT_FILE_COMPLETED);
                        console.log('  - GANTT_ALERT_SHOWN:', window.GANTT_ALERT_SHOWN);
                        
                        const ganttProps = Object.keys(window).filter(key => 
                            key.toLowerCase().includes('gantt')
                        ).sort();
                        console.log('  - All gantt window properties:', ganttProps);
                        
                        // Force check if gantt.js has actually loaded
                        if (!window.GANTT_FILE_COMPLETED) {
                            console.error('❌ CRITICAL: gantt.js file has not completed loading!');
                            console.error('📍 This indicates the gantt.js script failed to execute properly');
                            
                            // Show user-friendly error
                            const container = document.getElementById('gantt-chart-container');
                            if (container) {
                                container.innerHTML = `
                                    <div class="empty-icon">
                                        <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>
                                    </div>
                                    <div class="empty-text">Gantt Modülü Yüklenemedi</div>
                                    <div class="empty-description">
                                        gantt.js dosyası execute edilemedi.<br>
                                        <strong>Çözüm:</strong> Sayfayı tamamen yenileyin (CTRL+F5)
                                    </div>
                                `;
                            }
                            return;
                        }
                        
                        // Enhanced retry mechanism with multiple strategies
                        let attempts = 0;
                        const maxAttempts = 15; // Increased attempts
                        const baseDelay = 300; // Reduced base delay
                        
                        while (attempts < maxAttempts) {
                            attempts++;
                            console.log(`🔄 Gantt initialization attempt ${attempts}/${maxAttempts}`);
                            
                            // Check for GanttManager availability
                            if (typeof window.GanttManager !== 'undefined') {
                                console.log('✅ GanttManager class found! Attempting initialization...');
                                
                                try {
                                    // Try using initGanttChart function first
                                    if (typeof window.initGanttChart === 'function') {
                                        console.log('🎯 Using initGanttChart function');
                                        window.ganttManager = window.initGanttChart(ROOM_ID, socket);
                                    } else {
                                        console.log('🎯 Using GanttManager constructor directly');
                                        window.ganttManager = new window.GanttManager(ROOM_ID, socket);
                                    }
                                    
                                    console.log('✅ Gantt Chart Manager initialized successfully');
                                    console.log('📊 Manager instance:', window.ganttManager);
                                    
                                    // Update status
                                    const statusText = document.querySelector('.gantt-status .status-text');
                                    if (statusText) {
                                        statusText.textContent = 'Gantt şeması başlatıldı';
                                    }
                                    
                                    return; // Success!
                                    
                                } catch (error) {
                                    console.error(`❌ Gantt initialization failed on attempt ${attempts}:`, error);
                                    console.error('❌ Error stack:', error.stack);
                                    
                                    // Don't return immediately, try again
                                    if (attempts >= maxAttempts) {
                                        // Final attempt failed, show error
                                        const container = document.getElementById('gantt-chart-container');
                                        if (container) {
                                            container.innerHTML = `
                                                <div class="empty-icon">
                                                    <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>
                                                </div>
                                                <div class="empty-text">Gantt Başlatma Hatası</div>
                                                <div class="empty-description">
                                                    ${error.message}<br>
                                                    Detaylar için konsolu kontrol edin.
                                                </div>
                                            `;
                                        }
                                        return;
                                    }
                                }
                            }
                            
                            // Progressive delay - longer waits for later attempts
                            const delay = baseDelay * Math.min(attempts, 5);
                            
                            if (attempts < maxAttempts) {
                                console.log(`⏳ GanttManager not ready, waiting ${delay}ms... (attempt ${attempts}/${maxAttempts})`);
                                console.log(`   Current status: GanttManager=${typeof window.GanttManager}, GANTT_FILE_COMPLETED=${window.GANTT_FILE_COMPLETED}`);
                                await new Promise(resolve => setTimeout(resolve, delay));
                            }
                        }
                        
                        // All attempts exhausted
                        console.error('❌ GANTT INITIALIZATION COMPLETELY FAILED');
                        console.error('📊 Final status report:');
                        console.error('   - GanttManager type:', typeof window.GanttManager);
                        console.error('   - GANTT_FILE_COMPLETED:', window.GANTT_FILE_COMPLETED);
                        console.error('   - Available gantt properties:', Object.keys(window).filter(key => key.toLowerCase().includes('gantt')));
                        
                        // Show comprehensive error message
                        const container = document.getElementById('gantt-chart-container');
                        if (container) {
                            container.innerHTML = `
                                <div class="empty-icon">
                                    <i class="fas fa-exclamation-triangle" style="color: #ef4444;"></i>
                                </div>
                                <div class="empty-text">Gantt Şeması Başlatılamadı</div>
                                <div class="empty-description">
                                    ${maxAttempts} deneme sonrasında Gantt şeması başlatılamadı.<br><br>
                                    <strong>Olası Çözümler:</strong><br>
                                    1. Sayfayı tamamen yenileyin (CTRL+F5)<br>
                                    2. Browser cache'ini temizleyin<br>
                                    3. Developer Tools > Console'da hataları kontrol edin<br>
                                    4. Internet bağlantınızı kontrol edin
                                </div>
                            `;
                        }
                    };
                    
                    // Start the comprehensive initialization
                    initializeGanttComprehensive().catch(error => {
                        console.error('❌ Comprehensive Gantt initialization threw an error:', error);
                    });
                } else {
                    console.log('♻️ Gantt Manager already exists, refreshing...');
                    if (window.ganttManager && typeof window.ganttManager.loadTasks === 'function') {
                        window.ganttManager.loadTasks();
                    }
                }
            } else if (targetTab === 'workflow') {
                // Initialize BPMN workflow manager when workflow tab is opened
                if (!bpmnInitialized && window.bpmnManager) {
                    console.log('🚀 Initializing BPMN Workflow Manager...');
                    window.bpmnManager.init(socket, ROOM_ID, USER_ID).then(() => {
                        bpmnInitialized = true;
                        console.log('✅ BPMN Workflow Manager initialized successfully');
                    }).catch(error => {
                        console.error('❌ BPMN initialization failed:', error);
                    });
                }
            }
        });
    });
    
    // Not yönetimi elementlerini tanımla
    addNoteBtn = document.getElementById('add-note-btn');
    noteEditor = document.getElementById('note-editor');
    saveNoteBtn = document.getElementById('save-note-btn');
    cancelNoteBtn = document.getElementById('cancel-note-btn');
    noteContent = document.getElementById('note-content');
    notesList = document.getElementById('notes-list');
    
    // Not event listener'larını ekle
    if (addNoteBtn) {
        addNoteBtn.onclick = () => {
            currentEditingNoteId = null;
            noteContent.value = '';
            noteEditor.style.display = 'flex';
        };
    }

    if (cancelNoteBtn) {
        cancelNoteBtn.onclick = () => {
            noteEditor.style.display = 'none';
            currentEditingNoteId = null;
        };
    }

    if (saveNoteBtn) {
        saveNoteBtn.onclick = async () => {
            const content = noteContent.value.trim();
            if (!content) return;
            try {
                if (currentEditingNoteId) {
                    await updateNote(currentEditingNoteId, content);
                } else {
                    await createNote(content);
                }
                noteEditor.style.display = 'none';
                loadNotes();
            } catch (err) {
                alert('Not kaydetme hatası: ' + err.message);
            }
        };
    }    // Whiteboard button event listener'ını ekle
    if (whiteboardButt) {
        whiteboardButt.addEventListener('click', () => {
            boardVisible = !boardVisible;
            
            // Whiteboard section'ını aç/kapat (artık video container içinde)
            whiteboardSection.style.display = boardVisible ? 'flex' : 'none';
            
            // Whiteboard icon'u güncelle
            const icon = whiteboardButt.querySelector('i');
            if (icon) {
                icon.className = boardVisible ? 'fas fa-video' : 'fas fa-chalkboard';
            }
            
            // Whiteboard açıldığında canvas'ı yeniden boyutlandır
            if (boardVisible && canvas) {
                setTimeout(() => {
                    fitToContainer(canvas);
                    socket.emit('getCanvas'); 
                }, 100); // Kısa gecikme ile DOM'un güncellenmesini bekle
            }
        });
    }

    // Chat event listener'larını ekle
    if (sendButton) {
        sendButton.addEventListener('click', () => {
            const msg = messageField.value;
            if (msg.trim() === '') return;
            socket.emit('project message', ROOM_ID, msg); 
            messageField.value = '';
        });
    }

    if (messageField) {
        messageField.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); 
                sendButton.click();
            }
        });
    }

    // Video kontrol event listener'larını ekle
    if (audioButt) {
        audioButt.addEventListener('click', () => {
            isAudioOn = !isAudioOn;
            audioButt.innerHTML = isAudioOn ? '<i class="fas fa-microphone"></i>' : '<i class="fas fa-microphone-slash"></i>';
            if (localStream) {
                localStream.getAudioTracks().forEach(track => track.enabled = isAudioOn);
            }
        });
    }

    if (videoButt) {
        videoButt.addEventListener('click', () => {
            isVideoOn = !isVideoOn;
            videoButt.innerHTML = isVideoOn ? '<i class="fas fa-video"></i>' : '<i class="fas fa-video-slash"></i>';
            if (localStream) {
                localStream.getVideoTracks().forEach(track => track.enabled = isVideoOn);
            }
            const myVideoOffElement = document.getElementById('myvideooff');
            if (myVideoOffElement) {
                myVideoOffElement.style.display = isVideoOn ? 'none' : 'block';
            }
        });
    }

    if (cutCall) {
        cutCall.addEventListener('click', () => {
            if (peer) {
                peer.destroy();
            }
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
            }
            window.location.href = '/dashboard';
        });
    }    if (screenShareButt) {
        screenShareButt.addEventListener('click', async () => {
            if (isScreenSharing) {
                await stopScreenSharing();
            } else {
                await startScreenSharing();
            }
        });
    }
    
    // Window resize event listener'ını ekle
    window.onresize = function() { 
        if (canvas) {
            fitToContainer(canvas);
            socket.emit('getCanvas'); // Yeniden boyutlandırmada canvası tekrar iste
        }
    };
    
    console.log('DOM elementleri başarıyla tanımlandı ve event listener\'lar eklendi');
    console.log('CLIENT: Calling initializeRoom...');
    initializeRoom();
});

// initializeRoom(); // Bu satır yukarıdaki DOMContentLoaded ile değiştirildi.

// Utility fonksiyonları
function copyRoomId() {
    const roomId = ROOM_ID;
    if (navigator.clipboard) {
        navigator.clipboard.writeText(roomId).then(() => {
            console.log('Oda kodu kopyalandı:', roomId);
            // Kısa bildirim göster
            const btn = document.querySelector('.copy-code-btn');
            if (btn) {
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-check';
                    setTimeout(() => {
                        icon.className = 'fas fa-copy';
                    }, 2000);
                }
            }
        }).catch(err => {
            console.error('Oda kodu kopyalanamadı:', err);
            alert('Oda Kodu: ' + roomId);
        });
    } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = roomId;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            console.log('Oda kodu kopyalandı (fallback):', roomId);
        } catch (err) {
            console.error('Kopyalama başarısız:', err);
            alert('Oda Kodu: ' + roomId);
        }
        document.body.removeChild(textArea);
    }
}

// Global fonksiyonları window objesine ekle
window.copyRoomId = copyRoomId;