import { Request, Response } from 'express';
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

        // Find admin by email
        const admin = await Admin.findOne({ email }).populate('restaurantId');

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
            { adminId: admin._id.toString(), role: admin.role, restaurantId: admin.restaurantId?.toString() },
            config.jwtSecret
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
        res.status(500).json({ message: (error as Error).message || 'Login failed' });
    }
};

// Admin logout
export const logoutController = async (_req: Request, res: Response): Promise<void> => {
    // With JWT, logout is handled client-side by removing the token
    res.status(200).json({ message: 'Logout successful' });
};
