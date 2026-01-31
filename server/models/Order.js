const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    items: [{
        menuItemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MenuItem'
        },
        name: String,
        quantity: Number,
        price: Number,
        customizations: [{
            name: String,
            option: String,
            price: Number
        }]
    }],
    deliveryAddress: {
        label: String,
        addressLine: String,
        landmark: String,
        coordinates: {
            lat: Number,
            lng: Number
        }
    },
    distance: Number, // in kilometers
    deliveryCharges: Number,
    subtotal: Number,
    taxes: Number,
    total: Number,
    paymentMethod: {
        type: String,
        enum: ['COD', 'ONLINE'],
        required: true
    },
    paymentStatus: {
        type: String,
        enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
        default: 'PENDING'
    },
    paymentId: String,
    razorpayOrderId: String,
    orderStatus: {
        type: String,
        enum: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'],
        default: 'PENDING',
        index: true
    },
    preparationTime: Number, // in minutes
    estimatedDeliveryTime: Date,
    specialInstructions: String,
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Generate unique order ID before saving
orderSchema.pre('save', async function (next) {
    if (!this.orderId) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 7);
        this.orderId = `ORD-${timestamp}-${random}`.toUpperCase();
    }
    next();
});

module.exports = mongoose.model('Order', orderSchema);
