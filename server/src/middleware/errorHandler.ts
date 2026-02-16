import { Request, Response, NextFunction } from 'express';
import config from '../config/config';

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
    console.error('Error:', err.stack);

    res.status(500).json({
        message: 'Something went wrong!',
        error: config.nodeEnv === 'development' ? err.message : undefined
    });
};
