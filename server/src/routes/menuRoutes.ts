import { Router } from 'express';
import { getRestaurantInfo, getMenuItems, getMenuItem, getOffers, getCategories, getPublicDeliveryLocations } from '../controllers/menuController';
import { validateObjectId } from '../middleware/validateObjectId';

const router = Router();

// Public routes - no authentication required
router.get('/restaurant', getRestaurantInfo);
router.get('/items', getMenuItems);
router.get('/items/:id', validateObjectId(), getMenuItem);
router.get('/offers', getOffers);
router.get('/categories', getCategories);
router.get('/delivery-locations', getPublicDeliveryLocations);

export default router;
