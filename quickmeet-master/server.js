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
const cors = require('cors'); // CORS paketi eklendi

// Import middleware
const { ensureAuthenticated, ensureProjectOwner, ensureProjectMemberOrOwner } = require('./middleware/auth');

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

// SSL Certificate files for HTTPS
const privateKey = fs.readFileSync(path.join(__dirname, '..', 'key.pem'), 'utf8');
const certificate = fs.readFileSync(path.join(__dirname, '..', 'cert.pem'), 'utf8');
const credentials = { key: privateKey, cert: certificate };

// CORS middleware'ini burada kullanın
app.use(cors({
    origin: ['https://localhost:3000', 'https://192.168.1.100:3000', 'http://localhost:3000'], // Support both HTTPS and HTTP
    credentials: true // Kimlik bilgileriyle (cookie vs.) isteklere izin ver
}));

// EJS View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json()); // JSON body parser eklendi
app.use(express.urlencoded({ extended: true })); // URL-encoded body parser for form submissions

// Serve static files from the "public" directory (MOVED UP)
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware (MOVED UP)
app.use(session({
    secret: 'kasikmate-secret-key',
    resave: false,
    saveUninitialized: false
}));

// Passport middleware (MOVED UP)
app.use(passport.initialize());
app.use(passport.session());

// Ana Sayfa Route
app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/dashboard');
    }
    res.render('index'); 
});

// Authentication Routes
app.get('/register', (req, res) => {
    console.log("GET /register route hit!"); // Bu logu görmelisiniz
    try {
        res.render('register', { error: null });
    } catch (renderError) {
        console.error("Error rendering register.ejs:", renderError);
        res.status(500).send("Error rendering registration page.");
    }
});

app.post('/register', async (req, res) => {
    const { username, email, password, skills } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.render('register', { error: 'Bu e-posta adresi zaten kayıtlı.' });
        }
        user = new User({
            username,
            email,
            password,
            skills: skills ? skills.split(',').map(skill => skill.trim()) : []
        });
        await user.save();
        res.redirect('/login');
    } catch (err) {
        console.error('Kayıt sırasında hata:', err);
        res.render('register', { error: 'Kayıt sırasında bir hata oluştu. Lütfen tekrar deneyin.' });
    }
});

app.get('/login', (req, res) => {
    const errorMessages = req.session.messages || [];
    req.session.messages = []; 
    res.render('login', { error: errorMessages.length > 0 ? errorMessages[0] : null });
});

// POST /login route (ensuring it's correctly placed before static and other general routes)
app.post('/login', passport.authenticate('local', {
    successRedirect: '/dashboard', // Should redirect to the new EJS dashboard
    failureRedirect: '/login',     // On failure, redirect back to login
    failureMessage: true           // Store error messages in session
}));

app.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

// POST logout route for AJAX requests
app.post('/logout', (req, res, next) => {
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

// Check authentication status route
app.get('/check-auth', (req, res) => {
    if (req.isAuthenticated()) {
        // Kullanıcı bilgilerini döndürürken şifre gibi hassas verileri dışarıda bırakın
        const { _id, username, email, skills } = req.user;
        res.json({ isAuthenticated: true, user: { _id, username, email, skills } });
    } else {
        res.status(401).json({ isAuthenticated: false, message: 'Kullanıcı doğrulanmadı.' });
    }
});

// Dashboard Route
app.get('/dashboard', ensureAuthenticated, async (req, res) => {
    try {
        // Kullanıcının sahip olduğu veya üyesi olduğu projeleri çek
        const projects = await Project.find({
            $or: [
                { owner: req.user._id }, // Kullanıcının sahip olduğu projeler
                { 'members.user': req.user._id } // Kullanıcının üyesi olduğu projeler
            ]
        })
        .populate('owner', 'username email')
        .populate('members.user', 'username email')
        .sort({ createdAt: -1 });
        
        // Debug için log'lar ekle
        console.log('Dashboard - User ID:', req.user._id.toString());
        console.log('Dashboard - Projects found:', projects.length);
        if (projects.length > 0) {
            projects.forEach((project, index) => {
                console.log(`Project ${index + 1}:`);
                console.log('  - Name:', project.name);
                console.log('  - Owner ID:', project.owner ? project.owner._id.toString() : 'No owner');
                console.log('  - Is user owner?', project.owner && project.owner._id.toString() === req.user._id.toString());
                console.log('  - Members count:', project.members ? project.members.length : 0);
            });
        }
        
        res.render('dashboard', { 
            user: req.user, // Oturum açmış kullanıcı bilgisi
            projects: projects // Kullanıcının erişebileceği projeler
        });
    } catch (err) {
        console.error("Error rendering dashboard:", err);
        res.status(500).send("Dashboard yüklenirken bir hata oluştu.");
    }
});

// Project Routes
// Create a new project
app.post('/projects', ensureAuthenticated, async (req, res) => {
    const { name, description } = req.body;
    try {
        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Proje adı gereklidir.' });
        }        const newProject = new Project({
            name: name.trim(),
            description: description ? description.trim() : '',
            owner: req.user._id,
            members: [{ 
                user: req.user._id, 
                role: 'owner' 
            }] // Sahibi otomatik olarak owner rolüyle üye
        });
        await newProject.save();
        res.status(201).json({ message: 'Proje başarıyla oluşturuldu.', project: newProject });
    } catch (err) {
        console.error('Error creating project:', err);
        res.status(500).json({ message: 'Proje oluşturulurken sunucu hatası oluştu.', error: err.message });
    }
});

// Get user's projects (Bu route dashboard.js tarafından kullanılacak)
app.get('/projects', ensureAuthenticated, async (req, res) => {
    try {
        // Kullanıcının sahip olduğu veya üyesi olduğu projeleri çek
        const projects = await Project.find({
            $or: [
                { owner: req.user._id }, // Kullanıcının sahip olduğu projeler
                { 'members.user': req.user._id } // Kullanıcının üyesi olduğu projeler
            ]
        })
        .populate('owner', 'username email')
        .populate('members.user', 'username email')
        .sort({ createdAt: -1 });
        
        res.json({ projects }); // Projeleri { projects: [...] } formatında gönder
    } catch (err) {
        console.error('Error fetching projects:', err);
        res.status(500).json({ message: 'Projeler alınırken sunucu hatası oluştu.', error: err.message });
    }
});

// Get notes for a project
app.get('/projects/:projectId/notes', ensureAuthenticated, async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const notes = await ProjectNote.find({ project: projectId })
            .populate('user', 'username email _id') 
            .sort({ createdAt: -1 }); 

        res.json({ notes });
    } catch (err) {
        console.error(`Error fetching notes for project ${req.params.projectId}:`, err);
        res.status(500).json({ message: 'Notlar alınırken sunucu hatası oluştu.', error: err.message });
    }
});

// Create a new note for a project
app.post('/projects/:projectId/notes', ensureAuthenticated, async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const { content } = req.body;
        const userId = req.user._id;

        if (!content || content.trim() === '') {
            return res.status(400).json({ message: 'Not içeriği boş olamaz.' });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Proje bulunamadı.' });
        }

        const newNote = new ProjectNote({
            project: projectId,
            user: userId,
            content: content.trim()
        });        await newNote.save();
        const populatedNote = await ProjectNote.findById(newNote._id).populate('user', 'username email _id');
        
        // Socket.IO ile gerçek zamanlı not ekleme bildirimi
        if (io) {
            io.to(projectId).emit('note created', {
                note: populatedNote,
                projectId: projectId
            });
        }
        
        res.status(201).json({ message: 'Not başarıyla oluşturuldu.', note: populatedNote });

    } catch (err) {
        console.error(`Error creating note for project ${req.params.projectId}:`, err);
        res.status(500).json({ message: 'Not oluşturulurken sunucu hatası oluştu.', error: err.message });
    }
});

// Update an existing note
app.put('/projects/:projectId/notes/:noteId', ensureAuthenticated, async (req, res) => {
    try {
        const { projectId, noteId } = req.params;
        const { content } = req.body;
        const userId = req.user._id;

        if (!content || content.trim() === '') {
            return res.status(400).json({ message: 'Not içeriği boş olamaz.' });
        }

        const note = await ProjectNote.findById(noteId);

        if (!note) {
            return res.status(404).json({ message: 'Not bulunamadı.' });
        }

        if (note.user.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Bu notu düzenleme yetkiniz yok.' });
        }
        
        if (note.project.toString() !== projectId) {
             return res.status(400).json({ message: 'Not bu projeye ait değil.' });
        }

        note.content = content.trim();
        note.updatedAt = Date.now();

        await note.save();
        const populatedNote = await ProjectNote.findById(note._id).populate('user', 'username email _id');

        res.status(200).json({ message: 'Not başarıyla güncellendi.', note: populatedNote });

    } catch (err) {
        console.error(`Error updating note ${req.params.noteId} for project ${req.params.projectId}:`, err);
        res.status(500).json({ message: 'Not güncellenirken sunucu hatası oluştu.', error: err.message });
    }
});

// Delete a note
app.delete('/projects/:projectId/notes/:noteId', ensureAuthenticated, async (req, res) => {
    try {
        const { projectId, noteId } = req.params;
        const userId = req.user._id;

        const note = await ProjectNote.findById(noteId);

        if (!note) {
            return res.status(404).json({ message: 'Not bulunamadı.' });
        }

        if (note.user.toString() !== userId.toString()) {
             return res.status(403).json({ message: 'Bu notu silme yetkiniz yok.' });
        }

        if (note.project.toString() !== projectId) {
            return res.status(400).json({ message: 'Not bu projeye ait değil.' });
        }

        await ProjectNote.findByIdAndDelete(noteId);

        res.status(200).json({ message: 'Not başarıyla silindi.' });    } catch (err) {
        console.error(`Error deleting note ${req.params.noteId} for project ${req.params.projectId}:`, err);
        res.status(500).json({ message: 'Not silinirken sunucu hatası oluştu.', error: err.message });
    }
});

// Delete a project (only project owner can delete)
app.delete('/projects/:projectId', ensureAuthenticated, ensureProjectOwner, async (req, res) => {
    try {
        const projectId = req.params.projectId;
        console.log('🗑️ Delete request for project:', projectId, 'by user:', req.user.username);

        // Proje bilgisi middleware'den geliyor (req.project)
        const project = req.project;

        // Delete the project
        await Project.findByIdAndDelete(projectId);

        // Also delete related data (optional but recommended)
        await ChatMessage.deleteMany({ project: projectId });
        await ProjectNote.deleteMany({ project: projectId });
        await DrawingData.deleteMany({ project: projectId });

        console.log('✅ Project deleted successfully:', projectId);
        res.status(200).json({ message: 'Proje başarıyla silindi.' });

    } catch (err) {
        console.error('❌ Delete project error:', err);
        res.status(500).json({ message: 'Proje silinirken hata oluştu.', error: err.message });
    }
});

// Add member to project (only project owner can add members)
app.post('/projects/:projectId/members', ensureAuthenticated, ensureProjectOwner, async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const { username } = req.body;

        if (!username || username.trim() === '') {
            return res.status(400).json({ message: 'Kullanıcı adı gereklidir.' });
        }

        // Kullanıcıyı bul
        const userToAdd = await User.findOne({ username: username.trim() });
        if (!userToAdd) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }

        // Proje bilgisi middleware'den geliyor (req.project)
        const project = req.project;

        // Kullanıcı zaten üye mi kontrol et
        const isAlreadyMember = project.members.some(member => 
            member.user.toString() === userToAdd._id.toString()
        );

        if (isAlreadyMember) {
            return res.status(400).json({ message: 'Kullanıcı zaten proje üyesi.' });
        }

        // Kullanıcıyı editör olarak ekle
        project.members.push({
            user: userToAdd._id,
            role: 'editor'
        });

        await project.save();

        // Güncellenmiş proje bilgisini üye bilgileriyle birlikte döndür
        const updatedProject = await Project.findById(projectId)
            .populate('owner', 'username email')
            .populate('members.user', 'username email');

        console.log(`✅ User ${userToAdd.username} added to project ${project.name} as editor by ${req.user.username}`);

        res.status(200).json({ 
            message: 'Kullanıcı başarıyla projeye eklendi.',
            member: {
                user: {
                    _id: userToAdd._id,
                    username: userToAdd.username,
                    email: userToAdd.email
                },
                role: 'editor'
            },
            project: updatedProject
        });

    } catch (err) {
        console.error('❌ Add member error:', err);
        res.status(500).json({ message: 'Üye eklenirken hata oluştu.', error: err.message });
    }
});

// Get project members (only project members can view)
app.get('/projects/:projectId/members', ensureAuthenticated, ensureProjectMemberOrOwner, async (req, res) => {
    try {
        // Proje bilgisi middleware'den geliyor (req.project)
        const project = await Project.findById(req.params.projectId)
            .populate('owner', 'username email skills')
            .populate('members.user', 'username email skills');

        if (!project) {
            return res.status(404).json({ message: 'Proje bulunamadı.' });
        }

        res.status(200).json({ 
            members: project.members,
            owner: project.owner
        });

    } catch (err) {
        console.error('❌ Get members error:', err);
        res.status(500).json({ message: 'Üyeler alınırken hata oluştu.', error: err.message });
    }
});

// Remove member from project (only project owner can remove members)
app.delete('/projects/:projectId/members/:userId', ensureAuthenticated, ensureProjectOwner, async (req, res) => {
    try {
        const { projectId, userId } = req.params;

        // Proje bilgisi middleware'den geliyor (req.project)
        const project = req.project;

        // Sahibi silinmeye çalışılıyor mu kontrol et
        if (project.owner.toString() === userId) {
            return res.status(400).json({ message: 'Proje sahibi projeden çıkarılamaz.' });
        }

        // Üyeyi bul ve çıkar
        const memberIndex = project.members.findIndex(member => 
            member.user.toString() === userId
        );

        if (memberIndex === -1) {
            return res.status(404).json({ message: 'Kullanıcı proje üyesi değil.' });
        }

        const removedMember = project.members[memberIndex];
        project.members.splice(memberIndex, 1);

        await project.save();

        console.log(`✅ User ${userId} removed from project ${project.name} by ${req.user.username}`);

        res.status(200).json({ 
            message: 'Kullanıcı başarıyla projeden çıkarıldı.',
            removedMember: removedMember
        });

    } catch (err) {
        console.error('❌ Remove member error:', err);
        res.status(500).json({ message: 'Üye çıkarılırken hata oluştu.', error: err.message });
    }
});

// Canvas Drawing Data Routes
// Save canvas drawing data
app.post('/projects/:projectId/drawing', ensureAuthenticated, ensureProjectMemberOrOwner, async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const { data } = req.body;

        if (!data) {
            return res.status(400).json({ message: 'Canvas verisi gereklidir.' });
        }

        // Proje bilgisi middleware'den geliyor (req.project)
        const project = req.project;

        // Yeni çizim verisi oluştur
        const drawingData = new DrawingData({
            project: projectId,
            user: req.user._id,
            data: data
        });

        await drawingData.save();

        console.log(`✅ Canvas data saved for project ${project.name} by ${req.user.username}`);

        res.status(201).json({ 
            message: 'Canvas verisi başarıyla kaydedildi.',
            drawingData: {
                _id: drawingData._id,
                project: drawingData.project,
                user: drawingData.user,
                createdAt: drawingData.createdAt
            }
        });

    } catch (err) {
        console.error('❌ Save canvas data error:', err);
        res.status(500).json({ message: 'Canvas verisi kaydedilirken hata oluştu.', error: err.message });
    }
});

// Get latest canvas drawing data
app.get('/projects/:projectId/drawing', ensureAuthenticated, ensureProjectMemberOrOwner, async (req, res) => {
    try {
        const projectId = req.params.projectId;

        // En son kaydedilen çizim verisini al
        const latestDrawing = await DrawingData.findOne({ project: projectId })
            .sort({ createdAt: -1 })
            .populate('user', 'username');

        if (!latestDrawing) {
            return res.status(404).json({ message: 'Bu proje için çizim verisi bulunamadı.' });
        }

        console.log(`✅ Canvas data retrieved for project ${projectId}`);

        res.status(200).json({ 
            message: 'Canvas verisi başarıyla alındı.',
            drawingData: latestDrawing
        });

    } catch (err) {
        console.error('❌ Get canvas data error:', err);
        res.status(500).json({ message: 'Canvas verisi alınırken hata oluştu.', error: err.message });
    }
});

// Get all canvas drawing data for a project (history)
app.get('/projects/:projectId/drawing/history', ensureAuthenticated, ensureProjectMemberOrOwner, async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const { limit = 10, skip = 0 } = req.query;

        // Çizim verisi geçmişini al
        const drawingHistory = await DrawingData.find({ project: projectId })
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(skip))
            .populate('user', 'username email')
            .select('-data'); // Büyük veri boyutu nedeniyle data alanını hariç tut

        const totalCount = await DrawingData.countDocuments({ project: projectId });

        console.log(`✅ Canvas history retrieved for project ${projectId}, ${drawingHistory.length} items`);

        res.status(200).json({ 
            message: 'Canvas geçmişi başarıyla alındı.',
            history: drawingHistory,
            pagination: {
                total: totalCount,
                limit: parseInt(limit),
                skip: parseInt(skip),
                hasMore: totalCount > (parseInt(skip) + parseInt(limit))
            }
        });

    } catch (err) {
        console.error('❌ Get canvas history error:', err);
        res.status(500).json({ message: 'Canvas geçmişi alınırken hata oluştu.', error: err.message });
    }
});

// Project Settings Route (only project owner can access)
app.get('/projects/:projectId/settings', ensureAuthenticated, ensureProjectOwner, async (req, res) => {
    try {
        // Proje bilgisi middleware'den geliyor (req.project)
        const project = await Project.findById(req.params.projectId)
            .populate('owner', 'username email skills')
            .populate('members.user', 'username email skills');

        if (!project) {
            return res.status(404).send('Proje bulunamadı.');
        }

        console.log(`✅ User ${req.user.username} accessing settings for project: ${project.name}`);

        res.render('project-settings', { 
            user: req.user, 
            project: project
        });
    } catch (err) {
        console.error("Error rendering project settings:", err);
        res.status(500).send("Proje ayarları yüklenirken bir hata oluştu.");
    }
});

// HTTPS için SSL sertifikaları
let server, io;

// HTTPS Configuration - ENABLED
try {
    const options = {
        key: fs.readFileSync(path.join(__dirname, 'key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'cert.pem'))
    };
    server = https.createServer(options, app);
    io = socketio(server, {
        cors: {
            origin: ["https://localhost:3000", "https://192.168.1.100:3000"], // Allow both localhost and network IP
            methods: ["GET", "POST"],
            credentials: true
        }
    });
    console.log('✅ HTTPS server configured with SSL certificates');
} catch (error) {
    console.error('❌ SSL certificates not found:', error.message);
    console.log('📁 Looking for cert files in:', __dirname);
    console.log('⚠️ Falling back to HTTP mode');
    
    server = http.createServer(app);
    io = socketio(server, {
        cors: {
            origin: ["http://localhost:3000", "http://192.168.1.100:3000"], 
            methods: ["GET", "POST"],
            credentials: true
        }
    });
}

// PeerJS sunucusunu HTTPS/HTTP sunucusuna entegre et
const peerServer = ExpressPeerServer(server, {
    debug: true,
    path: '/' // Changed from '/peerjs' to '/' for simpler path resolution
});
app.use('/peerjs', peerServer);
console.log('✅ PeerJS server configured on /peerjs');

// app.use(express.static(path.join(__dirname, 'public'))); // MOVED UP - This line is now earlier

// Session middleware - BU BLOK YUKARI TAŞINDI, BURADAN SİLİNECEK
/*
app.use(session({
    secret: 'kasikmate-secret-key',
    resave: false,
    saveUninitialized: false
}));
*/

// Passport middleware - BU BLOK YUKARI TAŞINDI, BURADAN SİLİNECEK
/*
app.use(passport.initialize());
app.use(passport.session());
*/

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

// Eski genel oda yönetimi değişkenleri yorum satırına alındı
// let rooms = {};
// let socketroom = {};
// let socketname = {};
// let micSocket = {};
// let videoSocket = {};
// let roomBoard = {};

// Proje bazlı kullanıcıları ve socket bilgilerini tutmak için yeni yapılar
const projectUsers = {}; // Format: { projectId: { socketId: { userId, username }, ... }, ... }
const socketToProjectMap = {}; // Format: { socketId: projectId, ... }
const socketToUserMap = {}; // Format: { socketId: { userId, userName, projectId }, ... }

// Socket.IO event handlers için ortak fonksiyon
function setupSocketHandlers(io) {
    io.on('connection', (socket) => {
        console.log(`SERVER: Socket connected: ${socket.id}`);

        socket.on('join project', async (projectId, userName, userId) => {
            console.log(`SERVER: 'join project' event received for project ${projectId}, user ${userName} (${userId}), socket ${socket.id}`);
            if (!projectId || !userName || !userId) {
                console.error('join project: Missing parameters', { projectId, userName, userId });
                return;
            }

            socket.join(projectId);
            // Store user information associated with this socket
            socketToUserMap[socket.id] = { userId, userName, projectId };
            socketToProjectMap[socket.id] = projectId; // Bu satır eklendi

            // Add user to project's user list if not already there
            if (!projectUsers[projectId]) {
                projectUsers[projectId] = [];
            }
            const userInProject = projectUsers[projectId].find(u => u.userId === userId);
            if (!userInProject) {
                projectUsers[projectId].push({ userId, userName, socketId: socket.id });
            } else {
                // Update socketId if user reconnected with a new socket
                userInProject.socketId = socket.id;
                console.log(`SERVER: User ${userName} (${userId}) reconnected/updated socket ID in project ${projectId}.`);
            }
            
            console.log(`${userName} (${userId}) joined project: ${projectId}. Socket: ${socket.id}`);
            
            // Send the current list of users in the project to the newly joined user
            const usersInProjectList = projectUsers[projectId].map(u => ({ name: u.userName, id: u.userId, socketId: u.socketId }));
            socket.emit('project-users-list', usersInProjectList);
            console.log(`project-users-list sent to ${userName} (${userId}): `, usersInProjectList);


            // Notify other users in the project
            socket.to(projectId).emit('user-joined', { name: userName, id: userId, socketId: socket.id });
            console.log(`SERVER: user-joined event emitted in project ${projectId} for: ${userName} (${userId})`);
            console.log(`SERVER: 'join project' event processing completed for socket ${socket.id}`);

            try {
                const messages = await ChatMessage.find({ project: projectId }).populate('user', '_id username email').sort({ createdAt: 1 });
                socket.emit('project chat history', messages);
            } catch (err) {
                console.error(`Error fetching chat history for project ${projectId}:`, err);
            }
        });

        socket.on('project message', async (projectId, msg) => {
            // const userInfo = projectUsers[projectId]?.[socket.id]; // Eski hatalı arama
            const userInfo = projectUsers[projectId]?.find(u => u.socketId === socket.id); // Düzeltilmiş arama
            if (!userInfo) {
                console.error('project message: User info not found. Socket ID:', socket.id, 'Project ID:', projectId);
                return;
            }
            const { userId, username } = userInfo;

            try {
                const chatMessage = new ChatMessage({
                    project: projectId,
                    user: userId,
                    message: msg
                });
                await chatMessage.save();
                
                io.to(projectId).emit('project message', {
                    user: { _id: userId, username },
                    message: msg,
                    createdAt: chatMessage.createdAt
                });
            } catch (err) {
                console.error(`Error saving/sending chat message for project ${projectId}:`, err);
            }
        });        socket.on('project draw', async (projectId, drawData) => {
            // const userInfo = projectUsers[projectId]?.[socket.id]; // Eski hatalı arama
            const userInfo = projectUsers[projectId]?.find(u => u.socketId === socket.id); // Düzeltilmiş arama
            if (!userInfo) {
                console.error('project draw: User info not found. Socket ID:', socket.id, 'Project ID:', projectId);
                return;
            }
            const { userId } = userInfo;

            try {
                const drawing = new DrawingData({
                    project: projectId,
                    user: userId,
                    data: drawData
                });
                await drawing.save();
            } catch (err) {
                console.error(`Error saving drawing data for project ${projectId}:`, err);
            }
            
            socket.to(projectId).emit('project draw', { user: userId, data: drawData });
        });        // Real-time note synchronization
        socket.on('note created', async (projectId, noteData) => {
            const userInfo = projectUsers[projectId]?.find(u => u.socketId === socket.id);
            if (!userInfo) {
                console.error('note created: User info not found. Socket ID:', socket.id, 'Project ID:', projectId);
                return;
            }
            const { userId, userName } = userInfo;

            try {
                // Create the note in database
                const note = new ProjectNote({
                    project: projectId,
                    user: userId,
                    title: noteData.title || '',
                    content: noteData.content
                });
                await note.save();

                // Broadcast to all users in the project
                io.to(projectId).emit('note created', {
                    id: note._id,
                    title: note.title,
                    content: note.content,
                    user: { _id: userId, username: userName },
                    createdAt: note.createdAt,
                    updatedAt: note.updatedAt
                });

                console.log(`Note created in project ${projectId} by user ${userName}`);
            } catch (err) {
                console.error(`Error creating note for project ${projectId}:`, err);
                socket.emit('note error', { message: 'Note could not be created' });
            }
        });

        socket.on('note updated', async (projectId, noteId, noteData) => {
            const userInfo = projectUsers[projectId]?.find(u => u.socketId === socket.id);
            if (!userInfo) {
                console.error('note updated: User info not found. Socket ID:', socket.id, 'Project ID:', projectId);
                return;
            }
            const { userId, userName } = userInfo;

            try {
                // Update the note in database
                const note = await ProjectNote.findOneAndUpdate(
                    { _id: noteId, project: projectId },
                    { 
                        title: noteData.title || '',
                        content: noteData.content,
                        updatedAt: new Date()
                    },
                    { new: true }
                ).populate('user', 'username');

                if (!note) {
                    socket.emit('note error', { message: 'Note not found' });
                    return;
                }

                // Broadcast to all users in the project
                io.to(projectId).emit('note updated', {
                    id: note._id,
                    title: note.title,
                    content: note.content,
                    user: note.user,
                    createdAt: note.createdAt,
                    updatedAt: note.updatedAt
                });

                console.log(`Note ${noteId} updated in project ${projectId} by user ${userName}`);
            } catch (err) {
                console.error(`Error updating note ${noteId} for project ${projectId}:`, err);
                socket.emit('note error', { message: 'Note could not be updated' });
            }
        });

        socket.on('note deleted', async (projectId, noteId) => {
            const userInfo = projectUsers[projectId]?.find(u => u.socketId === socket.id);
            if (!userInfo) {
                console.error('note deleted: User info not found. Socket ID:', socket.id, 'Project ID:', projectId);
                return;
            }
            const { userId, userName } = userInfo;

            try {
                // Delete the note from database
                const note = await ProjectNote.findOneAndDelete({
                    _id: noteId,
                    project: projectId
                });

                if (!note) {
                    socket.emit('note error', { message: 'Note not found' });
                    return;
                }

                // Broadcast to all users in the project
                io.to(projectId).emit('note deleted', {
                    id: noteId
                });

                console.log(`Note ${noteId} deleted from project ${projectId} by user ${userName}`);
            } catch (err) {
                console.error(`Error deleting note ${noteId} for project ${projectId}:`, err);
                socket.emit('note error', { message: 'Note could not be deleted' });
            }
        });

        socket.on('store canvas', async (url) => {
            const projectId = socketToProjectMap[socket.id];
            if (!projectId) {
                console.error('store canvas: Project ID not found. Socket ID:', socket.id);
                return;
            }
            try {
                await Project.findByIdAndUpdate(projectId, { lastCanvasState: url });
                console.log(`Canvas state stored for project ${projectId}`);
            } catch (err) {
                console.error(`Error storing canvas state for project ${projectId}:`, err);
            }
        });

        socket.on('getCanvas', async () => {
            const projectId = socketToProjectMap[socket.id];
            if (!projectId) {
                console.error('getCanvas: Project ID not found. Socket ID:', socket.id);
                socket.emit('getCanvas', null);
                return;
            }
            try {
                const project = await Project.findById(projectId);
                if (project && project.lastCanvasState) {
                    socket.emit('getCanvas', project.lastCanvasState);
                } else {
                    socket.emit('getCanvas', null);
                }
            } catch (err) {
                console.error(`Error fetching canvas state for project ${projectId}:`, err);
                socket.emit('getCanvas', null);
            }
        });
    
        socket.on('clearBoard', async () => {
            const projectId = socketToProjectMap[socket.id];
            if (!projectId) {
                console.error('clearBoard: Project ID not found. Socket ID:', socket.id);
                return;
            }
            try {
                await Project.findByIdAndUpdate(projectId, { lastCanvasState: '' });
                io.to(projectId).emit('clearBoard');
                console.log(`Board cleared for project ${projectId} by socket ${socket.id}`);
            } catch (err) {
                console.error(`Error clearing board for project ${projectId}:`, err);
            }
        });

        socket.on('leave project', (projectId, userId) => {
            console.log(`leave project request: User ${userId} from project ${projectId}`);
            // This is mostly handled by disconnect, but can be a manual trigger.
            // Ensure it calls the same cleanup logic as disconnect if used.
        });

        socket.on('disconnect', (reason) => {
            console.log(`SERVER: Socket disconnected: ${socket.id}. Reason: ${reason}`);
            const userInfo = socketToUserMap[socket.id];
            if (userInfo) {
                const { userId, userName, projectId } = userInfo;
                console.log(`${userName} (${userId}) left project: ${projectId}. Socket: ${socket.id}`);
                if (projectUsers[projectId]) {
                    projectUsers[projectId] = projectUsers[projectId].filter(user => user.socketId !== socket.id); // Filter by socket.id
                    // Notify other users in the project
                    socket.to(projectId).emit('user-left', { name: userName, id: userId, socketId: socket.id }); // Send socketId as well
                    console.log(`SERVER: user-left event emitted in project ${projectId} for: ${userName} (${userId}). Remaining users: ${projectUsers[projectId].length}`);
                    if (projectUsers[projectId].length === 0) {
                        delete projectUsers[projectId]; // Clean up if project is empty
                        console.log(`SERVER: Project ${projectId} is now empty and removed from active list.`);
                    }
                }
                delete socketToUserMap[socket.id]; // Clean up map
            } else {
                console.log(`SERVER: Socket ${socket.id} disconnected, but no user info found in map.`);
            }
            console.log(`SERVER: 'disconnect' event processing completed for socket ${socket.id}`);
        });

        // Handle transport errors specifically for more detailed logging
        socket.on('error', (error) => {
            console.error(`SERVER: Socket error for ${socket.id}:`, error);
            // Additional details if available
            if (error && error.description) {
                console.error(`SERVER: Socket error description:`, error.description);
            }
        });
    });
}

// Her iki server için Socket.IO handler'larını kur
setupSocketHandlers(io);
// setupSocketHandlers(httpIo); // KALDIRILDI


// Server'ı başlat
server.listen(PORT, '0.0.0.0', () => {
    const serverType = server instanceof require('https').Server ? 'HTTPS' : 'HTTP'; // Düzeltilmiş satır
    console.log(`✅ ${serverType} Server is up and running on port ${PORT}`);
    console.log(`🌐 Local access: ${serverType.toLowerCase()}://localhost:${PORT}`);
    if (serverType === 'HTTPS') { 
        console.log(`⚠️  For external access, users need to accept self-signed certificate`);
    }
});

// httpServer.listen(3001, '0.0.0.0', () => { // KALDIRILDI
//     console.log(`✅ HTTP Server is up and running on port 3001`);
//     console.log(`🌐 Local access: http://localhost:3001`);
//     console.log(`⚠️  External HTTP access will have media capture restrictions`);
// });

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ 
        message: 'Sunucu hatası oluştu.', 
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
});