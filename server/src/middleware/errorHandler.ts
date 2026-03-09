import { Request, Response, NextFunction } from 'express';
import config from '../config/config';

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction): void => {
    console.error('Error:', err.stack);

    // Mongoose bad ObjectId / CastError
    if (err.name === 'CastError') {
        res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` });
        return;
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map((e: any) => e.message);
        res.status(400).json({ message: messages.join(', ') });
        return;
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {}).join(', ');
        res.status(409).json({ message: `Duplicate value for field: ${field}` });
        return;
    }

    // Multer file size / type error
    if (err.name === 'MulterError' || err.message?.includes('Only JPEG')) {
        res.status(400).json({ message: err.message });
        return;
    }

    res.status(500).json({
        message: 'Something went wrong!',
        error: config.nodeEnv === 'development' ? err.message : undefined
    });
};
