import { Request, Response } from 'express';
import Order from '../models/Order';
import Cart from '../models/Cart';
import MenuItem from '../models/MenuItem';
import Offer from '../models/Offer';
import Restaurant from '../models/Restaurant';
import { calculateDistance } from '../utils/distanceCalculator';
import { calculateDeliveryCharges } from '../utils/deliveryCharges';

// Create order — reads cart from DB, validates everything server-side
export const createOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }

        const { deliveryAddress, paymentMethod, specialInstructions } = req.body;

        if (!deliveryAddress) {
            res.status(400).json({ message: 'Delivery address is required' });
            return;
        }

        if (req.user.isBlocked) {
            res.status(403).json({ message: 'Your account has been blocked. Please contact support.' });
            return;
        }

        if (paymentMethod === 'COD' && req.user.isCODBlocked) {
            res.status(403).json({ message: 'Cash on Delivery is not available for your account. Please use online payment.' });
            return;
        }

        if (specialInstructions && typeof specialInstructions === 'string' && specialInstructions.length > 500) {
            res.status(400).json({ message: 'Special instructions must be 500 characters or less' });
            return;
        }

        // ── Read cart from DB ────────────────────────────────────────────────
        const cart = await Cart.findOne({ userId: req.user._id });
        if (!cart || cart.items.length === 0) {
            res.status(400).json({ message: 'Cart is empty' });
            return;
        }

        // ── Restaurant checks ────────────────────────────────────────────────
        const restaurant = await Restaurant.findOne();
        if (!restaurant) {
            res.status(500).json({ message: 'Restaurant information not found' });
            return;
        }
        if (!restaurant.isOpen) {
            res.status(400).json({ message: 'Restaurant is currently closed. Please try again later.' });
            return;
        }

        // ── Distance & delivery ──────────────────────────────────────────────
        let distance = 0;
        let deliveryCharges = 0;

        if (deliveryAddress.coordinates?.lat && deliveryAddress.coordinates?.lng) {
            // GPS-based address — calculate and validate distance
            distance = calculateDistance(
                restaurant.address.coordinates.lat,
                restaurant.address.coordinates.lng,
                deliveryAddress.coordinates.lat,
                deliveryAddress.coordinates.lng
            );

            if (distance > restaurant.deliveryRadius) {
                res.status(400).json({
                    message: `Delivery not available. Maximum delivery distance is ${restaurant.deliveryRadius}km. Your location is ${distance}km away.`
                });
                return;
            }

            const charges = calculateDeliveryCharges(distance);
            if (charges === null) {
                res.status(400).json({ message: 'Delivery not available for this distance' });
                return;
            }
            deliveryCharges = charges;
        }
        // Predefined delivery locations added by admin — no distance check needed

        // ── Validate items & calculate prices from DB ────────────────────────
        const menuItemIds = cart.items.map((i) => i.menuItemId);
        const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } });
        const menuMap = new Map(menuItems.map((m) => [m._id.toString(), m]));

        let subtotal = 0;
        const orderItems: any[] = [];

        for (const cartItem of cart.items) {
            if (!cartItem.quantity || !Number.isInteger(cartItem.quantity) || cartItem.quantity < 1 || cartItem.quantity > 50) {
                res.status(400).json({ message: 'Item quantity must be a positive integer (max 50)' });
                return;
            }

            const menuItem = menuMap.get(cartItem.menuItemId.toString());
            if (!menuItem || !menuItem.isAvailable) {
                res.status(400).json({
                    message: `Item "${menuItem?.name || 'Unknown'}" is not available`
                });
                return;
            }

            let itemPrice = menuItem.price;
            const validatedCustomizations: any[] = [];

            for (const cust of cartItem.selectedCustomizations) {
                let foundOption: { name: string; price: number } | null = null;
                for (const group of (menuItem.customizations ?? [])) {
                    if (group.name === cust.groupName) {
                        const opt = group.options?.find((o: any) => o.name === cust.optionName);
                        if (opt) { foundOption = opt; break; }
                    }
                }
                if (!foundOption) {
                    res.status(400).json({
                        message: `Unknown customization "${cust.optionName}" for item "${menuItem.name}"`
                    });
                    return;
                }
                itemPrice += foundOption.price;
                validatedCustomizations.push({
                    name: foundOption.name,
                    price: foundOption.price
                });
            }

            const itemTotal = itemPrice * cartItem.quantity;
            subtotal += itemTotal;

            orderItems.push({
                menuItemId: menuItem._id,
                name: menuItem.name,
                quantity: cartItem.quantity,
                price: itemPrice,
                customizations: validatedCustomizations
            });
        }

        // ── Minimum order ────────────────────────────────────────────────────
        if (subtotal < restaurant.minOrderAmount) {
            res.status(400).json({
                message: `Minimum order amount is ₹${restaurant.minOrderAmount}. Your order is ₹${subtotal}.`
            });
            return;
        }

        // ── Coupon / discount ────────────────────────────────────────────────
        let discount = 0;
        let couponCode: string | undefined;

        if (cart.appliedCoupon) {
            const offer = await Offer.findOne({ code: cart.appliedCoupon, isActive: true });
            if (offer) {
                const now = new Date();
                if (now >= offer.validFrom && now <= offer.validTill && subtotal >= offer.minOrderAmount) {
                    if (offer.discountType === 'PERCENTAGE') {
                        discount = Math.round((subtotal * offer.discountValue / 100) * 100) / 100;
                        if (offer.maxDiscount && discount > offer.maxDiscount) {
                            discount = offer.maxDiscount;
                        }
                    } else {
                        discount = offer.discountValue;
                    }
                    discount = Math.min(discount, subtotal);
                    couponCode = cart.appliedCoupon;
                }
            }
        }

        // ── Total ────────────────────────────────────────────────────────────
        const total = Math.round((subtotal + deliveryCharges - discount) * 100) / 100;

        // ── Create order ─────────────────────────────────────────────────────
        const order = await Order.create({
            userId: req.user._id,
            restaurantId: restaurant._id,
            items: orderItems,
            deliveryAddress,
            distance,
            deliveryCharges,
            subtotal,
            discount,
            couponCode,
            total,
            paymentMethod,
            paymentStatus: paymentMethod === 'COD' ? 'PAID' : 'PENDING',
            specialInstructions,
            statusHistory: [{ status: 'PENDING', timestamp: new Date() }],
        });

        // ── Clear cart ───────────────────────────────────────────────────────
        await Cart.deleteOne({ userId: req.user._id });

        // Emit Socket.io event to admin with customer info
        req.io.to('admin-room').emit('newOrder', {
            orderId: order._id,
            orderNumber: order.orderId,
            total: order.total,
            items: order.items.length,
            customerName: req.user.name,
            customerPhone: req.user.phone,
            paymentMethod: order.paymentMethod,
        });

        res.status(201).json({ message: 'Order created successfully', order });
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
        const order = await Order.findById(id).populate('restaurantId', 'name logo phone');

        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

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

        if (order.userId.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Not authorized to cancel this order' });
            return;
        }

        if (order.orderStatus !== 'PENDING') {
            res.status(400).json({ message: 'Cannot cancel this order. It has already been processed.' });
            return;
        }

        order.orderStatus = 'CANCELLED';
        order.cancelledBy = 'CUSTOMER';
        if (!order.statusHistory) order.statusHistory = [];
        order.statusHistory.push({ status: 'CANCELLED', timestamp: new Date(), note: 'Cancelled by customer' });
        order.updatedAt = new Date();
        await order.save();

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
