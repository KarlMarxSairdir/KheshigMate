// Load environment variables first
require('dotenv').config();

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
const Task = require('./models/Task'); // Added Task model
const BPMNDiagram = require('./models/BPMNDiagram'); // Added BPMN model
const CalendarEvent = require('./models/CalendarEvent'); // Added CalendarEvent model
const ProjectFile = require('./models/ProjectFile'); // Added ProjectFile model
const Notification = require('./models/Notification'); // Added Notification model for Faz 4
const multer = require('multer'); // Multer for file uploads
const { ExpressPeerServer } = require('peer'); // PeerJS sunucusu için
const cors = require('cors'); // CORS paketi eklendi
const { ensureAuthenticated, ensureProjectOwner, ensureProjectMemberOrOwner } = require('./middleware/auth'); // Auth middleware'leri
const aiTaskFinder = require('./services/aiTaskFinder'); // AI servisini import et

// Import cron jobs for automated notifications
require('./services/cronJobs'); // Cron job'ları başlat

// ===== NOTIFICATION HELPER FUNCTIONS =====

// Bildirim oluşturma ve WebSocket event'i gönderen yardımcı fonksiyon
async function createNotification(userId, projectId, type, message, link, triggeredBy = null) {
    try {
        const notification = new Notification({
            user: userId,
            project: projectId,
            type: type,
            message: message,
            link: link,
            triggeredBy: triggeredBy
        });
        
        await notification.save();
        
        // WebSocket ile anlık bildirim gönder
        if (typeof io !== 'undefined' && io) {
            // Kullanıcının socket ID'sini bul ve anlık bildirim gönder
            const userSocket = findUserSocket(userId);
            if (userSocket) {
                io.to(userSocket).emit('new-notification', {
                    _id: notification._id,
                    type: notification.type,
                    message: notification.message,
                    link: notification.link,
                    timeAgo: notification.timeAgo,
                    isRead: notification.isRead
                });
                console.log(`📢 Notification sent to user ${userId}: ${type}`);
            }
        }
        
        return notification;
    } catch (error) {
        console.error('Notification creation error:', error);
        throw error;
    }
}

// Kullanıcının aktif socket ID'sini bulan fonksiyon
function findUserSocket(userId) {
    // socketToUserMap'te kullanıcının socket ID'sini ara
    for (const [socketId, userInfo] of Object.entries(socketToUserMap)) {
        if (userInfo.userId === userId.toString()) {
            return socketId;
        }
    }
    return null;
}

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

// CORS middleware'ini burada kullanın
app.use(cors({
    origin: ['http://localhost:3000', 'https://localhost:3000'], // İstemcinizin çalıştığı adresler
    credentials: true // Kimlik bilgileriyle (cookie vs.) isteklere izin ver
}));

// Security headers to fix MIME type issues
app.use((req, res, next) => {
    // Allow external resources for CDN links
    res.removeHeader('X-Content-Type-Options');
    next();
});

// EJS View Engine Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json()); // JSON body parser eklendi
app.use(express.urlencoded({ extended: true })); // URL-encoded body parser for form submissions

// Serve static files from the "public" directory (MOVED UP)
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, path) => {
        if (path.endsWith('.css')) {
            res.set('Content-Type', 'text/css');
        }
        if (path.endsWith('.js')) {
            res.set('Content-Type', 'application/javascript');
        }
    }
}));

// Session middleware (MOVED UP)
app.use(session({
    secret: 'kasikmate-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // HTTP için false, HTTPS için true
        maxAge: 24 * 60 * 60 * 1000 // 24 saat
    }
}));

// Passport middleware (MOVED UP)
app.use(passport.initialize());
app.use(passport.session());

// --- Multer Configuration for File Uploads ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const projectId = req.params.projectId;
        const uploadPath = path.join(__dirname, 'uploads', projectId);
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp and random string
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const fileExtension = path.extname(file.originalname);
        const baseName = path.basename(file.originalname, fileExtension);
        cb(null, baseName + '-' + uniqueSuffix + fileExtension);
    }
});

const fileFilter = (req, file, cb) => {
    // Allow common file types
    const allowedMimeTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain', 'text/csv', 'application/zip', 'application/x-rar-compressed'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Desteklenmeyen dosya türü. İzin verilen türler: resim, PDF, Word, Excel, PowerPoint, metin ve arşiv dosyaları.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Türkçe karakterleri düzeltmek için middleware
app.use('/projects/:projectId/files', (req, res, next) => {
    const originalSend = res.send;
    
    // Dosya yükleme işleminde originalname'i düzelt
    if (req.method === 'POST') {
        upload.single('file')(req, res, (err) => {
            if (err) {
                return next(err);
            }
            
            // Türkçe karakterleri düzelt
            if (req.file && req.file.originalname) {
                try {
                    // Buffer'dan düzgün UTF-8 string'e çevir
                    const originalBuffer = Buffer.from(req.file.originalname, 'latin1');
                    req.file.originalname = originalBuffer.toString('utf8');
                } catch (e) {
                    // Eğer çeviri başarısız olursa, orijinal ismi koru
                    console.warn('⚠️ Could not fix encoding for filename:', req.file.originalname);
                }
            }
            
            next();
        });
    } else {
        next();
    }
});

console.log('✅ Multer file upload middleware configured');

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
        // Kullanıcının hem sahip olduğu hem de üye olduğu projeleri çek
        const projects = await Project.find({
            $or: [
                { owner: req.user._id }, // Kullanıcının sahip olduğu projeler
                { 'members.user': req.user._id } // Kullanıcının üye olduğu projeler
            ]
        })
        .populate('owner', 'username email') // Proje sahibi bilgilerini populate et
        .populate('members.user', 'username email') // Üye bilgilerini populate et
        .sort({ createdAt: -1 }); // Projeleri sırala

        console.log(`📊 Dashboard loaded for ${req.user.username}: ${projects.length} projects found`);
        
        res.render('dashboard', { 
            user: req.user, // Oturum açmış kullanıcı bilgisi
            projects: projects // Kullanıcının projeleri
        });
    } catch (err) {
        console.error("Error rendering dashboard:", err);
        res.status(500).send("Dashboard yüklenirken bir hata oluştu.");    }
});

// --- Profile Routes ---
// GET /profile - Kullanıcı profil sayfası
app.get('/profile', ensureAuthenticated, async (req, res) => {
    try {
        res.render('profile', { 
            user: req.user,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (err) {
        console.error("Error rendering profile:", err);
        res.status(500).send("Profil sayfası yüklenirken bir hata oluştu.");
    }
});

// POST /profile/details - Kullanıcı bilgilerini güncelle (username, email)
app.post('/profile/details', ensureAuthenticated, async (req, res) => {
    try {
        const { username, email } = req.body;
        
        // Email zaten kullanımda mı kontrol et (mevcut kullanıcı hariç)
        const existingUser = await User.findOne({ 
            email: email, 
            _id: { $ne: req.user._id } 
        });
        
        if (existingUser) {
            return res.redirect('/profile?error=' + encodeURIComponent('Bu e-posta adresi zaten kullanımda.'));
        }
        
        // Kullanıcı bilgilerini güncelle
        await User.findByIdAndUpdate(req.user._id, {
            username: username.trim(),
            email: email.trim()
        });
        
        console.log(`✅ User details updated for ${req.user.username}`);
        res.redirect('/profile?success=' + encodeURIComponent('Bilgileriniz başarıyla güncellendi.'));
        
    } catch (err) {
        console.error('Profile update error:', err);
        res.redirect('/profile?error=' + encodeURIComponent('Bilgiler güncellenirken bir hata oluştu.'));
    }
});

// POST /profile/skills - Kullanıcı yeteneklerini güncelle
app.post('/profile/skills', ensureAuthenticated, async (req, res) => {
    try {
        const { skills } = req.body;
        
        // Skills'i array'e çevir ve temizle
        const skillsArray = skills ? skills.split(',').map(skill => skill.trim()).filter(skill => skill.length > 0) : [];
        
        // Kullanıcı yeteneklerini güncelle
        await User.findByIdAndUpdate(req.user._id, {
            skills: skillsArray
        });
        
        console.log(`✅ User skills updated for ${req.user.username}:`, skillsArray);
        res.redirect('/profile?success=' + encodeURIComponent('Yetenekleriniz başarıyla güncellendi.'));
        
    } catch (err) {
        console.error('Skills update error:', err);
        res.redirect('/profile?error=' + encodeURIComponent('Yetenekler güncellenirken bir hata oluştu.'));
    }
});

// POST /profile/change-password - Şifre değiştir
app.post('/profile/change-password', ensureAuthenticated, async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        
        // Yeni şifre kontrolü
        if (newPassword !== confirmPassword) {
            return res.redirect('/profile?error=' + encodeURIComponent('Yeni şifreler eşleşmiyor.'));
        }
        
        if (newPassword.length < 6) {
            return res.redirect('/profile?error=' + encodeURIComponent('Yeni şifre en az 6 karakter olmalıdır.'));
        }
        
        // Mevcut kullanıcıyı çek
        const user = await User.findById(req.user._id);
        
        // Mevcut şifreyi kontrol et
        const isValidPassword = await user.comparePassword(currentPassword);
        if (!isValidPassword) {
            return res.redirect('/profile?error=' + encodeURIComponent('Mevcut şifre yanlış.'));
        }
        
        // Yeni şifreyi kaydet
        user.password = newPassword;
        await user.save();
        
        console.log(`✅ Password changed for ${req.user.username}`);
        res.redirect('/profile?success=' + encodeURIComponent('Şifreniz başarıyla değiştirildi.'));
        
    } catch (err) {
        console.error('Password change error:', err);
        res.redirect('/profile?error=' + encodeURIComponent('Şifre değiştirilirken bir hata oluştu.'));
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
                role: 'owner',
                joinedAt: new Date()
            }] // Sahibi aynı zamanda üye olarak ekle
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
        // Kullanıcının sahip olduğu ve üye olduğu tüm projeleri getir
        const projects = await Project.find({
            $or: [
                { owner: req.user._id }, // Sahip olduğu projeler
                { 'members.user': req.user._id } // Üye olduğu projeler
            ]
        })
        .populate('owner', 'username email _id') // Owner bilgisini populate et
        .populate('members.user', 'username email _id') // Üye bilgilerini populate et
        .sort({ createdAt: -1 });
        
        console.log(`📋 Found ${projects.length} projects for user ${req.user.username}`);
        res.json({ projects }); // Projeleri { projects: [...] } formatında gönder
    } catch (err) {
        console.error('Error fetching projects:', err);
        res.status(500).json({ message: 'Projeler alınırken sunucu hatası oluştu.', error: err.message });    }
});

// Get single project details
app.get('/projects/:projectId', ensureAuthenticated, async (req, res) => {
    try {
        const projectId = req.params.projectId;
        
        // Proje bilgilerini al ve member bilgilerini populate et
        const project = await Project.findById(projectId)
            .populate('owner', 'username email _id')
            .populate('members.user', 'username email _id skills');
        
        if (!project) {
            return res.status(404).json({ message: 'Proje bulunamadı.' });
        }
        
        // Kullanıcının bu projeye erişim yetkisi var mı kontrol et
        const isMember = project.members.some(member => 
            member.user._id.toString() === req.user._id.toString()
        );
        
        if (!isMember) {
            return res.status(403).json({ message: 'Bu projeye erişim yetkiniz yok.' });
        }
        
        console.log(`📋 Project details fetched: ${project.name} for user ${req.user.username}`);
        res.json(project);
        
    } catch (err) {
        console.error('Error fetching project details:', err);
        res.status(500).json({ message: 'Proje bilgileri alınırken sunucu hatası oluştu.', error: err.message });
    }
});

// Get notes for a project
app.get('/projects/:projectId/notes', ensureAuthenticated, async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const userId = req.user._id;
        
        // Proje bilgilerini al
        const project = await Project.findById(projectId)
            .populate('owner', 'username email _id')
            .populate('members.user', 'username email _id');
        
        if (!project) {
            return res.status(404).json({ message: 'Proje bulunamadı.' });
        }
        
        // Kullanıcının proje üyesi olup olmadığını kontrol et
        const isOwner = project.owner._id.toString() === userId.toString();
        const memberData = project.members.find(member => member.user._id.toString() === userId.toString());
        const isMember = !!memberData;
        
        if (!isOwner && !isMember) {
            return res.status(403).json({ message: 'Bu projeye erişim izniniz yok.' });
        }
        
        // Kullanıcının rolünü belirle
        let userRole = 'member';
        if (isOwner) {
            userRole = 'owner';
        } else if (memberData) {
            userRole = memberData.role;
        }
        
        const notes = await ProjectNote.find({ project: projectId })
            .populate('user', 'username email _id') 
            .sort({ createdAt: -1 }); 

        res.json({ 
            notes,
            project: {
                _id: project._id,
                name: project.name,
                owner: project.owner,
                members: project.members
            },
            currentUser: {
                _id: userId,
                isOwner,
                isMember,
                role: userRole
            }
        });
    } catch (err) {
        console.error(`Error fetching notes for project ${req.params.projectId}:`, err);
        res.status(500).json({ message: 'Notlar alınırken sunucu hatası oluştu.', error: err.message });
    }
});

// Get single note details
app.get('/projects/:projectId/notes/:noteId', ensureAuthenticated, async (req, res) => {
    try {
        const { projectId, noteId } = req.params;
        const userId = req.user._id;

        console.log(`[GET /projects/${projectId}/notes/${noteId}] Attempting to fetch note by user ${userId}`);

        // 1. Validate Note ID format
        if (!mongoose.Types.ObjectId.isValid(noteId)) {
            console.log(`[GET /projects/${projectId}/notes/${noteId}] Invalid Note ID format: ${noteId}`);
            return res.status(400).json({ message: 'Geçersiz Not ID formatı.' });
        }
        // 2. Validate Project ID format
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            console.log(`[GET /projects/${projectId}/notes/${noteId}] Invalid Project ID format: ${projectId}`);
            return res.status(400).json({ message: 'Geçersiz Proje ID formatı.' });
        }

        // 3. Fetch the note by its ID and populate user details
        const note = await ProjectNote.findById(noteId).populate('user', 'username email _id');
        if (!note) {
            console.log(`[GET /projects/${projectId}/notes/${noteId}] Note not found with ID: ${noteId}`);
            return res.status(404).json({ message: 'Not bulunamadı.' });
        }
        console.log(`[GET /projects/${projectId}/notes/${noteId}] Found note: ${note._id}, project field: ${note.project}`);

        // 4. Verify the note belongs to the specified project
        if (note.project.toString() !== projectId) {
            console.log(`[GET /projects/${projectId}/notes/${noteId}] Note ${noteId} (project: ${note.project.toString()}) does not belong to target project ${projectId}.`);
            return res.status(400).json({ message: 'Not bu projeye ait değil veya yanlış proje için istendi.' });
        }

        // 5. Fetch the project to check for user membership/ownership
        const project = await Project.findById(projectId);
        if (!project) {
            console.log(`[GET /projects/${projectId}/notes/${noteId}] Project not found with ID: ${projectId} (when fetching note ${noteId})`);
            return res.status(404).json({ message: 'İlişkili proje bulunamadı.' });
        }
        console.log(`[GET /projects/${projectId}/notes/${noteId}] Found project: ${project.name}`);

        // 6. Check if the user is a member or owner of the project
        const isOwner = project.owner.toString() === userId.toString();
        const isMember = project.members.some(member => member.user && member.user.toString() === userId.toString());
        console.log(`[GET /projects/${projectId}/notes/${noteId}] User ${userId} access check for project ${projectId}: isOwner=${isOwner}, isMember=${isMember}`);

        if (!isOwner && !isMember) {
            console.log(`[GET /projects/${projectId}/notes/${noteId}] User ${userId} is not authorized for project ${projectId}.`);
            return res.status(403).json({ message: 'Bu nota erişim yetkiniz yok (proje üyesi değilsiniz).' });
        }
        
        console.log(`[GET /projects/${projectId}/notes/${noteId}] Note ${noteId} fetched successfully. User: ${userId}, Project: ${projectId}`);
        res.status(200).json(note);

    } catch (err) {
        const { projectId, noteId } = req.params; // Ensure these are available for logging
        console.error(`[GET /projects/${projectId}/notes/${noteId}] Error fetching note:`, err);
        if (err.name === 'CastError' && err.kind === 'ObjectId') {
             console.log(`[GET /projects/${projectId}/notes/${noteId}] Invalid ID format during database query. Path: ${err.path}, Value: ${err.value}`);
             return res.status(400).json({ message: `Geçersiz ID formatı: ${err.path}` });
        }
        res.status(500).json({ message: 'Not alınırken sunucu hatası oluştu.', error: err.message });
    }
});

// Create a new note for a project
app.post('/projects/:projectId/notes', ensureAuthenticated, async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const { title, content, deltaContent, htmlContent } = req.body;
        const userId = req.user._id;

        // Quill zorunluluğu: deltaContent ve htmlContent gereklidir
        if (!deltaContent || !htmlContent) {
            return res.status(400).json({ message: 'Not kaydı için zengin metin (deltaContent ve htmlContent) gereklidir.' });
        }

        // Project access control and role checking
        const project = await Project.findById(projectId)
            .populate('members.user', '_id');
        if (!project) {
            return res.status(404).json({ message: 'Proje bulunamadı.' });
        }
        const isOwner = project.owner.toString() === userId.toString();
        const memberData = project.members.find(member => member.user._id.toString() === userId.toString());
        const userRole = isOwner ? 'owner' : (memberData ? memberData.role : 'none');
        if (userRole !== 'owner' && userRole !== 'editor') {
            return res.status(403).json({ message: 'Not oluşturmak için editör veya sahip yetkisine sahip olmalısınız.' });
        }

        const newNote = new ProjectNote({
            project: projectId,
            user: userId,
            title: title ? title.trim() : '',
            content: content ? content.trim() : '', // fallback, zorunlu değil
            deltaContent,
            htmlContent
        });
        await newNote.save();
        const populatedNote = await ProjectNote.findById(newNote._id).populate('user', 'username email _id');
        if (io) {
            io.to(projectId).emit('noteCreated', {
                projectId: projectId,
                noteId: newNote._id,
                note: populatedNote,
                createdBy: {
                    userId: userId,
                    username: req.user.username
                }
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
        const { title, content, deltaContent, htmlContent } = req.body;
        const userId = req.user._id;

        // Quill zorunluluğu: deltaContent ve htmlContent gereklidir
        if (!deltaContent || !htmlContent) {
            return res.status(400).json({ message: 'Not güncelleme için zengin metin (deltaContent ve htmlContent) gereklidir.' });
        }

        const note = await ProjectNote.findById(noteId);
        if (!note) {
            return res.status(404).json({ message: 'Not bulunamadı.' });
        }
        if (note.project.toString() !== projectId) {
            return res.status(400).json({ message: 'Not bu projeye ait değil.' });
        }
        const project = await Project.findById(projectId)
            .populate('members.user', '_id');
        if (!project) {
            return res.status(404).json({ message: 'Proje bulunamadı.' });
        }
        const isOwner = project.owner.toString() === userId.toString();
        const memberData = project.members.find(member => member.user._id.toString() === userId.toString());
        const userRole = isOwner ? 'owner' : (memberData ? memberData.role : 'none');
        let canEdit = false;
        if (userRole === 'owner') canEdit = true;
        else if (userRole === 'editor') canEdit = note.user.toString() === userId.toString();
        if (!canEdit) {
            return res.status(403).json({ 
                message: userRole === 'editor' 
                    ? 'Editörler sadece kendi oluşturdukları notları düzenleyebilir.' 
                    : 'Bu notu düzenlemek için yetkiniz yok.' 
            });
        }
        note.title = title !== undefined ? title.trim() : note.title;
        note.content = content ? content.trim() : note.content;
        note.deltaContent = deltaContent;
        note.htmlContent = htmlContent;
        note.updatedAt = Date.now();
        await note.save();
        const populatedNote = await ProjectNote.findById(note._id).populate('user', 'username email _id');
        if (io) {
            io.to(projectId).emit('noteUpdated', {
                projectId: projectId,
                noteId: noteId,
                note: populatedNote,
                updatedBy: {
                    userId: userId,
                    username: req.user.username
                }
            });
        }
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

        if (note.project.toString() !== projectId) {
            return res.status(400).json({ message: 'Not bu projeye ait değil.' });
        }

        // Project access control and role checking
        const project = await Project.findById(projectId)
            .populate('members.user', '_id');
        
        if (!project) {
            return res.status(404).json({ message: 'Proje bulunamadı.' });
        }

        // Check user's role and permissions
        const isOwner = project.owner.toString() === userId.toString();
        const memberData = project.members.find(member => member.user._id.toString() === userId.toString());
        const userRole = isOwner ? 'owner' : (memberData ? memberData.role : 'none');

        // Role-based permission check for deletion
        let canDelete = false;
        if (userRole === 'owner') {
            // Owner can delete all notes
            canDelete = true;
        } else if (userRole === 'editor') {
            // Editor can only delete their own notes
            canDelete = note.user.toString() === userId.toString();
        }
        // Members cannot delete any notes

        if (!canDelete) {
            return res.status(403).json({ 
                message: userRole === 'editor' 
                    ? 'Editörler sadece kendi oluşturdukları notları silebilir.' 
                    : 'Bu notu silmek için yetkiniz yok.' 
            });
        }        await ProjectNote.findByIdAndDelete(noteId);

        console.log(`🗑️ Note deleted by ${req.user.username} (${userRole}) - Note ID: ${noteId}`);
        
        // Emit socket event for real-time updates
        if (io) {
            io.to(projectId).emit('noteDeleted', {
                projectId: projectId,
                noteId: noteId,
                deletedBy: {
                    userId: userId,
                    username: req.user.username
                }
            });
        }
        
        res.status(200).json({ message: 'Not başarıyla silindi.' });
        
    } catch (err) {
        console.error(`Error deleting note ${req.params.noteId} for project ${req.params.projectId}:`, err);
        res.status(500).json({ message: 'Not silinirken sunucu hatası oluştu.', error: err.message });
    }
});

// Delete a project (only project owner can delete)
app.delete('/projects/:projectId', ensureAuthenticated, async (req, res) => {
    try {
        const projectId = req.params.projectId;
        const userId = req.user._id;

        console.log('🗑️ Delete request for project:', projectId, 'by user:', req.user.username);

        // Find the project
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Proje bulunamadı.' });
        }

        // Only project owner can delete
        if (project.owner.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Bu projeyi silme yetkiniz yok.' });
        }

        // Delete the project
        await Project.findByIdAndDelete(projectId);

        // Also delete related data (optional but recommended)
        await ChatMessage.deleteMany({ project: projectId });
        await ProjectNote.deleteMany({ project: projectId });
        await DrawingData.deleteMany({ project: projectId });        console.log('✅ Project deleted successfully:', projectId);
        res.status(200).json({ message: 'Proje başarıyla silindi.' });

    } catch (err) {
        console.error('❌ Delete project error:', err);
        res.status(500).json({ message: 'Proje silinirken hata oluştu.', error: err.message });
    }
});

// Project Settings Route - Render project settings page
app.get('/projects/:projectId/settings', ensureAuthenticated, ensureProjectOwner, async (req, res) => {
    try {
        const project = req.project; // ensureProjectOwner middleware'i project'i req'e ekler
        
        // Populate owner and members info
        await project.populate([
            { path: 'owner', select: 'username email' },
            { path: 'members.user', select: 'username email' }
        ]);
        
        res.render('project-settings', { 
            user: req.user, 
            project: project,
            title: `${project.name} - Proje Ayarları`
        });
    } catch (err) {
        console.error('Error rendering project settings:', err);
        res.status(500).send('Sunucu hatası');
    }
});

// Add Member to Project
app.post('/projects/:projectId/members', ensureAuthenticated, ensureProjectOwner, async (req, res) => {
    try {
        console.log('🔍 Add member request received');
        console.log('📝 Request body:', req.body);
        console.log('🆔 Project ID:', req.params.projectId);
        console.log('👤 Current user:', req.user.username);
        
        const projectId = req.params.projectId;
        const { username } = req.body;
        const project = req.project; // ensureProjectOwner middleware'den gelir

        console.log('📋 Project found:', project.name);

        if (!username || username.trim() === '') {
            console.log('❌ Username is required');
            return res.status(400).json({ message: 'Kullanıcı adı gerekli.' });
        }

        // Find the user to add
        const userToAdd = await User.findOne({ username: username.trim() });
        if (!userToAdd) {
            return res.status(404).json({ message: 'Kullanıcı bulunamadı.' });
        }

        // Check if user is already the owner
        if (project.owner.toString() === userToAdd._id.toString()) {
            return res.status(400).json({ message: 'Bu kullanıcı zaten proje sahibi.' });
        }

        // Check if user is already a member
        const isAlreadyMember = project.members.some(member => 
            member.user.toString() === userToAdd._id.toString()
        );

        if (isAlreadyMember) {
            return res.status(400).json({ message: 'Bu kullanıcı zaten projenin üyesi.' });
        }        // Add user to project members
        project.members.push({
            user: userToAdd._id,
            role: 'editor',
            joinedAt: new Date()
        });

        await project.save();

        // Populate the new member data for response
        await project.populate([
            { path: 'owner', select: 'username email' },
            { path: 'members.user', select: 'username email' }
        ]);

        // Get the newly added member
        const newMember = project.members[project.members.length - 1];

        console.log(`✅ User ${username} added to project ${project.name}`);
        res.status(200).json({ 
            message: 'Üye başarıyla eklendi.',
            member: {
                _id: newMember._id,
                user: newMember.user,
                role: newMember.role,
                joinedAt: newMember.joinedAt
            }
        });

    } catch (err) {
        console.error('❌ Add member error:', err);
        res.status(500).json({ message: 'Üye eklenirken hata oluştu.', error: err.message });
    }
});

// Remove Member from Project
app.delete('/projects/:projectId/members/:memberId', ensureAuthenticated, ensureProjectOwner, async (req, res) => {
    try {
        console.log('🔍 Remove member request received');
        console.log('🆔 Project ID:', req.params.projectId);
        console.log('🆔 Member ID to remove:', req.params.memberId);
        console.log('👤 Current user:', req.user.username);
        
        const projectId = req.params.projectId;
        const memberId = req.params.memberId;
        const project = req.project; // ensureProjectOwner middleware'den gelir

        console.log('📋 Project found:', project.name);
        console.log('👥 Current members count:', project.members.length);
        console.log('👥 Members list:', project.members.map(m => ({ id: m._id, user: m.user })));        // Find and remove the member
        const memberIndex = project.members.findIndex(member => 
            member.user.toString() === memberId
        );

        console.log('🔍 Looking for member with USER ID:', memberId);
        console.log('🔍 Found member index:', memberIndex);

        if (memberIndex === -1) {
            console.log('❌ Member not found in project');
            return res.status(404).json({ message: 'Üye bulunamadı.' });
        }

        const removedMember = project.members[memberIndex];
        project.members.splice(memberIndex, 1);
        await project.save();

        console.log(`✅ Member removed from project ${project.name}`);
        res.status(200).json({ 
            message: 'Üye başarıyla çıkarıldı.',
            removedMemberId: memberId
        });

    } catch (err) {
        console.error('❌ Remove member error:', err);
        res.status(500).json({ message: 'Üye çıkarılırken hata oluştu.', error: err.message });
    }
});

// Room Route
app.get('/room/:projectId', ensureAuthenticated, async (req, res) => {
    try {
        const projectId = req.params.projectId;

        // Sunucu taraflı Proje ID format kontrolü
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            console.log(`[SERVER] Invalid Project ID format in URL for /room: ${projectId}`);
            return res.redirect('/dashboard?error=invalidprojectid');
        }

        const project = await Project.findById(projectId);

        if (!project) {
            // Proje bulunamazsa, kullanıcıyı dashboard\'a yönlendir veya bir hata mesajı göster
            console.log(`Proje bulunamadı: ${projectId}`);
            return res.redirect('/dashboard?error=projectnotfound');
        }

        // Proje üyelerini kontrol et (isteğe bağlı, eğer sadece üyeler girebilsin istiyorsanız)
        // if (!project.members.includes(req.user._id)) {
        //     console.log(`Kullanıcı ${req.user.username} proje ${project.name} üyesi değil.`);
        //     return res.redirect('/dashboard?error=notmember');
        // }

        res.render('room', { 
            user: req.user, 
            project: project,
            // Gerekirse room.js için ek ayarlar veya tokenlar buraya eklenebilir
        });
    } catch (err) {
        console.error("Error rendering room:", err);
        res.status(500).send("Oda yüklenirken bir hata oluştu.");
    }
});

// --- TASK API ROUTES ---

// Yeni görev oluştur
app.post('/projects/:projectId/tasks', ensureAuthenticated, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { title, description, priority, assignedTo, dueDate, requiredSkills } = req.body;
        
        console.log('📝 Task creation request:', { title, description, priority, assignedTo, dueDate, requiredSkills });
        
        // Proje erişim kontrolü
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ error: 'Proje bulunamadı' });
        }
        
        // Kullanıcının proje üyesi olup olmadığını kontrol et
        const isOwner = project.owner.toString() === req.user._id.toString();
        const isMember = project.members.some(member => 
            member.user.toString() === req.user._id.toString()
        );
        
        if (!isOwner && !isMember) {
            return res.status(403).json({ error: 'Bu projeye erişim yetkiniz yok' });
        }
        
        // AssignedTo kontrolü - eğer belirtilmişse geçerli kullanıcı olup olmadığını kontrol et
        if (assignedTo) {
            const assignedUser = await User.findById(assignedTo);
            if (!assignedUser) {
                return res.status(400).json({ error: 'Atanan kullanıcı bulunamadı' });
            }
            
            // Atanan kullanıcının proje üyesi olup olmadığını kontrol et
            const isAssignedUserMember = project.owner.toString() === assignedTo.toString() ||
                project.members.some(member => member.user.toString() === assignedTo.toString());
            
            if (!isAssignedUserMember) {
                return res.status(400).json({ error: 'Atanan kullanıcı bu projenin üyesi değil' });
            }
        }
        
        // Yeni görev oluştur
        const task = new Task({
            title,
            description,
            priority,
            assignedTo: assignedTo || undefined,
            dueDate: dueDate ? new Date(dueDate) : undefined,
            requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : [],
            project: projectId,
            createdBy: req.user._id
        });
        
        await task.save();
        await task.populate(['assignedTo', 'createdBy'], 'username email');
        
        console.log(`✅ Task created: ${task.title} for project ${project.name}, assigned to: ${task.assignedTo?.username || 'Atanmamış'}`);
        res.status(201).json(task);
    } catch (error) {
        console.error('Task creation error:', error);
        res.status(500).json({ error: 'Görev oluşturulurken hata oluştu' });
    }
});

// Proje görevlerini listele
app.get('/projects/:projectId/tasks', ensureAuthenticated, async (req, res) => {
    try {
        const { projectId } = req.params;
        
        // Proje erişim kontrolü
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ error: 'Proje bulunamadı' });
        }
        
        const isOwner = project.owner.toString() === req.user._id.toString();
        const isMember = project.members.some(member => 
            member.user.toString() === req.user._id.toString()
        );
        
        if (!isOwner && !isMember) {
            return res.status(403).json({ error: 'Bu projeye erişim yetkiniz yok' });
        }
        
        // Görevleri getir
        const tasks = await Task.find({ project: projectId })
            .populate('assignedTo', 'username email skills')
            .populate('createdBy', 'username email')
            .sort({ order: 1, createdAt: -1 });
            
        console.log(`📋 Found ${tasks.length} tasks for project ${project.name}`);
        res.json(tasks);
    } catch (error) {
        console.error('Task listing error:', error);
        res.status(500).json({ error: 'Görevler getirilirken hata oluştu' });
    }
});

// Görevi güncelle (AKILLI, MERKEZİ, WEBSOCKET'Lİ)
app.put('/projects/:projectId/tasks/:taskId', ensureAuthenticated, async (req, res) => {
    try {
        const { projectId, taskId } = req.params;
        let updateData = req.body;
        const task = await Task.findById(taskId);
        if (!task) { return res.status(404).json({ error: 'Görev bulunamadı.' }); }
        // Proje erişim kontrolü
        const project = await Project.findById(projectId);
        const isOwner = project.owner.toString() === req.user._id.toString();
        const isMember = project.members.some(member => member.user.toString() === req.user._id.toString());
        if (!isOwner && !isMember) {
            return res.status(403).json({ error: 'Bu projeye erişim yetkiniz yok' });
        }
        // --- AKILLI SENKRONİZASYON MANTIĞI ---
        if ('status' in updateData && !('progress' in updateData)) {
            if (updateData.status === 'done' ) updateData.progress = 100;
            else if (updateData.status === 'in-progress') {
                if (task.progress === 0 || task.progress === 100) updateData.progress = 10;
            } else if (updateData.status === 'todo') updateData.progress = 0;
        } else if ('progress' in updateData) {
            const progress = Number(updateData.progress);
            if (progress >= 100) updateData.status = 'done';
            else if (progress > 0) updateData.status = 'in-progress';
            else updateData.status = 'todo';
        }
        // --- TARİH ALANLARINI DÜZELT ---
        ['startDate', 'dueDate', 'endDate'].forEach(field => {
            if (updateData[field]) {
                updateData[field] = new Date(updateData[field]);
            }
        });        // --- BİTTİ ---
        const updatedTask = await Task.findByIdAndUpdate(taskId, { $set: updateData }, { new: true, runValidators: true })
            .populate('assignedTo', 'username email skills')
            .populate('createdBy', 'username email');

        // --- GÖREV ATAMA BİLDİRİMİ (FAZ 4) ---
        if (updateData.assignedTo && task.assignedTo?.toString() !== updateData.assignedTo) {
            try {
                const assignedUser = await User.findById(updateData.assignedTo);
                if (assignedUser && assignedUser._id.toString() !== req.user._id.toString()) {
                    const message = `${req.user.username} size "${updatedTask.title}" görevini atadı.`;
                    const link = `/room/${projectId}?tab=tasks&highlight=${updatedTask._id}`;
                    await createNotification(
                        assignedUser._id, 
                        projectId, 
                        'new-task-assigned', 
                        message, 
                        link, 
                        req.user._id
                    );
                    console.log(`📢 Task assignment notification sent to ${assignedUser.username}`);
                }
            } catch (notificationError) {
                console.error('Task assignment notification error:', notificationError);
                // Notification hatası, ana işlemi etkilemez
            }
        }

        // --- GÖREV TAMAMLANMA BİLDİRİMİ (FAZ 4) ---
        if (updateData.status === 'done' && task.status !== 'done') {
            try {
                // Görev tamamlandığında proje sahibine bildirim gönder
                const projectData = await Project.findById(projectId).populate('owner', 'username');
                if (projectData && projectData.owner._id.toString() !== req.user._id.toString()) {
                    const message = `${req.user.username} "${updatedTask.title}" görevini tamamladı.`;
                    const link = `/room/${projectId}?tab=tasks&highlight=${updatedTask._id}`;
                    await createNotification(
                        projectData.owner._id,
                        projectId,
                        'task-completed',
                        message,
                        link,
                        req.user._id
                    );
                    console.log(`📢 Task completion notification sent to project owner`);
                }
            } catch (notificationError) {
                console.error('Task completion notification error:', notificationError);
            }
        }

        // --- WEBSOCKET BİLDİRİMİ ---
        if (typeof io !== 'undefined' && io && io.to) {
            io.to(projectId).emit('task-updated', updatedTask);
            console.log(`📡 WebSocket event 'task-updated' emitted for task ${updatedTask._id}`);
        }
        res.json(updatedTask);
    } catch (error) {
        console.error('Task update error:', error);
        res.status(500).json({ error: 'Görev güncellenirken hata oluştu' });
    }
});

// Görevi sil
app.delete('/projects/:projectId/tasks/:taskId', ensureAuthenticated, async (req, res) => {
    try {
        const { projectId, taskId } = req.params;
        
        // Görev ve proje erişim kontrolü
        const task = await Task.findById(taskId);
        if (!task || task.project.toString() !== projectId) {
            return res.status(404).json({ error: 'Görev bulunamadı' });
        }
        
        const project = await Project.findById(projectId);
        const isOwner = project.owner.toString() === req.user._id.toString();
        const isMember = project.members.some(member => 
            member.user.toString() === req.user._id.toString()
        );
        
        if (!isOwner && !isMember) {
            return res.status(403).json({ error: 'Bu projeye erişim yetkiniz yok' });
        }
        
        // Silme işlemi
        await Task.findByIdAndDelete(taskId);
        
        console.log(`✅ Task deleted: ${task.title}`);
        res.json({ message: 'Görev başarıyla silindi' });
    } catch (error) {
        console.error('Task deletion error:', error);
        res.status(500).json({ error: 'Görev silinirken hata oluştu' });
    }
});

// --- CALENDAR EVENT API ROUTES ---

// Proje etkinliklerini listele (görevlerle birleştir)
app.get('/projects/:projectId/events', ensureAuthenticated, async (req, res) => {
    try {
        const { projectId } = req.params;
        
        // Proje erişim kontrolü
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ error: 'Proje bulunamadı' });
        }
        
        const isOwner = project.owner.toString() === req.user._id.toString();
        const isMember = project.members.some(member => 
            member.user.toString() === req.user._id.toString()
        );
        
        if (!isOwner && !isMember) {
            return res.status(403).json({ error: 'Bu projeye erişim yetkiniz yok' });
        }
        
        // Etkinlikleri getir
        const events = await CalendarEvent.find({ project: projectId, isActive: true })
            .populate('createdBy', 'username email')
            .populate('attendees.user', 'username email')
            .sort({ startDate: 1 });
        
        // Görevleri de etkinlik olarak dahil et (son tarih olanlar)
        const tasks = await Task.find({ 
            project: projectId, 
            dueDate: { $exists: true, $ne: null } 
        })
            .populate('assignedTo', 'username email')
            .populate('createdBy', 'username email');
        
        // Görevleri takvim etkinliği formatına çevir
        const taskEvents = tasks.map(task => ({
            _id: `task_${task._id}`,
            title: `📝 ${task.title}`,
            description: task.description,
            startDate: task.dueDate,
            endDate: task.dueDate,
            allDay: true,
            color: task.status === 'done' ? '#27ae60' : 
                   task.status === 'in-progress' ? '#f39c12' : '#e74c3c',
            type: 'task-deadline',
            project: task.project,
            createdBy: task.createdBy,
            taskData: task,
            isTaskEvent: true
        }));
        
        const allEvents = [...events, ...taskEvents];
        
        console.log(`📅 Found ${events.length} events and ${taskEvents.length} task deadlines for project ${project.name}`);
        res.json(allEvents);
    } catch (error) {
        console.error('Calendar events listing error:', error);
        res.status(500).json({ error: 'Etkinlikler getirilirken hata oluştu' });
    }
});

// Yeni etkinlik oluştur
app.post('/projects/:projectId/events', ensureAuthenticated, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { title, description, startDate, endDate, allDay, color, type, attendees } = req.body;
        
        // Proje erişim kontrolü
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ error: 'Proje bulunamadı' });
        }
        
        const isOwner = project.owner.toString() === req.user._id.toString();
        const isMember = project.members.some(member => 
            member.user.toString() === req.user._id.toString()
        );
        
        if (!isOwner && !isMember) {
            return res.status(403).json({ error: 'Bu projeye erişim yetkiniz yok' });
        }
        
        // Tarih validasyonu
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        if (end < start) {
            return res.status(400).json({ error: 'Bitiş tarihi başlangıç tarihinden önce olamaz' });
        }
        
        // Yeni etkinlik oluştur
        const event = new CalendarEvent({
            title,
            description,
            startDate: start,
            endDate: end,
            allDay: allDay || false,
            color: color || '#3498db',
            type: type || 'event',
            project: projectId,
            createdBy: req.user._id,
            attendees: Array.isArray(attendees) ? attendees.map(userId => ({
                user: userId,
                status: 'pending'
            })) : []
        });
        
        await event.save();
        await event.populate(['createdBy', 'attendees.user'], 'username email');
        
        console.log(`✅ Calendar event created: ${event.title} for project ${project.name}`);
        res.status(201).json(event);
    } catch (error) {
        console.error('Calendar event creation error:', error);
        res.status(500).json({ error: 'Etkinlik oluşturulurken hata oluştu' });
    }
});

// Etkinlik güncelle
app.put('/projects/:projectId/events/:eventId', ensureAuthenticated, async (req, res) => {
    try {
        const { projectId, eventId } = req.params;
        const updateData = req.body;
        
        // Etkinlik ve proje erişim kontrolü
        const event = await CalendarEvent.findById(eventId);
        if (!event || event.project.toString() !== projectId) {
            return res.status(404).json({ error: 'Etkinlik bulunamadı' });
        }
        
        const project = await Project.findById(projectId);
        const isOwner = project.owner.toString() === req.user._id.toString();
        const isMember = project.members.some(member => 
            member.user.toString() === req.user._id.toString()
        );
        
        if (!isOwner && !isMember) {
            return res.status(403).json({ error: 'Bu projeye erişim yetkiniz yok' });
        }
        
        // Tarih alanlarını düzelt
        ['startDate', 'endDate'].forEach(field => {
            if (updateData[field]) {
                updateData[field] = new Date(updateData[field]);
            }
        });
        
        // Tarih validasyonu
        const start = updateData.startDate || event.startDate;
        const end = updateData.endDate || event.endDate;
        
        if (end < start) {
            return res.status(400).json({ error: 'Bitiş tarihi başlangıç tarihinden önce olamaz' });
        }
        
        const updatedEvent = await CalendarEvent.findByIdAndUpdate(eventId, { $set: updateData }, { new: true, runValidators: true })
            .populate('createdBy', 'username email')
            .populate('attendees.user', 'username email');
        
        console.log(`✅ Calendar event updated: ${updatedEvent.title}`);
        res.json(updatedEvent);
    } catch (error) {
        console.error('Calendar event update error:', error);
        res.status(500).json({ error: 'Etkinlik güncellenirken hata oluştu' });
    }
});

// Etkinlik sil
app.delete('/projects/:projectId/events/:eventId', ensureAuthenticated, async (req, res) => {
    try {
        const { projectId, eventId } = req.params;
        
        // Etkinlik ve proje erişim kontrolü
        const event = await CalendarEvent.findById(eventId);
        if (!event || event.project.toString() !== projectId) {
            return res.status(404).json({ error: 'Etkinlik bulunamadı' });
        }
        
        const project = await Project.findById(projectId);
        const isOwner = project.owner.toString() === req.user._id.toString();
        const isMember = project.members.some(member => 
            member.user.toString() === req.user._id.toString()
        );
        
        if (!isOwner && !isMember) {
            return res.status(403).json({ error: 'Bu projeye erişim yetkiniz yok' });
        }
        
        // Soft delete
        await CalendarEvent.findByIdAndUpdate(eventId, { isActive: false });
          console.log(`✅ Calendar event deleted: ${event.title}`);
        res.json({ message: 'Etkinlik başarıyla silindi' });
    } catch (error) {
        console.error('Calendar event deletion error:', error);
        res.status(500).json({ error: 'Etkinlik silinirken hata oluştu' });
    }
});

// --- FILE MANAGEMENT API ROUTES ---

// Dosya yükleme (sadece owner ve editor)
app.post('/projects/:projectId/files', ensureAuthenticated, ensureProjectMemberOrOwner, async (req, res) => {
    try {
        const { projectId } = req.params;
        
        if (!req.file) {
            return res.status(400).json({ error: 'Dosya seçilmedi' });
        }
        
        // User role check - only owner and editor can upload
        if (req.userRole === 'member') {
            // Remove uploaded file if user doesn't have permission
            fs.unlinkSync(req.file.path);
            return res.status(403).json({ error: 'Dosya yükleme için yeterli yetkiniz yok' });
        }
        
        console.log('📁 File upload request:', {
            originalName: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            uploadedBy: req.user.username
        });
        
        // Create file record in database
        const projectFile = new ProjectFile({
            originalName: req.file.originalname,
            serverFilename: req.file.filename,
            path: req.file.path,
            mimetype: req.file.mimetype,
            size: req.file.size,
            project: projectId,
            uploadedBy: req.user._id
        });
        
        await projectFile.save();
          // Populate user data for response
        await projectFile.populate('uploadedBy', 'username fullName');
          console.log('✅ File uploaded successfully:', projectFile.originalName);
        
        // --- DOSYA YÜKLEME BİLDİRİMİ (FAZ 4) ---
        try {
            const project = await Project.findById(projectId).populate('members.user', 'username');
            if (project) {
                // Proje üyelerine bildirim gönder (dosyayı yükleyen hariç)
                const memberIds = project.members
                    .filter(member => member.user._id.toString() !== req.user._id.toString())
                    .map(member => member.user._id);
                
                // Proje sahibine de bildirim gönder (eğer üye değilse)
                if (project.owner.toString() !== req.user._id.toString() && 
                    !memberIds.includes(project.owner)) {
                    memberIds.push(project.owner);
                }
                
                const message = `${req.user.username} projeye "${projectFile.originalName}" dosyasını yükledi.`;
                const link = `/room/${projectId}?tab=files`;
                
                for (const memberId of memberIds) {
                    await createNotification(
                        memberId,
                        projectId,
                        'file-uploaded',
                        message,
                        link,
                        req.user._id
                    );
                }
                
                console.log(`📢 File upload notifications sent to ${memberIds.length} project members`);
            }
        } catch (notificationError) {
            console.error('File upload notification error:', notificationError);
            // Notification hatası, ana işlemi etkilemez
        }
        
        // Emit WebSocket event for real-time updates
        if (io) {
            io.to(projectId).emit('fileUploaded', {
                file: projectFile,
                uploadedBy: req.user.username
            });
            console.log('📡 File upload event emitted to project:', projectId);
        }
        
        res.status(201).json({ 
            message: 'Dosya başarıyla yüklendi', 
            file: projectFile 
        });
        
    } catch (error) {
        console.error('File upload error:', error);
        
        // Clean up uploaded file if database save failed
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Dosya boyutu çok büyük (maksimum 10MB)' });
        }
        
        res.status(500).json({ error: 'Dosya yüklenirken hata oluştu' });
    }
});

// Proje dosyalarını listele
app.get('/projects/:projectId/files', ensureAuthenticated, ensureProjectMemberOrOwner, async (req, res) => {
    try {
        const { projectId } = req.params;
        
        const files = await ProjectFile.getByProject(projectId);
        
        console.log(`📁 Files loaded for project ${projectId}: ${files.length} files`);
        res.json({ files });
        
    } catch (error) {
        console.error('Files list error:', error);
        res.status(500).json({ error: 'Dosya listesi alınırken hata oluştu' });
    }
});

// Dosya indirme
app.get('/projects/:projectId/files/:fileId/download', ensureAuthenticated, ensureProjectMemberOrOwner, async (req, res) => {
    try {
        const { projectId, fileId } = req.params;
        
        const file = await ProjectFile.findById(fileId);
        
        if (!file) {
            return res.status(404).json({ error: 'Dosya bulunamadı' });
        }
        
        if (file.project.toString() !== projectId) {
            return res.status(403).json({ error: 'Bu dosyaya erişim izniniz yok' });
        }
        
        if (!fs.existsSync(file.path)) {
            return res.status(404).json({ error: 'Dosya disk üzerinde bulunamadı' });
        }
          console.log('📥 File download:', file.originalName, 'by', req.user.username);
        
        // Properly encode filename for Turkish characters
        const encodedFilename = encodeURIComponent(file.originalName);
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFilename}; filename="${file.originalName}"`);
        res.setHeader('Content-Type', file.mimetype);
        res.sendFile(path.resolve(file.path));
        
    } catch (error) {
        console.error('File download error:', error);
        res.status(500).json({ error: 'Dosya indirilirken hata oluştu' });
    }
});

// Dosya silme (sadece yükleyen veya proje sahibi)
app.delete('/projects/:projectId/files/:fileId', ensureAuthenticated, ensureProjectMemberOrOwner, async (req, res) => {
    try {
        const { projectId, fileId } = req.params;
        
        const file = await ProjectFile.findById(fileId);
        
        if (!file) {
            return res.status(404).json({ error: 'Dosya bulunamadı' });
        }
        
        if (file.project.toString() !== projectId) {
            return res.status(403).json({ error: 'Bu dosyaya erişim izniniz yok' });
        }
        
        // Check if user can delete (owner or uploader)
        if (!file.canDeleteBy(req.user._id, req.userRole)) {
            return res.status(403).json({ error: 'Bu dosyayı silme yetkiniz yok' });
        }
        
        // Delete file from disk
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }
          // Delete from database
        await ProjectFile.findByIdAndDelete(fileId);
        
        console.log('🗑️ File deleted:', file.originalName, 'by', req.user.username);
        
        // Emit WebSocket event for real-time updates
        if (io) {
            io.to(projectId).emit('fileDeleted', {
                fileId: fileId,
                fileName: file.originalName,
                deletedBy: req.user.username
            });
            console.log('📡 File deletion event emitted to project:', projectId);
        }
        
        res.json({ message: 'Dosya başarıyla silindi' });
        
    } catch (error) {
        console.error('File deletion error:', error);
        res.status(500).json({ error: 'Dosya silinirken hata oluştu' });
    }
});

// --- PROJECT REPORTING API ROUTES ---

// Proje raporlama verileri - MongoDB Aggregation kullanarak
app.get('/projects/:projectId/report', ensureAuthenticated, ensureProjectMemberOrOwner, async (req, res) => {    try {
        const { projectId } = req.params;
        
        console.log('📊 Generating report for project:', projectId);
        
        // Proje varlığını kontrol et
        const projectDoc = await Project.findById(projectId);
        if (!projectDoc) {
            console.log('❌ Project not found:', projectId);
            return res.status(404).json({ error: 'Proje bulunamadı' });
        }
        console.log('✅ Project found:', projectDoc.name);
          // 1. Toplam görev sayısı ve durum dağılımı
        console.log('🔍 Step 1: Fetching task statistics...');
        const taskStats = await Task.aggregate([
            { $match: { project: new mongoose.Types.ObjectId(projectId) } },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
        console.log('✅ Task stats:', taskStats);
        
        // 2. Öncelik dağılımı
        console.log('🔍 Step 2: Fetching priority statistics...');
        const priorityStats = await Task.aggregate([
            { $match: { project: new mongoose.Types.ObjectId(projectId) } },
            {
                $group: {
                    _id: '$priority',
                    count: { $sum: 1 }
                }
            }
        ]);        console.log('✅ Priority stats:', priorityStats);
          
        // 3. Üye başına görev dağılımı
        console.log('🔍 Step 3: Fetching member task statistics...');
        const memberTaskStats = await Task.aggregate([
            { $match: { project: new mongoose.Types.ObjectId(projectId) } },
            { $unwind: '$assignedTo' },
            {
                $group: {
                    _id: '$assignedTo',
                    taskCount: { $sum: 1 },                    completedTasks: {
                        $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] }
                    }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            {
                $project: {
                    _id: 1,
                    taskCount: 1,
                    completedTasks: 1,
                    username: { $arrayElemAt: ['$user.username', 0] }
                }
            }
        ]);
        console.log('✅ Member task stats:', memberTaskStats);
          // 4. Genel ilerleme hesaplama
        console.log('🔍 Step 4: Calculating overall progress...');
        const totalTasks = await Task.countDocuments({ 
            project: projectId 
        });
        console.log('✅ Total tasks:', totalTasks);
          const completedTasks = await Task.countDocuments({ 
            project: projectId,
            status: 'done'
        });
        
        const overallProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
          // 5. Dosya istatistikleri
        const fileStats = await ProjectFile.aggregate([
            { $match: { project: new mongoose.Types.ObjectId(projectId) } },
            {
                $group: {
                    _id: null,
                    totalFiles: { $sum: 1 },
                    totalSize: { $sum: '$size' }
                }
            }
        ]);
        
        // 6. Üye sayısı
        const project = await Project.findById(projectId).populate('members.user', 'username');
        const memberCount = project.members.length;
        
        // 7. Son aktivite tarihi
        const lastActivity = await Task.findOne({ 
            project: projectId, 
            isActive: true 
        }).sort({ updatedAt: -1 }).select('updatedAt');
        
        // Veri formatla ve döndür
        const reportData = {
            projectInfo: {
                name: project.name,
                description: project.description,
                memberCount: memberCount,
                createdAt: project.createdAt,
                lastActivity: lastActivity ? lastActivity.updatedAt : project.createdAt
            },
            taskStatistics: {
                totalTasks: totalTasks,
                statusCounts: taskStats.reduce((acc, stat) => {
                    acc[stat._id] = stat.count;
                    return acc;
                }, {}),
                priorityCounts: priorityStats.reduce((acc, stat) => {
                    acc[stat._id] = stat.count;
                    return acc;
                }, {}),
                overallProgress: overallProgress
            },
            memberStatistics: memberTaskStats,
            fileStatistics: {
                totalFiles: fileStats.length > 0 ? fileStats[0].totalFiles : 0,
                totalSize: fileStats.length > 0 ? fileStats[0].totalSize : 0
            }
        };
        
        console.log(`✅ Report generated for project ${projectId}:`, {
            totalTasks,
            completedTasks,
            overallProgress: `${overallProgress}%`,
            memberCount
        });
        
        res.json(reportData);
        
    } catch (error) {
        console.error('Project report error:', error);
        res.status(500).json({ error: 'Proje raporu oluşturulurken hata oluştu' });
    }
});

// --- AI API ROUTES ---

// AI destekli görev önerileri al
app.get('/projects/:projectId/ai-suggestions', ensureAuthenticated, ensureProjectMemberOrOwner, async (req, res) => {
    try {
        const { projectId } = req.params;
        
        // Proje ID format kontrolü
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            console.log(`[AI API] Invalid Project ID format: ${projectId}`);
            return res.status(400).json({ message: 'Geçersiz Proje ID formatı.' });
        }        console.log(`[AI API] Fetching AI suggestions for project: ${projectId} by user: ${req.user.username}`);
        const suggestions = await aiTaskFinder.findPotentialTasks(projectId);
        console.log(`[AI API] Found ${suggestions.length} AI suggestions for project: ${projectId}`);
        
        res.json({ suggestions: suggestions });
    } catch (error) {
        console.error(`[AI API] Error fetching AI suggestions for project ${req.params.projectId}:`, error);
        res.status(500).json({ message: 'AI önerileri alınırken sunucu hatası oluştu.', error: error.message });
    }
});

// --- BPMN Workflow API Routes ---

// Proje BPMN diyagramlarını listele
app.get('/projects/:projectId/bpmn', ensureAuthenticated, async (req, res) => {
    try {
        const { projectId } = req.params;
        
        // Proje erişim kontrolü
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ error: 'Proje bulunamadı' });
        }
        
        const isOwner = project.owner.toString() === req.user._id.toString();
        const isMember = project.members.some(member => 
            member.user.toString() === req.user._id.toString()
        );
        
        if (!isOwner && !isMember) {
            return res.status(403).json({ error: 'Bu projeye erişim yetkiniz yok' });
        }
          // BPMN diyagramlarını getir
        const diagrams = await BPMNDiagram.find({ project: projectId, isActive: true })
            .populate('createdBy', 'username email')
            .sort({ createdAt: -1 });
        
        console.log(`📊 Found ${diagrams.length} BPMN diagrams for project ${project.name}`);
        console.log('📊 Sample diagram data:', diagrams[0] ? {
            title: diagrams[0].title,
            createdAt: diagrams[0].createdAt,
            updatedAt: diagrams[0].updatedAt,
            timestamps: diagrams[0].toObject()
        } : 'No diagrams');
        res.json(diagrams);
    } catch (error) {
        console.error('BPMN listing error:', error);
        res.status(500).json({ error: 'BPMN diyagramları getirilirken hata oluştu' });
    }
});

// Yeni BPMN diyagramı oluştur
app.post('/projects/:projectId/bpmn', ensureAuthenticated, async (req, res) => {
    try {
        const { projectId } = req.params;
        const { title, description, xmlData, category, tags } = req.body;
        
        console.log('📊 BPMN creation request:', { title, description, category, tags });
        
        // Proje erişim kontrolü
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ error: 'Proje bulunamadı' });
        }
        
        const isOwner = project.owner.toString() === req.user._id.toString();
        const isMember = project.members.some(member => 
            member.user.toString() === req.user._id.toString()
        );
        
        if (!isOwner && !isMember) {
            return res.status(403).json({ error: 'Bu projeye erişim yetkiniz yok' });
        }
        
        // Yeni BPMN diyagramı oluştur
        const diagram = new BPMNDiagram({
            title,
            description,
            xmlData: xmlData || '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn"><bpmn:process id="Process_1" isExecutable="true" /></bpmn:definitions>',
            category: category || 'general',
            tags: Array.isArray(tags) ? tags : [],
            project: projectId,
            createdBy: req.user._id
        });
          await diagram.save();
        await diagram.populate('createdBy', 'username email');
        
        console.log(`✅ BPMN diagram created: ${diagram.title} for project ${project.name}`);
        
        // Emit real-time update for diagram list refresh
        io.to(projectId).emit('bpmn:diagram-created', {
            projectId,
            diagram: diagram,
            createdBy: {
                userId: req.user._id,
                userName: req.user.username
            }
        });
        
        res.status(201).json(diagram);
    } catch (error) {
        console.error('BPMN creation error:', error);
        res.status(500).json({ error: 'BPMN diyagramı oluşturulurken hata oluştu' });
    }
});

// BPMN diyagramını güncelle
app.put('/projects/:projectId/bpmn/:diagramId', ensureAuthenticated, async (req, res) => {
    try {
        const { projectId, diagramId } = req.params;
        const { title, description, xmlData, tags } = req.body;
        
        console.log('📊 BPMN update request:', { title, description, tags });
        
        // Diyagram ve proje erişim kontrolü
        const diagram = await BPMNDiagram.findById(diagramId);
        if (!diagram || diagram.project.toString() !== projectId) {
            return res.status(404).json({ error: 'BPMN diyagramı bulunamadı' });
        }
        
        const project = await Project.findById(projectId);
        const isOwner = project.owner.toString() === req.user._id.toString();
        const isMember = project.members.some(member => 
            member.user.toString() === req.user._id.toString()
        );
        
        if (!isOwner && !isMember) {
            return res.status(403).json({ error: 'Bu projeye erişim yetkiniz yok' });
        }
        
        // Güncelleme
        const updateData = {
            title: title || diagram.title,
            description: description !== undefined ? description : diagram.description,
            xmlData: xmlData || diagram.xmlData,
            tags: Array.isArray(tags) ? tags : diagram.tags,
            version: diagram.version + 1
        };
          const updatedDiagram = await BPMNDiagram.findByIdAndUpdate(diagramId, updateData, { new: true })
            .populate('createdBy', 'username email');
        
        console.log(`✅ BPMN diagram updated: ${updatedDiagram.title} (v${updatedDiagram.version})`);
        
        // Emit real-time update for diagram list refresh
        io.to(projectId).emit('bpmn:diagram-updated', {
            projectId,
            diagram: updatedDiagram,
            updatedBy: {
                userId: req.user._id,
                userName: req.user.username
            }
        });
        
        res.json(updatedDiagram);
    } catch (error) {
        console.error('BPMN update error:', error);
        res.status(500).json({ error: 'BPMN diyagramı güncellenirken hata oluştu' });
    }
});

// BPMN diyagramı metadata'sını güncelle (sadece title, description, category)
app.put('/projects/:projectId/bpmn/:diagramId/metadata', ensureAuthenticated, async (req, res) => {
    try {
        const { projectId, diagramId } = req.params;
        const { title, description, category } = req.body;
        
        console.log('📝 BPMN metadata update request:', { 
            projectId, 
            diagramId, 
            title, 
            description, 
            category,
            userId: req.user._id 
        });
        
        // Validate diagram ID
        if (!diagramId || diagramId === 'null' || diagramId === 'undefined') {
            console.error('❌ Invalid diagram ID received:', diagramId);
            return res.status(400).json({ error: 'Geçersiz diyagram ID' });
        }
        
        // Diyagram ve proje erişim kontrolü
        const diagram = await BPMNDiagram.findById(diagramId);
        if (!diagram || diagram.project.toString() !== projectId) {
            console.error('❌ Diagram not found or project mismatch:', { diagramId, projectId });
            return res.status(404).json({ error: 'BPMN diyagramı bulunamadı' });
        }
        
        const project = await Project.findById(projectId);
        if (!project) {
            console.error('❌ Project not found:', projectId);
            return res.status(404).json({ error: 'Proje bulunamadı' });
        }
        
        const isOwner = project.owner.toString() === req.user._id.toString();
        const isMember = project.members.some(member => 
            member.user.toString() === req.user._id.toString()
        );
        
        if (!isOwner && !isMember) {
            return res.status(403).json({ error: 'Bu projeye erişim yetkiniz yok' });
        }
        
        // Sadece metadata alanlarını güncelle
        const updateData = {
            title: title || diagram.title,
            description: description !== undefined ? description : diagram.description,
            category: category || diagram.category
        };
          const updatedDiagram = await BPMNDiagram.findByIdAndUpdate(diagramId, updateData, { new: true })
            .populate('createdBy', 'username email');
        
        console.log(`✅ BPMN diagram metadata updated: ${updatedDiagram.title} (${updatedDiagram.category})`);
        
        // Emit real-time update for diagram list refresh
        io.to(projectId).emit('bpmn:diagram-updated', {
            projectId,
            diagram: updatedDiagram,
            updatedBy: {
                userId: req.user._id,
                userName: req.user.username
            }
        });
        
        res.json(updatedDiagram);
    } catch (error) {
        console.error('BPMN metadata update error:', error);
        res.status(500).json({ error: 'BPMN diyagramı metadata güncellenirken hata oluştu' });
    }
});

// BPMN diyagramını sil
app.delete('/projects/:projectId/bpmn/:diagramId', ensureAuthenticated, async (req, res) => {
    try {
        const { projectId, diagramId } = req.params;
        
        // Diyagram ve proje erişim kontrolü
        const diagram = await BPMNDiagram.findById(diagramId);
        if (!diagram || diagram.project.toString() !== projectId) {
            return res.status(404).json({ error: 'BPMN diyagramı bulunamadı' });
        }
        
        const project = await Project.findById(projectId);
        const isOwner = project.owner.toString() === req.user._id.toString();
        const isMember = project.members.some(member => 
            member.user.toString() === req.user._id.toString()
        );
        
        if (!isOwner && !isMember) {
            return res.status(403).json({ error: 'Bu projeye erişim yetkiniz yok' });
        }
          // Soft delete (isActive = false)
        await BPMNDiagram.findByIdAndUpdate(diagramId, { isActive: false });
        
        console.log(`✅ BPMN diagram soft deleted: ${diagram.title}`);
        
        // Emit real-time update for diagram list refresh
        io.to(projectId).emit('bpmn:diagram-deleted', {
            projectId,
            diagramId,
            deletedBy: {
                userId: req.user._id,
                userName: req.user.username
            }
        });
        
        res.json({ message: 'BPMN diyagramı başarıyla silindi' });
    } catch (error) {
        console.error('BPMN deletion error:', error);
        res.status(500).json({ error: 'BPMN diyagramı silinirken hata oluştu' });
    }
});

// Spesifik BPMN diyagramını al (metadata)
app.get('/projects/:projectId/bpmn/:diagramId', ensureAuthenticated, async (req, res) => {
    try {
        const { projectId, diagramId } = req.params;
        
        // Diyagram ve proje erişim kontrolü
        const diagram = await BPMNDiagram.findById(diagramId)
            .populate('createdBy', 'username email');
            
        if (!diagram || diagram.project.toString() !== projectId || !diagram.isActive) {
            return res.status(404).json({ error: 'BPMN diyagramı bulunamadı' });
        }
        
        const project = await Project.findById(projectId);
        const isOwner = project.owner.toString() === req.user._id.toString();
        const isMember = project.members.some(member => 
            member.user.toString() === req.user._id.toString()
        );
        
        if (!isOwner && !isMember) {
            return res.status(403).json({ error: 'Bu projeye erişim yetkiniz yok' });
        }
        
        console.log(`📊 BPMN diagram requested: ${diagram.title}`);
        res.json(diagram);
    } catch (error) {
        console.error('BPMN fetch error:', error);
        res.status(500).json({ error: 'BPMN diyagramı alınırken hata oluştu' });
    }
});

// Spesifik BPMN diyagramının XML verisini al
app.get('/projects/:projectId/bpmn/:diagramId/xml', ensureAuthenticated, async (req, res) => {
    try {
        const { projectId, diagramId } = req.params;
        
        // Diyagram ve proje erişim kontrolü
        const diagram = await BPMNDiagram.findById(diagramId);
        if (!diagram || diagram.project.toString() !== projectId || !diagram.isActive) {
            return res.status(404).json({ error: 'BPMN diyagramı bulunamadı' });
        }
        
        const project = await Project.findById(projectId);
        const isOwner = project.owner.toString() === req.user._id.toString();
        const isMember = project.members.some(member => 
            member.user.toString() === req.user._id.toString()
        );
        
        if (!isOwner && !isMember) {
            return res.status(403).json({ error: 'Bu projeye erişim yetkiniz yok' });
        }
        
        console.log(`📊 BPMN XML requested: ${diagram.title}`);
        res.set('Content-Type', 'application/xml');
        res.send(diagram.xmlData);
    } catch (error) {
        console.error('BPMN XML fetch error:', error);
        res.status(500).json({ error: 'BPMN XML verisi alınırken hata oluştu' });
    }
});

// HTTPS için SSL sertifikaları
let server, io;

// HTTPS KISMI TAMAMEN DEVRE DIŞI BIRAKILDI - BAŞLANGIÇ

try {
    const options = {
        key: fs.readFileSync(path.join(__dirname, 'key.pem')),
        cert: fs.readFileSync(path.join(__dirname, 'cert.pem'))
    };
    server = https.createServer(options, app);
    io = socketio(server, {
        cors: {
            origin: "https://localhost:3000", 
            methods: ["GET", "POST"],
            credentials: true
        }
    });
    console.log('✅ HTTPS server configured with SSL certificates');
} catch (error) {
    console.log('⚠️ SSL certificates not found, falling back to HTTP only');
    // Fallback to HTTP if SSL certs are not found (bu blok artık ana blok olacak)
    server = http.createServer(app);
    io = socketio(server, {
        cors: {
            origin: "http://localhost:3000", 
            methods: ["GET", "POST"],
            credentials: true
        }
    });
}

// HTTPS KISMI TAMAMEN DEVRE DIŞI BIRAKILDI - SON

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
        const user = await User.findOne({ email });
        
        if (!user) return done(null, false, { message: 'Kullanıcı bulunamadı.' });
        
        const isMatch = await user.comparePassword(password);
        
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
            const { userId, username } = userInfo;            try {
                const chatMessage = new ChatMessage({
                    project: projectId,
                    user: userId,
                    message: msg
                });
                await chatMessage.save();
                
                // --- CHAT MENTION BİLDİRİMİ (FAZ 4) ---
                const mentions = msg.match(/@(\w+)/g); // @ ile başlayan kelimeleri bul
                if (mentions) {
                    for (const mention of mentions) {
                        const mentionedUsername = mention.substring(1); // @ işaretini kaldır
                        try {
                            const mentionedUser = await User.findOne({ username: mentionedUsername });
                            if (mentionedUser && mentionedUser._id.toString() !== userId.toString()) {
                                const message = `${username} sizi bir mesajda bahsetti: "${msg.length > 50 ? msg.substring(0, 50) + '...' : msg}"`;
                                const link = `/room/${projectId}?tab=chat`;
                                await createNotification(
                                    mentionedUser._id,
                                    projectId,
                                    'chat-mention',
                                    message,
                                    link,
                                    userId
                                );
                                console.log(`📢 Chat mention notification sent to ${mentionedUser.username}`);
                            }
                        } catch (mentionError) {
                            console.error(`Error processing mention ${mention}:`, mentionError);
                        }
                    }
                }
                
                io.to(projectId).emit('project message', {
                    user: { _id: userId, username },
                    message: msg,
                    createdAt: chatMessage.createdAt
                });
            } catch (err) {
                console.error(`Error saving/sending chat message for project ${projectId}:`, err);
            }
        });

        socket.on('project draw', async (projectId, drawData) => {
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
        });        socket.on('leave project', (projectId, userId) => {
            console.log(`leave project request: User ${userId} from project ${projectId}`);
            // This is mostly handled by disconnect, but can be a manual trigger.
            // Ensure it calls the same cleanup logic as disconnect if used.
        });

        // BPMN Workflow Collaboration Events
        socket.on('bpmn:join-diagram', (diagramId, projectId) => {
            console.log(`SERVER: User joined BPMN diagram ${diagramId} in project ${projectId}. Socket: ${socket.id}`);
            socket.join(`bpmn:${diagramId}`);
            
            // Notify other users in the diagram that a new user joined
            const userInfo = socketToUserMap[socket.id];
            if (userInfo) {
                socket.to(`bpmn:${diagramId}`).emit('bpmn:user-joined', {
                    userId: userInfo.userId,
                    userName: userInfo.userName,
                    socketId: socket.id,
                    diagramId
                });
            }
        });

        socket.on('bpmn:leave-diagram', (diagramId) => {
            console.log(`SERVER: User left BPMN diagram ${diagramId}. Socket: ${socket.id}`);
            socket.leave(`bpmn:${diagramId}`);
            
            // Notify other users in the diagram that the user left
            const userInfo = socketToUserMap[socket.id];
            if (userInfo) {
                socket.to(`bpmn:${diagramId}`).emit('bpmn:user-left', {
                    userId: userInfo.userId,
                    userName: userInfo.userName,
                    socketId: socket.id,
                    diagramId
                });
            }
        });

        socket.on('bpmn:diagram-changed', async (diagramId, xmlData, changeInfo) => {
            console.log(`SERVER: BPMN diagram ${diagramId} changed by ${socket.id}`);
            
            try {
                // Save the updated diagram to database
                await BPMNDiagram.findByIdAndUpdate(diagramId, { 
                    xmlData,
                    version: changeInfo.version || 1
                });
                
                // Broadcast the change to other users in the diagram
                const userInfo = socketToUserMap[socket.id];
                socket.to(`bpmn:${diagramId}`).emit('bpmn:diagram-changed', {
                    diagramId,
                    xmlData,
                    changeInfo,
                    changedBy: userInfo ? {
                        userId: userInfo.userId,
                        userName: userInfo.userName
                    } : null
                });
            } catch (error) {
                console.error(`Error saving BPMN diagram ${diagramId}:`, error);
                socket.emit('bpmn:error', { 
                    message: 'Diyagram kaydedilirken hata oluştu',
                    diagramId 
                });
            }
        });

        socket.on('bpmn:cursor-move', (diagramId, cursorData) => {
            // Broadcast cursor movement to other users in the diagram
            const userInfo = socketToUserMap[socket.id];
            if (userInfo) {
                socket.to(`bpmn:${diagramId}`).emit('bpmn:cursor-move', {
                    userId: userInfo.userId,
                    userName: userInfo.userName,
                    socketId: socket.id,
                    diagramId,
                    x: cursorData.x,
                    y: cursorData.y
                });
            }
        });

        socket.on('bpmn:selection-changed', (diagramId, selectedElements) => {
            // Broadcast selection changes to other users in the diagram
            const userInfo = socketToUserMap[socket.id];
            if (userInfo) {
                socket.to(`bpmn:${diagramId}`).emit('bpmn:selection-changed', {
                    userId: userInfo.userId,
                    userName: userInfo.userName,
                    socketId: socket.id,
                    diagramId,
                    selectedElements
                });
            }
        });

        socket.on('bpmn:request-sync', (diagramId) => {
            // Request current diagram state for synchronization
            console.log(`SERVER: Sync requested for BPMN diagram ${diagramId} by ${socket.id}`);
            
            // Emit sync request to the first available user in the diagram room
            socket.to(`bpmn:${diagramId}`).emit('bpmn:sync-request', {
                diagramId,
                requestedBy: socket.id
            });
        });        socket.on('bpmn:sync-response', (diagramId, xmlData, targetSocketId) => {
            // Send sync response to specific user
            console.log(`SERVER: Sync response for BPMN diagram ${diagramId} to ${targetSocketId}`);
            
            socket.to(targetSocketId).emit('bpmn:sync-response', {
                diagramId,
                xmlData
            });
        });

        // ==================== KANBAN TASK REAL-TIME EVENTS ====================
        socket.on('task-created', (data) => {
            console.log(`SERVER: Task created in project ${data.projectId} by ${socket.id}`);
            // Broadcast to all other users in the project
            socket.to(data.projectId).emit('task-created', data);
        });

        socket.on('task-updated', (data) => {
            console.log(`SERVER: Task updated in project ${data.projectId} by ${socket.id}`);
            // Broadcast to all other users in the project
            socket.to(data.projectId).emit('task-updated', data);
        });

        socket.on('task-deleted', (data) => {
            console.log(`SERVER: Task deleted in project ${data.projectId} by ${socket.id}`);
            // Broadcast to all other users in the project
            socket.to(data.projectId).emit('task-deleted', data);
        });        socket.on('task-status-updated', (data) => {
            console.log(`SERVER: Task status updated in project ${data.projectId} by ${socket.id}`);
            // Broadcast to all other users in the project
            socket.to(data.projectId).emit('task-status-updated', data);
        });

        // ==================== PROJECT NOTE REAL-TIME EVENTS ====================
        socket.on('noteCreated', (data) => {
            console.log(`SERVER: Note created in project ${data.projectId} by ${socket.id}`);
            // Broadcast to all other users in the project
            socket.to(data.projectId).emit('noteCreated', data);
        });

        socket.on('noteUpdated', (data) => {
            console.log(`SERVER: Note updated in project ${data.projectId} by ${socket.id}`);
            // Broadcast to all other users in the project
            socket.to(data.projectId).emit('noteUpdated', data);
        });

        socket.on('noteDeleted', (data) => {
            console.log(`SERVER: Note deleted in project ${data.projectId} by ${socket.id}`);
            // Broadcast to all other users in the project
            socket.to(data.projectId).emit('noteDeleted', data);
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

// Debug endpoint to list users
app.get('/debug/users', ensureAuthenticated, async (req, res) => {
    try {
        const users = await User.find({}, 'username email createdAt');
        res.json({
            count: users.length,
            users: users
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ===== NOTIFICATION API ROUTES (FAZ 4) =====

// Get user notifications
app.get('/notifications', ensureAuthenticated, async (req, res) => {
    try {
        const { limit = 20, offset = 0, unreadOnly = false } = req.query;
        
        // Build query
        const query = { user: req.user._id };
        if (unreadOnly === 'true') {
            query.isRead = false;
        }
        
        // Get notifications with pagination
        const notifications = await Notification.find(query)
            .populate('project', 'name')
            .populate('triggeredBy', 'username fullName')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .skip(parseInt(offset));
        
        // Get unread count
        const unreadCount = await Notification.getUnreadCount(req.user._id);
        
        // Add timeAgo virtual field to response
        const notificationsWithTime = notifications.map(notification => ({
            _id: notification._id,
            type: notification.type,
            message: notification.message,
            link: notification.link,
            isRead: notification.isRead,
            timeAgo: notification.timeAgo,
            project: notification.project,
            triggeredBy: notification.triggeredBy,
            createdAt: notification.createdAt
        }));
        
        res.json({
            notifications: notificationsWithTime,
            unreadCount: unreadCount,
            total: notifications.length,
            hasMore: notifications.length === parseInt(limit)
        });
        
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ error: 'Bildirimler alınırken hata oluştu' });
    }
});

// Mark notifications as read
app.post('/notifications/mark-as-read', ensureAuthenticated, async (req, res) => {
    try {
        const { notificationIds, markAll = false } = req.body;
        
        let updateQuery = { user: req.user._id };
        
        if (markAll) {
            // Mark all user notifications as read
            await Notification.updateMany(updateQuery, { isRead: true });
            console.log(`📖 All notifications marked as read for user ${req.user.username}`);
        } else if (notificationIds && Array.isArray(notificationIds)) {
            // Mark specific notifications as read
            updateQuery._id = { $in: notificationIds };
            await Notification.updateMany(updateQuery, { isRead: true });
            console.log(`📖 ${notificationIds.length} notifications marked as read for user ${req.user.username}`);
        } else {
            return res.status(400).json({ error: 'notificationIds array or markAll flag required' });
        }
        
        // Get updated unread count
        const unreadCount = await Notification.getUnreadCount(req.user._id);
        
        res.json({ 
            success: true, 
            unreadCount: unreadCount,
            message: 'Bildirimler okundu olarak işaretlendi' 
        });
        
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ error: 'Bildirimler güncellenirken hata oluştu' });
    }
});

// Delete notification
app.delete('/notifications/:notificationId', ensureAuthenticated, async (req, res) => {
    try {
        const { notificationId } = req.params;
        
        const notification = await Notification.findOne({
            _id: notificationId,
            user: req.user._id
        });
        
        if (!notification) {
            return res.status(404).json({ error: 'Bildirim bulunamadı' });
        }
        
        await Notification.findByIdAndDelete(notificationId);
        
        const unreadCount = await Notification.getUnreadCount(req.user._id);
        
        res.json({ 
            success: true, 
            unreadCount: unreadCount,
            message: 'Bildirim silindi' 
        });
        
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ error: 'Bildirim silinirken hata oluştu' });
    }
});

// Get notification statistics
app.get('/notifications/stats', ensureAuthenticated, async (req, res) => {
    try {
        const userId = req.user._id;
        
        const stats = await Notification.aggregate([
            { $match: { user: userId } },
            {
                $group: {
                    _id: '$type',
                    count: { $sum: 1 },
                    unreadCount: {
                        $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] }
                    }
                }
            },
            { $sort: { count: -1 } }
        ]);
        
        const totalUnread = await Notification.getUnreadCount(userId);
        const totalNotifications = await Notification.countDocuments({ user: userId });
        
        res.json({
            totalNotifications,
            totalUnread,
            byType: stats
        });
        
    } catch (error) {
        console.error('Notification stats error:', error);
        res.status(500).json({ error: 'Bildirim istatistikleri alınırken hata oluştu' });
    }
});

// Debug endpoint to show current user info
app.get('/debug/current-user', ensureAuthenticated, async (req, res) => {
    try {
        res.json({
            isAuthenticated: req.isAuthenticated(),
            user: req.user,
            sessionID: req.sessionID,
            session: req.session
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Debug endpoint to check user by username
app.get('/debug/user/:username', ensureAuthenticated, async (req, res) => {
    try {
        const user = await User.findOne({ username: req.params.username });
        res.json({
            found: !!user,
            user: user
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ 
        message: 'Sunucu hatası oluştu.', 
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
    });
});

// Update project information
app.put('/projects/:id', ensureAuthenticated, async (req, res) => {
    try {
        const { name, description } = req.body;
        const projectId = req.params.id;
        
        // Projeyi bul ve sadece sahip olan kullanıcının güncelleyebilmesini sağla
        const project = await Project.findById(projectId);
        
        if (!project) {
            return res.status(404).json({ message: 'Proje bulunamadı.' });
        }
        
        // Sadece proje sahibi güncelleyebilir
        if (project.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Bu projeyi güncelleme yetkiniz yok.' });
        }
        
        // Validasyon
        if (!name || name.trim() === '') {
            return res.status(400).json({ message: 'Proje adı gereklidir.' });
        }
        
        // Projeyi güncelle
        project.name = name.trim();
        project.description = description ? description.trim() : '';
        
        await project.save();
        
        console.log(`📝 Project ${projectId} updated by ${req.user.username}`);
        res.json({ message: 'Proje başarıyla güncellendi.', project: project });
        
    } catch (err) {
        console.error('Error updating project:', err);
        res.status(500).json({ message: 'Proje güncellenirken sunucu hatası oluştu.', error: err.message });
    }
});