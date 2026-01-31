# Phase 2: Backend API Development (Days 3-7)

## Overview
Build complete REST API with authentication, order management, payment integration, and admin functionality.

---

## 2.1 Authentication System

### Customer Authentication (SMS OTP)

#### OTP Controller (`controllers/authController.js`)
```javascript
const User = require('../models/User');
const OTP = require('../models/OTP');
const jwt = require('jsonwebtoken');
const smsService = require('../services/smsService');
const config = require('../config/config');

// Send OTP
exports.sendOTP = async (req, res) => {
  try {
    const { phone } = req.body;
    
    // Validate phone number
    if (!phone || !/^[6-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ message: 'Invalid phone number' });
    }
    
    // Check rate limiting
    const recentOTP = await OTP.findOne({
      phone,
      createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) }
    });
    
    if (recentOTP) {
      return res.status(429).json({ 
        message: 'Please wait before requesting another OTP' 
      });
    }
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Save OTP to database
    await OTP.create({ phone, otp });
    
    // Send OTP via SMS
    await smsService.sendOTP(phone, otp);
    
    res.status(200).json({ 
      message: 'OTP sent successfully',
      expiresIn: 300 // seconds
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { phone, otp } = req.body;
    
    // Find OTP
    const otpRecord = await OTP.findOne({ phone, otp });
    
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }
    
    // Find or create user
    let user = await User.findOne({ phone });
    
    if (!user) {
      user = await User.create({ phone, lastLogin: new Date() });
    } else {
      user.lastLogin = new Date();
      await user.save();
    }
    
    // Delete OTP
    await OTP.deleteOne({ _id: otpRecord._id });
    
    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, phone: user.phone },
      config.jwtSecret,
      { expiresIn: config.jwtExpire }
    );
    
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Refresh Token
exports.refreshToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const token = jwt.sign(
      { userId: user._id, phone: user.phone },
      config.jwtSecret,
      { expiresIn: config.jwtExpire }
    );
    
    res.status(200).json({ token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

#### Admin Authentication (`controllers/adminAuthController.js`)
```javascript
const Admin = require('../models/Admin');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Admin Login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find admin
    const admin = await Admin.findOne({ email });
    
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Check password
    const isMatch = await admin.comparePassword(password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Generate JWT
    const token = jwt.sign(
      { adminId: admin._id, role: admin.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpire }
    );
    
    res.status(200).json({
      message: 'Login successful',
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin Logout
exports.logout = async (req, res) => {
  res.status(200).json({ message: 'Logout successful' });
};
```

### Authentication Middleware (`middleware/auth.js`)
```javascript
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    const decoded = jwt.verify(token, config.jwtSecret);
    
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    if (user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized' });
  }
};
```

### Admin Auth Middleware (`middleware/adminAuth.js`)
```javascript
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const Admin = require('../models/Admin');

exports.adminProtect = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    
    const decoded = jwt.verify(token, config.jwtSecret);
    
    const admin = await Admin.findById(decoded.adminId);
    
    if (!admin) {
      return res.status(401).json({ message: 'Admin not found' });
    }
    
    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized' });
  }
};
```

### Rate Limiter Middleware (`middleware/rateLimiter.js`)
```javascript
const rateLimit = require('express-rate-limit');

exports.otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // 3 requests per window
  message: 'Too many OTP requests, please try again later'
});

exports.apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later'
});
```

### SMS Service (`services/smsService.js`)
```javascript
const axios = require('axios');
const config = require('../config/config');

exports.sendOTP = async (phone, otp) => {
  try {
    // Using 2Factor.in
    const response = await axios.get(config.smsApiUrl, {
      params: {
        api_key: config.smsApiKey,
        module: 'TRANS_SMS',
        to: phone,
        from: 'RESTRO',
        msg: `Your OTP for restaurant login is ${otp}. Valid for 5 minutes.`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('SMS Error:', error);
    throw new Error('Failed to send OTP');
  }
};
```

---

## 2.2 User Management APIs

### User Controller (`controllers/userController.js`)
```javascript
const User = require('../models/User');
const geocodingService = require('../services/geocodingService');

// Get user profile
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-__v');
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, email },
      { new: true, runValidators: true }
    );
    
    res.status(200).json({ message: 'Profile updated', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add address
exports.addAddress = async (req, res) => {
  try {
    const { label, addressLine, landmark, coordinates } = req.body;
    
    const user = await User.findById(req.user._id);
    
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
    
    res.status(201).json({ 
      message: 'Address added', 
      address: user.addresses[user.addresses.length - 1] 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update address
exports.updateAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    const { label, addressLine, landmark, coordinates, isDefault } = req.body;
    
    const user = await User.findById(req.user._id);
    const address = user.addresses.id(addressId);
    
    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }
    
    // If setting as default, unset other defaults
    if (isDefault) {
      user.addresses.forEach(addr => {
        addr.isDefault = false;
      });
    }
    
    address.label = label || address.label;
    address.addressLine = addressLine || address.addressLine;
    address.landmark = landmark || address.landmark;
    address.coordinates = coordinates || address.coordinates;
    address.isDefault = isDefault !== undefined ? isDefault : address.isDefault;
    
    await user.save();
    
    res.status(200).json({ message: 'Address updated', address });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete address
exports.deleteAddress = async (req, res) => {
  try {
    const { addressId } = req.params;
    
    const user = await User.findById(req.user._id);
    user.addresses.id(addressId).remove();
    
    await user.save();
    
    res.status(200).json({ message: 'Address deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get order history
exports.getOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const query = { userId: req.user._id };
    if (status) query.orderStatus = status;
    
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('restaurantId', 'name logo');
    
    const count = await Order.countDocuments(query);
    
    res.status(200).json({
      orders,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

---

## 2.3 Restaurant & Menu APIs

### Menu Controller (`controllers/menuController.js`)
```javascript
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const Offer = require('../models/Offer');

// Get restaurant info
exports.getRestaurantInfo = async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne();
    res.status(200).json({ restaurant });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all menu items
exports.getMenuItems = async (req, res) => {
  try {
    const { category, isVeg, search, minPrice, maxPrice } = req.query;
    
    const query = { isAvailable: true };
    
    if (category) query.category = category;
    if (isVeg !== undefined) query.isVeg = isVeg === 'true';
    if (search) query.name = { $regex: search, $options: 'i' };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    
    const menuItems = await MenuItem.find(query).sort({ category: 1, name: 1 });
    
    res.status(200).json({ menuItems });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single menu item
exports.getMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    
    res.status(200).json({ menuItem });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get active offers
exports.getOffers = async (req, res) => {
  try {
    const now = new Date();
    
    const offers = await Offer.find({
      isActive: true,
      validFrom: { $lte: now },
      validTill: { $gte: now }
    }).sort({ createdAt: -1 });
    
    res.status(200).json({ offers });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

---

## 2.4 Order Management APIs

### Order Controller (`controllers/orderController.js`)
```javascript
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const { calculateDistance } = require('../utils/distanceCalculator');
const { calculateDeliveryCharges } = require('../utils/deliveryCharges');

// Create order
exports.createOrder = async (req, res) => {
  try {
    const { items, deliveryAddress, paymentMethod, specialInstructions } = req.body;
    
    // Check if user is blocked
    if (req.user.isBlocked) {
      return res.status(403).json({ message: 'Your account has been blocked' });
    }
    
    // Check if COD is blocked for this user
    if (paymentMethod === 'COD' && req.user.isCODBlocked) {
      return res.status(403).json({ message: 'COD is not available for your account' });
    }
    
    // Get restaurant
    const restaurant = await Restaurant.findOne();
    
    if (!restaurant.isOpen) {
      return res.status(400).json({ message: 'Restaurant is currently closed' });
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
      return res.status(400).json({ 
        message: `Delivery not available. Maximum delivery distance is ${restaurant.deliveryRadius}km` 
      });
    }
    
    // Calculate delivery charges
    const deliveryCharges = calculateDeliveryCharges(distance);
    
    // Validate and calculate order total
    let subtotal = 0;
    const orderItems = [];
    
    for (const item of items) {
      const menuItem = await MenuItem.findById(item.menuItemId);
      
      if (!menuItem || !menuItem.isAvailable) {
        return res.status(400).json({ 
          message: `Item ${item.name} is not available` 
        });
      }
      
      let itemPrice = menuItem.price;
      
      // Add customization prices
      if (item.customizations) {
        item.customizations.forEach(custom => {
          itemPrice += custom.price || 0;
        });
      }
      
      const itemTotal = itemPrice * item.quantity;
      subtotal += itemTotal;
      
      orderItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        quantity: item.quantity,
        price: itemPrice,
        customizations: item.customizations || []
      });
    }
    
    // Calculate taxes (5% GST)
    const taxes = subtotal * 0.05;
    const total = subtotal + deliveryCharges + taxes;
    
    // Check minimum order amount
    if (subtotal < restaurant.minOrderAmount) {
      return res.status(400).json({ 
        message: `Minimum order amount is ₹${restaurant.minOrderAmount}` 
      });
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
    
    res.status(201).json({ 
      message: 'Order created successfully', 
      order 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get order details
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('restaurantId', 'name logo phone');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check if order belongs to user
    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    res.status(200).json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    // Check if order belongs to user
    if (order.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    // Can only cancel pending orders
    if (order.orderStatus !== 'PENDING') {
      return res.status(400).json({ message: 'Cannot cancel this order' });
    }
    
    order.orderStatus = 'CANCELLED';
    await order.save();
    
    res.status(200).json({ message: 'Order cancelled', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

### Utility: Distance Calculator (`utils/distanceCalculator.js`)
```javascript
// Haversine formula to calculate distance between two coordinates
exports.calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
};

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}
```

### Utility: Delivery Charges (`utils/deliveryCharges.js`)
```javascript
exports.calculateDeliveryCharges = (distance) => {
  if (distance <= 2) return 20;
  if (distance <= 5) return 40;
  if (distance <= 10) return 60;
  return null; // Beyond delivery range
};
```

---

## 2.5 Payment Integration

### Payment Controller (`controllers/paymentController.js`)
```javascript
const Razorpay = require('razorpay');
const crypto = require('crypto');
const Order = require('../models/Order');
const config = require('../config/config');

const razorpay = new Razorpay({
  key_id: config.razorpayKeyId,
  key_secret: config.razorpayKeySecret
});

// Create Razorpay order
exports.createPaymentOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const options = {
      amount: order.total * 100, // amount in paise
      currency: 'INR',
      receipt: order.orderId
    };
    
    const razorpayOrder = await razorpay.orders.create(options);
    
    order.razorpayOrderId = razorpayOrder.id;
    await order.save();
    
    res.status(200).json({ 
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Verify payment
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;
    
    const sign = razorpayOrderId + '|' + razorpayPaymentId;
    const expectedSign = crypto
      .createHmac('sha256', config.razorpayKeySecret)
      .update(sign.toString())
      .digest('hex');
    
    if (razorpaySignature === expectedSign) {
      const order = await Order.findById(orderId);
      order.paymentStatus = 'PAID';
      order.paymentId = razorpayPaymentId;
      await order.save();
      
      res.status(200).json({ message: 'Payment verified successfully' });
    } else {
      res.status(400).json({ message: 'Invalid signature' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

---

## 2.6 Admin APIs

### Admin Controller (`controllers/adminController.js`)
```javascript
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Offer = require('../models/Offer');
const cloudinary = require('../config/cloudinary');

// Get all orders
exports.getOrders = async (req, res) => {
  try {
    const { status, paymentMethod, startDate, endDate, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (status) query.orderStatus = status;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('userId', 'name phone');
    
    const count = await Order.countDocuments(query);
    
    res.status(200).json({
      orders,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Accept order
exports.acceptOrder = async (req, res) => {
  try {
    const { preparationTime } = req.body;
    
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    order.orderStatus = 'ACCEPTED';
    order.preparationTime = preparationTime;
    order.estimatedDeliveryTime = new Date(Date.now() + preparationTime * 60000);
    await order.save();
    
    // Emit socket event to customer
    req.io.to(order.userId.toString()).emit('orderStatusUpdate', {
      orderId: order._id,
      status: 'ACCEPTED',
      estimatedDeliveryTime: order.estimatedDeliveryTime
    });
    
    res.status(200).json({ message: 'Order accepted', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    order.orderStatus = status;
    order.updatedAt = new Date();
    await order.save();
    
    // Emit socket event
    req.io.to(order.userId.toString()).emit('orderStatusUpdate', {
      orderId: order._id,
      status
    });
    
    res.status(200).json({ message: 'Order status updated', order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get order statistics
exports.getOrderStats = async (req, res) => {
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
    res.status(500).json({ message: error.message });
  }
};

// Add menu item
exports.addMenuItem = async (req, res) => {
  try {
    const { name, description, category, price, isVeg, customizations } = req.body;
    
    let imageUrl = null;
    if (req.file) {
      const result = await cloudinary.uploader.upload(req.file.path);
      imageUrl = result.secure_url;
    }
    
    const menuItem = await MenuItem.create({
      restaurantId: req.admin.restaurantId,
      name,
      description,
      category,
      price,
      image: imageUrl,
      isVeg,
      customizations
    });
    
    res.status(201).json({ message: 'Menu item added', menuItem });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update menu item
exports.updateMenuItem = async (req, res) => {
  try {
    const menuItem = await MenuItem.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({ message: 'Menu item updated', menuItem });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete menu item
exports.deleteMenuItem = async (req, res) => {
  try {
    await MenuItem.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Menu item deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Toggle menu item availability
exports.toggleAvailability = async (req, res) => {
  try {
    const menuItem = await MenuItem.findById(req.params.id);
    menuItem.isAvailable = !menuItem.isAvailable;
    await menuItem.save();
    
    res.status(200).json({ message: 'Availability updated', menuItem });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all users
exports.getUsers = async (req, res) => {
  try {
    const { search, isBlocked, page = 1, limit = 20 } = req.query;
    
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }
    if (isBlocked !== undefined) query.isBlocked = isBlocked === 'true';
    
    const users = await User.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    res.status(200).json({ users });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Block/Unblock user
exports.toggleUserBlock = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    user.isBlocked = !user.isBlocked;
    await user.save();
    
    res.status(200).json({ 
      message: user.isBlocked ? 'User blocked' : 'User unblocked', 
      user 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Block/Unblock COD
exports.toggleCODBlock = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    user.isCODBlocked = !user.isCODBlocked;
    await user.save();
    
    res.status(200).json({ 
      message: user.isCODBlocked ? 'COD blocked' : 'COD unblocked', 
      user 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update restaurant info
exports.updateRestaurant = async (req, res) => {
  try {
    const restaurant = await Restaurant.findOneAndUpdate({}, req.body, { new: true });
    res.status(200).json({ message: 'Restaurant updated', restaurant });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Create offer
exports.createOffer = async (req, res) => {
  try {
    const offer = await Offer.create({
      ...req.body,
      restaurantId: req.admin.restaurantId
    });
    res.status(201).json({ message: 'Offer created', offer });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

---

## 2.7 Routes Setup

### Auth Routes (`routes/authRoutes.js`)
```javascript
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { otpLimiter } = require('../middleware/rateLimiter');
const { protect } = require('../middleware/auth');

router.post('/send-otp', otpLimiter, authController.sendOTP);
router.post('/verify-otp', authController.verifyOTP);
router.post('/refresh-token', protect, authController.refreshToken);

module.exports = router;
```

### User Routes (`routes/userRoutes.js`)
```javascript
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/profile', userController.getProfile);
router.put('/profile', userController.updateProfile);
router.post('/address', userController.addAddress);
router.put('/address/:addressId', userController.updateAddress);
router.delete('/address/:addressId', userController.deleteAddress);
router.get('/orders', userController.getOrders);

module.exports = router;
```

### Order Routes (`routes/orderRoutes.js`)
```javascript
const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', orderController.createOrder);
router.get('/:id', orderController.getOrder);
router.put('/:id/cancel', orderController.cancelOrder);

module.exports = router;
```

### Admin Routes (`routes/adminRoutes.js`)
```javascript
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const adminAuthController = require('../controllers/adminAuthController');
const { adminProtect } = require('../middleware/adminAuth');
const multer = require('multer');

const upload = multer({ dest: 'uploads/' });

router.post('/login', adminAuthController.login);
router.post('/logout', adminProtect, adminAuthController.logout);

router.use(adminProtect);

// Orders
router.get('/orders', adminController.getOrders);
router.put('/orders/:id/accept', adminController.acceptOrder);
router.put('/orders/:id/status', adminController.updateOrderStatus);
router.get('/orders/stats', adminController.getOrderStats);

// Menu
router.post('/menu', upload.single('image'), adminController.addMenuItem);
router.put('/menu/:id', adminController.updateMenuItem);
router.delete('/menu/:id', adminController.deleteMenuItem);
router.put('/menu/:id/availability', adminController.toggleAvailability);

// Users
router.get('/users', adminController.getUsers);
router.put('/users/:id/block', adminController.toggleUserBlock);
router.put('/users/:id/block-cod', adminController.toggleCODBlock);

// Restaurant
router.put('/restaurant', adminController.updateRestaurant);

// Offers
router.post('/offers', adminController.createOffer);

module.exports = router;
```

---

## 2.8 Main Server File (`server.js`)
```javascript
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketio = require('socket.io');
const connectDB = require('./config/db');
const config = require('./config/config');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: { origin: config.clientUrl }
});

// Connect to database
connectDB();

// Middleware
app.use(helmet());
app.use(cors({ origin: config.clientUrl }));
app.use(express.json());
app.use(morgan('dev'));

// Make io accessible to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/menu', require('./routes/menuRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Socket.io
io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('join', (userId) => {
    socket.join(userId);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = config.port;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

---

## Checklist

- [ ] Create authentication controllers (customer & admin)
- [ ] Implement SMS OTP service
- [ ] Create authentication middleware
- [ ] Create rate limiter middleware
- [ ] Create user management controller
- [ ] Create menu controller
- [ ] Create order controller with distance validation
- [ ] Implement distance calculator utility
- [ ] Implement delivery charges calculator
- [ ] Create payment controller with Razorpay
- [ ] Create admin controller (orders, menu, users, settings)
- [ ] Setup all routes
- [ ] Create main server file with Socket.io
- [ ] Test all API endpoints with Postman
- [ ] Verify OTP flow works
- [ ] Test payment integration in sandbox mode

---

## Next Phase

Proceed to [Phase 3: Customer Frontend](file:///C:/Users/welcome/.gemini/antigravity/brain/5dae8491-6a0e-49f7-977b-98355a9f8dbe/phase-3-customer-frontend.md)
