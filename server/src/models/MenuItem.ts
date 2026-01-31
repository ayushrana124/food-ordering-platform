import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMenuItem extends Document {
    restaurantId: Types.ObjectId;
    name: string;
    description?: string;
    category: string;
    price: number;
    image?: string;
    isVeg: boolean;
    isAvailable: boolean;
    customizations: Array<{
        name: string;
        options: Array<{
            name: string;
            price: number;
        }>;
        required: boolean;
    }>;
    createdAt: Date;
}

const menuItemSchema = new Schema<IMenuItem>({
    restaurantId: {
        type: Schema.Types.ObjectId,
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

menuItemSchema.index({ restaurantId: 1, category: 1 });

export default mongoose.model<IMenuItem>('MenuItem', menuItemSchema);
