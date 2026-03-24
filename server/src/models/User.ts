import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAddress {
    _id?: Types.ObjectId;
    label: 'Home' | 'Work' | 'Other';
    addressLine: string;
    landmark?: string;
    coordinates?: {
        lat: number;
        lng: number;
    };
    isDefault: boolean;
}

export interface IUser extends Document {
    phone: string;
    name?: string;
    email?: string;
    addresses: Types.DocumentArray<IAddress>;
    isBlocked: boolean;
    isCODBlocked: boolean;
    createdAt: Date;
    lastLogin: Date;
}

const userSchema = new Schema<IUser>({
    phone: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        index: true
    },
    name: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        trim: true,
        lowercase: true
    },
    addresses: [{
        label: {
            type: String,
            enum: ['Home', 'Work', 'Other'],
            default: 'Home'
        },
        addressLine: {
            type: String,
            required: true
        },
        landmark: String,
        coordinates: {
            lat: { type: Number },
            lng: { type: Number }
        },
        isDefault: {
            type: Boolean,
            default: false
        }
    }],
    isBlocked: {
        type: Boolean,
        default: false
    },
    isCODBlocked: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date,
        default: Date.now
    }
});

export default mongoose.model<IUser>('User', userSchema);
