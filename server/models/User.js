const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    name: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    addresses: [{
        label: {
            type: String,
            enum: ['Home', 'Work', 'Other'],
            default: 'Home'
        },
        addressLine: {
            type: String,
            required: true
        },
        landmark: String,
        coordinates: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true }
        },
        isDefault: {
            type: Boolean,
            default: false
        }
    }],
    isBlocked: {
        type: Boolean,
        default: false
    },
    isCODBlocked: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('User', userSchema);
