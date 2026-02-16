import { Router } from 'express';
import { getProfile, updateProfile, addAddress, updateAddress, deleteAddress, getOrders } from '../controllers/userController';
import { protect } from '../middleware/auth';

const router = Router();

// All user routes require authentication
router.use(protect);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Address routes
router.post('/address', addAddress);
router.put('/address/:addressId', updateAddress);
router.delete('/address/:addressId', deleteAddress);

// Order history
router.get('/orders', getOrders);

export default router;
