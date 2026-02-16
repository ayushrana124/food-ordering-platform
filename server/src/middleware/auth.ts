import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import config from '../config/config';

interface JWTPayload {
    userId: string;
    phone: string;
}

export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        let token: string | undefined;

        // Extract token from Authorization header
        if (req.headers.authorization?.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            res.status(401).json({ message: 'Not authorized. Please login.' });
            return;
        }

        // Verify token
        const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;

        // Find user
        const user = await User.findById(decoded.userId);

        if (!user) {
            res.status(401).json({ message: 'User not found. Please login again.' });
            return;
        }

        // Check if user is blocked
        if (user.isBlocked) {
            res.status(403).json({ message: 'Your account has been blocked. Please contact support.' });
            return;
        }

        // Attach user to request
        req.user = user;
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
