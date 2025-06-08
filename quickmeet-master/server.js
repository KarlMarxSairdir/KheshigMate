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
const { ExpressPeerServer } = require('peer'); // PeerJS sunucusu için
const cors = require('cors'); // CORS paketi eklendi
const { ensureAuthenticated, ensureProjectOwner, ensureProjectMemberOrOwner } = require('./middleware/auth'); // Auth middleware'leri

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
    saveUninitialized: false,
    cookie: {
        secure: false, // HTTP için false, HTTPS için true
        maxAge: 24 * 60 * 60 * 1000 // 24 saat
    }
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
        const isMember = project.members.some(member => member.user._id.toString() === userId.toString());
        
        if (!isOwner && !isMember) {
            return res.status(403).json({ message: 'Bu projeye erişim izniniz yok.' });
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
                isMember
            }
        });
    } catch (err) {
        console.error(`Error fetching notes for project ${req.params.projectId}:`, err);
        res.status(500).json({ message: 'Notlar alınırken sunucu hatası oluştu.', error: err.message });
    }
});

// Create a new note for a project
app.post('/projects/:projectId/notes', ensureAuthenticated, async (req, res) => {    try {
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
        });

        await newNote.save();
        const populatedNote = await ProjectNote.findById(newNote._id).populate('user', 'username email _id');
        
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
        
        if (note.project.toString() !== projectId) {
             return res.status(400).json({ message: 'Not bu projeye ait değil.' });
        }

        // YENİ YETKI KURALI: Tüm proje üyeleri herhangi bir notu düzenleyebilir
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Proje bulunamadı.' });
        }

        // Kullanıcının proje üyesi olup olmadığını kontrol et
        const isOwner = project.owner.toString() === userId.toString();
        const isMember = project.members.some(member => member.user.toString() === userId.toString());
        
        if (!isOwner && !isMember) {
            return res.status(403).json({ message: 'Bu notu düzenlemek için proje üyesi olmalısınız.' });
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

        if (note.project.toString() !== projectId) {
            return res.status(400).json({ message: 'Not bu projeye ait değil.' });
        }

        // YENİ YETKI KURALI: Sadece proje sahibi veya notu oluşturan kişi silebilir
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ message: 'Proje bulunamadı.' });
        }

        const isProjectOwner = project.owner.toString() === userId.toString();
        const isNoteCreator = note.user.toString() === userId.toString();
        
        if (!isProjectOwner && !isNoteCreator) {
            return res.status(403).json({ message: 'Bu notu sadece proje sahibi veya notu oluşturan kişi silebilir.' });
        }

        await ProjectNote.findByIdAndDelete(noteId);

        res.status(200).json({ message: 'Not başarıyla silindi.' });    } catch (err) {
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
        const { title, description, priority, dueDate, requiredSkills } = req.body;
        
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
        
        // Yeni görev oluştur
        const task = new Task({
            title,
            description,
            priority,
            dueDate: dueDate ? new Date(dueDate) : undefined,
            requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : [],
            project: projectId,
            createdBy: req.user._id
        });
        
        await task.save();
        await task.populate(['assignedTo', 'createdBy'], 'username email');
        
        console.log(`✅ Task created: ${task.title} for project ${project.name}`);
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

// Görevi güncelle
app.put('/projects/:projectId/tasks/:taskId', ensureAuthenticated, async (req, res) => {
    try {
        const { projectId, taskId } = req.params;
        const { title, description, priority, dueDate, requiredSkills } = req.body;
        
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
        
        // Güncelle
        const updatedTask = await Task.findByIdAndUpdate(taskId, {
            title,
            description,
            priority,
            dueDate: dueDate ? new Date(dueDate) : undefined,
            requiredSkills: Array.isArray(requiredSkills) ? requiredSkills : []
        }, { new: true }).populate(['assignedTo', 'createdBy'], 'username email');
        
        console.log(`✅ Task updated: ${updatedTask.title}`);
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

// Görev durumunu güncelle (Kanban sürükle-bırak için)
app.put('/projects/:projectId/tasks/:taskId/status', ensureAuthenticated, async (req, res) => {
    try {
        const { projectId, taskId } = req.params;
        const { status, order } = req.body;
        
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
        
        // Status güncelleme
        const updatedTask = await Task.findByIdAndUpdate(taskId, {
            status,
            order: order || task.order
        }, { new: true }).populate(['assignedTo', 'createdBy'], 'username email');
        
        console.log(`✅ Task status updated: ${updatedTask.title} -> ${status}`);
        res.json(updatedTask);
    } catch (error) {
        console.error('Task status update error:', error);
        res.status(500).json({ error: 'Görev durumu güncellenirken hata oluştu' });
    }
});

// Görev ataması (skills matching için)
app.put('/projects/:projectId/tasks/:taskId/assign', ensureAuthenticated, async (req, res) => {
    try {
        const { projectId, taskId } = req.params;
        const { assignedTo } = req.body;
        
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
        
        // Atanacak kullanıcının proje üyesi olup olmadığını kontrol et
        if (assignedTo) {
            const assigneeIsOwner = project.owner.toString() === assignedTo;
            const assigneeIsMember = project.members.some(member => 
                member.user.toString() === assignedTo
            );
            
            if (!assigneeIsOwner && !assigneeIsMember) {
                return res.status(400).json({ error: 'Kullanıcı bu projenin üyesi değil' });
            }
        }
        
        // Atama işlemi
        const updatedTask = await Task.findByIdAndUpdate(taskId, {
            assignedTo: assignedTo || null
        }, { new: true }).populate(['assignedTo', 'createdBy'], 'username email skills');
        
        console.log(`✅ Task assigned: ${updatedTask.title} -> ${updatedTask.assignedTo?.username || 'Unassigned'}`);
        res.json(updatedTask);
    } catch (error) {
        console.error('Task assignment error:', error);
        res.status(500).json({ error: 'Görev atanırken hata oluştu' });
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