import { Response } from 'express';
import config from '../config/config';

/**
 * Send a 500 without leaking internals.
 *
 * Controllers used to echo `error.message` straight back to the caller. In
 * production that hands out Mongoose cast errors, model names and driver
 * details to anyone who can trigger a failure — an unauthenticated request to
 * the admin login endpoint was enough. The real error still goes to the server
 * log; the client gets it only in development.
 */
export const sendServerError = (res: Response, error: unknown, fallback = 'Something went wrong. Please try again.'): void => {
    res.status(500).json({
        message: config.isProduction ? fallback : ((error as Error)?.message || fallback),
    });
};
