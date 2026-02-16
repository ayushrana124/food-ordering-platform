import { Router } from 'express';
import { createPaymentOrder, verifyPayment } from '../controllers/paymentController';
import { protect } from '../middleware/auth';

const router = Router();

// All payment routes require authentication
router.use(protect);

router.post('/create-order', createPaymentOrder);
router.post('/verify', verifyPayment);

export default router;
