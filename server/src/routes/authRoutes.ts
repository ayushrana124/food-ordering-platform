import { Router } from 'express';
import { sendOTPController, verifyOTPController, refreshTokenController } from '../controllers/authController';
import { otpLimiter } from '../middleware/rateLimiter';
import { protect } from '../middleware/auth';

const router = Router();

// Send OTP (rate limited)
router.post('/send-otp', otpLimiter, sendOTPController);

// Verify OTP and login
router.post('/verify-otp', verifyOTPController);

// Refresh token (protected route)
router.post('/refresh-token', protect, refreshTokenController);

export default router;
