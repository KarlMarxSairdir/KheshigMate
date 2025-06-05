// Middleware for authentication and authorization
const Project = require('../models/Project');

// Ensure user is authenticated
const ensureAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    return res.redirect('/login');
};

// Ensure user is project owner
const ensureProjectOwner = async (req, res, next) => {
    try {
        console.log('🔍 ensureProjectOwner middleware started');
        console.log('👤 User:', req.user ? req.user.username : 'NOT AUTHENTICATED');
        
        const projectId = req.params.id || req.params.projectId;
        console.log('🆔 Project ID:', projectId);
        
        const project = await Project.findById(projectId);
        
        if (!project) {
            console.log('❌ Project not found:', projectId);
            return res.status(404).json({ error: 'Proje bulunamadı' });
        }
        
        console.log('✅ Project found:', project.name);
        console.log('👤 Project owner:', project.owner);
        console.log('👤 Current user ID:', req.user._id);
        
        if (project.owner.toString() !== req.user._id.toString()) {
            console.log('❌ Access denied: User is not project owner');
            return res.status(403).json({ error: 'Bu işlem için proje sahibi olmanız gerekir' });
        }
        
        console.log('✅ Access granted: User is project owner');
        req.project = project;
        next();
    } catch (error) {
        console.error('❌ Project owner check error:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
};

// Ensure user is project member or owner
const ensureProjectMemberOrOwner = async (req, res, next) => {
    try {
        const projectId = req.params.id || req.params.projectId;
        const project = await Project.findById(projectId);
        
        if (!project) {
            return res.status(404).json({ error: 'Proje bulunamadı' });
        }
          // Check if user is owner
        if (project.owner.toString() === req.user._id.toString()) {
            req.project = project;
            req.userRole = 'owner';
            return next();
        }
        
        // Check if user is member
        const member = project.members.find(m => m.user.toString() === req.user._id.toString());
        if (member) {
            req.project = project;
            req.userRole = member.role;
            return next();
        }
        
        return res.status(403).json({ error: 'Bu projeye erişim izniniz yok' });
    } catch (error) {
        console.error('Project member check error:', error);
        res.status(500).json({ error: 'Sunucu hatası' });
    }
};

module.exports = {
    ensureAuthenticated,
    ensureProjectOwner,
    ensureProjectMemberOrOwner
};
