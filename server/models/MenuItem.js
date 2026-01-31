const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: String,
    category: {
        type: String,
        required: true,
        index: true
    },
    price: {
        type: Number,
        required: true
    },
    image: String,
    isVeg: {
        type: Boolean,
        default: true
    },
    isAvailable: {
        type: Boolean,
        default: true
    },
    customizations: [{
        name: String,
        options: [{
            name: String,
            price: Number
        }],
        required: Boolean
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

// Compound index for efficient queries
menuItemSchema.index({ restaurantId: 1, category: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
