import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IOffer extends Document {
    restaurantId: Types.ObjectId;
    title: string;
    description?: string;
    code: string;
    discountType: 'PERCENTAGE' | 'FLAT';
    discountValue: number;
    minOrderAmount: number;
    maxDiscount?: number;
    validFrom: Date;
    validTill: Date;
    isActive: boolean;
    // Landing-page display fields
    label?: string;        // e.g. "Today Only", "New User"
    headline?: string;     // e.g. "Buy 2\nGet 1 FREE"
    ctaText?: string;      // e.g. "Order Now"
    colorTheme?: string;   // hex e.g. "#E8A317"
    createdAt: Date;
}

const offerSchema = new Schema<IOffer>({
    restaurantId: {
        type: Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    title: {
        type: String,
        required: true
    },
    description: String,
    code: {
        type: String,
        unique: true,
        uppercase: true
    },
    discountType: {
        type: String,
        enum: ['PERCENTAGE', 'FLAT'],
        required: true
    },
    discountValue: {
        type: Number,
        required: true
    },
    minOrderAmount: {
        type: Number,
        default: 0
    },
    maxDiscount: Number,
    validFrom: {
        type: Date,
        required: true
    },
    validTill: {
        type: Date,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    label: String,
    headline: String,
    ctaText: { type: String, default: 'Order Now' },
    colorTheme: { type: String, default: '#E8A317' },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model<IOffer>('Offer', offerSchema);
