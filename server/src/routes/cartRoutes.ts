import { Router } from 'express';
import { protect } from '../middleware/auth';
import {
    getCart,
    addItem,
    updateItem,
    removeItem,
    clearCart,
    applyCoupon,
    removeCoupon,
    getAvailableCoupons,
} from '../controllers/cartController';

const router = Router();

// All cart routes require authentication
router.use(protect);

router.get('/', getCart);
router.post('/add', addItem);
router.put('/update', updateItem);
router.delete('/item/:itemId', removeItem);
router.delete('/', clearCart);
router.get('/available-coupons', getAvailableCoupons);
router.post('/apply-coupon', applyCoupon);
router.delete('/coupon', removeCoupon);

export default router;
