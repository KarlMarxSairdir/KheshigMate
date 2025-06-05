const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    members: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        role: { type: String, enum: ['owner', 'editor'], default: 'editor' }
    }],
    lastCanvasState: { type: String }, // Added lastCanvasState for whiteboard persistence
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', projectSchema);
