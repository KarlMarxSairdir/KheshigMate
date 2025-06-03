const socket = io();
const myvideo = document.querySelector("#vd1");
const chatRoom = document.querySelector('.chat-cont');
const sendButton = document.querySelector('.chat-send');
const messageField = document.querySelector('.chat-input');
const videoContainer = document.querySelector('#vcont');
const overlayContainer = document.querySelector('#overlay')
const continueButt = document.querySelector('.continue-name');
const nameField = document.querySelector('#name-field');
const videoButt = document.querySelector('.novideo');
const audioButt = document.querySelector('.audio');
const cutCall = document.querySelector('.cutcall');
const screenShareButt = document.querySelector('.screenshare');
const whiteboardButt = document.querySelector('.board-icon')

// --- FAZ 1 FRONTEND ENTEGRASYONU ---
// URL parametrelerini kontrol et
const params = new URLSearchParams(window.location.search);
const projectId = params.get('project');
const roomId = params.get('room') || projectId; // Eski sistemle uyumluluk için

// Kullanıcı bilgileri - localStorage kullanmak yerine session kontrol edelim
let userId = localStorage.getItem('userId');
let usernameFromStorage = localStorage.getItem('username');
let username = usernameFromStorage;

// Eğer kullanıcı girişi yoksa ana sayfaya yönlendir
if (!userId || !username) {
    // Session kontrol et
    fetch('/check-auth')
        .then(res => res.json())
        .then(user => {
            username = user.username;
            userId = user._id;
            localStorage.setItem('username', username);
            localStorage.setItem('userId', userId);
            initializeRoom();
        })
        .catch(() => {
            location.href = '/';
        });
} else {
    initializeRoom();
}

function initializeRoom() {
    // Overlay göster ve isim iste - eğer zaten isim varsa geç
    if (username && username.trim() !== '') {
        overlayContainer.style.visibility = 'hidden';
        document.querySelector("#myname").innerHTML = `${username} (You)`;
        
        // Proje veya oda kontrolü
        if (projectId) {
            // Proje bazlı çalışma
            socket.emit('join project', projectId, username);
            document.title = `Kaşıkmate - Proje Çalışma Alanı`;
        } else if (roomId) {
            // Eski sistem uyumluluğu
            socket.emit('join room', roomId, username);
            document.title = `Kaşıkmate - Oda: ${roomId}`;
        }
        
        // Video başlat
        startCall();
        
    } else {
        overlayContainer.style.visibility = 'visible';
    }
}

// --- TAB SİSTEMİ ---
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Aktif tab'ı kaldır
        tabs.forEach(t => t.classList.remove('active'));
        tabContents.forEach(tc => tc.classList.remove('active'));
        
        // Seçili tab'ı aktif yap
        tab.classList.add('active');
        const targetTab = tab.getAttribute('data-tab');
        document.getElementById(`${targetTab}-tab`).classList.add('active');
        
        // Tab değişiminde gerekli işlemleri yap
        if (targetTab === 'notes') {
            loadNotes();
        } else if (targetTab === 'attendees') {
            loadAttendees();
        }
    });
});

// --- NOT YÖNETİMİ ---
let currentEditingNoteId = null;

const addNoteBtn = document.getElementById('add-note-btn');
const noteEditor = document.getElementById('note-editor');
const saveNoteBtn = document.getElementById('save-note-btn');
const cancelNoteBtn = document.getElementById('cancel-note-btn');
const noteContent = document.getElementById('note-content');
const notesList = document.getElementById('notes-list');

addNoteBtn.onclick = () => {
    currentEditingNoteId = null;
    noteContent.value = '';
    noteEditor.style.display = 'flex';
};

cancelNoteBtn.onclick = () => {
    noteEditor.style.display = 'none';
    currentEditingNoteId = null;
};

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

async function loadNotes() {
    if (!projectId) return;
    try {
        const response = await fetch(`/projects/${projectId}/notes`);
        const data = await response.json();
        
        if (response.ok) {
            renderNotes(data.notes);
        }
    } catch (err) {
        console.error('Not yükleme hatası:', err);
    }
}

function renderNotes(notes) {
    notesList.innerHTML = '';
    notes.forEach(note => {
        const noteEl = document.createElement('div');
        noteEl.className = 'note-item';
        noteEl.innerHTML = `
            <div class="note-item-header">
                <span class="note-author">${note.user.username}</span>
                <span class="note-date">${new Date(note.createdAt).toLocaleDateString()}</span>
            </div>
            <div class="note-preview">${note.content.substring(0, 100)}${note.content.length > 100 ? '...' : ''}</div>
            <div class="note-actions">
                <button class="note-action-btn edit" onclick="editNote('${note._id}', '${note.content.replace(/'/g, "\\'")}')">Düzenle</button>
                <button class="note-action-btn delete" onclick="deleteNote('${note._id}')">Sil</button>
            </div>
        `;
        notesList.appendChild(noteEl);
    });
}

async function createNote(content) {
    const response = await fetch(`/projects/${projectId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
    }
}

async function updateNote(noteId, content) {
    const response = await fetch(`/projects/${projectId}/notes/${noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
    }
}

async function deleteNote(noteId) {
    if (!confirm('Bu notu silmek istediğinizden emin misiniz?')) return;
    
    try {
        const response = await fetch(`/projects/${projectId}/notes/${noteId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadNotes();
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
    attendeesList.innerHTML = '';
    
    // Mevcut kullanıcıyı ekle
    const myAttendee = document.createElement('div');
    myAttendee.className = 'attendee-item';
    myAttendee.innerHTML = `
        <div class="attendee-avatar">${username.charAt(0).toUpperCase()}</div>
        <div class="attendee-name">${username} (Sen)</div>
    `;
    attendeesList.appendChild(myAttendee);
    
    // Diğer katılımcıları ekle (Socket.IO'dan gelecek)
    // TODO: Implement real attendees list from socket data
}

//whiteboard js start
const whiteboardCont = document.querySelector('.whiteboard-cont');
const canvas = document.querySelector("#whiteboard");
const ctx = canvas.getContext('2d');

let boardVisisble = false;
whiteboardCont.style.visibility = 'hidden';

let isDrawing = 0;
let x = 0;
let y = 0;
let color = "black";
let drawsize = 3;
let colorRemote = "black";
let drawsizeRemote = 3;

function fitToContainer(canvas) {
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

fitToContainer(canvas);

//getCanvas call is under join room call
socket.on('getCanvas', url => {
    let img = new Image();
    img.onload = start;
    img.src = url;

    function start() {
        ctx.drawImage(img, 0, 0);
    }

    console.log('got canvas', url)
})

function setColor(newcolor) {
    color = newcolor;
    drawsize = 3;
}

function setEraser() {
    color = "white";
    drawsize = 10;
}

//might remove this
function reportWindowSize() {
    fitToContainer(canvas);
}

window.onresize = reportWindowSize;

function clearBoard() {
    if (window.confirm('Are you sure you want to clear board? This cannot be undone')) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        socket.emit('store canvas', canvas.toDataURL());
        socket.emit('clearBoard');
    }
    else return;
}

socket.on('clearBoard', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
})

function draw(newx, newy, oldx, oldy) {
    ctx.strokeStyle = color;
    ctx.lineWidth = drawsize;
    ctx.beginPath();
    ctx.moveTo(oldx, oldy);
    ctx.lineTo(newx, newy);
    ctx.stroke();
    ctx.closePath();

    socket.emit('store canvas', canvas.toDataURL());
}

function drawRemote(newx, newy, oldx, oldy) {
    ctx.strokeStyle = colorRemote;
    ctx.lineWidth = drawsizeRemote;
    ctx.beginPath();
    ctx.moveTo(oldx, oldy);
    ctx.lineTo(newx, newy);
    ctx.stroke();
    ctx.closePath();
}

canvas.addEventListener('mousedown', e => {
    x = e.offsetX;
    y = e.offsetY;
    isDrawing = 1;
})

canvas.addEventListener('mousemove', e => {
    if (isDrawing) {
        draw(e.offsetX, e.offsetY, x, y);
        socket.emit('draw', e.offsetX, e.offsetY, x, y, color, drawsize);
        x = e.offsetX;
        y = e.offsetY;
    }
})

window.addEventListener('mouseup', e => {
    if (isDrawing) {
        isDrawing = 0;
    }
})

socket.on('draw', (newX, newY, prevX, prevY, color, size) => {
    colorRemote = color;
    drawsizeRemote = size;
    drawRemote(newX, newY, prevX, prevY);
})

//whiteboard js end

// Room code display
document.querySelector('.roomcode').innerHTML = `${roomId || projectId}`;

function CopyClassText() {
    var textToCopy = document.querySelector('.roomcode');
    var currentRange;
    if (document.getSelection().rangeCount > 0) {
        currentRange = document.getSelection().getRangeAt(0);
        window.getSelection().removeRange(currentRange);
    } else {
        currentRange = false;
    }

    var CopyRange = document.createRange();
    CopyRange.selectNode(textToCopy);
    window.getSelection().addRange(CopyRange);
    document.execCommand("copy");

    window.getSelection().removeRange(CopyRange);

    if (currentRange) {
        window.getSelection().addRange(currentRange);
    }

    document.querySelector(".copycode-button").textContent = "Copied!"
    setTimeout(() => {
        document.querySelector(".copycode-button").textContent = "Copy Code";
    }, 5000);
}

// Name entry overlay
continueButt.addEventListener('click', () => {
    if (nameField.value == '') return;
    username = nameField.value;
    overlayContainer.style.visibility = 'hidden';
    document.querySelector("#myname").innerHTML = `${username} (You)`;
    
    if (projectId) {
        socket.emit('join project', projectId, username);
    } else {
        socket.emit('join room', roomId, username);
    }
    
    startCall();
});

nameField.addEventListener("keyup", function (event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        continueButt.click();
    }
});

// Video grid management
socket.on('user count', count => {
    if (count > 1) {
        videoContainer.className = 'video-cont';
    } else {
        videoContainer.className = 'video-cont-single';
    }
})

// WebRTC variables
let peerConnection;
const configuration = { iceServers: [{ urls: "stun:stun.stunprotocol.org" }] }
const mediaConstraints = { video: true, audio: true };
let connections = {};
let cName = {};
let audioTrackSent = {};
let videoTrackSent = {};
let mystream, myscreenshare;
let audioAllowed = 1;
let videoAllowed = 1;
let micInfo = {};
let videoInfo = {};
let mymuteicon = document.querySelector("#mymuteicon");
let myvideooff = document.querySelector("#myvideooff");

mymuteicon.style.visibility = 'hidden';
myvideooff.style.visibility = 'hidden';

function handleGetUserMediaError(e) {
    switch (e.name) {
        case "NotFoundError":
            alert("Unable to open your call because no camera and/or microphone were found.");
            break;
        case "SecurityError":
        case "PermissionDeniedError":
            break;
        default:
            alert("Error opening your camera and/or microphone: " + e.message);
            break;
    }
}

function reportError(e) {
    console.log(e);
    return;
}

function startCall() {
    navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then(localStream => {
            myvideo.srcObject = localStream;
            myvideo.muted = true;
            mystream = localStream;

            localStream.getTracks().forEach(track => {
                for (let key in connections) {
                    connections[key].addTrack(track, localStream);
                    if (track.kind === 'audio')
                        audioTrackSent[key] = track;
                    else
                        videoTrackSent[key] = track;
                }
            })
        })
        .catch(handleGetUserMediaError);
}

function handleVideoOffer(offer, sid, cname, micinf, vidinf) {
    console.log('video offer', sid, cname);
    cName[sid] = cname;
    micInfo[sid] = micinf;
    videoInfo[sid] = vidinf;

    connections[sid] = new RTCPeerConnection(configuration);

    connections[sid].onicecandidate = function (event) {
        if (event.candidate) {
            console.log('icecandidate fired');
            socket.emit('new icecandidate', event.candidate, sid);
        }
    };

    connections[sid].ontrack = function (event) {
        if (!document.getElementById(sid)) {
            console.log('track event fired');
            let vidCont = document.createElement('div');
            let newvideo = document.createElement('video');
            let name = document.createElement('div');
            let muteIcon = document.createElement('div');
            let videoOff = document.createElement('div');
            
            vidCont.id = sid;
            vidCont.className = "video-box";
            newvideo.srcObject = event.streams[0];
            newvideo.autoplay = true;
            newvideo.muted = true;
            newvideo.className = "video-frame";
            
            name.className = "nametag";
            name.innerHTML = `${cname}`;
            
            muteIcon.id = `mute${sid}`;
            muteIcon.className = "mute-icon";
            muteIcon.innerHTML = `<i class="fas fa-microphone-slash"></i>`;
            muteIcon.style.visibility = micinf == 'on' ? 'hidden' : 'visible';
            
            videoOff.id = `vidoff${sid}`;
            videoOff.className = "video-off";
            videoOff.innerHTML = `Video Off`;
            videoOff.style.visibility = vidinf == 'on' ? 'hidden' : 'visible';
            
            vidCont.appendChild(newvideo);
            vidCont.appendChild(name);
            vidCont.appendChild(muteIcon);
            vidCont.appendChild(videoOff);
            
            videoContainer.appendChild(vidCont);
        }
    };

    connections[sid].onremovetrack = function (event) {
        if (document.getElementById(sid)) {
            document.getElementById(sid).remove();
        }
    }

    connections[sid].onnegotiationneeded = function () {
        connections[sid].createOffer()
            .then(function (offer) {
                return connections[sid].setLocalDescription(offer);
            })
            .then(function () {
                socket.emit('video-offer', connections[sid].localDescription, sid);
            })
            .catch(reportError);
    };

    let desc = new RTCSessionDescription(offer);

    connections[sid].setRemoteDescription(desc)
        .then(() => { return navigator.mediaDevices.getUserMedia(mediaConstraints) })
        .then((localStream) => {
            localStream.getTracks().forEach(track => {
                connections[sid].addTrack(track, localStream);
                console.log('added local stream to peer')
                if (track.kind === 'audio') {
                    audioTrackSent[sid] = track;
                    if (!audioAllowed)
                        audioTrackSent[sid].enabled = false;
                }
                else {
                    videoTrackSent[sid] = track;
                    if (!videoAllowed)
                        videoTrackSent[sid].enabled = false
                }
            })
        })
        .then(() => {
            return connections[sid].createAnswer();
        })
        .then(answer => {
            return connections[sid].setLocalDescription(answer);
        })
        .then(() => {
            socket.emit('video-answer', connections[sid].localDescription, sid);
        })
        .catch(reportError);
}

function handleNewIceCandidate(candidate, sid) {
    var candidate = new RTCIceCandidate(candidate);

    connections[sid].addIceCandidate(candidate)
        .catch(reportError);
}

function handleVideoAnswer(answer, sid) {
    console.log('video answer', sid);
    var desc = new RTCSessionDescription(answer);
    connections[sid].setRemoteDescription(desc).catch(reportError);
}

//Thanks to (https://github.com/miroslavpejic85) for ScreenShare Code
screenShareButt.addEventListener('click', () => {
    screenShareToggle();
});

let screenshareEnabled = false;
function screenShareToggle() {
    if (screenshareEnabled) {
        stopScreenShare();
    } else {
        startScreenShare();
    }
}

function startScreenShare() {
    navigator.mediaDevices.getDisplayMedia({ video: true })
        .then((stream) => {
            screenshareEnabled = true;
            myscreenshare = stream;
            
            for (let key in connections) {
                const videoSender = connections[key].getSenders().find(sender => 
                    sender.track && sender.track.kind === 'video'
                );
                if (videoSender) {
                    videoSender.replaceTrack(stream.getVideoTracks()[0]);
                }
            }
            
            myvideo.srcObject = stream;
            
            screenShareButt.innerHTML = (screenshareEnabled 
                ? `<i class="fas fa-desktop"></i><span class="tooltiptext">Stop Share Screen</span>`
                : `<i class="fas fa-desktop"></i><span class="tooltiptext">Share Screen</span>`
            );
            
            myscreenshare.getVideoTracks()[0].onended = function() {
                if (screenshareEnabled) screenShareToggle();
            };
        })
        .catch((e) => {
            alert("Unable to share screen:" + e.message);
            console.error(e);
        });
}

function stopScreenShare() {
    screenshareEnabled = false;
    navigator.mediaDevices.getUserMedia(mediaConstraints)
        .then((stream) => {
            for (let key in connections) {
                const videoSender = connections[key].getSenders().find(sender => 
                    sender.track && sender.track.kind === 'video'
                );
                if (videoSender) {
                    videoSender.replaceTrack(stream.getVideoTracks()[0]);
                }
            }
            
            myvideo.srcObject = stream;
            mystream = stream;
            
            screenShareButt.innerHTML = `<i class="fas fa-desktop"></i><span class="tooltiptext">Share Screen</span>`;
        });
}

socket.on('video-offer', handleVideoOffer);
socket.on('new icecandidate', handleNewIceCandidate);
socket.on('video-answer', handleVideoAnswer);

socket.on('join room', async (conc, cnames, micinfo, videoinfo) => {
    socket.emit('getCanvas');
    if (cnames)
        cName = cnames;

    if (micinfo)
        micInfo = micinfo;

    if (videoinfo)
        videoInfo = videoinfo;

    if (conc) {
        conc.forEach(sid => {
            connections[sid] = new RTCPeerConnection(configuration);

            connections[sid].onicecandidate = function (event) {
                if (event.candidate) {
                    console.log('icecandidate fired');
                    socket.emit('new icecandidate', event.candidate, sid);
                }
            };

            connections[sid].ontrack = function (event) {
                if (!document.getElementById(sid)) {
                    console.log('track event fired');
                    let vidCont = document.createElement('div');
                    let newvideo = document.createElement('video');
                    let name = document.createElement('div');
                    let muteIcon = document.createElement('div');
                    let videoOff = document.createElement('div');
                    
                    vidCont.id = sid;
                    vidCont.className = "video-box";
                    newvideo.srcObject = event.streams[0];
                    newvideo.autoplay = true;
                    newvideo.muted = true;
                    newvideo.className = "video-frame";
                    
                    name.className = "nametag";
                    name.innerHTML = `${cName[sid]}`;
                    
                    muteIcon.id = `mute${sid}`;
                    muteIcon.className = "mute-icon";
                    muteIcon.innerHTML = `<i class="fas fa-microphone-slash"></i>`;
                    muteIcon.style.visibility = micInfo[sid] == 'on' ? 'hidden' : 'visible';
                    
                    videoOff.id = `vidoff${sid}`;
                    videoOff.className = "video-off";
                    videoOff.innerHTML = `Video Off`;
                    videoOff.style.visibility = videoInfo[sid] == 'on' ? 'hidden' : 'visible';
                    
                    vidCont.appendChild(newvideo);
                    vidCont.appendChild(name);
                    vidCont.appendChild(muteIcon);
                    vidCont.appendChild(videoOff);
                    
                    videoContainer.appendChild(vidCont);
                }
            };

            connections[sid].onremovetrack = function (event) {
                if (document.getElementById(sid)) {
                    document.getElementById(sid).remove();
                }
            }

            connections[sid].onnegotiationneeded = function () {
                connections[sid].createOffer()
                    .then(function (offer) {
                        return connections[sid].setLocalDescription(offer);
                    })
                    .then(function () {
                        socket.emit('video-offer', connections[sid].localDescription, sid);
                    })
                    .catch(reportError);
            };
        });

        console.log('added all sockets to connections');
        startCall();
    } else {
        console.log('waiting for someone to join');
        navigator.mediaDevices.getUserMedia(mediaConstraints)
            .then(localStream => {
                myvideo.srcObject = localStream;
                myvideo.muted = true;
                mystream = localStream;
            })
            .catch(handleGetUserMediaError);
    }
})

socket.on('remove peer', sid => {
    if (document.getElementById(sid)) {
        document.getElementById(sid).remove();
    }
    delete connections[sid];
})

// Chat functionality
sendButton.addEventListener('click', () => {
    const msg = messageField.value;
    messageField.value = '';
    if (projectId) {
        socket.emit('project message', projectId, msg, username);
    } else {
        socket.emit('message', msg, username, roomId);
    }
})

messageField.addEventListener("keyup", function (event) {
    if (event.keyCode === 13) {
        event.preventDefault();
        sendButton.click();
    }
});

socket.on('message', (msg, sendername, time) => {
    chatRoom.scrollTop = chatRoom.scrollHeight;
    chatRoom.innerHTML += `<div class="message">
    <div class="info">
        <div class="username">${sendername}</div>
        <div class="time">${time}</div>
    </div>
    <div class="content">
        ${msg}
    </div>
</div>`
});

// Video/Audio controls
videoButt.addEventListener('click', () => {
    if (videoAllowed) {
        for (let key in videoTrackSent) {
            videoTrackSent[key].enabled = false;
        }
        videoButt.innerHTML = `<i class="fas fa-video-slash"></i>`;
        videoAllowed = 0;
        myvideooff.style.visibility = 'visible';
        socket.emit('action', 'videooff');
    } else {
        for (let key in videoTrackSent) {
            videoTrackSent[key].enabled = true;
        }
        videoButt.innerHTML = `<i class="fas fa-video"></i>`;
        videoAllowed = 1;
        myvideooff.style.visibility = 'hidden';
        socket.emit('action', 'videoon');
    }
})

audioButt.addEventListener('click', () => {
    if (audioAllowed) {
        for (let key in audioTrackSent) {
            audioTrackSent[key].enabled = false;
        }
        audioButt.innerHTML = `<i class="fas fa-microphone-slash"></i>`;
        audioAllowed = 0;
        mymuteicon.style.visibility = 'visible';
        socket.emit('action', 'mute');
    } else {
        for (let key in audioTrackSent) {
            audioTrackSent[key].enabled = true;
        }
        audioButt.innerHTML = `<i class="fas fa-microphone"></i>`;
        audioAllowed = 1;
        mymuteicon.style.visibility = 'hidden';
        socket.emit('action', 'unmute');
    }
})

socket.on('action', (msg, sid) => {
    if (msg == 'mute') {
        console.log(sid + ' muted themself');
        document.querySelector(`#mute${sid}`).style.visibility = 'visible';
        micInfo[sid] = 'off';
    }
    else if (msg == 'unmute') {
        console.log(sid + ' unmuted themself');
        document.querySelector(`#mute${sid}`).style.visibility = 'hidden';
        micInfo[sid] = 'on';
    }
    else if (msg == 'videooff') {
        console.log(sid + 'turned video off');
        document.querySelector(`#vidoff${sid}`).style.visibility = 'visible';
        videoInfo[sid] = 'off';
    }
    else if (msg == 'videoon') {
        console.log(sid + 'turned video on');
        document.querySelector(`#vidoff${sid}`).style.visibility = 'hidden';
        videoInfo[sid] = 'on';
    }
})

whiteboardButt.addEventListener('click', () => {
    if (boardVisisble) {
        whiteboardCont.style.visibility = 'hidden';
        boardVisisble = false;
    }
    else {
        whiteboardCont.style.visibility = 'visible';
        boardVisisble = true;
    }
})

cutCall.addEventListener('click', () => {
    if (projectId) {
        socket.emit('leave project', projectId, username);
    }
    location.href = '/';
})

// Proje mesajları için özel handler
socket.on('project message', (projectId, msg, sendername, time) => {
    chatRoom.scrollTop = chatRoom.scrollHeight;
    chatRoom.innerHTML += `<div class="message">
    <div class="info">
        <div class="username">${sendername}</div>
        <div class="time">${time}</div>
    </div>
    <div class="content">
        ${msg}
    </div>
</div>`
});

// Oda ayrılma (ör: sayfa kapatılırken)
window.addEventListener('beforeunload', () => {
    if (projectId && username) {
        socket.emit('leave project', projectId, username);
    }
});
