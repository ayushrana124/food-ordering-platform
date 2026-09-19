import { Request, Response } from 'express';
import { sendServerError } from '../utils/errorResponse';
import User from '../models/User';
import Order from '../models/Order';
import MenuItem from '../models/MenuItem';

// Get user profile
export const getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }

        const user = await User.findById(req.user._id).select('-__v').lean();
        res.status(200).json({ user });
    } catch (error) {
        console.error('Get Profile Error:', error);
        sendServerError(res, error);
    }
};

// Update profile
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }

        const { name, email } = req.body;

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { name, email },
            { new: true, runValidators: true }
        ).select('-__v');

        res.status(200).json({ message: 'Profile updated successfully', user });
    } catch (error) {
        console.error('Update Profile Error:', error);
        sendServerError(res, error);
    }
};

// Add address
export const addAddress = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }

        const { label, addressLine, landmark, coordinates } = req.body;

        if (!label || !addressLine || !coordinates) {
            res.status(400).json({ message: 'Label, address line, and coordinates are required' });
            return;
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        // If this is the first address, make it default
        const isDefault = user.addresses.length === 0;

        user.addresses.push({
            label,
            addressLine,
            landmark,
            coordinates,
            isDefault
        });

        await user.save();

        const newAddress = user.addresses[user.addresses.length - 1];

        res.status(201).json({
            message: 'Address added successfully',
            address: newAddress
        });
    } catch (error) {
        console.error('Add Address Error:', error);
        sendServerError(res, error);
    }
};

// Update address
export const updateAddress = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }

        const { addressId } = req.params;
        const { label, addressLine, landmark, coordinates, isDefault } = req.body;

        const user = await User.findById(req.user._id);

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const addressIndex = user.addresses.findIndex(addr => addr._id?.toString() === addressId);

        if (addressIndex === -1) {
            res.status(404).json({ message: 'Address not found' });
            return;
        }

        const address = user.addresses[addressIndex];

        // If setting as default, unset other defaults
        if (isDefault) {
            user.addresses.forEach(addr => {
                addr.isDefault = false;
            });
        }

        // Update address fields
        if (label) address.label = label;
        if (addressLine) address.addressLine = addressLine;
        if (landmark !== undefined) address.landmark = landmark;
        if (coordinates) address.coordinates = coordinates;
        if (isDefault !== undefined) address.isDefault = isDefault;

        await user.save();

        res.status(200).json({ message: 'Address updated successfully', address });
    } catch (error) {
        console.error('Update Address Error:', error);
        sendServerError(res, error);
    }
};

// Delete address
export const deleteAddress = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }

        const { addressId } = req.params;

        const user = await User.findById(req.user._id);

        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }

        const addressIndex = user.addresses.findIndex(addr => addr._id?.toString() === addressId);

        if (addressIndex === -1) {
            res.status(404).json({ message: 'Address not found' });
            return;
        }

        user.addresses.splice(addressIndex, 1);
        await user.save();

        res.status(200).json({ message: 'Address deleted successfully' });
    } catch (error) {
        console.error('Delete Address Error:', error);
        sendServerError(res, error);
    }
};

// Get order history
export const getOrders = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }

        const { status, page = '1', limit = '10' } = req.query;

        const query: any = { userId: req.user._id };
        if (status) query.orderStatus = status;

        const pageNum = parseInt(page as string, 10);
        const limitNum = parseInt(limit as string, 10);

        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .limit(limitNum)
            .skip((pageNum - 1) * limitNum)
            .populate('restaurantId', 'name logo')
            .lean();

        const count = await Order.countDocuments(query);

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
 * GET /api/users/favorites
 * Returns the customer's hearted dishes, already filtered to what is still on
 * the menu so the client never has to deal with dangling references.
 */
export const getFavorites = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) { res.status(401).json({ message: 'Not authorized' }); return; }

        const user = await User.findById(req.user._id).select('favorites').lean();
        const ids = user?.favorites ?? [];
        if (ids.length === 0) { res.status(200).json({ favorites: [], menuItems: [] }); return; }

        // The soft-delete hook on MenuItem drops removed dishes automatically.
        const menuItems = await MenuItem.find({ _id: { $in: ids } }).lean();

        res.status(200).json({
            favorites: menuItems.map((m) => m._id.toString()),
            menuItems,
        });
    } catch (error) {
        console.error('Get Favorites Error:', error);
        sendServerError(res, error);
    }
};

/**
 * PUT /api/users/favorites/:menuItemId
 * Toggles one dish. Idempotent per state, so a double-tap cannot desync the UI.
 */
export const toggleFavorite = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) { res.status(401).json({ message: 'Not authorized' }); return; }

        const { menuItemId } = req.params;

        const menuItem = await MenuItem.findById(menuItemId).select('_id').lean();
        if (!menuItem) { res.status(404).json({ message: 'Menu item not found' }); return; }

        const user = await User.findById(req.user._id).select('favorites');
        if (!user) { res.status(404).json({ message: 'User not found' }); return; }

        const idx = user.favorites.findIndex((f) => f.toString() === menuItemId);
        const isFavorite = idx === -1;

        if (isFavorite) {
            user.favorites.push(menuItem._id);
        } else {
            user.favorites.splice(idx, 1);
        }

        await user.save();

        res.status(200).json({
            isFavorite,
            favorites: user.favorites.map((f) => f.toString()),
        });
    } catch (error) {
        console.error('Toggle Favorite Error:', error);
        sendServerError(res, error);
    }
};
