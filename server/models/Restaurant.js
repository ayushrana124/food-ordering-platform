const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: String,
    logo: String,
    banner: String,
    address: {
        addressLine: String,
        coordinates: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true }
        }
    },
    phone: String,
    email: String,
    openingHours: {
        monday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
        tuesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
        wednesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
        thursday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
        friday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
        saturday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
        sunday: { open: String, close: String, isOpen: { type: Boolean, default: true } }
    },
    isOpen: {
        type: Boolean,
        default: true
    },
    deliveryRadius: {
        type: Number,
        default: 10 // kilometers
    },
    minOrderAmount: {
        type: Number,
        default: 0
    },
    avgPreparationTime: {
        type: Number,
        default: 30 // minutes
    },
    categories: [String]
});

module.exports = mongoose.model('Restaurant', restaurantSchema);
