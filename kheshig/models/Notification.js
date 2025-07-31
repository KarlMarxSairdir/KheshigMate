const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    // Bildirimi alacak kullanıcı
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true, 
        index: true 
    },
    
    // Bildirim türü - enum ile sınırlandırılmış
    type: {
        type: String,
        enum: [
            'new-task-assigned',    // Yeni görev atandığında
            'due-date-reminder',    // Son tarih yaklaştığında
            'chat-mention',         // Chat'te bahsedildiğinde (@mention)
            'file-uploaded',        // Yeni dosya yüklendiğinde
            'note-mention',         // Notlarda bahsedildiğinde
            'task-completed',       // Görev tamamlandığında
            'project-updated'       // Proje güncellendiğinde
        ],
        required: true,
        index: true
    },
    
    // Bildirim mesajı - kullanıcıya gösterilecek metin
    message: { 
        type: String, 
        required: true,
        maxlength: 500
    },
    
    // İlgili sayfaya yönlendiren link
    link: { 
        type: String, 
        required: true 
    },
    
    // Okundu/okunmadı durumu
    isRead: { 
        type: Boolean, 
        default: false,
        index: true
    },
    
    // Hangi projeyle ilgili olduğu
    project: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Project', 
        required: true,
        index: true 
    },
    
    // Ek veri (opsiyonel) - JSON formatında ek bilgiler
    metadata: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, { 
    timestamps: true  // createdAt ve updatedAt otomatik eklenir
});

// Compound index - kullanıcıya göre okunmamış bildirimleri hızlı getirmek için
notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

// Compound index - projeye göre bildirimleri getirmek için
notificationSchema.index({ project: 1, createdAt: -1 });

// Virtual field - bildirim yaşı (kaç dakika/saat/gün önce)
notificationSchema.virtual('timeAgo').get(function() {
    const now = new Date();
    const diffMs = now - this.createdAt;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    return this.createdAt.toLocaleDateString('tr-TR');
});

// Static method - kullanıcının okunmamış bildirim sayısını getir
notificationSchema.statics.getUnreadCount = function(userId) {
    return this.countDocuments({ 
        user: userId, 
        isRead: false 
    });
};

// Static method - kullanıcının son bildirimlerini getir
notificationSchema.statics.getUserNotifications = function(userId, limit = 20, skip = 0) {
    return this.find({ user: userId })
        .populate('project', 'name')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
};

// Instance method - bildirimi okundu olarak işaretle
notificationSchema.methods.markAsRead = function() {
    this.isRead = true;
    return this.save();
};

// Pre-save middleware - bildirim oluşturulmadan önce validation
notificationSchema.pre('save', function(next) {
    // Link formatını kontrol et
    if (!this.link.startsWith('/') && !this.link.startsWith('http')) {
        this.link = '/' + this.link;
    }
    next();
});

module.exports = mongoose.model('Notification', notificationSchema);
