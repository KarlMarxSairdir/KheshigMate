const mongoose = require('mongoose');

const projectNoteSchema = new mongoose.Schema({
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, default: '' }, // Optional title field
    content: { type: String, required: true }, // Plain text fallback
    deltaContent: { type: mongoose.Schema.Types.Mixed }, // Quill.js Delta format
    htmlContent: { type: String }, // HTML representation for display
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ProjectNote', projectNoteSchema);
