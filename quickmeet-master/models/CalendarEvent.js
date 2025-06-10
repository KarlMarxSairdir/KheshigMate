const mongoose = require('mongoose');

const calendarEventSchema = new mongoose.Schema({
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
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    allDay: {
        type: Boolean,
        default: false
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
    color: {
        type: String,
        default: '#3498db'
    },
    type: {
        type: String,
        enum: ['event', 'meeting', 'deadline', 'milestone'],
        default: 'event'
    },
    attendees: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'declined'],
            default: 'pending'
        }
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Indexler (Performans için)
calendarEventSchema.index({ project: 1, startDate: 1 });
calendarEventSchema.index({ createdBy: 1 });
calendarEventSchema.index({ 'attendees.user': 1 });

module.exports = mongoose.model('CalendarEvent', calendarEventSchema);
