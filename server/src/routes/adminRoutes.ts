import { Router } from 'express';
import multer from 'multer';
import {
    getOrders,
    acceptOrder,
    updateOrderStatus,
    rejectOrder,
    getOrderStats,
    getDetailedOrderStats,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    toggleAvailability,
    getAdminMenuItems,
    getDeletedMenuItems,
    restoreMenuItem,
    getUsers,
    toggleUserBlock,
    toggleCODBlock,
    updateRestaurant,
    createOffer,
    getOffers,
    updateOffer,
    deleteOffer,
    toggleOfferActive,
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
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
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
        if (allowed.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, WebP, and AVIF images are allowed'));
        }
    },
});

// Public admin routes
router.post('/login', loginLimiter, loginController);

// Protected admin routes
router.use(adminProtect);

router.post('/logout', logoutController);

// Order management (stats routes must come before parameterized :id routes)
router.get('/orders/stats/detailed', getDetailedOrderStats);
router.get('/orders/stats', getOrderStats);
router.get('/orders', getOrders);
router.put('/orders/:id/accept', validateObjectId(), acceptOrder);
router.put('/orders/:id/reject', validateObjectId(), rejectOrder);
router.put('/orders/:id/status', validateObjectId(), updateOrderStatus);

// Menu management
router.get('/menu', getAdminMenuItems);
router.get('/menu/deleted', getDeletedMenuItems);
router.post('/menu', upload.single('image'), addMenuItem);
router.put('/menu/:id/restore', validateObjectId(), restoreMenuItem);
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

// Category management
router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', validateObjectId(), updateCategory);
router.delete('/categories/:id', validateObjectId(), deleteCategory);

export default router;
