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
    createdAt: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model<IOffer>('Offer', offerSchema);
