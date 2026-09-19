import { Router } from 'express';
import { getProfile, updateProfile, addAddress, updateAddress, deleteAddress, getOrders, getFavorites, toggleFavorite } from '../controllers/userController';
import { protect } from '../middleware/auth';
import { validateObjectId } from '../middleware/validateObjectId';

const router = Router();

// All user routes require authentication
router.use(protect);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Address routes
router.post('/address', addAddress);
router.put('/address/:addressId', validateObjectId('addressId'), updateAddress);
router.delete('/address/:addressId', validateObjectId('addressId'), deleteAddress);

// Order history
router.get('/orders', getOrders);

// Favourites
router.get('/favorites', getFavorites);
router.put('/favorites/:menuItemId', validateObjectId('menuItemId'), toggleFavorite);

export default router;
