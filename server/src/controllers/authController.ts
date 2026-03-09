import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import OTP from '../models/OTP';
import config from '../config/config';
import { sendOTP } from '../services/smsService';

// Send OTP
export const sendOTPController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { phone } = req.body;

        // Validate phone number (Indian format)
        if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
            res.status(400).json({ message: 'Invalid phone number. Please enter a valid 10-digit Indian mobile number.' });
            return;
        }

        // Check rate limiting - prevent OTP spam
        const recentOTP = await OTP.findOne({
            phone,
            createdAt: { $gte: new Date(Date.now() - config.otpCooldown * 60 * 1000) }
        });

        if (recentOTP) {
            res.status(429).json({
                message: `Please wait ${config.otpCooldown} minutes before requesting another OTP`
            });
            return;
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save OTP to database (TTL index will auto-delete after 5 minutes)
        await OTP.create({ phone, otp });

        // Send OTP via SMS
        await sendOTP(phone, otp);

        res.status(200).json({
            message: 'OTP sent successfully',
            expiresIn: config.otpExpiry * 60 // seconds
        });
    } catch (error) {
        console.error('Send OTP Error:', error);
        res.status(500).json({ message: (error as Error).message || 'Failed to send OTP' });
    }
};

// Verify OTP and login
export const verifyOTPController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            res.status(400).json({ message: 'Phone number and OTP are required' });
            return;
        }

        // Find OTP record
        const otpRecord = await OTP.findOne({ phone, otp });

        if (!otpRecord) {
            res.status(400).json({ message: 'Invalid or expired OTP' });
            return;
        }

        // Find or create user
        let user = await User.findOne({ phone });

        if (!user) {
            user = await User.create({
                phone,
                lastLogin: new Date()
            });
        } else {
            // Check if user is blocked
            if (user.isBlocked) {
                res.status(403).json({ message: 'Your account has been blocked. Please contact support.' });
                return;
            }

            user.lastLogin = new Date();
            await user.save();
        }

        // Delete OTP after successful verification
        await OTP.deleteOne({ _id: otpRecord._id });

        // Generate JWT token
        const token = jwt.sign(
            { userId: user._id.toString(), phone: user.phone },
            config.jwtSecret,
            { expiresIn: config.jwtExpire } as jwt.SignOptions
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                phone: user.phone,
                name: user.name,
                email: user.email,
                addresses: user.addresses
            }
        });
    } catch (error) {
        console.error('Verify OTP Error:', error);
        res.status(500).json({ message: (error as Error).message || 'Verification failed' });
    }
};

// Refresh token
export const refreshTokenController = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        if (user.isBlocked) {
            res.status(403).json({ message: 'Your account has been blocked' });
            return;
        }

        // Generate new JWT token
        const token = jwt.sign(
            { userId: user._id.toString(), phone: user.phone },
            config.jwtSecret,
            { expiresIn: config.jwtExpire } as jwt.SignOptions
        );

        res.status(200).json({ token });
    } catch (error) {
        console.error('Refresh Token Error:', error);
        res.status(500).json({ message: (error as Error).message || 'Failed to refresh token' });
    }
};
