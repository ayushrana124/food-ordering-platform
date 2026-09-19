import { Request, Response } from 'express';
import { sendServerError } from '../utils/errorResponse';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin';
import config from '../config/config';

// Admin login
export const loginController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            res.status(400).json({ message: 'Email and password are required' });
            return;
        }

        // Reject non-string credentials up front. A crafted object here used to
        // reach Mongoose, fail to cast, and come back as a 500 carrying the raw
        // driver error — which told an unauthenticated caller the model name and
        // field types.
        if (typeof email !== 'string' || typeof password !== 'string') {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        // Find admin by email
        const admin = await Admin.findOne({ email }).select('+password').populate('restaurantId');

        if (!admin) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        // Verify password
        const isPasswordValid = await admin.comparePassword(password);

        if (!isPasswordValid) {
            res.status(401).json({ message: 'Invalid credentials' });
            return;
        }

        // Generate JWT token
        const token = jwt.sign(
            { adminId: admin._id.toString(), role: admin.role, restaurantId: admin.restaurantId?.toString() || '' },
            config.jwtSecret,
            { expiresIn: config.jwtExpire } as jwt.SignOptions
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            admin: {
                id: admin._id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
                restaurantId: admin.restaurantId
            }
        });
    } catch (error) {
        console.error('Admin Login Error:', error);
        sendServerError(res, error, 'Login failed');
    }
};

// Admin logout
export const logoutController = async (_req: Request, res: Response): Promise<void> => {
    // With JWT, logout is handled client-side by removing the token
    res.status(200).json({ message: 'Logout successful' });
};
