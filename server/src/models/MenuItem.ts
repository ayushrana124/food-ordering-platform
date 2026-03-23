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
    isDeleted: boolean;
    deletedAt?: Date | null;
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
    isDeleted: {
        type: Boolean,
        default: false
    },
    deletedAt: {
        type: Date,
        default: null
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

// Soft-delete middleware: auto-exclude deleted items from all queries
function applySoftDeleteFilter(this: any) {
    if (this.getFilter().isDeleted === undefined) {
        this.where({ isDeleted: { $ne: true } });
    }
}

menuItemSchema.pre('find', applySoftDeleteFilter);
menuItemSchema.pre('findOne', applySoftDeleteFilter);
menuItemSchema.pre('countDocuments', applySoftDeleteFilter);

menuItemSchema.index({ restaurantId: 1, isDeleted: 1, category: 1 });

export default mongoose.model<IMenuItem>('MenuItem', menuItemSchema);
