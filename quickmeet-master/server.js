const path = require('path');
const express = require('express')
const http = require('http')
const moment = require('moment');
const socketio = require('socket.io');
const fs = require('fs');
const https = require('https');
const mongoose = require('mongoose'); // Added mongoose
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./models/User');
const Project = require('./models/Project');
const ChatMessage = require('./models/ChatMessage');
const DrawingData = require('./models/DrawingData'); // Added DrawingData model
const ProjectNote = require('./models/ProjectNote'); // Added ProjectNote model
const { ExpressPeerServer } = require('peer'); // PeerJS sunucusu için

const PORT = process.env.PORT || 3000;

// MongoDB Connection URI (replace with your actual connection string)
const MONGO_URI = 'mongodb+srv://kaanyetimoglu5:1kDGYqKg5qYFc1Np@cluster0.r6fzhun.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'; // Updated MongoDB URI

mongoose.connect(MONGO_URI) // Removed deprecated options
    .then(() => {
        console.log('✅ MongoDB Connected successfully');
        console.log('🔗 Database URI:', MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
    })
    .catch(err => {
        console.error('❌ MongoDB Connection Error:', err.message);
        console.error('🔗 Attempted URI:', MONGO_URI.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'));
    });

// Define a schema for session data
const sessionSchema = new mongoose.Schema({ // Added Session Schema
    roomId: String,
    drawings: Array, // To store drawing actions
    notes: String, // To store text notes (can be expanded)
    canvasState: String // To store the current state of the canvas
});

const Session = mongoose.model('Session', sessionSchema); // Added Session Model

const app = express();

app.use(express.json()); // JSON body parser eklendi

// HTTPS için SSL sertifikaları
let server, io;
try {
    const options = {
        key: fs.readFileSync(path.join(__dirname, 'key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'cert.pem'))
    };
    server = https.createServer(options, app);
    io = socketio(server);
    console.log('✅ HTTPS server configured with SSL certificates');
} catch (error) {
    console.log('⚠️ SSL certificates not found, falling back to HTTP only');
    server = http.createServer(app);
    io = socketio(server);
}

const httpServer = http.createServer(app); // HTTP server eklendi
const httpIo = socketio(httpServer); // HTTP için Socket.IO

// PeerJS sunucusunu HTTPS sunucusuna entegre et - geçici olarak devre dışı
// const peerServer = ExpressPeerServer(server, {
//     debug: true,
//     path: '/myapp'
// });

// app.use('/peerjs', peerServer);

app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(session({
    secret: 'kasikmate-secret-key',
    resave: false,
    saveUninitialized: false
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// Passport local strategy
passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
        console.log('🔍 Login attempt for email:', email);
        const user = await User.findOne({ email });
        console.log('👤 User found:', user ? user.username : 'No user found');
        
        if (!user) return done(null, false, { message: 'Kullanıcı bulunamadı.' });
        
        console.log('🔐 Comparing password...');
        const isMatch = await user.comparePassword(password);
        console.log('🔓 Password match result:', isMatch);
        
        if (!isMatch) return done(null, false, { message: 'Şifre hatalı.' });
        return done(null, user);
    } catch (err) {
        console.error('❌ Passport strategy error:', err);
        return done(err);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});

let rooms = {};
let socketroom = {};
let socketname = {};
let micSocket = {};
let videoSocket = {};
let roomBoard = {};

// Socket.IO event handlers için ortak fonksiyon
function setupSocketHandlers(io) {
    io.on('connect', socket => {
        // Kullanıcı bir proje odasına katılır
        socket.on('join project', async (projectId, username) => {
            socket.join(projectId);
            socketname[socket.id] = username;
            // Oda üyelerine kullanıcı katıldı mesajı gönder
            socket.to(projectId).emit('message', `${username} projeye katıldı.`, 'Bot', moment().format("h:mm a"));
            // Proje chat geçmişini gönder
            const messages = await ChatMessage.find({ project: projectId }).populate('user', 'username email');
            socket.emit('project chat history', messages);
            // Proje çizim geçmişini gönder
            const drawings = await DrawingData.find({ project: projectId });
            socket.emit('project drawing history', drawings);
        });

    // Gerçek zamanlı chat mesajı gönderme
    socket.on('project message', async (projectId, username, userId, msg) => {
        const chatMessage = new ChatMessage({
            project: projectId,
            user: userId,
            message: msg
        });
        await chatMessage.save();
        io.to(projectId).emit('project message', {
            user: { _id: userId, username },
            message: msg,
            createdAt: new Date()
        });
    });

    // Gerçek zamanlı çizim verisi gönderme
    socket.on('project draw', async (projectId, userId, data) => {
        const drawing = new DrawingData({
            project: projectId,
            user: userId,
            data
        });
        await drawing.save();
        socket.to(projectId).emit('project draw', { user: userId, data });
    });

    // Oda ayrılma
    socket.on('leave project', (projectId, username) => {
        socket.leave(projectId);
        socket.to(projectId).emit('message', `${username} projeden ayrıldı.`, 'Bot', moment().format("h:mm a"));
    });

    socket.on("join room", async (roomid, username) => { // Added async

        socket.join(roomid);
        socketroom[socket.id] = roomid;
        socketname[socket.id] = username;
        micSocket[socket.id] = 'on';
        videoSocket[socket.id] = 'on';

        if (rooms[roomid] && rooms[roomid].length > 0) {
            rooms[roomid].push(socket.id);
            socket.to(roomid).emit('message', `${username} joined the room.`, 'Bot', moment().format(
                "h:mm a"
            ));
            io.to(socket.id).emit('join room', rooms[roomid].filter(pid => pid != socket.id), socketname, micSocket, videoSocket);
        }
        else {
            rooms[roomid] = [socket.id];
            io.to(socket.id).emit('join room', null, null, null, null);
            // Create a new session if it doesn't exist
            try { // Added try-catch for session creation
                let session = await Session.findOne({ roomId: roomid });
                if (!session) {
                    session = new Session({ roomId: roomid, drawings: [], notes: '', canvasState: '' });
                    await session.save();
                    console.log(`Session created for room ${roomid}`);
                } else {
                    console.log(`Session found for room ${roomid}`);
                }
            } catch (err) {
                console.error('Error creating or finding session:', err);
            }
        }

        io.to(roomid).emit('user count', rooms[roomid].length);

    });

    socket.on('action', msg => {
        if (msg == 'mute')
            micSocket[socket.id] = 'off';
        else if (msg == 'unmute')
            micSocket[socket.id] = 'on';
        else if (msg == 'videoon')
            videoSocket[socket.id] = 'on';
        else if (msg == 'videooff')
            videoSocket[socket.id] = 'off';

        socket.to(socketroom[socket.id]).emit('action', msg, socket.id);
    })

    socket.on('video-offer', (offer, sid) => {
        socket.to(sid).emit('video-offer', offer, socket.id, socketname[socket.id], micSocket[socket.id], videoSocket[socket.id]);
    })

    socket.on('video-answer', (answer, sid) => {
        socket.to(sid).emit('video-answer', answer, socket.id);
    })

    socket.on('new icecandidate', (candidate, sid) => {
        socket.to(sid).emit('new icecandidate', candidate, socket.id);
    })

    socket.on('message', (msg, username, roomid) => {
        io.to(roomid).emit('message', msg, username, moment().format(
            "h:mm a"
        ));
    })

    socket.on('getCanvas', async () => { // Added async
        if (roomBoard[socketroom[socket.id]])
            socket.emit('getCanvas', roomBoard[socketroom[socket.id]]);
        else { // Added else block to fetch from DB
            try {
                const session = await Session.findOne({ roomId: socketroom[socket.id] });
                if (session && session.canvasState) {
                    roomBoard[socketroom[socket.id]] = session.canvasState;
                    socket.emit('getCanvas', session.canvasState);
                }
            } catch (err) {
                console.error('Error fetching canvas state from DB:', err);
            }
        }
    });

    socket.on('draw', async (newx, newy, prevx, prevy, color, size) => { // Added async
        socket.to(socketroom[socket.id]).emit('draw', newx, newy, prevx, prevy, color, size);
        // Save drawing action to DB
        try { // Added try-catch for saving drawing
            await Session.updateOne(
                { roomId: socketroom[socket.id] },
                { $push: { drawings: { newx, newy, prevx, prevy, color, size, timestamp: new Date() } } }
            );
        } catch (err) {
            console.error('Error saving drawing to DB:', err);
        }
    })

    socket.on('clearBoard', async () => { // Added async
        socket.to(socketroom[socket.id]).emit('clearBoard');
        // Clear drawings and canvas state in DB
        try { // Added try-catch for clearing board
            await Session.updateOne(
                { roomId: socketroom[socket.id] },
                { $set: { drawings: [], canvasState: '' } }
            );
            roomBoard[socketroom[socket.id]] = ''; // Clear in-memory cache as well
        } catch (err) {
            console.error('Error clearing board in DB:', err);
        }
    });

    socket.on('store canvas', async url => { // Added async
        roomBoard[socketroom[socket.id]] = url;
        // Save canvas state to DB
        try { // Added try-catch for storing canvas
            await Session.updateOne(
                { roomId: socketroom[socket.id] },
                { $set: { canvasState: url } }
            );
        } catch (err) {
            console.error('Error storing canvas state to DB:', err);
        }
    })

    socket.on('disconnect', () => {
        if (!socketroom[socket.id]) return;
        socket.to(socketroom[socket.id]).emit('message', `${socketname[socket.id]} left the chat.`, `Bot`, moment().format(
            "h:mm a"
        ));
        socket.to(socketroom[socket.id]).emit('remove peer', socket.id);
        var index = rooms[socketroom[socket.id]].indexOf(socket.id);
        rooms[socketroom[socket.id]].splice(index, 1);
        io.to(socketroom[socket.id]).emit('user count', rooms[socketroom[socket.id]].length);        delete socketroom[socket.id];
        console.log('--------------------');
        console.log(rooms[socketroom[socket.id]]);

        //toDo: push socket.id out of rooms
    });
    });
}

// Her iki server için Socket.IO handler'larını kur
setupSocketHandlers(io);
setupSocketHandlers(httpIo);


// Server'ları başlat
server.listen(PORT, '0.0.0.0', () => {
    const serverType = server.constructor.name === 'Server' ? 'HTTP' : 'HTTPS';
    console.log(`✅ ${serverType} Server is up and running on port ${PORT}`);
    console.log(`🌐 Local access: ${serverType.toLowerCase()}://localhost:${PORT}`);
    if (serverType === 'HTTPS') {
        console.log(`⚠️  For external access, users need to accept self-signed certificate`);
    }
});

httpServer.listen(3001, '0.0.0.0', () => {
    console.log(`✅ HTTP Server is up and running on port 3001`);
    console.log(`🌐 Local access: http://localhost:3001`);
    console.log(`⚠️  External HTTP access will have media capture restrictions`);
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ 
        message: 'Sunucu hatası oluştu.', 
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
});

// Authentication Routes
// Kullanıcı kayıt
app.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    console.log('Register attempt:', { username, email, password: '***' });
    
    try {
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            console.log('Registration failed: User already exists');
            return res.status(400).json({ message: 'Bu e-posta veya kullanıcı adı zaten kullanılıyor.' });
        }
        
        const user = new User({ username, email, password });
        await user.save();
        console.log('Registration successful for user:', username);
        res.status(201).json({ message: 'Kullanıcı başarıyla kaydedildi.' });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(400).json({ message: 'Kayıt işlemi başarısız.', error: err.message });
    }
});

// Kullanıcı giriş
app.post('/login', (req, res, next) => {
    console.log('Login attempt:', req.body);
    passport.authenticate('local', (err, user, info) => {
        console.log('Passport authenticate result:', { err, user: user ? user.username : null, info });
        if (err) {
            console.error('Login error:', err);
            return next(err);
        }
        if (!user) {
            console.log('Login failed:', info.message);
            return res.status(400).json({ message: info.message });
        }
        req.logIn(user, (err) => {
            if (err) {
                console.error('Session login error:', err);
                return next(err);
            }
            console.log('Login successful for user:', user.username);
            res.json({ 
                message: 'Giriş başarılı.', 
                user: {
                    _id: user._id,
                    username: user.username,
                    email: user.email
                }
            });
        });
    })(req, res, next);
});

// Debug: Kullanıcı listesi (sadece geliştirme aşamasında)
app.get('/debug/users', async (req, res) => {
    try {
        const users = await User.find({}, 'username email createdAt');
        res.json({
            count: users.length,
            users: users
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Kullanıcı durumu kontrolü
app.get('/check-auth', (req, res) => {
    if (req.isAuthenticated()) {
        res.json({ username: req.user.username, email: req.user.email, _id: req.user._id });
    } else {
        res.status(401).json({ message: 'Giriş yapılmamış.' });
    }
});

// Kullanıcı çıkış
app.post('/logout', (req, res) => {
    req.logout((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ message: 'Çıkış işlemi başarısız.' });
        }
        req.session.destroy((err) => {
            if (err) {
                console.error('Session destroy error:', err);
                return res.status(500).json({ message: 'Oturum sonlandırılamadı.' });
            }
            res.clearCookie('connect.sid');
            res.json({ message: 'Başarıyla çıkış yapıldı.' });
        });
    });
});

// Proje oluşturma (sadece giriş yapmış kullanıcılar için)
app.post('/projects', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: 'Giriş yapmalısınız.' });
    const { name, description } = req.body;
    try {
        const project = new Project({
            name,
            description,
            owner: req.user._id,
            members: [req.user._id]
        });
        await project.save();
        res.status(201).json({ message: 'Proje oluşturuldu.', project });
    } catch (err) {
        res.status(400).json({ message: 'Proje oluşturulamadı.', error: err.message });
    }
});

// Kullanıcının projelerini listeleme
app.get('/projects', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: 'Giriş yapmalısınız.' });
    try {
        console.log('🔍 Loading projects for user:', req.user.username);
        const projects = await Project.find({ members: req.user._id })
            .populate('owner', 'username email')
            .sort({ createdAt: -1 });
        console.log('📋 Found projects:', projects.length);
        res.json({ projects });
    } catch (err) {
        console.error('❌ Get projects error:', err);
        res.status(400).json({ message: 'Projeler alınamadı.', error: err.message });
    }
});

// Proje silme (sadece proje sahibi silebilir)
app.delete('/projects/:projectId', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: 'Giriş yapmalısınız.' });
    
    try {
        const projectId = req.params.projectId;
        console.log('🗑️ Delete request for project:', projectId, 'by user:', req.user.username);
        
        // Projeyi bul
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Proje bulunamadı.' });
        }
        
        // Sadece proje sahibi silebilir
        if (project.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bu projeyi silme yetkiniz yok.' });
        }
        
        // Projeyi sil
        await Project.findByIdAndDelete(projectId);
        
        // İlişkili verileri de sil (opsiyonel)
        await ChatMessage.deleteMany({ project: projectId });
        await ProjectNote.deleteMany({ project: projectId });
        await DrawingData.deleteMany({ project: projectId });
        
        console.log('✅ Project deleted successfully:', projectId);
        res.json({ message: 'Proje başarıyla silindi.' });
        
    } catch (err) {
        console.error('❌ Delete project error:', err);
        res.status(500).json({ message: 'Proje silinirken hata oluştu.', error: err.message });
    }
});

// Belirli bir projenin chat mesajlarını getirme
app.get('/projects/:projectId/chat', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: 'Giriş yapmalısınız.' });
    try {
        const messages = await ChatMessage.find({ project: req.params.projectId }).populate('user', 'username email');
        res.json({ messages });
    } catch (err) {
        res.status(400).json({ message: 'Mesajlar alınamadı.', error: err.message });
    }
});

// Belirli bir projeye chat mesajı ekleme
app.post('/projects/:projectId/chat', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: 'Giriş yapmalısınız.' });
    const { message } = req.body;
    try {
        const chatMessage = new ChatMessage({
            project: req.params.projectId,
            user: req.user._id,
            message
        });
        await chatMessage.save();
        res.status(201).json({ message: 'Mesaj gönderildi.', chatMessage });
    } catch (err) {
        res.status(400).json({ message: 'Mesaj gönderilemedi.', error: err.message });
    }
});

// Proje bazlı çizim verisi ekleme
app.post('/projects/:projectId/drawings', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: 'Giriş yapmalısınız.' });
    const { data } = req.body;
    try {
        const drawing = new DrawingData({
            project: req.params.projectId,
            user: req.user._id,
            data
        });
        await drawing.save();
        res.status(201).json({ message: 'Çizim kaydedildi.', drawing });
    } catch (err) {
        res.status(400).json({ message: 'Çizim kaydedilemedi.', error: err.message });
    }
});

// Proje bazlı çizim verilerini getirme
app.get('/projects/:projectId/drawings', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: 'Giriş yapmalısınız.' });
    try {
        const drawings = await DrawingData.find({ project: req.params.projectId });
        res.json({ drawings });
    } catch (err) {
        res.status(400).json({ message: 'Çizimler alınamadı.', error: err.message });
    }
});

// Proje Note API'leri
// Proje notlarını getirme
app.get('/projects/:projectId/notes', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: 'Giriş yapmalısınız.' });
    try {
        const notes = await ProjectNote.find({ project: req.params.projectId }).populate('user', 'username');
        res.json({ notes });
    } catch (err) {
        res.status(400).json({ message: 'Notlar alınamadı.', error: err.message });
    }
});

// Proje notu oluşturma
app.post('/projects/:projectId/notes', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: 'Giriş yapmalısınız.' });
    const { content } = req.body;
    try {
        const note = new ProjectNote({
            project: req.params.projectId,
            user: req.user._id,
            content
        });
        await note.save();
        res.status(201).json({ message: 'Not oluşturuldu.', note });
    } catch (err) {
        res.status(400).json({ message: 'Not oluşturulamadı.', error: err.message });
    }
});

// Proje notunu güncelleme
app.put('/projects/:projectId/notes/:noteId', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: 'Giriş yapmalısınız.' });
    const { content } = req.body;
    try {
        const note = await ProjectNote.findByIdAndUpdate(
            req.params.noteId, 
            { content, updatedAt: new Date() }, 
            { new: true }
        );
        if (!note) return res.status(404).json({ message: 'Not bulunamadı.' });
        res.json({ message: 'Not güncellendi.', note });
    } catch (err) {
        res.status(400).json({ message: 'Not güncellenemedi.', error: err.message });
    }
});

// Proje notunu silme
app.delete('/projects/:projectId/notes/:noteId', async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: 'Giriş yapmalısınız.' });
    try {
        const note = await ProjectNote.findByIdAndDelete(req.params.noteId);
        if (!note) return res.status(404).json({ message: 'Not bulunamadı.' });
        res.json({ message: 'Not silindi.' });
    } catch (err) {
        res.status(400).json({ message: 'Not silinemedi.', error: err.message });
    }
});