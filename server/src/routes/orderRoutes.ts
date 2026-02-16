import { Router } from 'express';
import { createOrder, getOrder, cancelOrder } from '../controllers/orderController';
import { protect } from '../middleware/auth';

const router = Router();

// All order routes require authentication
router.use(protect);

router.post('/', createOrder);
router.get('/:id', getOrder);
router.put('/:id/cancel', cancelOrder);

export default router;
