import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';

/**
 * Middleware factory – validates that the given route param is a valid MongoDB ObjectId.
 * Usage:  router.get('/:id', validateObjectId('id'), handler)
 *         router.put('/address/:addressId', validateObjectId('addressId'), handler)
 */
export const validateObjectId = (paramName = 'id') => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const value = req.params[paramName] as string | undefined;
        if (!value || !mongoose.Types.ObjectId.isValid(value)) {
            res.status(400).json({ message: `Invalid ${paramName}: "${value}"` });
            return;
        }
        next();
    };
};
