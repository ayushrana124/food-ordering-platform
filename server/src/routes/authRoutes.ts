import { Router } from 'express';
import { sendOTPController, verifyOTPController, refreshTokenController } from '../controllers/authController';
import { otpLimiter, otpVerifyLimiter } from '../middleware/rateLimiter';
import { protect } from '../middleware/auth';

const router = Router();

// Send OTP (rate limited)
router.post('/send-otp', otpLimiter, sendOTPController);

// Verify OTP and login (rate limited to prevent brute-force)
router.post('/verify-otp', otpVerifyLimiter, verifyOTPController);

// Refresh token (protected route)
router.post('/refresh-token', protect, refreshTokenController);

export default router;
