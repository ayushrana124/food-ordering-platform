import { Router } from 'express';
import { verifyFirebaseTokenController, refreshTokenController } from '../controllers/authController';
import { firebaseVerifyLimiter } from '../middleware/rateLimiter';
import { protect } from '../middleware/auth';

const router = Router();

// Verify Firebase ID token and login (rate limited to prevent abuse)
router.post('/verify-firebase-token', firebaseVerifyLimiter, verifyFirebaseTokenController);

// Refresh token (protected route)
router.post('/refresh-token', protect, refreshTokenController);

export default router;
