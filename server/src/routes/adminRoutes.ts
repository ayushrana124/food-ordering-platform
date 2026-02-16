import { Router } from 'express';
import multer from 'multer';
import {
    getOrders,
    acceptOrder,
    updateOrderStatus,
    getOrderStats,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleAvailability,
    getUsers,
    toggleUserBlock,
    toggleCODBlock,
    updateRestaurant,
    createOffer
} from '../controllers/adminController';
import { loginController, logoutController } from '../controllers/adminAuthController';
import { adminProtect } from '../middleware/adminAuth';
import { loginLimiter } from '../middleware/rateLimiter';

const router = Router();

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Public admin routes
router.post('/login', loginLimiter, loginController);

// Protected admin routes
router.use(adminProtect);

router.post('/logout', logoutController);

// Order management
router.get('/orders', getOrders);
router.put('/orders/:id/accept', acceptOrder);
router.put('/orders/:id/status', updateOrderStatus);
router.get('/orders/stats', getOrderStats);

// Menu management
router.post('/menu', upload.single('image'), addMenuItem);
router.put('/menu/:id', updateMenuItem);
router.delete('/menu/:id', deleteMenuItem);
router.put('/menu/:id/availability', toggleAvailability);

// User management
router.get('/users', getUsers);
router.put('/users/:id/block', toggleUserBlock);
router.put('/users/:id/block-cod', toggleCODBlock);

// Restaurant settings
router.put('/restaurant', updateRestaurant);

// Offer management
router.post('/offers', createOffer);

export default router;
