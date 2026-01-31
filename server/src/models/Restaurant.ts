import mongoose, { Document, Schema } from 'mongoose';

export interface IRestaurant extends Document {
    name: string;
    description?: string;
    logo?: string;
    banner?: string;
    address: {
        addressLine: string;
        coordinates: {
            lat: number;
            lng: number;
        };
    };
    phone?: string;
    email?: string;
    openingHours: {
        [key: string]: {
            open: string;
            close: string;
            isOpen: boolean;
        };
    };
    isOpen: boolean;
    deliveryRadius: number;
    minOrderAmount: number;
    avgPreparationTime: number;
    categories: string[];
}

const restaurantSchema = new Schema<IRestaurant>({
    name: {
        type: String,
        required: true
    },
    description: String,
    logo: String,
    banner: String,
    address: {
        addressLine: String,
        coordinates: {
            lat: { type: Number, required: true },
            lng: { type: Number, required: true }
        }
    },
    phone: String,
    email: String,
    openingHours: {
        monday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
        tuesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
        wednesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
        thursday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
        friday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
        saturday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
        sunday: { open: String, close: String, isOpen: { type: Boolean, default: true } }
    },
    isOpen: {
        type: Boolean,
        default: true
    },
    deliveryRadius: {
        type: Number,
        default: 10
    },
    minOrderAmount: {
        type: Number,
        default: 0
    },
    avgPreparationTime: {
        type: Number,
        default: 30
    },
    categories: [String]
});

export default mongoose.model<IRestaurant>('Restaurant', restaurantSchema);
