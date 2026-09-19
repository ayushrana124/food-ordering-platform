import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Cart from '../models/Cart';
import MenuItem from '../models/MenuItem';
import Order from '../models/Order';
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
    const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } }).lean();
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
    const offer = await Offer.findOne({ code: code.toUpperCase(), isActive: true }).lean();
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

export interface CartLineInput {
    menuItemId?: unknown;
    quantity?: unknown;
    selectedCustomizations?: unknown;
}

export interface ResolvedCartLine {
    menuItemId: mongoose.Types.ObjectId;
    quantity: number;
    selectedCustomizations: { groupName: string; optionName: string }[];
}

/**
 * Validate one incoming cart line against the live menu.
 *
 * Shared by add-to-cart, guest-cart merge and reorder so all three enforce the
 * same rules: the item must exist and be available, every customization must
 * still be offered, and required option groups must be chosen. Returns a reason
 * instead of throwing, because merge and reorder need to skip bad lines rather
 * than fail the whole request.
 */
export async function resolveCartLine(input: CartLineInput): Promise<{ line: ResolvedCartLine } | { reason: string; name?: string }> {
    const { menuItemId, quantity = 1, selectedCustomizations = [] } = input;

    if (!menuItemId || typeof menuItemId !== 'string' || !mongoose.Types.ObjectId.isValid(menuItemId)) {
        return { reason: 'Invalid menu item ID' };
    }

    const parsedQty = Math.floor(Number(quantity));
    if (!Number.isFinite(parsedQty)) return { reason: 'Invalid quantity' };
    const qty = Math.min(Math.max(1, parsedQty), MAX_ITEM_QTY);

    if (!Array.isArray(selectedCustomizations) || selectedCustomizations.some(
        (c: any) => typeof c?.groupName !== 'string' || typeof c?.optionName !== 'string'
    )) {
        return { reason: 'Invalid customizations format' };
    }

    const menuItem = await MenuItem.findById(menuItemId).lean();
    if (!menuItem) return { reason: 'Menu item not found' };
    if (!menuItem.isAvailable) return { reason: 'unavailable', name: menuItem.name };

    const cleanCustomizations: { groupName: string; optionName: string }[] = [];
    for (const cust of selectedCustomizations as { groupName: string; optionName: string }[]) {
        let found = false;
        for (const group of menuItem.customizations ?? []) {
            if (group.name === cust.groupName) {
                const opt = group.options?.find((o: any) => o.name === cust.optionName);
                if (opt) { found = true; break; }
            }
        }
        if (!found) {
            return { reason: `Invalid customization: ${cust.groupName} → ${cust.optionName}`, name: menuItem.name };
        }
        cleanCustomizations.push({ groupName: cust.groupName, optionName: cust.optionName });
    }

    for (const group of menuItem.customizations ?? []) {
        if (group.required && !cleanCustomizations.some((c) => c.groupName === group.name)) {
            return { reason: `Required customization "${group.name}" not selected`, name: menuItem.name };
        }
    }

    return {
        line: {
            menuItemId: new mongoose.Types.ObjectId(menuItemId),
            quantity: qty,
            selectedCustomizations: cleanCustomizations,
        },
    };
}

/** Stable key for "same item, same options" deduplication. */
const customizationKey = (c: { groupName: string; optionName: string }[]): string =>
    JSON.stringify(
        c.slice().sort((a, b) => a.groupName.localeCompare(b.groupName) || a.optionName.localeCompare(b.optionName))
    );

/** Add a resolved line into a cart document, merging with an identical existing line. */
function pushLine(cart: any, line: ResolvedCartLine): boolean {
    const totalQty = cart.items.reduce((s: number, i: any) => s + i.quantity, 0);
    if (totalQty >= MAX_ITEMS) return false;

    const key = customizationKey(line.selectedCustomizations);
    const existing = cart.items.find(
        (i: any) => i.menuItemId.toString() === line.menuItemId.toString() &&
            customizationKey(i.selectedCustomizations) === key
    );

    const room = MAX_ITEMS - totalQty;
    const qty = Math.min(line.quantity, room);

    if (existing) {
        existing.quantity = Math.min(existing.quantity + qty, MAX_ITEM_QTY);
    } else {
        cart.items.push({ ...line, quantity: qty });
    }
    return true;
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

        // Same validation the guest-cart merge and reorder paths use.
        const resolved = await resolveCartLine(req.body);
        if ('reason' in resolved) {
            const message = resolved.reason === 'unavailable'
                ? `"${resolved.name}" is currently unavailable`
                : resolved.reason;
            res.status(resolved.reason === 'Menu item not found' ? 404 : 400).json({ message });
            return;
        }

        let cart = await Cart.findOne({ userId: req.user._id });
        if (!cart) {
            cart = new Cart({ userId: req.user._id, items: [] });
        }

        if (!pushLine(cart, resolved.line)) {
            res.status(400).json({ message: `Cart cannot exceed ${MAX_ITEMS} items` }); return;
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
        const menuItems = await MenuItem.find({ _id: { $in: menuItemIds } }).lean();
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

/**
 * POST /api/cart/merge
 *
 * Guests build a cart in their browser before signing in. On login the client
 * posts those lines here and they are folded into the account's server cart.
 *
 * Lines that are no longer valid (item withdrawn, option removed, went out of
 * stock while they browsed) are skipped and reported rather than failing the
 * whole merge — losing the entire cart at the login step would be worse than
 * losing one line.
 */
export const mergeCart = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) { res.status(401).json({ message: 'Not authorized' }); return; }

        const { items } = req.body;
        if (!Array.isArray(items)) {
            res.status(400).json({ message: 'items must be an array' }); return;
        }
        if (items.length > MAX_ITEMS) {
            res.status(400).json({ message: `Cannot merge more than ${MAX_ITEMS} lines` }); return;
        }

        let cart = await Cart.findOne({ userId: req.user._id });
        if (!cart) cart = new Cart({ userId: req.user._id, items: [] });

        const skipped: string[] = [];

        for (const raw of items) {
            const result = await resolveCartLine(raw);
            if ('reason' in result) {
                if (result.name) skipped.push(result.name);
                continue;
            }
            if (!pushLine(cart, result.line)) break; // cart is full
        }

        await cart.save();
        const data = await buildCartResponse(req.user._id);
        res.json({ ...data, skipped });
    } catch (err) {
        console.error('mergeCart error:', err);
        res.status(500).json({ message: 'Failed to merge cart' });
    }
};

/**
 * POST /api/cart/reorder
 *
 * Refills the cart from one of the customer's own past orders. Prices and
 * availability are re-resolved from the live menu, never copied from the old
 * order — yesterday's price must not carry into today's basket.
 */
export const reorderIntoCart = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) { res.status(401).json({ message: 'Not authorized' }); return; }

        const { orderId, replace = true } = req.body;
        if (!orderId || typeof orderId !== 'string' || !mongoose.Types.ObjectId.isValid(orderId)) {
            res.status(400).json({ message: 'Valid order ID is required' }); return;
        }

        const order = await Order.findById(orderId).lean();
        if (!order) { res.status(404).json({ message: 'Order not found' }); return; }

        if (order.userId.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Not authorized to reorder this order' }); return;
        }

        let cart = await Cart.findOne({ userId: req.user._id });
        if (!cart) cart = new Cart({ userId: req.user._id, items: [] });
        if (replace) { cart.items.splice(0, cart.items.length); cart.appliedCoupon = null; }

        const skipped: string[] = [];
        let added = 0;

        for (const item of order.items) {
            // Past orders store the chosen option names flat; the cart needs them
            // grouped, so map each one back to the group it belongs to today.
            const menuItem = await MenuItem.findById(item.menuItemId).lean();
            if (!menuItem) { skipped.push(item.name); continue; }

            const selectedCustomizations: { groupName: string; optionName: string }[] = [];
            for (const chosen of item.customizations ?? []) {
                const optionName = (chosen as { name?: string }).name;
                if (!optionName) continue;
                const group = (menuItem.customizations ?? []).find(
                    (g: any) => g.options?.some((o: any) => o.name === optionName)
                );
                if (group) selectedCustomizations.push({ groupName: group.name, optionName });
            }

            const result = await resolveCartLine({
                menuItemId: item.menuItemId.toString(),
                quantity: item.quantity,
                selectedCustomizations,
            });

            if ('reason' in result) { skipped.push(result.name ?? item.name); continue; }
            if (!pushLine(cart, result.line)) break;
            added++;
        }

        if (added === 0) {
            res.status(400).json({ message: 'None of the items from that order are available right now', skipped });
            return;
        }

        await cart.save();
        const data = await buildCartResponse(req.user._id);
        res.json({ ...data, skipped });
    } catch (err) {
        console.error('reorderIntoCart error:', err);
        res.status(500).json({ message: 'Failed to reorder' });
    }
};
