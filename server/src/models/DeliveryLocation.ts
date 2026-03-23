import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IDeliveryLocation extends Document {
    restaurantId: Types.ObjectId;
    name: string;
    lat: number;
    lng: number;
    isActive: boolean;
    displayOrder: number;
    createdAt: Date;
}

const deliveryLocationSchema = new Schema<IDeliveryLocation>({
    restaurantId: {
        type: Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    lat: {
        type: Number,
        required: true
    },
    lng: {
        type: Number,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    displayOrder: {
        type: Number,
        default: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

deliveryLocationSchema.index({ restaurantId: 1, isActive: 1 });

export default mongoose.model<IDeliveryLocation>('DeliveryLocation', deliveryLocationSchema);
