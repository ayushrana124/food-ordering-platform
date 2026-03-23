import { Router } from 'express';
import { createPaymentOrder, verifyPayment, handleWebhook, retryPayment } from '../controllers/paymentController';
import { protect } from '../middleware/auth';
import { paymentLimiter } from '../middleware/rateLimiter';

const router = Router();

// Webhook route — NO auth (Razorpay calls this server-to-server), NO rate limiter
router.post('/webhook', handleWebhook);

// Authenticated payment routes
router.use(protect);
router.post('/create-order', paymentLimiter, createPaymentOrder);
router.post('/verify', paymentLimiter, verifyPayment);
router.post('/retry', paymentLimiter, retryPayment);

export default router;
