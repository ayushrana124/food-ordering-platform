import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IOrder extends Document {
    orderId: string;
    userId: Types.ObjectId;
    restaurantId: Types.ObjectId;
    items: Array<{
        menuItemId: Types.ObjectId;
        name: string;
        quantity: number;
        price: number;
        customizations: Array<{
            name: string;
            option: string;
            price: number;
        }>;
    }>;
    deliveryAddress: {
        label: string;
        addressLine: string;
        landmark?: string;
        coordinates: {
            lat: number;
            lng: number;
        };
    };
    distance: number;
    deliveryCharges: number;
    subtotal: number;
    taxes: number;
    total: number;
    paymentMethod: 'COD' | 'ONLINE';
    paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
    paymentId?: string;
    razorpayOrderId?: string;
    orderStatus: 'PENDING' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
    preparationTime?: number;
    estimatedDeliveryTime?: Date;
    specialInstructions?: string;
    createdAt: Date;
    updatedAt: Date;
}

const orderSchema = new Schema<IOrder>({
    orderId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    restaurantId: {
        type: Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    items: [{
        menuItemId: {
            type: Schema.Types.ObjectId,
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
    distance: Number,
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
    preparationTime: Number,
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

orderSchema.pre('save', async function () {
    if (!this.orderId) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 7);
        this.orderId = `ORD-${timestamp}-${random}`.toUpperCase();
    }
});

export default mongoose.model<IOrder>('Order', orderSchema);
