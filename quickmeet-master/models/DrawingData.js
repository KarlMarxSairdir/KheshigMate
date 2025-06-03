const mongoose = require('mongoose');

const drawingDataSchema = new mongoose.Schema({
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    data: { type: Object, required: true }, // Çizim verisi (ör: koordinatlar, renk, vs.)
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DrawingData', drawingDataSchema);
