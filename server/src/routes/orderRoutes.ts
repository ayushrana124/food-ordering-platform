import { Router } from 'express';
import { createOrder, getOrder, cancelOrder } from '../controllers/orderController';
import { protect } from '../middleware/auth';
import { validateObjectId } from '../middleware/validateObjectId';

const router = Router();

// All order routes require authentication
router.use(protect);

router.post('/', createOrder);
router.get('/:id', validateObjectId(), getOrder);
router.put('/:id/cancel', validateObjectId(), cancelOrder);

export default router;
