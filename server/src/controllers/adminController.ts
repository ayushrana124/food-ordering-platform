import { Request, Response } from 'express';
import MenuItem from '../models/MenuItem';
import Order from '../models/Order';
import User from '../models/User';
import Restaurant from '../models/Restaurant';
import Offer from '../models/Offer';
import { v2 as cloudinary } from 'cloudinary';

// ============= ORDER MANAGEMENT =============

// Get all orders with filters
export const getOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        const { status, paymentMethod, startDate, endDate, page = '1', limit = '20' } = req.query;

        const query: any = {};
        if (status) query.orderStatus = status;
        if (paymentMethod) query.paymentMethod = paymentMethod;

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate as string);
            if (endDate) query.createdAt.$lte = new Date(endDate as string);
        }

        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);

        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .limit(limitNum)
            .skip((pageNum - 1) * limitNum)
            .populate('userId', 'name phone');

        const count = await Order.countDocuments(query);

        res.status(200).json({
            orders,
            totalPages: Math.ceil(count / limitNum),
            currentPage: pageNum,
            totalOrders: count
        });
    } catch (error) {
        console.error('Get Orders Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Accept order
export const acceptOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { preparationTime } = req.body;

        if (!preparationTime) {
            res.status(400).json({ message: 'Preparation time is required' });
            return;
        }

        const order = await Order.findById(id);

        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        order.orderStatus = 'ACCEPTED';
        order.preparationTime = preparationTime;
        order.estimatedDeliveryTime = new Date(Date.now() + preparationTime * 60000);
        await order.save();

        // Emit socket event to customer
        req.io.to(order.userId.toString()).emit('orderStatusUpdate', {
            orderId: order._id,
            orderNumber: order.orderId,
            status: 'ACCEPTED',
            estimatedDeliveryTime: order.estimatedDeliveryTime
        });

        res.status(200).json({ message: 'Order accepted successfully', order });
    } catch (error) {
        console.error('Accept Order Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Update order status
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            res.status(400).json({ message: 'Status is required' });
            return;
        }

        const VALID_STATUSES = ['ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
        if (!VALID_STATUSES.includes(status)) {
            res.status(400).json({ message: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}` });
            return;
        }

        const order = await Order.findById(id);

        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        order.orderStatus = status;
        order.updatedAt = new Date();
        await order.save();

        // Emit socket event to customer
        req.io.to(order.userId.toString()).emit('orderStatusUpdate', {
            orderId: order._id,
            orderNumber: order.orderId,
            status
        });

        res.status(200).json({ message: 'Order status updated successfully', order });
    } catch (error) {
        console.error('Update Order Status Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Get order statistics
export const getOrderStats = async (_req: Request, res: Response): Promise<void> => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayRevenue = await Order.aggregate([
            { $match: { createdAt: { $gte: today }, paymentStatus: 'PAID' } },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);

        const todayOrders = await Order.countDocuments({ createdAt: { $gte: today } });
        const pendingOrders = await Order.countDocuments({ orderStatus: 'PENDING' });
        const activeUsers = await User.countDocuments({ isBlocked: false });

        res.status(200).json({
            todayRevenue: todayRevenue[0]?.total || 0,
            todayOrders,
            pendingOrders,
            activeUsers
        });
    } catch (error) {
        console.error('Get Order Stats Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// ============= MENU MANAGEMENT =============

// Add menu item
export const addMenuItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, description, category, price, isVeg, customizations } = req.body;

        if (!name || !category || !price) {
            res.status(400).json({ message: 'Name, category, and price are required' });
            return;
        }

        let imageUrl = null;

        // Upload image to Cloudinary if provided
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path, {
                folder: 'menu-items'
            });
            imageUrl = result.secure_url;
        }

        const menuItem = await MenuItem.create({
            restaurantId: req.admin?.restaurantId,
            name,
            description,
            category,
            price: Number(price),
            image: imageUrl || undefined,
            isVeg: isVeg === 'true' || isVeg === true,
            customizations: customizations ? JSON.parse(customizations) : []
        });

        res.status(201).json({ message: 'Menu item added successfully', menuItem });
    } catch (error) {
        console.error('Add Menu Item Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Update menu item
export const updateMenuItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // Whitelist allowed fields to prevent mass-assignment
        const allowed = ['name', 'description', 'category', 'price', 'isVeg', 'isAvailable', 'customizations', 'image'];
        const update: Record<string, any> = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) update[key] = req.body[key];
        }

        const menuItem = await MenuItem.findByIdAndUpdate(
            id,
            update,
            { new: true, runValidators: true }
        );

        if (!menuItem) {
            res.status(404).json({ message: 'Menu item not found' });
            return;
        }

        res.status(200).json({ message: 'Menu item updated successfully', menuItem });
    } catch (error) {
        console.error('Update Menu Item Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Delete menu item
export const deleteMenuItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const menuItem = await MenuItem.findByIdAndDelete(id);

        if (!menuItem) {
            res.status(404).json({ message: 'Menu item not found' });
            return;
        }

        res.status(200).json({ message: 'Menu item deleted successfully' });
    } catch (error) {
        console.error('Delete Menu Item Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Toggle menu item availability
export const toggleAvailability = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const menuItem = await MenuItem.findById(id);

        if (!menuItem) {
            res.status(404).json({ message: 'Menu item not found' });
            return;
        }

        menuItem.isAvailable = !menuItem.isAvailable;
        await menuItem.save();

        res.status(200).json({
            message: `Menu item ${menuItem.isAvailable ? 'enabled' : 'disabled'} successfully`,
            menuItem
        });
    } catch (error) {
        console.error('Toggle Availability Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// ============= USER MANAGEMENT =============

// Get all users
export const getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const { search, isBlocked, page = '1', limit = '20' } = req.query;

        const query: any = {};

        if (search) {
            // Escape regex special characters to prevent ReDoS
            const escaped = (search as string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            query.$or = [
                { name: { $regex: escaped, $options: 'i' } },
                { phone: { $regex: escaped, $options: 'i' } }
            ];
        }

        if (isBlocked !== undefined) {
            query.isBlocked = isBlocked === 'true';
        }

        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);

        const users = await User.find(query)
            .select('-__v')
            .limit(limitNum)
            .skip((pageNum - 1) * limitNum)
            .sort({ createdAt: -1 });

        const count = await User.countDocuments(query);

        res.status(200).json({
            users,
            totalPages: Math.ceil(count / limitNum),
            currentPage: pageNum,
            totalUsers: count
        });
    } catch (error) {
        console.error('Get Users Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Block/Unblock user
export const toggleUserBlock = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        user.isBlocked = !user.isBlocked;
        await user.save();

        res.status(200).json({
            message: user.isBlocked ? 'User blocked successfully' : 'User unblocked successfully',
            user
        });
    } catch (error) {
        console.error('Toggle User Block Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Block/Unblock COD for user
export const toggleCODBlock = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const user = await User.findById(id);

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        user.isCODBlocked = !user.isCODBlocked;
        await user.save();

        res.status(200).json({
            message: user.isCODBlocked ? 'COD blocked for user' : 'COD unblocked for user',
            user
        });
    } catch (error) {
        console.error('Toggle COD Block Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// ============= RESTAURANT MANAGEMENT =============

// Update restaurant settings
export const updateRestaurant = async (req: Request, res: Response): Promise<void> => {
    try {
        // Whitelist allowed fields to prevent mass-assignment
        const allowed = ['name', 'description', 'phone', 'email', 'deliveryRadius', 'minOrderAmount', 'avgPreparationTime', 'isOpen', 'address', 'openingHours', 'categories'];
        const update: Record<string, any> = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) update[key] = req.body[key];
        }

        const restaurant = await Restaurant.findOneAndUpdate(
            {},
            update,
            { new: true, runValidators: true }
        );

        if (!restaurant) {
            res.status(404).json({ message: 'Restaurant not found' });
            return;
        }

        res.status(200).json({ message: 'Restaurant updated successfully', restaurant });
    } catch (error) {
        console.error('Update Restaurant Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// ============= OFFER MANAGEMENT =============

// Create offer
export const createOffer = async (req: Request, res: Response): Promise<void> => {
    try {
        // Whitelist allowed fields
        const { title, description, discountType, discountValue, minOrderAmount, maxDiscount, validFrom, validTill, isActive } = req.body;

        const offer = await Offer.create({
            title, description, discountType, discountValue, minOrderAmount,
            maxDiscount, validFrom, validTill, isActive,
            restaurantId: req.admin?.restaurantId
        });

        res.status(201).json({ message: 'Offer created successfully', offer });
    } catch (error) {
        console.error('Create Offer Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Get all offers (admin view — includes inactive)
export const getOffers = async (req: Request, res: Response): Promise<void> => {
    try {
        const { page = '1', limit = '20' } = req.query;
        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);

        const offers = await Offer.find()
            .sort({ createdAt: -1 })
            .limit(limitNum)
            .skip((pageNum - 1) * limitNum);

        const total = await Offer.countDocuments();

        res.status(200).json({
            offers,
            totalPages: Math.ceil(total / limitNum),
            currentPage: pageNum,
            totalOffers: total,
        });
    } catch (error) {
        console.error('Get Offers Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Update offer
export const updateOffer = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        // Whitelist allowed fields
        const allowed = ['title', 'description', 'code', 'discountType', 'discountValue', 'minOrderAmount', 'maxDiscount', 'validFrom', 'validTill', 'isActive'];
        const update: Record<string, any> = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) update[key] = req.body[key];
        }

        const offer = await Offer.findByIdAndUpdate(id, update, { new: true, runValidators: true });

        if (!offer) {
            res.status(404).json({ message: 'Offer not found' });
            return;
        }

        res.status(200).json({ message: 'Offer updated successfully', offer });
    } catch (error) {
        console.error('Update Offer Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Delete offer
export const deleteOffer = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const offer = await Offer.findByIdAndDelete(id);

        if (!offer) {
            res.status(404).json({ message: 'Offer not found' });
            return;
        }

        res.status(200).json({ message: 'Offer deleted successfully' });
    } catch (error) {
        console.error('Delete Offer Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Toggle offer active status
export const toggleOfferActive = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const offer = await Offer.findById(id);

        if (!offer) {
            res.status(404).json({ message: 'Offer not found' });
            return;
        }

        offer.isActive = !offer.isActive;
        await offer.save();

        res.status(200).json({
            message: `Offer ${offer.isActive ? 'activated' : 'deactivated'}`,
            offer,
        });
    } catch (error) {
        console.error('Toggle Offer Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};
