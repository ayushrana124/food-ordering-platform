import mongoose, { Schema, Document } from 'mongoose';

export interface ICartItem {
    menuItemId: mongoose.Types.ObjectId;
    quantity: number;
    selectedCustomizations: { groupName: string; optionName: string }[];
}

export interface ICart extends Document {
    userId: mongoose.Types.ObjectId;
    items: ICartItem[];
    appliedCoupon: string | null;
    updatedAt: Date;
}

const cartItemSchema = new Schema(
    {
        menuItemId: { type: Schema.Types.ObjectId, ref: 'MenuItem', required: true },
        quantity: { type: Number, required: true, min: 1, max: 20 },
        selectedCustomizations: [
            {
                groupName: { type: String, required: true },
                optionName: { type: String, required: true },
                _id: false,
            },
        ],
    },
    { _id: true }
);

const cartSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
        items: { type: [cartItemSchema], default: [] },
        appliedCoupon: { type: String, default: null },
    },
    { timestamps: true }
);

// TTL: auto-delete carts inactive for 7 days
cartSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 7 * 24 * 60 * 60 });

export default mongoose.model<ICart>('Cart', cartSchema);
