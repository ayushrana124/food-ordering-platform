import mongoose, { Document, Schema } from 'mongoose';

export interface IOTP extends Document {
    phone: string;
    otp: string;
    createdAt: Date;
}

const otpSchema = new Schema<IOTP>({
    phone: {
        type: String,
        required: true,
        index: true
    },
    otp: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 300 // Auto-delete after 5 minutes
    }
});

export default mongoose.model<IOTP>('OTP', otpSchema);
