const mongoose = require('mongoose');

const bpmnDiagramSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    project: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    xmlData: {
        type: String,
        required: true
    },    version: {
        type: Number,
        default: 1
    },
    category: {
        type: String,
        enum: ['general', 'approval', 'development', 'testing', 'deployment', 'other'],
        default: 'general',
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    tags: [{
        type: String,
        trim: true
    }]
}, {
    timestamps: true
});

// Indexler (Performans için)
bpmnDiagramSchema.index({ project: 1, createdAt: -1 });
bpmnDiagramSchema.index({ createdBy: 1 });
bpmnDiagramSchema.index({ project: 1, isActive: 1 });

module.exports = mongoose.model('BPMNDiagram', bpmnDiagramSchema);
