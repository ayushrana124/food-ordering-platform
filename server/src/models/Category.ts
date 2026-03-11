import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICategory extends Document {
    restaurantId: Types.ObjectId;
    name: string;
    icon: string;          // lucide icon key: "Pizza", "Coffee", "Cake", etc.
    colorScheme: {
        bg: string;        // card background
        border: string;    // card border
        color: string;     // text color
        iconBg: string;    // icon badge background
    };
    displayOrder: number;
    isActive: boolean;
    createdAt: Date;
}

const categorySchema = new Schema<ICategory>({
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
    icon: {
        type: String,
        default: 'Utensils'
    },
    colorScheme: {
        bg: { type: String, default: '#F7F7F5' },
        border: { type: String, default: '#EEEEEE' },
        color: { type: String, default: '#4A4A4A' },
        iconBg: { type: String, default: '#F0F0EE' },
    },
    displayOrder: {
        type: Number,
        default: 0
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

categorySchema.index({ restaurantId: 1, displayOrder: 1 });

export default mongoose.model<ICategory>('Category', categorySchema);
