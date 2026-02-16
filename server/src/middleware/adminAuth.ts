import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin';
import config from '../config/config';

interface JWTPayload {
    adminId: string;
    role: string;
    restaurantId: string;
}

export const adminProtect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        let token: string | undefined;

        // Extract token from Authorization header
        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            res.status(401).json({ message: 'Not authorized. Admin access required.' });
            return;
        }

        // Verify token
        const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;

        // Find admin
        const admin = await Admin.findById(decoded.adminId).populate('restaurantId');

        if (!admin) {
            res.status(401).json({ message: 'Admin not found. Please login again.' });
            return;
        }

        // Attach admin to request
        req.admin = admin;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({ message: 'Invalid token. Please login again.' });
            return;
        }
        if (error instanceof jwt.TokenExpiredError) {
            res.status(401).json({ message: 'Token expired. Please login again.' });
            return;
        }
        res.status(401).json({ message: 'Authentication failed' });
    }
};
