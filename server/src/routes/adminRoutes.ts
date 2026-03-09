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
    createOffer,
    getOffers,
    updateOffer,
    deleteOffer,
    toggleOfferActive
} from '../controllers/adminController';
import { loginController, logoutController } from '../controllers/adminAuthController';
import { adminProtect } from '../middleware/adminAuth';
import { loginLimiter } from '../middleware/rateLimiter';
import { validateObjectId } from '../middleware/validateObjectId';

const router = Router();

// Configure multer for file uploads with security restrictions
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, and WebP images are allowed'));
        }
    },
});

// Public admin routes
router.post('/login', loginLimiter, loginController);

// Protected admin routes
router.use(adminProtect);

router.post('/logout', logoutController);

// Order management (stats route must come before parameterized :id routes)
router.get('/orders/stats', getOrderStats);
router.get('/orders', getOrders);
router.put('/orders/:id/accept', validateObjectId(), acceptOrder);
router.put('/orders/:id/status', validateObjectId(), updateOrderStatus);

// Menu management
router.post('/menu', upload.single('image'), addMenuItem);
router.put('/menu/:id', validateObjectId(), updateMenuItem);
router.delete('/menu/:id', validateObjectId(), deleteMenuItem);
router.put('/menu/:id/availability', validateObjectId(), toggleAvailability);

// User management
router.get('/users', getUsers);
router.put('/users/:id/block', validateObjectId(), toggleUserBlock);
router.put('/users/:id/block-cod', validateObjectId(), toggleCODBlock);

// Restaurant settings
router.put('/restaurant', updateRestaurant);

// Offer management (full CRUD)
router.get('/offers', getOffers);
router.post('/offers', createOffer);
router.put('/offers/:id', validateObjectId(), updateOffer);
router.delete('/offers/:id', validateObjectId(), deleteOffer);
router.put('/offers/:id/toggle', validateObjectId(), toggleOfferActive);

export default router;
