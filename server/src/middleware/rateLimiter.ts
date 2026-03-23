import rateLimit from 'express-rate-limit';

// OTP request rate limiter - 3 requests per 10 minutes
export const otpLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 3, // 3 requests per window
    message: {
        message: 'Too many OTP requests from this IP. Please try again after 10 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// General API rate limiter - 500 requests per 15 minutes (scaled for 500-600 active users)
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // 500 requests per window
    message: {
        message: 'Too many requests from this IP. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Admin login rate limiter - 5 attempts per 15 minutes
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    message: {
        message: 'Too many login attempts. Please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// OTP verification rate limiter - 10 attempts per 15 minutes (prevents brute-force)
export const otpVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    message: {
        message: 'Too many OTP verification attempts. Please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Payment-specific limiter - 5 payment attempts per 10 minutes per IP
export const paymentLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5,
    message: {
        message: 'Too many payment attempts. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Order creation limiter - 10 orders per 15 minutes per IP
export const orderLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10,
    message: {
        message: 'Too many orders. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
