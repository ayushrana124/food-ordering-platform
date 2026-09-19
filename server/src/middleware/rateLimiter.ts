import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request } from 'express';

/**
 * Rate-limit key for authenticated routes.
 *
 * Indian mobile carriers put large numbers of subscribers behind carrier-grade
 * NAT, so many unrelated customers can share one public IP. A purely IP-based
 * limit on ordering would let one heavy user lock out everyone else on the same
 * carrier — lost sales, and very hard to diagnose. Where we know who is calling,
 * the limit is applied per account and falls back to IP only for anonymous
 * traffic.
 */
const userOrIpKey = (req: Request): string => {
    const admin = (req as any).admin;
    if (admin?._id) return `admin:${admin._id}`;

    const user = (req as any).user;
    if (user?._id) return `user:${user._id}`;

    return ipKeyGenerator(req.ip ?? '');
};

// General API rate limiter.
// Necessarily IP-keyed: this is mounted globally on /api, so it runs before any
// route's auth middleware and `req.user` does not exist yet. The ceiling is set
// high enough to absorb several customers sharing one carrier NAT address.
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    // Tunable via RATE_LIMIT_MAX — raise it if the shop ever shares one NAT
    // address with a lot of customers, or lower it under abuse.
    max: parseInt(process.env.RATE_LIMIT_MAX || '600', 10),
    message: {
        message: 'Too many requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Admin login rate limiter - 5 attempts per 15 minutes.
// Deliberately IP-keyed: this runs before authentication, and throttling
// password guessing is the entire point.
export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        message: 'Too many login attempts. Please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Firebase token verification limiter — also pre-authentication, so IP-keyed.
// Raised from 10 because a shared carrier IP can legitimately carry several
// customers logging in during a dinner rush.
export const firebaseVerifyLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: {
        message: 'Too many authentication attempts. Please try again after 15 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Payment-specific limiter — per account, not per IP.
export const paymentLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 15,
    keyGenerator: userOrIpKey,
    message: {
        message: 'Too many payment attempts. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Order creation limiter — per account, not per IP.
// Previously 10 per IP, which on a shared carrier IP could block real customers
// from ordering at all.
export const orderLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    keyGenerator: userOrIpKey,
    message: {
        message: 'Too many orders in a short time. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});
