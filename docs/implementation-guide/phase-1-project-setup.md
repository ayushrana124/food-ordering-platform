# Phase 1: Project Setup & Architecture (Days 1-2)

## Overview
Set up the complete project structure, development environment, and design the database architecture for the restaurant ordering platform.

---

## 1.1 Initialize Project Structure

### Create Directory Structure
```
restaurant-ordering-platform/
├── client/                 # React frontend
│   ├── public/
│   │   ├── favicon.ico
│   │   └── manifest.json
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── customer/
│   │   │   └── admin/
│   │   ├── pages/
│   │   │   ├── customer/
│   │   │   └── admin/
│   │   ├── redux/
│   │   │   ├── slices/
│   │   │   └── store.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── utils/
│   │   ├── hooks/
│   │   ├── assets/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── package.json
│   └── vite.config.js
├── server/                 # Node.js backend
│   ├── config/
│   │   ├── db.js
│   │   └── config.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── orderController.js
│   │   ├── menuController.js
│   │   ├── paymentController.js
│   │   └── adminController.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Restaurant.js
│   │   ├── MenuItem.js
│   │   ├── Order.js
│   │   ├── Admin.js
│   │   └── Offer.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── menuRoutes.js
│   │   ├── paymentRoutes.js
│   │   └── adminRoutes.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── adminAuth.js
│   │   ├── errorHandler.js
│   │   └── rateLimiter.js
│   ├── utils/
│   │   ├── distanceCalculator.js
│   │   ├── deliveryCharges.js
│   │   └── validators.js
│   ├── services/
│   │   ├── smsService.js
│   │   ├── geocodingService.js
│   │   └── paymentService.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── .gitignore
└── README.md
```

### Initialize Git Repository
```bash
git init
git add .
git commit -m "Initial project structure"
```

---

## 1.2 Setup Development Environment

### Backend Setup

#### Install Dependencies
```bash
cd server
npm init -y
npm install express mongoose dotenv cors bcryptjs jsonwebtoken
npm install socket.io multer cloudinary axios node-cron
npm install express-rate-limit helmet morgan
npm install --save-dev nodemon
```

#### Create `.env.example`
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/restaurant-ordering
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=7d

# SMS Service (2Factor.in or Twilio)
SMS_API_KEY=your_sms_api_key
SMS_API_URL=https://2factor.in/API/V1

# Razorpay
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Frontend URL
CLIENT_URL=http://localhost:5173
```

#### Update `package.json` Scripts
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

### Frontend Setup

#### Initialize Vite + React
```bash
npm create vite@latest client -- --template react
cd client
npm install
```

#### Install Dependencies
```bash
npm install react-router-dom @reduxjs/toolkit react-redux
npm install axios socket.io-client
npm install react-leaflet leaflet
npm install tailwindcss postcss autoprefixer
npm install react-hot-toast react-icons
npx tailwindcss init -p
```

#### Create `.env.example`
```env
VITE_API_URL=http://localhost:5000
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id
VITE_SOCKET_URL=http://localhost:5000
```

#### Configure Tailwind CSS (`tailwind.config.js`)
```javascript
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### Setup Third-Party Accounts

#### MongoDB Atlas
1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create free account
3. Create new cluster (Free tier - M0)
4. Create database user
5. Whitelist IP (0.0.0.0/0 for development)
6. Get connection string

#### Cloudinary
1. Go to [cloudinary.com](https://cloudinary.com)
2. Sign up for free account
3. Get cloud name, API key, and API secret from dashboard

#### 2Factor.in (SMS Service)
1. Go to [2factor.in](https://2factor.in)
2. Sign up and verify account
3. Get API key from dashboard
4. Add ₹100-500 credits for testing

#### Razorpay (Payment Gateway)
1. Go to [razorpay.com](https://razorpay.com)
2. Sign up for account
3. Get test API keys from dashboard
4. Enable required payment methods

---

## 1.3 Database Schema Design

### User Schema (`models/User.js`)
```javascript
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    trim: true
  },
  email: {
    type: String,
    trim: true,
    lowercase: true
  },
  addresses: [{
    label: {
      type: String,
      enum: ['Home', 'Work', 'Other'],
      default: 'Home'
    },
    addressLine: {
      type: String,
      required: true
    },
    landmark: String,
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  isBlocked: {
    type: Boolean,
    default: false
  },
  isCODBlocked: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);
```

### Restaurant Schema (`models/Restaurant.js`)
```javascript
const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: String,
  logo: String,
  banner: String,
  address: {
    addressLine: String,
    coordinates: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true }
    }
  },
  phone: String,
  email: String,
  openingHours: {
    monday: { open: String, close: String, isOpen: Boolean },
    tuesday: { open: String, close: String, isOpen: Boolean },
    wednesday: { open: String, close: String, isOpen: Boolean },
    thursday: { open: String, close: String, isOpen: Boolean },
    friday: { open: String, close: String, isOpen: Boolean },
    saturday: { open: String, close: String, isOpen: Boolean },
    sunday: { open: String, close: String, isOpen: Boolean }
  },
  isOpen: {
    type: Boolean,
    default: true
  },
  deliveryRadius: {
    type: Number,
    default: 10 // kilometers
  },
  minOrderAmount: {
    type: Number,
    default: 0
  },
  avgPreparationTime: {
    type: Number,
    default: 30 // minutes
  },
  categories: [String]
});

module.exports = mongoose.model('Restaurant', restaurantSchema);
```

### MenuItem Schema (`models/MenuItem.js`)
```javascript
const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: String,
  category: {
    type: String,
    required: true,
    index: true
  },
  price: {
    type: Number,
    required: true
  },
  image: String,
  isVeg: {
    type: Boolean,
    default: true
  },
  isAvailable: {
    type: Boolean,
    default: true
  },
  customizations: [{
    name: String,
    options: [{
      name: String,
      price: Number
    }],
    required: Boolean
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

menuItemSchema.index({ restaurantId: 1, category: 1 });

module.exports = mongoose.model('MenuItem', menuItemSchema);
```

### Order Schema (`models/Order.js`)
```javascript
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  items: [{
    menuItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem'
    },
    name: String,
    quantity: Number,
    price: Number,
    customizations: [{
      name: String,
      option: String,
      price: Number
    }]
  }],
  deliveryAddress: {
    label: String,
    addressLine: String,
    landmark: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  distance: Number, // in kilometers
  deliveryCharges: Number,
  subtotal: Number,
  taxes: Number,
  total: Number,
  paymentMethod: {
    type: String,
    enum: ['COD', 'ONLINE'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'],
    default: 'PENDING'
  },
  paymentId: String,
  razorpayOrderId: String,
  orderStatus: {
    type: String,
    enum: ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'],
    default: 'PENDING',
    index: true
  },
  preparationTime: Number, // in minutes
  estimatedDeliveryTime: Date,
  specialInstructions: String,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Generate unique order ID
orderSchema.pre('save', async function(next) {
  if (!this.orderId) {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    this.orderId = `ORD-${timestamp}-${random}`.toUpperCase();
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
```

### Admin Schema (`models/Admin.js`)
```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['OWNER', 'MANAGER'],
    default: 'MANAGER'
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Admin', adminSchema);
```

### Offer Schema (`models/Offer.js`)
```javascript
const mongoose = require('mongoose');

const offerSchema = new mongoose.Schema({
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: String,
  code: {
    type: String,
    unique: true,
    uppercase: true
  },
  discountType: {
    type: String,
    enum: ['PERCENTAGE', 'FLAT'],
    required: true
  },
  discountValue: {
    type: Number,
    required: true
  },
  minOrderAmount: {
    type: Number,
    default: 0
  },
  maxDiscount: Number, // for percentage type
  validFrom: {
    type: Date,
    required: true
  },
  validTill: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Offer', offerSchema);
```

### OTP Schema (`models/OTP.js`)
```javascript
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    index: true
  },
  otp: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300 // Auto-delete after 5 minutes
  }
});

module.exports = mongoose.model('OTP', otpSchema);
```

---

## 1.4 Create Basic Configuration Files

### Database Connection (`config/db.js`)
```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
```

### Config File (`config/config.js`)
```javascript
module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  
  // SMS
  smsApiKey: process.env.SMS_API_KEY,
  smsApiUrl: process.env.SMS_API_URL,
  
  // Razorpay
  razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET,
  
  // Cloudinary
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  
  // Business Logic
  maxDeliveryDistance: 10, // km
  otpExpiry: 5, // minutes
  maxOtpAttempts: 3,
  otpCooldown: 10 // minutes
};
```

---

## Checklist

- [ ] Create project directory structure
- [ ] Initialize Git repository
- [ ] Setup backend with Node.js and dependencies
- [ ] Setup frontend with Vite + React
- [ ] Install all required npm packages
- [ ] Create environment variable templates
- [ ] Setup MongoDB Atlas account and cluster
- [ ] Setup Cloudinary account
- [ ] Setup 2Factor.in account for SMS
- [ ] Setup Razorpay account
- [ ] Create all database schemas
- [ ] Create database connection file
- [ ] Create configuration file
- [ ] Test MongoDB connection
- [ ] Commit initial setup to Git

---

## Next Phase

Once Phase 1 is complete, proceed to [Phase 2: Backend API Development](file:///C:/Users/welcome/.gemini/antigravity/brain/5dae8491-6a0e-49f7-977b-98355a9f8dbe/phase-2-backend-api.md)
