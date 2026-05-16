import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Cart from '../models/Cart';
import MenuItem from '../models/MenuItem';
import Offer from '../models/Offer';

// ── Helpers ──────────────────────────────────────────────────────────────────

const MAX_ITEMS = 50;
const MAX_ITEM_QTY = 20;

/** Build the full cart response with server-calculated prices */
async function buildCartResponse(userId: mongoose.Types.ObjectId) {
    const cart = await Cart.findOne({ userId });

    if (!cart || cart.items.length === 0) {
        return {
            items: [],
            subtotal: 0,
            discount: null,
            total: 0,
            itemCount: 0,
            appliedCoupon: null,
        };
    }

    // Fetch all referenced menu items in one query
    const menuItemIds = cart.items.map((i) => i.menuItemId);
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } });
    const menuMap = new Map(menuItems.map((m) => [m._id.toString(), m]));

    const responseItems: any[] = [];
    let subtotal = 0;
    let itemCount = 0;

    for (const cartItem of cart.items) {
        const menu = menuMap.get(cartItem.menuItemId.toString());
        if (!menu) continue; // item was deleted from menu

        let unitPrice = menu.price;
        const validatedCustomizations: { groupName: string; optionName: string; price: number }[] = [];

        for (const cust of cartItem.selectedCustomizations) {
            let foundPrice = 0;
            for (const group of menu.customizations ?? []) {
                if (group.name === cust.groupName) {
                    const opt = group.options?.find((o: any) => o.name === cust.optionName);
                    if (opt) { foundPrice = opt.price; break; }
                }
            }
            unitPrice += foundPrice;
            validatedCustomizations.push({ groupName: cust.groupName, optionName: cust.optionName, price: foundPrice });
        }

        const itemTotal = unitPrice * cartItem.quantity;
        subtotal += itemTotal;
        itemCount += cartItem.quantity;

        responseItems.push({
            cartItemId: cartItem._id!.toString(),
            menuItemId: menu._id.toString(),
            name: menu.name,
            image: menu.image,
            isVeg: menu.isVeg,
            price: menu.price,
            quantity: cartItem.quantity,
            selectedCustomizations: validatedCustomizations,
            itemTotal,
            isAvailable: menu.isAvailable,
        });
    }

    // ── Coupon ────────────────────────────────────────────────────────────────
    let discount: any = null;
    let appliedCoupon: string | null = cart.appliedCoupon;

    if (appliedCoupon) {
        const couponResult = await validateCoupon(appliedCoupon, subtotal);
        if (couponResult.valid) {
            discount = {
                code: appliedCoupon,
                discountType: couponResult.discountType,
                discountValue: couponResult.discountValue,
                appliedDiscount: couponResult.appliedDiscount,
                title: couponResult.title,
            };
        } else {
            // Coupon no longer valid — auto-remove
            appliedCoupon = null;
            cart.appliedCoupon = null;
            await cart.save();
        }
    }

    const appliedDiscount = discount?.appliedDiscount ?? 0;
    const total = Math.max(0, Math.round((subtotal - appliedDiscount) * 100) / 100);

    return { items: responseItems, subtotal, discount, total, itemCount, appliedCoupon };
}

/** Validate a coupon code against the Offer collection */
async function validateCoupon(code: string, subtotal: number) {
    const offer = await Offer.findOne({ code: code.toUpperCase(), isActive: true });
    if (!offer) return { valid: false, reason: 'Invalid coupon code' };

    const now = new Date();
    if (now < offer.validFrom) return { valid: false, reason: 'This coupon is not active yet' };
    if (now > offer.validTill) return { valid: false, reason: 'This coupon has expired' };
    if (subtotal < offer.minOrderAmount) {
        return { valid: false, reason: `Minimum order of ₹${offer.minOrderAmount} required for this coupon` };
    }

    let appliedDiscount: number;
    if (offer.discountType === 'PERCENTAGE') {
        appliedDiscount = Math.round((subtotal * offer.discountValue / 100) * 100) / 100;
        if (offer.maxDiscount && appliedDiscount > offer.maxDiscount) {
            appliedDiscount = offer.maxDiscount;
        }
    } else {
        appliedDiscount = offer.discountValue;
    }
    // Discount cannot exceed subtotal
    appliedDiscount = Math.min(appliedDiscount, subtotal);

    return {
        valid: true,
        discountType: offer.discountType,
        discountValue: offer.discountValue,
        appliedDiscount,
        title: offer.title,
    };
}

// ── Controllers ──────────────────────────────────────────────────────────────

/** GET /api/cart */
export const getCart = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) { res.status(401).json({ message: 'Not authorized' }); return; }
        const data = await buildCartResponse(req.user._id);
        res.json(data);
    } catch (err) {
        console.error('getCart error:', err);
        res.status(500).json({ message: 'Failed to fetch cart' });
    }
};

/** POST /api/cart/add */
export const addItem = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) { res.status(401).json({ message: 'Not authorized' }); return; }

        const { menuItemId, quantity = 1, selectedCustomizations = [] } = req.body;

        // Validate inputs
        if (!menuItemId || !mongoose.Types.ObjectId.isValid(menuItemId)) {
            res.status(400).json({ message: 'Invalid menu item ID' }); return;
        }
        const qty = Math.min(Math.max(1, Math.floor(Number(quantity))), MAX_ITEM_QTY);
        if (!Number.isFinite(qty)) { res.status(400).json({ message: 'Invalid quantity' }); return; }

        // Validate customizations are strings
        if (!Array.isArray(selectedCustomizations) || selectedCustomizations.some(
            (c: any) => typeof c.groupName !== 'string' || typeof c.optionName !== 'string'
        )) {
            res.status(400).json({ message: 'Invalid customizations format' }); return;
        }

        // Validate menu item exists & is available
        const menuItem = await MenuItem.findById(menuItemId);
        if (!menuItem) { res.status(404).json({ message: 'Menu item not found' }); return; }
        if (!menuItem.isAvailable) { res.status(400).json({ message: `"${menuItem.name}" is currently unavailable` }); return; }

        // Validate customizations exist on menu item
        const cleanCustomizations: { groupName: string; optionName: string }[] = [];
        for (const cust of selectedCustomizations) {
            let found = false;
            for (const group of menuItem.customizations ?? []) {
                if (group.name === cust.groupName) {
                    const opt = group.options?.find((o: any) => o.name === cust.optionName);
                    if (opt) { found = true; break; }
                }
            }
            if (!found) {
                res.status(400).json({ message: `Invalid customization: ${cust.groupName} → ${cust.optionName}` }); return;
            }
            cleanCustomizations.push({ groupName: cust.groupName, optionName: cust.optionName });
        }

        // Validate required customization groups are selected
        for (const group of menuItem.customizations ?? []) {
            if (group.required) {
                const hasSelection = cleanCustomizations.some((c) => c.groupName === group.name);
                if (!hasSelection) {
                    res.status(400).json({ message: `Required customization "${group.name}" not selected` }); return;
                }
            }
        }

        // Upsert cart
        let cart = await Cart.findOne({ userId: req.user._id });
        if (!cart) {
            cart = new Cart({ userId: req.user._id, items: [] });
        }

        // Check total items cap
        const totalQty = cart.items.reduce((s, i) => s + i.quantity, 0);
        if (totalQty + qty > MAX_ITEMS) {
            res.status(400).json({ message: `Cart cannot exceed ${MAX_ITEMS} items` }); return;
        }

        // Deduplication — same menuItemId + same customizations = increment qty
        const custKey = JSON.stringify(cleanCustomizations.sort((a, b) => a.groupName.localeCompare(b.groupName) || a.optionName.localeCompare(b.optionName)));
        const existing = cart.items.find(
            (i) => i.menuItemId.toString() === menuItemId &&
                JSON.stringify(
                    i.selectedCustomizations
                        .slice()
                        .sort((a, b) => a.groupName.localeCompare(b.groupName) || a.optionName.localeCompare(b.optionName))
                ) === custKey
        );

        if (existing) {
            existing.quantity = Math.min(existing.quantity + qty, MAX_ITEM_QTY);
        } else {
            cart.items.push({ menuItemId: new mongoose.Types.ObjectId(menuItemId), quantity: qty, selectedCustomizations: cleanCustomizations });
        }

        await cart.save();
        const data = await buildCartResponse(req.user._id);
        res.json(data);
    } catch (err) {
        console.error('addItem error:', err);
        res.status(500).json({ message: 'Failed to add item' });
    }
};

/** PUT /api/cart/update */
export const updateItem = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) { res.status(401).json({ message: 'Not authorized' }); return; }

        const { cartItemId, quantity } = req.body;
        if (!cartItemId || !mongoose.Types.ObjectId.isValid(cartItemId)) {
            res.status(400).json({ message: 'Invalid cart item ID' }); return;
        }

        const qty = Math.floor(Number(quantity));
        if (!Number.isFinite(qty)) { res.status(400).json({ message: 'Invalid quantity' }); return; }

        const cart = await Cart.findOne({ userId: req.user._id });
        if (!cart) { res.status(404).json({ message: 'Cart not found' }); return; }

        if (qty <= 0) {
            cart.items = cart.items.filter((i) => i._id!.toString() !== cartItemId);
        } else {
            const item = cart.items.find((i) => i._id!.toString() === cartItemId);
            if (!item) { res.status(404).json({ message: 'Cart item not found' }); return; }
            item.quantity = Math.min(qty, MAX_ITEM_QTY);
        }

        await cart.save();
        const data = await buildCartResponse(req.user._id);
        res.json(data);
    } catch (err) {
        console.error('updateItem error:', err);
        res.status(500).json({ message: 'Failed to update item' });
    }
};

/** DELETE /api/cart/item/:itemId */
export const removeItem = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) { res.status(401).json({ message: 'Not authorized' }); return; }

        const { itemId } = req.params as { itemId: string };
        if (!mongoose.Types.ObjectId.isValid(itemId)) {
            res.status(400).json({ message: 'Invalid item ID' }); return;
        }

        const cart = await Cart.findOne({ userId: req.user._id });
        if (!cart) { res.status(404).json({ message: 'Cart not found' }); return; }

        cart.items = cart.items.filter((i) => i._id!.toString() !== itemId);
        await cart.save();

        const data = await buildCartResponse(req.user._id);
        res.json(data);
    } catch (err) {
        console.error('removeItem error:', err);
        res.status(500).json({ message: 'Failed to remove item' });
    }
};

/** DELETE /api/cart */
export const clearCart = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) { res.status(401).json({ message: 'Not authorized' }); return; }
        await Cart.deleteOne({ userId: req.user._id });
        res.json({ items: [], subtotal: 0, discount: null, total: 0, itemCount: 0, appliedCoupon: null });
    } catch (err) {
        console.error('clearCart error:', err);
        res.status(500).json({ message: 'Failed to clear cart' });
    }
};

/** POST /api/cart/apply-coupon */
export const applyCoupon = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) { res.status(401).json({ message: 'Not authorized' }); return; }

        const { code } = req.body;
        if (!code || typeof code !== 'string' || code.trim().length === 0) {
            res.status(400).json({ message: 'Coupon code is required' }); return;
        }

        const cart = await Cart.findOne({ userId: req.user._id });
        if (!cart || cart.items.length === 0) {
            res.status(400).json({ message: 'Cart is empty' }); return;
        }

        // Calculate current subtotal to validate min order
        const menuItemIds = cart.items.map((i) => i.menuItemId);
        const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } });
        const menuMap = new Map(menuItems.map((m) => [m._id.toString(), m]));

        let subtotal = 0;
        for (const cartItem of cart.items) {
            const menu = menuMap.get(cartItem.menuItemId.toString());
            if (!menu) continue;
            let unitPrice = menu.price;
            for (const cust of cartItem.selectedCustomizations) {
                for (const group of menu.customizations ?? []) {
                    if (group.name === cust.groupName) {
                        const opt = group.options?.find((o: any) => o.name === cust.optionName);
                        if (opt) { unitPrice += opt.price; break; }
                    }
                }
            }
            subtotal += unitPrice * cartItem.quantity;
        }

        const result = await validateCoupon(code.trim().toUpperCase(), subtotal);
        if (!result.valid) {
            res.status(400).json({ message: (result as any).reason }); return;
        }

        cart.appliedCoupon = code.trim().toUpperCase();
        await cart.save();

        const data = await buildCartResponse(req.user._id);
        res.json(data);
    } catch (err) {
        console.error('applyCoupon error:', err);
        res.status(500).json({ message: 'Failed to apply coupon' });
    }
};

/** GET /api/cart/available-coupons */
export const getAvailableCoupons = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) { res.status(401).json({ message: 'Not authorized' }); return; }

        const now = new Date();
        const offers = await Offer.find({
            isActive: true,
            validFrom: { $lte: now },
            validTill: { $gte: now },
            code: { $exists: true, $ne: '' },
        }).select('code title description discountType discountValue minOrderAmount maxDiscount').lean();

        // Get current subtotal to determine eligibility
        const cartData = await buildCartResponse(req.user._id);
        const subtotal = cartData.subtotal;

        const coupons = offers.map((o) => {
            const eligible = subtotal >= o.minOrderAmount;
            let savings = 0;
            if (eligible && subtotal > 0) {
                if (o.discountType === 'PERCENTAGE') {
                    savings = Math.round((subtotal * o.discountValue / 100) * 100) / 100;
                    if (o.maxDiscount && savings > o.maxDiscount) savings = o.maxDiscount;
                } else {
                    savings = o.discountValue;
                }
                savings = Math.min(savings, subtotal);
            }
            return {
                code: o.code,
                title: o.title,
                description: o.description ?? '',
                discountType: o.discountType,
                discountValue: o.discountValue,
                minOrderAmount: o.minOrderAmount,
                maxDiscount: o.maxDiscount ?? null,
                eligible,
                savings: Math.round(savings),
                reason: !eligible ? `Add ₹${o.minOrderAmount - subtotal} more to unlock` : null,
            };
        });

        res.json({ coupons, subtotal });
    } catch (err) {
        console.error('getAvailableCoupons error:', err);
        res.status(500).json({ message: 'Failed to fetch coupons' });
    }
};

/** DELETE /api/cart/coupon */
export const removeCoupon = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) { res.status(401).json({ message: 'Not authorized' }); return; }

        const cart = await Cart.findOne({ userId: req.user._id });
        if (cart) {
            cart.appliedCoupon = null;
            await cart.save();
        }

        const data = await buildCartResponse(req.user._id);
        res.json(data);
    } catch (err) {
        console.error('removeCoupon error:', err);
        res.status(500).json({ message: 'Failed to remove coupon' });
    }
};
