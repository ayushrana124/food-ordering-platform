import { Request, Response } from 'express';
import MenuItem from '../models/MenuItem';
import Order from '../models/Order';
import User from '../models/User';
import Restaurant from '../models/Restaurant';
import Offer from '../models/Offer';
import Category from '../models/Category';
import DeliveryLocation from '../models/DeliveryLocation';
import cloudinary from '../config/cloudinary';
import fs from 'fs';
import { autoCancelUnpaidOrders } from './paymentController';

// ============= ORDER MANAGEMENT =============

// Get all orders with filters
export const getOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        // Auto-cancel unpaid online orders older than 15 minutes
        await autoCancelUnpaidOrders().catch((err) => console.error('Auto-cancel error:', err));

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

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
    'PENDING': ['ACCEPTED', 'CANCELLED'],
    'ACCEPTED': ['PREPARING', 'CANCELLED'],
    'PREPARING': ['OUT_FOR_DELIVERY', 'CANCELLED'],
    'OUT_FOR_DELIVERY': ['DELIVERED'],
    'DELIVERED': [],
    'CANCELLED': [],
};

const VALID_PREP_TIMES = [20, 30, 45, 60, 90];

// Accept order
export const acceptOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { preparationTime } = req.body;

        if (!preparationTime) {
            res.status(400).json({ message: 'Preparation time is required' });
            return;
        }

        if (!VALID_PREP_TIMES.includes(Number(preparationTime))) {
            res.status(400).json({ message: `Preparation time must be one of: ${VALID_PREP_TIMES.join(', ')} minutes` });
            return;
        }

        const order = await Order.findById(id);

        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        // Must be PENDING to accept
        if (order.orderStatus !== 'PENDING') {
            res.status(400).json({ message: `Cannot accept order in ${order.orderStatus} status` });
            return;
        }

        // Payment guard: don't accept unpaid online orders
        if (order.paymentMethod === 'ONLINE' && order.paymentStatus !== 'PAID') {
            res.status(400).json({ message: 'Cannot accept order — online payment is still pending' });
            return;
        }

        order.orderStatus = 'ACCEPTED';
        order.preparationTime = preparationTime;
        order.estimatedDeliveryTime = new Date(Date.now() + preparationTime * 60000);
        if (!order.statusHistory) order.statusHistory = [];
        order.statusHistory.push({ status: 'ACCEPTED', timestamp: new Date() });
        order.updatedAt = new Date();
        await order.save();

        // Emit rich socket event to customer
        req.io.to(order.userId.toString()).emit('orderStatusUpdate', {
            orderId: order._id,
            orderNumber: order.orderId,
            status: 'ACCEPTED',
            preparationTime: order.preparationTime,
            estimatedDeliveryTime: order.estimatedDeliveryTime,
        });

        res.status(200).json({ message: 'Order accepted successfully', order });
    } catch (error) {
        console.error('Accept Order Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Update order status (with transition validation)
export const updateOrderStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            res.status(400).json({ message: 'Status is required' });
            return;
        }

        const VALID_STATUSES = ['ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'];
        if (!VALID_STATUSES.includes(status)) {
            res.status(400).json({ message: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}` });
            return;
        }

        const order = await Order.findById(id);

        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        // Validate status transition
        const allowed = VALID_TRANSITIONS[order.orderStatus];
        if (!allowed || !allowed.includes(status)) {
            res.status(400).json({
                message: `Cannot transition from ${order.orderStatus} to ${status}. Allowed: ${(allowed || []).join(', ') || 'none'}`
            });
            return;
        }

        order.orderStatus = status;
        if (!order.statusHistory) order.statusHistory = [];
        order.statusHistory.push({ status, timestamp: new Date() });
        order.updatedAt = new Date();
        await order.save();

        // Emit rich socket event to customer
        req.io.to(order.userId.toString()).emit('orderStatusUpdate', {
            orderId: order._id,
            orderNumber: order.orderId,
            status,
            preparationTime: order.preparationTime,
            estimatedDeliveryTime: order.estimatedDeliveryTime,
        });

        res.status(200).json({ message: 'Order status updated successfully', order });
    } catch (error) {
        console.error('Update Order Status Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Reject order with optional reason
export const rejectOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const order = await Order.findById(id);

        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        // Can only reject from PENDING or ACCEPTED
        const allowed = VALID_TRANSITIONS[order.orderStatus];
        if (!allowed || !allowed.includes('CANCELLED')) {
            res.status(400).json({ message: `Cannot reject order in ${order.orderStatus} status` });
            return;
        }

        order.orderStatus = 'CANCELLED';
        order.cancelledBy = 'RESTAURANT';
        order.rejectionReason = reason || undefined;
        if (!order.statusHistory) order.statusHistory = [];
        order.statusHistory.push({ status: 'CANCELLED', timestamp: new Date(), note: reason || 'Rejected by restaurant' });
        order.updatedAt = new Date();
        await order.save();

        // Emit to customer with rejection reason
        req.io.to(order.userId.toString()).emit('orderStatusUpdate', {
            orderId: order._id,
            orderNumber: order.orderId,
            status: 'CANCELLED',
            rejectionReason: order.rejectionReason,
        });

        res.status(200).json({ message: 'Order rejected', order });
    } catch (error) {
        console.error('Reject Order Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Get order statistics
export const getOrderStats = async (_req: Request, res: Response): Promise<void> => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayRevenue = await Order.aggregate([
            { $match: { createdAt: { $gte: today }, orderStatus: 'DELIVERED', paymentStatus: 'PAID' } },
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
            // Clean up temp file after successful upload
            fs.unlink(req.file.path, () => {});
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

// Soft-delete menu item
export const deleteMenuItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const menuItem = await MenuItem.findByIdAndUpdate(
            id,
            { isDeleted: true, deletedAt: new Date(), isAvailable: false },
            { new: true }
        );

        if (!menuItem) {
            res.status(404).json({ message: 'Menu item not found' });
            return;
        }

        res.status(200).json({ message: 'Menu item moved to trash', menuItem });
    } catch (error) {
        console.error('Delete Menu Item Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Restore soft-deleted menu item
export const restoreMenuItem = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;

        const menuItem = await MenuItem.findOneAndUpdate(
            { _id: id, isDeleted: true },
            { isDeleted: false, deletedAt: null },
            { new: true }
        );

        if (!menuItem) {
            res.status(404).json({ message: 'Deleted menu item not found' });
            return;
        }

        res.status(200).json({ message: 'Menu item restored successfully', menuItem });
    } catch (error) {
        console.error('Restore Menu Item Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Get soft-deleted menu items (trash view)
export const getDeletedMenuItems = async (_req: Request, res: Response): Promise<void> => {
    try {
        const menuItems = await MenuItem.find({ isDeleted: true }).sort({ deletedAt: -1 });
        res.status(200).json({ menuItems });
    } catch (error) {
        console.error('Get Deleted Menu Items Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Get all menu items for admin (includes unavailable, excludes soft-deleted)
export const getAdminMenuItems = async (req: Request, res: Response): Promise<void> => {
    try {
        const menuItems = await MenuItem.find({ restaurantId: req.admin?.restaurantId })
            .sort({ category: 1, name: 1 });
        res.status(200).json({ menuItems });
    } catch (error) {
        console.error('Get Admin Menu Items Error:', error);
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

// Create offer (max 3)
export const createOffer = async (req: Request, res: Response): Promise<void> => {
    try {
        // Enforce 3-offer limit
        const existingCount = await Offer.countDocuments({ restaurantId: req.admin?.restaurantId });
        if (existingCount >= 3) {
            res.status(400).json({ message: 'Maximum 3 offers allowed. Please delete an existing offer first.' });
            return;
        }

        const { title, description, code, discountType, discountValue, minOrderAmount, maxDiscount, validFrom, validTill, isActive, label, headline, ctaText, colorTheme } = req.body;

        // Validate required fields
        if (!title?.trim()) { res.status(400).json({ message: 'Title is required' }); return; }
        if (!code?.trim()) { res.status(400).json({ message: 'Coupon code is required' }); return; }
        if (!discountType) { res.status(400).json({ message: 'Discount type is required' }); return; }

        // Normalize discountType to uppercase (frontend may send 'flat'/'percentage')
        const normalizedType = discountType.toString().toUpperCase();
        if (!['FLAT', 'PERCENTAGE'].includes(normalizedType)) {
            res.status(400).json({ message: 'Discount type must be FLAT or PERCENTAGE' }); return;
        }

        // Validate discount value
        if (!discountValue || discountValue <= 0) { res.status(400).json({ message: 'Discount value must be positive' }); return; }
        if (normalizedType === 'PERCENTAGE' && discountValue > 100) { res.status(400).json({ message: 'Percentage discount cannot exceed 100' }); return; }

        // Validate dates
        if (!validFrom || !validTill) { res.status(400).json({ message: 'Valid from and valid till dates are required' }); return; }
        if (new Date(validTill) <= new Date(validFrom)) { res.status(400).json({ message: 'Valid till must be after valid from' }); return; }

        // Check code uniqueness
        const normalizedCode = code.trim().toUpperCase();
        const existingCode = await Offer.findOne({ code: normalizedCode });
        if (existingCode) { res.status(400).json({ message: `Coupon code "${normalizedCode}" is already in use` }); return; }

        const offer = await Offer.create({
            title: title.trim(),
            description: description?.trim(),
            code: normalizedCode,
            discountType: normalizedType,
            discountValue,
            minOrderAmount: minOrderAmount || 0,
            maxDiscount: normalizedType === 'FLAT' ? undefined : (maxDiscount || undefined),
            validFrom,
            validTill,
            isActive: isActive !== false,
            label: label?.trim(),
            headline: headline?.trim(),
            ctaText: ctaText?.trim() || 'Order Now',
            colorTheme: colorTheme || '#E8A317',
            restaurantId: req.admin?.restaurantId,
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
        const allowed = ['title', 'description', 'code', 'discountType', 'discountValue', 'minOrderAmount', 'maxDiscount', 'validFrom', 'validTill', 'isActive', 'label', 'headline', 'ctaText', 'colorTheme'];
        const update: Record<string, any> = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) update[key] = req.body[key];
        }

        // Normalize discountType to uppercase
        if (update.discountType) {
            update.discountType = update.discountType.toString().toUpperCase();
            if (!['FLAT', 'PERCENTAGE'].includes(update.discountType)) {
                res.status(400).json({ message: 'Discount type must be FLAT or PERCENTAGE' }); return;
            }
            // Flat discounts don't need maxDiscount
            if (update.discountType === 'FLAT') {
                update.maxDiscount = undefined;
            }
        }

        // Normalize code to uppercase
        if (update.code) {
            update.code = update.code.trim().toUpperCase();
            // Check uniqueness (excluding current offer)
            const existingCode = await Offer.findOne({ code: update.code, _id: { $ne: id as any } });
            if (existingCode) {
                res.status(400).json({ message: `Coupon code "${update.code}" is already in use` }); return;
            }
        }

        // Validate percentage max
        if (update.discountType === 'PERCENTAGE' && update.discountValue > 100) {
            res.status(400).json({ message: 'Percentage discount cannot exceed 100' }); return;
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

// ============= CATEGORY MANAGEMENT =============

// Get all categories (admin)
export const getCategories = async (req: Request, res: Response): Promise<void> => {
    try {
        const categories = await Category.find({ restaurantId: req.admin?.restaurantId })
            .sort({ displayOrder: 1, createdAt: 1 });
        res.status(200).json({ categories });
    } catch (error) {
        console.error('Get Categories Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Create category
export const createCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, icon, colorScheme, displayOrder } = req.body;
        if (!name) { res.status(400).json({ message: 'Category name is required' }); return; }

        const category = await Category.create({
            name, icon, colorScheme, displayOrder,
            restaurantId: req.admin?.restaurantId
        });
        res.status(201).json({ message: 'Category created', category });
    } catch (error) {
        console.error('Create Category Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Update category
export const updateCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const allowed = ['name', 'icon', 'colorScheme', 'displayOrder', 'isActive'];
        const update: Record<string, any> = {};
        for (const key of allowed) { if (req.body[key] !== undefined) update[key] = req.body[key]; }

        const category = await Category.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
        if (!category) { res.status(404).json({ message: 'Category not found' }); return; }
        res.status(200).json({ message: 'Category updated', category });
    } catch (error) {
        console.error('Update Category Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Delete category
export const deleteCategory = async (req: Request, res: Response): Promise<void> => {
    try {
        const category = await Category.findById(req.params.id);
        if (!category) { res.status(404).json({ message: 'Category not found' }); return; }

        // Prevent deletion if menu items use this category
        const itemCount = await MenuItem.countDocuments({ category: category.name });
        if (itemCount > 0) {
            res.status(400).json({
                message: `Cannot delete — ${itemCount} menu item${itemCount > 1 ? 's' : ''} still use the "${category.name}" category. Remove or reassign them first.`
            });
            return;
        }

        await Category.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Category deleted' });
    } catch (error) {
        console.error('Delete Category Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// ============= DELIVERY LOCATION MANAGEMENT =============

// Get all delivery locations (admin view — includes inactive)
export const getDeliveryLocations = async (req: Request, res: Response): Promise<void> => {
    try {
        const locations = await DeliveryLocation.find({ restaurantId: req.admin?.restaurantId })
            .sort({ displayOrder: 1, createdAt: 1 });
        res.status(200).json({ locations });
    } catch (error) {
        console.error('Get Delivery Locations Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Create delivery location
export const createDeliveryLocation = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, isActive, displayOrder } = req.body;

        if (!name) {
            res.status(400).json({ message: 'Name is required' });
            return;
        }

        const location = await DeliveryLocation.create({
            name,
            isActive: isActive !== undefined ? isActive : true,
            displayOrder: displayOrder || 0,
            restaurantId: req.admin?.restaurantId
        });

        res.status(201).json({ message: 'Delivery location created', location });
    } catch (error) {
        console.error('Create Delivery Location Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Update delivery location
export const updateDeliveryLocation = async (req: Request, res: Response): Promise<void> => {
    try {
        const allowed = ['name', 'isActive', 'displayOrder'];
        const update: Record<string, any> = {};
        for (const key of allowed) {
            if (req.body[key] !== undefined) update[key] = req.body[key];
        }

        const location = await DeliveryLocation.findByIdAndUpdate(
            req.params.id, update, { new: true, runValidators: true }
        );

        if (!location) {
            res.status(404).json({ message: 'Delivery location not found' });
            return;
        }

        res.status(200).json({ message: 'Delivery location updated', location });
    } catch (error) {
        console.error('Update Delivery Location Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Delete delivery location
export const deleteDeliveryLocation = async (req: Request, res: Response): Promise<void> => {
    try {
        const location = await DeliveryLocation.findByIdAndDelete(req.params.id);

        if (!location) {
            res.status(404).json({ message: 'Delivery location not found' });
            return;
        }

        res.status(200).json({ message: 'Delivery location deleted' });
    } catch (error) {
        console.error('Delete Delivery Location Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// ============= DETAILED STATS =============

// Get detailed order statistics for dashboard
export const getDetailedOrderStats = async (_req: Request, res: Response): Promise<void> => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Basic stats
        const todayRevenueAgg = await Order.aggregate([
            { $match: { createdAt: { $gte: today }, orderStatus: 'DELIVERED', paymentStatus: 'PAID' } },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);
        const todayOrders = await Order.countDocuments({ createdAt: { $gte: today } });
        const pendingOrders = await Order.countDocuments({ orderStatus: 'PENDING' });
        const activeUsers = await User.countDocuments({ isBlocked: false });

        // Weekly revenue (last 7 days)
        const weeklyRevenue: { date: string; revenue: number }[] = [];
        for (let i = 6; i >= 0; i--) {
            const dayStart = new Date(today);
            dayStart.setDate(dayStart.getDate() - i);
            const dayEnd = new Date(dayStart);
            dayEnd.setDate(dayEnd.getDate() + 1);

            const dayAgg = await Order.aggregate([
                { $match: { createdAt: { $gte: dayStart, $lt: dayEnd }, orderStatus: 'DELIVERED', paymentStatus: 'PAID' } },
                { $group: { _id: null, total: { $sum: '$total' } } }
            ]);

            weeklyRevenue.push({
                date: dayStart.toISOString().split('T')[0],
                revenue: dayAgg[0]?.total || 0
            });
        }

        // Orders by status
        const statusAgg = await Order.aggregate([
            { $group: { _id: '$orderStatus', count: { $sum: 1 } } }
        ]);
        const ordersByStatus: Record<string, number> = {};
        statusAgg.forEach((s: any) => { ordersByStatus[s._id] = s.count; });

        // Revenue by payment method
        const paymentAgg = await Order.aggregate([
            { $match: { orderStatus: 'DELIVERED', paymentStatus: 'PAID' } },
            { $group: { _id: '$paymentMethod', total: { $sum: '$total' } } }
        ]);
        const revenueByPayment = { cod: 0, online: 0 };
        paymentAgg.forEach((p: any) => {
            if (p._id === 'COD') revenueByPayment.cod = p.total;
            if (p._id === 'ONLINE') revenueByPayment.online = p.total;
        });

        // Top 5 selling items
        const topItemsAgg = await Order.aggregate([
            { $unwind: '$items' },
            { $group: { _id: '$items.name', count: { $sum: '$items.quantity' } } },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);
        const topItems = topItemsAgg.map((i: any) => ({ name: i._id, count: i.count }));

        // Average order value
        const avgAgg = await Order.aggregate([
            { $match: { orderStatus: 'DELIVERED', paymentStatus: 'PAID' } },
            { $group: { _id: null, avg: { $avg: '$total' } } }
        ]);

        res.status(200).json({
            todayRevenue: todayRevenueAgg[0]?.total || 0,
            todayOrders,
            pendingOrders,
            activeUsers,
            weeklyRevenue,
            ordersByStatus,
            revenueByPayment,
            topItems,
            avgOrderValue: Math.round(avgAgg[0]?.avg || 0)
        });
    } catch (error) {
        console.error('Get Detailed Order Stats Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};
