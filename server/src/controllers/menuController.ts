import { Request, Response } from 'express';
import MenuItem from '../models/MenuItem';
import Restaurant from '../models/Restaurant';
import Offer from '../models/Offer';
import Category from '../models/Category';


// Get restaurant information
export const getRestaurantInfo = async (_req: Request, res: Response): Promise<void> => {
    try {
        const restaurant = await Restaurant.findOne();

        if (!restaurant) {
            res.status(404).json({ message: 'Restaurant information not found' });
            return;
        }

        res.status(200).json({ restaurant });
    } catch (error) {
        console.error('Get Restaurant Info Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Get all menu items with filters
export const getMenuItems = async (req: Request, res: Response): Promise<void> => {
    try {
        const { category, isVeg, search, minPrice, maxPrice } = req.query;

        const query: any = { isAvailable: true };

        if (category) query.category = category;
        if (isVeg !== undefined) query.isVeg = isVeg === 'true';
        if (search) {
            const escaped = (search as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.name = { $regex: escaped, $options: 'i' };
        }

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        const menuItems = await MenuItem.find(query).sort({ category: 1, name: 1 });

        res.status(200).json({
            menuItems,
            count: menuItems.length
        });
    } catch (error) {
        console.error('Get Menu Items Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Get single menu item
export const getMenuItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const menuItem = await MenuItem.findById(id);

        if (!menuItem) {
            res.status(404).json({ message: 'Menu item not found' });
            return;
        }

        res.status(200).json({ menuItem });
    } catch (error) {
        console.error('Get Menu Item Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Get active offers
export const getOffers = async (_req: Request, res: Response): Promise<void> => {
    try {
        const now = new Date();

        const offers = await Offer.find({
            isActive: true,
            validFrom: { $lte: now },
            validTill: { $gte: now }
        }).sort({ createdAt: -1 });

        res.status(200).json({
            offers,
            count: offers.length
        });
    } catch (error) {
        console.error('Get Offers Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Get active categories (public)
export const getCategories = async (_req: Request, res: Response): Promise<void> => {
    try {
        const categories = await Category.find({ isActive: true })
            .sort({ displayOrder: 1, createdAt: 1 });
        res.status(200).json({ categories, count: categories.length });
    } catch (error) {
        console.error('Get Categories Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};


