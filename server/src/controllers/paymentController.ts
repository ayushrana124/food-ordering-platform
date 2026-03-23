import { Request, Response } from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Order from '../models/Order';
import config from '../config/config';

// Lazily create Razorpay instance — avoids crash at startup when keys are placeholders
let _razorpay: Razorpay | null = null;

function getRazorpay(): Razorpay {
    if (!_razorpay) {
        const keyId = config.razorpayKeyId;
        const keySecret = config.razorpayKeySecret;
        if (!keyId || keyId === 'your_razorpay_key_id' || !keySecret || keySecret === 'your_razorpay_key_secret') {
            throw new Error('Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env');
        }
        _razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
    }
    return _razorpay;
}

// Create Razorpay order
export const createPaymentOrder = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }

        const { orderId } = req.body;

        if (!orderId) {
            res.status(400).json({ message: 'Order ID is required' });
            return;
        }

        const order = await Order.findById(orderId);

        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        // Verify order belongs to user
        if (order.userId.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Not authorized' });
            return;
        }

        // Idempotency: if already paid, return error
        if (order.paymentStatus === 'PAID') {
            res.status(400).json({ message: 'Order is already paid' });
            return;
        }

        // ── Dummy payment bypass ──────────────────────────────────────────
        if (config.useDummyPayment) {
            const fakeOrderId = `dummy_order_${Date.now()}`;
            order.razorpayOrderId = fakeOrderId;
            order.updatedAt = new Date();
            await order.save();
            console.log(`[DUMMY PAYMENT] Created fake order ${fakeOrderId} for order ${order.orderId}`);
            res.status(200).json({
                razorpayOrderId: fakeOrderId,
                amount: Math.round(order.total * 100),
                currency: 'INR',
                key: 'dummy_key',
            });
            return;
        }

        // If order already has a valid razorpayOrderId created recently (< 15 min), reuse it
        if (order.razorpayOrderId && order.createdAt) {
            const ageMinutes = (Date.now() - new Date(order.updatedAt).getTime()) / 60000;
            if (ageMinutes < 15) {
                res.status(200).json({
                    razorpayOrderId: order.razorpayOrderId,
                    amount: Math.round(order.total * 100),
                    currency: 'INR',
                    key: config.razorpayKeyId
                });
                return;
            }
        }

        // Create Razorpay order
        const options = {
            amount: Math.round(order.total * 100), // amount in paise
            currency: 'INR',
            receipt: order.orderId
        };

        const razorpayOrder = await getRazorpay().orders.create(options);

        // Save Razorpay order ID
        order.razorpayOrderId = razorpayOrder.id;
        order.updatedAt = new Date();
        await order.save();

        res.status(200).json({
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            key: config.razorpayKeyId
        });
    } catch (error) {
        console.error('Create Payment Order Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Verify payment (client-side verification)
export const verifyPayment = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }

        const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !orderId) {
            res.status(400).json({ message: 'Missing payment verification details' });
            return;
        }

        // Verify signature
        const sign = razorpayOrderId + '|' + razorpayPaymentId;
        const expectedSign = crypto
            .createHmac('sha256', config.razorpayKeySecret)
            .update(sign.toString())
            .digest('hex');

        if (razorpaySignature !== expectedSign) {
            // In dummy mode, skip signature check
            if (!config.useDummyPayment) {
                res.status(400).json({ message: 'Invalid payment signature' });
                return;
            }
        }

        // Update order payment status
        const order = await Order.findById(orderId);

        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        // Verify order belongs to user
        if (order.userId.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Not authorized' });
            return;
        }

        // Idempotency: if already paid, return success without re-processing
        if (order.paymentStatus === 'PAID') {
            res.status(200).json({ message: 'Payment already verified', order });
            return;
        }

        // Verify payment amount matches order total via Razorpay API
        if (!config.useDummyPayment) {
            try {
                const rzpPayment = await getRazorpay().payments.fetch(razorpayPaymentId);
                const expectedAmountPaise = Math.round(order.total * 100);
                if (Number(rzpPayment.amount) !== expectedAmountPaise) {
                    console.error(`Payment amount mismatch: expected ${expectedAmountPaise}, got ${rzpPayment.amount}`);
                    res.status(400).json({ message: 'Payment amount does not match order total' });
                    return;
                }
            } catch (fetchErr) {
                console.error('Failed to fetch Razorpay payment for amount verification:', fetchErr);
                // Continue — signature verification already passed, amount check is belt-and-suspenders
            }
        } else {
            console.log(`[DUMMY PAYMENT] Skipping Razorpay amount verification for order ${order.orderId}`);
        }

        order.paymentStatus = 'PAID';
        order.paymentId = razorpayPaymentId;
        order.updatedAt = new Date();
        await order.save();

        // Emit Socket.io event to admin
        req.io.to('admin-room').emit('paymentReceived', {
            orderId: order._id,
            orderNumber: order.orderId,
            amount: order.total
        });

        res.status(200).json({
            message: 'Payment verified successfully',
            order
        });
    } catch (error) {
        console.error('Verify Payment Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Razorpay Webhook handler (server-to-server, no auth middleware)
export const handleWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
        const webhookSecret = config.razorpayWebhookSecret;
        if (!webhookSecret) {
            console.error('RAZORPAY_WEBHOOK_SECRET not configured');
            res.status(500).json({ message: 'Webhook not configured' });
            return;
        }

        // Verify webhook signature
        const signature = req.headers['x-razorpay-signature'] as string;
        if (!signature) {
            res.status(400).json({ message: 'Missing webhook signature' });
            return;
        }

        const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
        const expectedSignature = crypto
            .createHmac('sha256', webhookSecret)
            .update(body)
            .digest('hex');

        if (signature !== expectedSignature) {
            res.status(400).json({ message: 'Invalid webhook signature' });
            return;
        }

        const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const eventType = event.event;

        if (eventType === 'payment.captured') {
            const payment = event.payload?.payment?.entity;
            if (!payment) { res.status(200).json({ status: 'ok' }); return; }

            const razorpayOrderId = payment.order_id;
            const order = await Order.findOne({ razorpayOrderId });

            if (!order) {
                console.warn(`Webhook: No order found for razorpayOrderId ${razorpayOrderId}`);
                res.status(200).json({ status: 'ok' });
                return;
            }

            // Idempotency: skip if already PAID
            if (order.paymentStatus === 'PAID') {
                res.status(200).json({ status: 'ok' });
                return;
            }

            // Verify amount
            const expectedPaise = Math.round(order.total * 100);
            if (Number(payment.amount) !== expectedPaise) {
                console.error(`Webhook amount mismatch: expected ${expectedPaise}, got ${payment.amount} for order ${order.orderId}`);
                res.status(200).json({ status: 'ok' });
                return;
            }

            order.paymentStatus = 'PAID';
            order.paymentId = payment.id;
            order.updatedAt = new Date();
            await order.save();

            // Notify admin and user via socket
            req.io.to('admin-room').emit('paymentReceived', {
                orderId: order._id,
                orderNumber: order.orderId,
                amount: order.total,
            });
            req.io.to(order.userId.toString()).emit('orderStatusUpdate', {
                orderId: order._id,
                orderNumber: order.orderId,
                status: order.orderStatus,
                paymentStatus: 'PAID',
            });
        } else if (eventType === 'payment.failed') {
            const payment = event.payload?.payment?.entity;
            if (!payment) { res.status(200).json({ status: 'ok' }); return; }

            const razorpayOrderId = payment.order_id;
            const order = await Order.findOne({ razorpayOrderId });

            if (order && order.paymentStatus !== 'PAID') {
                order.paymentStatus = 'FAILED';
                order.updatedAt = new Date();
                await order.save();

                req.io.to(order.userId.toString()).emit('orderStatusUpdate', {
                    orderId: order._id,
                    orderNumber: order.orderId,
                    status: order.orderStatus,
                    paymentStatus: 'FAILED',
                });
            }
        }

        // Always return 200 to Razorpay (prevents retries)
        res.status(200).json({ status: 'ok' });
    } catch (error) {
        console.error('Webhook Error:', error);
        // Still return 200 to prevent Razorpay from retrying on our error
        res.status(200).json({ status: 'ok' });
    }
};

// Retry payment for abandoned online orders
export const retryPayment = async (req: Request, res: Response): Promise<void> => {
    try {
        if (!req.user) {
            res.status(401).json({ message: 'Not authorized' });
            return;
        }

        const { orderId } = req.body;
        if (!orderId) {
            res.status(400).json({ message: 'Order ID is required' });
            return;
        }

        const order = await Order.findById(orderId);
        if (!order) {
            res.status(404).json({ message: 'Order not found' });
            return;
        }

        if (order.userId.toString() !== req.user._id.toString()) {
            res.status(403).json({ message: 'Not authorized' });
            return;
        }

        if (order.paymentMethod !== 'ONLINE') {
            res.status(400).json({ message: 'Only online payment orders can be retried' });
            return;
        }

        if (order.paymentStatus === 'PAID') {
            res.status(400).json({ message: 'Order is already paid' });
            return;
        }

        if (order.orderStatus === 'CANCELLED') {
            res.status(400).json({ message: 'Order has been cancelled' });
            return;
        }

        // ── Dummy payment bypass ──────────────────────────────────────────
        if (config.useDummyPayment) {
            const fakeOrderId = `dummy_retry_${Date.now()}`;
            order.razorpayOrderId = fakeOrderId;
            order.updatedAt = new Date();
            await order.save();
            console.log(`[DUMMY PAYMENT] Created fake retry order ${fakeOrderId} for order ${order.orderId}`);
            res.status(200).json({
                razorpayOrderId: fakeOrderId,
                amount: Math.round(order.total * 100),
                currency: 'INR',
                key: 'dummy_key',
            });
            return;
        }

        // Create a new Razorpay order (old one may have expired)
        const options = {
            amount: Math.round(order.total * 100),
            currency: 'INR',
            receipt: order.orderId,
        };

        const razorpayOrder = await getRazorpay().orders.create(options);

        order.razorpayOrderId = razorpayOrder.id;
        order.updatedAt = new Date();
        await order.save();

        res.status(200).json({
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            key: config.razorpayKeyId,
        });
    } catch (error) {
        console.error('Retry Payment Error:', error);
        res.status(500).json({ message: (error as Error).message });
    }
};

// Auto-cancel unpaid online orders older than 15 minutes
export const autoCancelUnpaidOrders = async (): Promise<number> => {
    const cutoff = new Date(Date.now() - 15 * 60 * 1000);
    const result = await Order.updateMany(
        {
            paymentMethod: 'ONLINE',
            paymentStatus: 'PENDING',
            orderStatus: 'PENDING',
            createdAt: { $lt: cutoff },
        },
        {
            orderStatus: 'CANCELLED',
            paymentStatus: 'FAILED',
            updatedAt: new Date(),
        }
    );
    return result.modifiedCount;
};
