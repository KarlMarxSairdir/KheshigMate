const mongoose = require('mongoose');

const projectFileSchema = new mongoose.Schema({
    originalName: {
        type: String,
        required: true,
        trim: true
    },
    serverFilename: {
        type: String,
        required: true,
        unique: true
    },
    path: {
        type: String,
        required: true
    },
    mimetype: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true,
        min: 0
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true,
        index: true
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

// Compound index for better query performance
projectFileSchema.index({ project: 1, createdAt: -1 });

// Virtual for file size in human readable format
projectFileSchema.virtual('sizeFormatted').get(function() {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (this.size === 0) return '0 Bytes';
    const i = Math.floor(Math.log(this.size) / Math.log(1024));
    return Math.round(this.size / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
});

// Virtual for file extension
projectFileSchema.virtual('extension').get(function() {
    return this.originalName.split('.').pop().toLowerCase();
});

// Static method to get files by project
projectFileSchema.statics.getByProject = function(projectId) {
    return this.find({ project: projectId })
        .populate('uploadedBy', 'username fullName')
        .sort({ createdAt: -1 });
};

// Instance method to check if user can delete file
projectFileSchema.methods.canDeleteBy = function(userId, userRole) {
    // Owner can delete any file, or uploader can delete their own file
    return userRole === 'owner' || this.uploadedBy.toString() === userId.toString();
};

module.exports = mongoose.model('ProjectFile', projectFileSchema);
