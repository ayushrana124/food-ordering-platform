import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import config from '../config/config';
import { firebaseAuth } from '../config/firebaseAdmin';

// ─── Security: In-memory set of consumed Firebase token JTIs to prevent replay attacks ───
// In production with multiple server instances, replace with Redis or a DB-backed store.
const consumedTokenIds = new Set<string>();
const TOKEN_ID_TTL_MS = 10 * 60 * 1000; // Keep IDs for 10 minutes then auto-purge

// Periodically purge old token IDs to prevent memory leaks
const tokenTimestamps = new Map<string, number>();
setInterval(() => {
    const now = Date.now();
    for (const [tokenId, timestamp] of tokenTimestamps) {
        if (now - timestamp > TOKEN_ID_TTL_MS) {
            consumedTokenIds.delete(tokenId);
            tokenTimestamps.delete(tokenId);
        }
    }
}, 60 * 1000); // Cleanup every minute

// Maximum age (in seconds) for a Firebase token to be accepted
// Prevents stolen tokens from being used long after issuance
const MAX_TOKEN_AGE_SECONDS = 5 * 60; // 5 minutes

// Verify Firebase ID Token and login
export const verifyFirebaseTokenController = async (req: Request, res: Response): Promise<void> => {
    try {
        const { idToken } = req.body;

        if (!idToken || typeof idToken !== 'string') {
            res.status(400).json({ message: 'Valid Firebase ID token is required' });
            return;
        }

        // ─── Basic input sanitization: reject absurdly long tokens ───
        if (idToken.length > 5000) {
            res.status(400).json({ message: 'Invalid token format' });
            return;
        }

        // ─── Verify the Firebase ID token using Admin SDK ───
        let decodedToken;
        try {
            // checkRevoked: true ensures revoked tokens are rejected
            decodedToken = await firebaseAuth.verifyIdToken(idToken, true);
        } catch (firebaseError: unknown) {
            const errCode = (firebaseError as { code?: string }).code;
            console.error('Firebase token verification failed:', errCode);

            if (errCode === 'auth/id-token-revoked') {
                res.status(401).json({ message: 'Your session has been revoked. Please login again.' });
            } else if (errCode === 'auth/id-token-expired') {
                res.status(401).json({ message: 'Authentication expired. Please login again.' });
            } else {
                // Generic message — don't leak Firebase internals to the client
                res.status(401).json({ message: 'Authentication failed. Please try again.' });
            }
            return;
        }

        // ─── Security: Token freshness check ───
        // Reject tokens that were issued too long ago
        const tokenAge = Math.floor(Date.now() / 1000) - decodedToken.auth_time;
        if (tokenAge > MAX_TOKEN_AGE_SECONDS) {
            res.status(401).json({ message: 'Authentication expired. Please login again.' });
            return;
        }

        // ─── Security: Replay attack prevention ───
        // Each Firebase ID token has a unique 'jti' — reject if already consumed
        const tokenId = decodedToken.sub + '_' + decodedToken.iat;
        if (consumedTokenIds.has(tokenId)) {
            console.warn(`Replay attack detected for token: ${tokenId.slice(0, 20)}...`);
            res.status(401).json({ message: 'Authentication token already used. Please login again.' });
            return;
        }
        consumedTokenIds.add(tokenId);
        tokenTimestamps.set(tokenId, Date.now());

        // ─── Security: Verify the token is a phone-auth token ───
        if (decodedToken.firebase?.sign_in_provider !== 'phone') {
            res.status(400).json({ message: 'Only phone number authentication is supported' });
            return;
        }

        // ─── Extract and validate phone number ───
        const phoneNumber = decodedToken.phone_number;

        if (!phoneNumber) {
            res.status(400).json({ message: 'Phone number not found in authentication token' });
            return;
        }

        // Normalize phone: strip country code (+91) to store 10 digits
        const phone = phoneNumber.replace(/^\+91/, '');

        if (!/^[6-9]\d{9}$/.test(phone)) {
            res.status(400).json({ message: 'Invalid phone number' });
            return;
        }

        // ─── Find or create user ───
        let user = await User.findOne({ phone });

        if (!user) {
            user = await User.create({
                phone,
                lastLogin: new Date()
            });
        } else {
            // Check if user is blocked
            if (user.isBlocked) {
                res.status(403).json({ message: 'Your account has been blocked. Please contact support.' });
                return;
            }

            user.lastLogin = new Date();
            await user.save();
        }

        // ─── Generate JWT token ───
        const token = jwt.sign(
            { userId: user._id.toString(), phone: user.phone },
            config.jwtSecret,
            { expiresIn: config.jwtExpire } as jwt.SignOptions
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                phone: user.phone,
                name: user.name,
                email: user.email,
                addresses: user.addresses
            }
        });
    } catch (error) {
        console.error('Firebase Auth Error:', error);
        // Generic message — never leak internal error details
        res.status(500).json({ message: 'Authentication failed. Please try again.' });
    }
};

// Refresh token
export const refreshTokenController = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        if (user.isBlocked) {
            res.status(403).json({ message: 'Your account has been blocked' });
            return;
        }

        // Generate new JWT token
        const token = jwt.sign(
            { userId: user._id.toString(), phone: user.phone },
            config.jwtSecret,
            { expiresIn: config.jwtExpire } as jwt.SignOptions
        );

        res.status(200).json({ token });
    } catch (error) {
        console.error('Refresh Token Error:', error);
        res.status(500).json({ message: 'Failed to refresh token' });
    }
};
