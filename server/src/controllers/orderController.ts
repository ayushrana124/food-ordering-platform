import { Request, Response } from 'express';
import Order from '../models/Order';
import MenuItem from '../models/MenuItem';
import Restaurant from '../models/Restaurant';
import { calculateDistance } from '../utils/distanceCalculator';
import { calculateDeliveryCharges } from '../utils/deliveryCharges';

// Create order
export const createOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }

        const { items, deliveryAddress, paymentMethod, specialInstructions } = req.body;

        if (!items || items.length === 0) {
            res.status(400).json({ message: 'Order must contain at least one item' });
            return;
        }

        if (!deliveryAddress || !deliveryAddress.coordinates) {
            res.status(400).json({ message: 'Delivery address with coordinates is required' });
            return;
        }

        // Check if user is blocked
        if (req.user.isBlocked) {
            res.status(403).json({ message: 'Your account has been blocked. Please contact support.' });
            return;
        }

        // Check if COD is blocked for this user
        if (paymentMethod === 'COD' && req.user.isCODBlocked) {
            res.status(403).json({ message: 'Cash on Delivery is not available for your account. Please use online payment.' });
            return;
        }

        // Validate specialInstructions length
        if (specialInstructions && typeof specialInstructions === 'string' && specialInstructions.length > 500) {
            res.status(400).json({ message: 'Special instructions must be 500 characters or less' });
            return;
        }

        // Get restaurant
        const restaurant = await Restaurant.findOne();

        if (!restaurant) {
            res.status(500).json({ message: 'Restaurant information not found' });
            return;
        }

        if (!restaurant.isOpen) {
            res.status(400).json({ message: 'Restaurant is currently closed. Please try again later.' });
            return;
        }

        // Calculate distance
        const distance = calculateDistance(
            restaurant.address.coordinates.lat,
            restaurant.address.coordinates.lng,
            deliveryAddress.coordinates.lat,
            deliveryAddress.coordinates.lng
        );

        // Check delivery radius
        if (distance > restaurant.deliveryRadius) {
            res.status(400).json({
                message: `Delivery not available. Maximum delivery distance is ${restaurant.deliveryRadius}km. Your location is ${distance}km away.`
            });
            return;
        }

        // Calculate delivery charges
        const deliveryCharges = calculateDeliveryCharges(distance);

        if (deliveryCharges === null) {
            res.status(400).json({ message: 'Delivery not available for this distance' });
            return;
        }

        // Validate and calculate order total
        let subtotal = 0;
        const orderItems: any[] = [];

        for (const item of items) {
            // Validate quantity
            if (!item.quantity || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) {
                res.status(400).json({ message: 'Item quantity must be a positive integer (max 50)' });
                return;
            }

            const menuItem = await MenuItem.findById(item.menuItemId);

            if (!menuItem || !menuItem.isAvailable) {
                res.status(400).json({
                    message: `Item "${item.name || 'Unknown'}" is not available`
                });
                return;
            }

            let itemPrice = menuItem.price;

            // Validate customization prices against actual menu item customizations
            const validatedCustomizations: any[] = [];
            if (item.customizations && Array.isArray(item.customizations)) {
                for (const custom of item.customizations) {
                    // Client sends { name, price } — name is the option name
                    // Server schema: customizations[].options[] = { name, price }
                    let foundOption: { name: string; price: number } | null = null;
                    for (const group of (menuItem.customizations ?? [])) {
                        const opt = group.options?.find(
                            (o: any) => o.name === custom.name
                        );
                        if (opt) { foundOption = opt; break; }
                    }
                    if (!foundOption) {
                        res.status(400).json({
                            message: `Unknown customization "${custom.name}" for item "${menuItem.name}"`
                        });
                        return;
                    }
                    // Use server-side price, never trust client price
                    itemPrice += foundOption.price;
                    validatedCustomizations.push({
                        name: foundOption.name,
                        price: foundOption.price
                    });
                }
            }

            const itemTotal = itemPrice * item.quantity;
            subtotal += itemTotal;

            orderItems.push({
                menuItemId: menuItem._id,
                name: menuItem.name,
                quantity: item.quantity,
                price: itemPrice,
                customizations: validatedCustomizations
            });
        }

        // Calculate taxes (5% GST)
        const taxes = Math.round(subtotal * 0.05 * 100) / 100;
        const total = Math.round((subtotal + deliveryCharges + taxes) * 100) / 100;

        // Check minimum order amount
        if (subtotal < restaurant.minOrderAmount) {
            res.status(400).json({
                message: `Minimum order amount is ₹${restaurant.minOrderAmount}. Your order is ₹${subtotal}.`
            });
            return;
        }

        // Create order
        const order = await Order.create({
            userId: req.user._id,
            restaurantId: restaurant._id,
            items: orderItems,
            deliveryAddress,
            distance,
            deliveryCharges,
            subtotal,
            taxes,
            total,
            paymentMethod,
            paymentStatus: paymentMethod === 'COD' ? 'PENDING' : 'PENDING',
            specialInstructions
        });

        // Emit Socket.io event to admin
        req.io.to('admin-room').emit('newOrder', {
            orderId: order._id,
            orderNumber: order.orderId,
            total: order.total,
            items: order.items.length
        });

        res.status(201).json({
            message: 'Order created successfully',
            order
        });
    } catch (error) {
        console.error('Create Order Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Get order details
export const getOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }

        const { id } = req.params;

        const order = await Order.findById(id)
            .populate('restaurantId', 'name logo phone');

        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        // Check if order belongs to user
        if (order.userId.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Not authorized to view this order' });
            return;
        }

        res.status(200).json({ order });
    } catch (error) {
        console.error('Get Order Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Cancel order
export const cancelOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }

        const { id } = req.params;

        const order = await Order.findById(id);

        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        // Check if order belongs to user
        if (order.userId.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Not authorized to cancel this order' });
            return;
        }

        // Can only cancel pending orders
        if (order.orderStatus !== 'PENDING') {
            res.status(400).json({ message: 'Cannot cancel this order. It has already been processed.' });
            return;
        }

        order.orderStatus = 'CANCELLED';
        await order.save();

        // Emit Socket.io event to admin
        req.io.to('admin-room').emit('orderCancelled', {
            orderId: order._id,
            orderNumber: order.orderId
        });

        res.status(200).json({ message: 'Order cancelled successfully', order });
    } catch (error) {
        console.error('Cancel Order Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};
