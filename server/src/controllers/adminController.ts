import { Request, Response } from 'express';
import { sendServerError } from '../utils/errorResponse';
import MenuItem from '../models/MenuItem';
import Order from '../models/Order';
import User from '../models/User';
import Restaurant from '../models/Restaurant';
import Offer from '../models/Offer';
import Category from '../models/Category';

import cloudinary from '../config/cloudinary';
import fs from 'fs';

// ============= SHARED HELPERS =============

/**
 * Clamp pagination input. `parseInt` on a junk value yields NaN, which Mongoose
 * turns into an unbounded query — so bad input used to be able to pull the whole
 * collection into memory.
 */
const parsePagination = (
    page: unknown,
    limit: unknown,
    { defaultLimit = 20, maxLimit = 100 } = {}
): { pageNum: number; limitNum: number; skip: number } => {
    const parsedPage = parseInt(String(page ?? ''), 10);
    const parsedLimit = parseInt(String(limit ?? ''), 10);

    const pageNum = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;
    const limitNum = Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, maxLimit)
        : defaultLimit;

    return { pageNum, limitNum, skip: (pageNum - 1) * limitNum };
};

// ============= ORDER MANAGEMENT =============

// Get all orders with filters
export const getOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        // Note: auto-cancelling abandoned online orders used to run here, on every
        // single request. It is now a scheduled job (see src/jobs) so this read
        // path no longer triggers a collection-wide write.
        const { status, paymentMethod, startDate, endDate, page, limit } = req.query;

        const query: any = {};
        if (status) query.orderStatus = status;
        if (paymentMethod) query.paymentMethod = paymentMethod;

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate as string);
            if (endDate) query.createdAt.$lte = new Date(endDate as string);
        }

        const { pageNum, limitNum, skip } = parsePagination(page, limit);

        const [orders, count] = await Promise.all([
            Order.find(query)
                .sort({ createdAt: -1 })
                .limit(limitNum)
                .skip(skip)
                .populate('userId', 'name phone')
                .lean(),
            Order.countDocuments(query),
        ]);

        res.status(200).json({
            orders,
            totalPages: Math.ceil(count / limitNum),
            currentPage: pageNum,
            totalOrders: count
        });
    } catch (error) {
        console.error('Get Orders Error:', error);
        sendServerError(res, error);
    }
};

/**
 * Single-round-trip order counts for the admin shell.
 *
 * The dashboard previously derived these by firing four separate paginated
 * `GET /orders` requests (one per active status) every 30 seconds. This
 * replaces all four with one grouped aggregation.
 */
export const getOrderCounts = async (_req: Request, res: Response): Promise<void> => {
    try {
        const agg = await Order.aggregate([
            { $match: { orderStatus: { $in: ['PENDING', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY'] } } },
            { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
        ]);

        const byStatus: Record<string, number> = {
            PENDING: 0, ACCEPTED: 0, PREPARING: 0, OUT_FOR_DELIVERY: 0,
        };
        for (const row of agg) byStatus[row._id] = row.count;

        const activeOrderCount = Object.values(byStatus).reduce((a, b) => a + b, 0);

        res.status(200).json({
            byStatus,
            pendingOrderCount: byStatus.PENDING,
            activeOrderCount,
        });
    } catch (error) {
        console.error('Get Order Counts Error:', error);
        sendServerError(res, error);
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
        invalidateStatsCache();

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
        sendServerError(res, error);
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
        invalidateStatsCache();

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
        sendServerError(res, error);
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
        invalidateStatsCache();

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
        sendServerError(res, error);
    }
};

// Get order statistics
export const getOrderStats = async (_req: Request, res: Response): Promise<void> => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Run in parallel — these four are independent, so there is no reason to
        // pay four sequential database round-trips for them.
        const [todayRevenue, todayOrders, pendingOrders, activeUsers] = await Promise.all([
            Order.aggregate([
                { $match: { createdAt: { $gte: today }, orderStatus: 'DELIVERED', paymentStatus: 'PAID' } },
                { $group: { _id: null, total: { $sum: '$total' } } }
            ]),
            Order.countDocuments({ createdAt: { $gte: today } }),
            Order.countDocuments({ orderStatus: 'PENDING' }),
            User.countDocuments({ isBlocked: false }),
        ]);

        res.status(200).json({
            todayRevenue: todayRevenue[0]?.total || 0,
            todayOrders,
            pendingOrders,
            activeUsers
        });
    } catch (error) {
        console.error('Get Order Stats Error:', error);
        sendServerError(res, error);
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
        sendServerError(res, error);
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
        sendServerError(res, error);
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
        sendServerError(res, error);
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
        sendServerError(res, error);
    }
};

// Get soft-deleted menu items (trash view)
export const getDeletedMenuItems = async (_req: Request, res: Response): Promise<void> => {
    try {
        const menuItems = await MenuItem.find({ isDeleted: true }).sort({ deletedAt: -1 }).lean();
        res.status(200).json({ menuItems });
    } catch (error) {
        console.error('Get Deleted Menu Items Error:', error);
        sendServerError(res, error);
    }
};

// Get all menu items for admin (includes unavailable, excludes soft-deleted)
export const getAdminMenuItems = async (req: Request, res: Response): Promise<void> => {
    try {
        const menuItems = await MenuItem.find({ restaurantId: req.admin?.restaurantId })
            .sort({ category: 1, name: 1 })
            .lean();
        res.status(200).json({ menuItems });
    } catch (error) {
        console.error('Get Admin Menu Items Error:', error);
        sendServerError(res, error);
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
        sendServerError(res, error);
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

        const { pageNum, limitNum, skip } = parsePagination(page, limit);

        const [users, count] = await Promise.all([
            User.find(query)
                .select('-__v')
                .limit(limitNum)
                .skip(skip)
                .sort({ createdAt: -1 })
                .lean(),
            User.countDocuments(query),
        ]);

        res.status(200).json({
            users,
            totalPages: Math.ceil(count / limitNum),
            currentPage: pageNum,
            totalUsers: count
        });
    } catch (error) {
        console.error('Get Users Error:', error);
        sendServerError(res, error);
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
        sendServerError(res, error);
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
        sendServerError(res, error);
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
        sendServerError(res, error);
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
        sendServerError(res, error);
    }
};

// Get all offers (admin view — includes inactive)
export const getOffers = async (req: Request, res: Response): Promise<void> => {
    try {
        const { page, limit } = req.query;
        const { pageNum, limitNum, skip } = parsePagination(page, limit);

        const [offers, total] = await Promise.all([
            Offer.find()
                .sort({ createdAt: -1 })
                .limit(limitNum)
                .skip(skip)
                .lean(),
            Offer.countDocuments(),
        ]);

        res.status(200).json({
            offers,
            totalPages: Math.ceil(total / limitNum),
            currentPage: pageNum,
            totalOffers: total,
        });
    } catch (error) {
        console.error('Get Offers Error:', error);
        sendServerError(res, error);
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
        sendServerError(res, error);
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
        sendServerError(res, error);
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
        sendServerError(res, error);
    }
};

// ============= CATEGORY MANAGEMENT =============

// Get all categories (admin)
export const getCategories = async (req: Request, res: Response): Promise<void> => {
    try {
        const categories = await Category.find({ restaurantId: req.admin?.restaurantId })
            .sort({ displayOrder: 1, createdAt: 1 })
            .lean();
        res.status(200).json({ categories });
    } catch (error) {
        console.error('Get Categories Error:', error);
        sendServerError(res, error);
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
        sendServerError(res, error);
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
        sendServerError(res, error);
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
        sendServerError(res, error);
    }
};



// ============= DETAILED STATS =============

const VALID_TIME_RANGES = ['today', 'week', 'month', '3months'];

// The server's own timezone, handed to MongoDB so date bucketing in the database
// agrees with the local-time Date maths below. Set TZ=Asia/Kolkata on the server.
const REPORT_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

/** Local-time YYYY-MM-DD. Matches MongoDB's $dateToString under REPORT_TZ. */
const dayKey = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ─── Short-lived stats cache ──────────────────────────────────────────────────
// The dashboard polls on a timer and several admin screens ask for the same
// numbers. A few seconds of staleness is irrelevant for revenue totals, and this
// keeps repeated polls from re-running the aggregation pipeline every time.
const STATS_CACHE_TTL_MS = 15000;
const statsCache = new Map<string, { at: number; payload: unknown }>();

/** Called after any write that changes order figures, so the UI never shows stale totals. */
export const invalidateStatsCache = (): void => statsCache.clear();

// Get detailed order statistics for dashboard
export const getDetailedOrderStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const requested = req.query.timeRange as string;
        const timeRange = VALID_TIME_RANGES.includes(requested) ? requested : 'today';

        const cached = statsCache.get(timeRange);
        if (cached && Date.now() - cached.at < STATS_CACHE_TTL_MS) {
            res.status(200).json(cached.payload);
            return;
        }

        const now = new Date();
        const startDate = new Date();
        startDate.setHours(0, 0, 0, 0);

        if (timeRange === 'week') {
            startDate.setDate(startDate.getDate() - 6);
        } else if (timeRange === 'month') {
            startDate.setDate(startDate.getDate() - 29);
        } else if (timeRange === '3months') {
            startDate.setDate(startDate.getDate() - 89);
        }

        const dateMatch = { createdAt: { $gte: startDate } };
        const deliveredMatch = { ...dateMatch, orderStatus: 'DELIVERED', paymentStatus: 'PAID' };

        // The revenue trend used to be built with one aggregation per bucket —
        // 8 round-trips for "today" and 30 for "month", run one after another.
        // It is now a single grouped query, with the buckets filled in below.
        const trendGroupId = timeRange === 'today'
            ? { $multiply: [{ $floor: { $divide: [{ $hour: { date: '$createdAt', timezone: REPORT_TZ } }, 3] } }, 3] }
            : { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: REPORT_TZ } };

        // Every query below is independent, so they all go out together.
        const [
            revenueAgg,
            periodOrders,
            pendingOrders,
            activeUsers,
            trendAgg,
            statusAgg,
            paymentAgg,
            topItemsAgg,
        ] = await Promise.all([
            // Sum and average share a pipeline instead of being two separate passes.
            Order.aggregate([
                { $match: deliveredMatch },
                { $group: { _id: null, total: { $sum: '$total' }, avg: { $avg: '$total' } } },
            ]),
            Order.countDocuments(dateMatch),
            Order.countDocuments({ orderStatus: 'PENDING' }),
            User.countDocuments({ isBlocked: false }),
            Order.aggregate([
                { $match: deliveredMatch },
                { $group: { _id: trendGroupId, revenue: { $sum: '$total' } } },
            ]),
            Order.aggregate([
                { $match: dateMatch },
                { $group: { _id: '$orderStatus', count: { $sum: 1 } } },
            ]),
            Order.aggregate([
                { $match: deliveredMatch },
                { $group: { _id: '$paymentMethod', total: { $sum: '$total' } } },
            ]),
            Order.aggregate([
                { $match: dateMatch },
                { $unwind: '$items' },
                { $group: { _id: '$items.name', count: { $sum: '$items.quantity' } } },
                { $sort: { count: -1 } },
                { $limit: 5 },
            ]),
        ]);

        // ── Fill the trend buckets, including the empty ones ──────────────────
        const revenueByBucket = new Map<string | number, number>(
            trendAgg.map((r: any) => [r._id, r.revenue])
        );
        const trendData: { date: string; revenue: number }[] = [];

        if (timeRange === 'today') {
            for (let i = 0; i < 24; i += 3) {
                trendData.push({
                    date: `${i.toString().padStart(2, '0')}:00`,
                    revenue: revenueByBucket.get(i) || 0,
                });
            }
        } else {
            const numDays = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 90;
            const step = numDays > 30 ? 7 : 1;

            for (let i = numDays - 1; i >= 0; i -= step) {
                const bucketStart = new Date(now);
                bucketStart.setHours(0, 0, 0, 0);
                bucketStart.setDate(bucketStart.getDate() - i);

                // A multi-day bucket sums the days it covers.
                let revenue = 0;
                for (let d = 0; d < step; d++) {
                    const day = new Date(bucketStart);
                    day.setDate(day.getDate() + d);
                    revenue += revenueByBucket.get(dayKey(day)) || 0;
                }

                // Label in local time. This previously used toISOString(), which
                // is UTC and so labelled the wrong day for any timezone ahead of it.
                trendData.push({
                    date: dayKey(bucketStart),
                    revenue: Math.round(revenue * 100) / 100,
                });
            }
        }

        const ordersByStatus: Record<string, number> = {};
        statusAgg.forEach((s: any) => { ordersByStatus[s._id] = s.count; });

        const revenueByPayment = { cod: 0, online: 0 };
        paymentAgg.forEach((p: any) => {
            if (p._id === 'COD') revenueByPayment.cod = p.total;
            if (p._id === 'ONLINE') revenueByPayment.online = p.total;
        });

        const payload = {
            revenue: revenueAgg[0]?.total || 0,
            orders: periodOrders,
            pendingOrders,
            activeUsers,
            trendData,
            ordersByStatus,
            revenueByPayment,
            topItems: topItemsAgg.map((i: any) => ({ name: i._id, count: i.count })),
            avgOrderValue: Math.round(revenueAgg[0]?.avg || 0),
        };

        statsCache.set(timeRange, { at: Date.now(), payload });
        res.status(200).json(payload);
    } catch (error) {
        console.error('Get Detailed Order Stats Error:', error);
        sendServerError(res, error);
    }
};
