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

        // Create Razorpay order
        const options = {
            amount: Math.round(order.total * 100), // amount in paise
            currency: 'INR',
            receipt: order.orderId
        };

        const razorpayOrder = await getRazorpay().orders.create(options);

        // Save Razorpay order ID
        order.razorpayOrderId = razorpayOrder.id;
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

// Verify payment
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
            res.status(400).json({ message: 'Invalid payment signature' });
            return;
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

        order.paymentStatus = 'PAID';
        order.paymentId = razorpayPaymentId;
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
