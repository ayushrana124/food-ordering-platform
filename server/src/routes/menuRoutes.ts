import { Router } from 'express';
import { getRestaurantInfo, getMenuItems, getMenuItem, getOffers } from '../controllers/menuController';

const router = Router();

// Public routes - no authentication required
router.get('/restaurant', getRestaurantInfo);
router.get('/items', getMenuItems);
router.get('/items/:id', getMenuItem);
router.get('/offers', getOffers);

export default router;
