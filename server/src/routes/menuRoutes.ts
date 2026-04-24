import { Router } from 'express';
import { getRestaurantInfo, getMenuItems, getMenuItem, getOffers, getCategories } from '../controllers/menuController';
import { validateObjectId } from '../middleware/validateObjectId';

const router = Router();

// Public routes - no authentication required
router.get('/restaurant', getRestaurantInfo);
router.get('/items', getMenuItems);
router.get('/items/:id', validateObjectId(), getMenuItem);
router.get('/offers', getOffers);
router.get('/categories', getCategories);

export default router;
