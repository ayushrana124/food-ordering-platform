# Complete Restaurant Ordering Website - Implementation Plan

## Project Overview

Building a full-stack restaurant ordering platform using the MERN stack (MongoDB, Express.js, React.js, Node.js) that replaces Zomato functionality with direct customer ordering. The platform includes customer-facing ordering system with SMS-based authentication, payment gateway integration, and a comprehensive admin dashboard for restaurant management.

## Technology Stack

### Frontend
- **React.js** with Vite for fast development
- **React Router** for navigation
- **Redux Toolkit** for state management
- **Axios** for API calls
- **Socket.io-client** for real-time updates
- **Leaflet/React-Leaflet** for maps (free, open-source)
- **Tailwind CSS** for styling

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Socket.io** for real-time features
- **Multer** for file uploads
- **Node-cron** for scheduled tasks

### Third-Party Services (Free/Minimal Cost)
- **Twilio Trial** or **2Factor.in** for SMS OTP (₹0.10-0.20 per SMS)
- **Razorpay** or **Cashfree** for payment gateway (free setup, transaction fees only)
- **OpenStreetMap + Nominatim** for geocoding (free)
- **Cloudinary Free Tier** for image hosting (25GB storage, 25GB bandwidth/month)
- **MongoDB Atlas Free Tier** (512MB storage)

---

## Phase-by-Phase Implementation Plan

---

## **Phase 1: Project Setup & Architecture** (Days 1-2)

### 1.1 Initialize Project Structure
```
restaurant-ordering-platform/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── redux/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── hooks/
│   │   └── App.jsx
│   └── package.json
├── server/                 # Node.js backend
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── utils/
│   ├── services/
│   └── server.js
└── package.json
```

### 1.2 Setup Development Environment
- Initialize Git repository
- Setup ESLint and Prettier
- Configure environment variables (.env files)
- Setup MongoDB Atlas account
- Create Cloudinary account for image storage

### 1.3 Database Schema Design

#### User Schema
```javascript
{
  phone: String (unique, indexed),
  name: String,
  email: String,
  addresses: [{
    label: String,
    addressLine: String,
    landmark: String,
    coordinates: { lat: Number, lng: Number },
    isDefault: Boolean
  }],
  isBlocked: Boolean,
  isCODBlocked: Boolean,
  createdAt: Date,
  lastLogin: Date
}
```

#### Restaurant Schema
```javascript
{
  name: String,
  description: String,
  logo: String,
  banner: String,
  address: {
    addressLine: String,
    coordinates: { lat: Number, lng: Number }
  },
  phone: String,
  email: String,
  openingHours: Object,
  isOpen: Boolean,
  deliveryRadius: Number (default: 10km),
  minOrderAmount: Number,
  avgPreparationTime: Number,
  categories: [String]
}
```

#### MenuItem Schema
```javascript
{
  restaurantId: ObjectId,
  name: String,
  description: String,
  category: String,
  price: Number,
  image: String,
  isVeg: Boolean,
  isAvailable: Boolean,
  customizations: [{
    name: String,
    options: [{ name: String, price: Number }],
    required: Boolean
  }],
  createdAt: Date
}
```

#### Order Schema
```javascript
{
  orderId: String (unique),
  userId: ObjectId,
  restaurantId: ObjectId,
  items: [{
    menuItemId: ObjectId,
    name: String,
    quantity: Number,
    price: Number,
    customizations: Array
  }],
  deliveryAddress: Object,
  distance: Number,
  deliveryCharges: Number,
  subtotal: Number,
  taxes: Number,
  total: Number,
  paymentMethod: String (COD/ONLINE),
  paymentStatus: String,
  paymentId: String,
  orderStatus: String (PENDING/ACCEPTED/PREPARING/READY/DELIVERED/CANCELLED),
  preparationTime: Number (minutes),
  estimatedDeliveryTime: Date,
  specialInstructions: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### Admin Schema
```javascript
{
  email: String (unique),
  password: String (hashed),
  name: String,
  role: String (OWNER/MANAGER),
  restaurantId: ObjectId,
  createdAt: Date
}
```

#### Offer Schema
```javascript
{
  restaurantId: ObjectId,
  title: String,
  description: String,
  discountType: String (PERCENTAGE/FLAT),
  discountValue: Number,
  minOrderAmount: Number,
  maxDiscount: Number,
  validFrom: Date,
  validTill: Date,
  isActive: Boolean
}
```

---

## **Phase 2: Backend API Development** (Days 3-7)

### 2.1 Authentication System

#### Customer Authentication (SMS OTP)
- **POST /api/auth/send-otp** - Send OTP to phone number
- **POST /api/auth/verify-otp** - Verify OTP and generate JWT
- **POST /api/auth/refresh-token** - Refresh JWT token
- Implement rate limiting (max 3 OTP requests per 10 minutes)
- OTP expiry: 5 minutes
- Store OTP temporarily in MongoDB with TTL index

#### Admin Authentication
- **POST /api/admin/login** - Email/password login
- **POST /api/admin/logout** - Logout
- Password hashing with bcrypt
- JWT-based session management

### 2.2 User Management APIs
- **GET /api/users/profile** - Get user profile
- **PUT /api/users/profile** - Update profile
- **POST /api/users/address** - Add new address
- **PUT /api/users/address/:id** - Update address
- **DELETE /api/users/address/:id** - Delete address
- **GET /api/users/orders** - Get order history

### 2.3 Restaurant & Menu APIs
- **GET /api/restaurant/info** - Get restaurant details
- **GET /api/menu** - Get all menu items (with filters)
- **GET /api/menu/:id** - Get single menu item
- **GET /api/offers** - Get active offers

### 2.4 Order Management APIs
- **POST /api/orders** - Create new order
  - Validate delivery distance (max 10km)
  - Calculate delivery charges based on distance
  - Check if user is blocked or COD blocked
  - Verify menu item availability
- **GET /api/orders/:id** - Get order details
- **GET /api/orders** - Get user's orders
- **PUT /api/orders/:id/cancel** - Cancel order (only if status is PENDING)

### 2.5 Payment Integration
- **POST /api/payment/create-order** - Create Razorpay order
- **POST /api/payment/verify** - Verify payment signature
- **POST /api/payment/webhook** - Handle payment webhooks
- Support both COD and online payment

### 2.6 Admin APIs

#### Menu Management
- **POST /api/admin/menu** - Add menu item
- **PUT /api/admin/menu/:id** - Update menu item
- **DELETE /api/admin/menu/:id** - Delete menu item
- **PUT /api/admin/menu/:id/availability** - Toggle availability

#### Order Management
- **GET /api/admin/orders** - Get all orders (with filters)
- **PUT /api/admin/orders/:id/accept** - Accept order and set preparation time
- **PUT /api/admin/orders/:id/status** - Update order status
- **GET /api/admin/orders/stats** - Get order statistics

#### User Management
- **GET /api/admin/users** - Get all users
- **PUT /api/admin/users/:id/block** - Block/unblock user
- **PUT /api/admin/users/:id/block-cod** - Block/unblock COD for user

#### Restaurant Settings
- **PUT /api/admin/restaurant** - Update restaurant info
- **PUT /api/admin/restaurant/hours** - Update opening hours
- **PUT /api/admin/restaurant/toggle** - Open/close restaurant

#### Offers Management
- **POST /api/admin/offers** - Create offer
- **PUT /api/admin/offers/:id** - Update offer
- **DELETE /api/admin/offers/:id** - Delete offer

### 2.7 Utility Services

#### Distance Calculation Service
```javascript
// Calculate distance between two coordinates using Haversine formula
function calculateDistance(lat1, lng1, lat2, lng2) {
  // Returns distance in kilometers
}
```

#### Delivery Charge Calculator
```javascript
// Calculate delivery charges based on distance
function calculateDeliveryCharges(distance) {
  if (distance <= 2) return 20;
  if (distance <= 5) return 40;
  if (distance <= 10) return 60;
  return null; // Beyond delivery range
}
```

#### SMS Service (using 2Factor.in or Twilio)
```javascript
async function sendOTP(phone, otp) {
  // Send OTP via SMS
}
```

#### Geocoding Service (using Nominatim)
```javascript
async function getCoordinatesFromAddress(address) {
  // Convert address to lat/lng
}
```

---

## **Phase 3: Frontend - Customer Website** (Days 8-14)

### 3.1 Landing Page (Public)
**Route: /**

#### Components:
- **Navbar**
  - Restaurant logo and name
  - Navigation: Home, Menu, Offers, Contact
  - Cart icon with item count
  - Login button (if not logged in) / User profile (if logged in)

- **Hero Section**
  - Restaurant banner image
  - Welcome message
  - CTA: "Order Now" button

- **Menu Preview**
  - Category tabs (Starters, Main Course, Desserts, Beverages, etc.)
  - Grid of menu items with images
  - Each item shows: name, description, price, veg/non-veg indicator
  - "Add to Cart" button

- **Offers Section**
  - Carousel of active offers
  - Offer cards with discount details

- **About Section**
  - Restaurant story
  - Opening hours
  - Contact information

- **Footer**
  - Social media links
  - Terms & conditions
  - Privacy policy

### 3.2 Authentication Flow

#### Login Modal (Triggered on "Add to Cart")
- Phone number input with country code
- "Send OTP" button
- OTP input field (appears after OTP sent)
- Auto-focus on OTP input
- Resend OTP option (after 30 seconds)
- "Verify & Continue" button

#### Post-Login Flow
- Store JWT in localStorage
- Update Redux state with user info
- Close modal and add item to cart
- Show success toast

### 3.3 Menu Page
**Route: /menu**

- Advanced filtering:
  - Category filter
  - Veg/Non-veg filter
  - Price range filter
  - Search by name
- Detailed item cards
- Quick add to cart
- Item detail modal with customizations

### 3.4 Cart & Checkout
**Route: /cart**

#### Cart Page
- List of cart items with quantity controls
- Remove item option
- Subtotal calculation
- "Proceed to Checkout" button

#### Checkout Page
**Route: /checkout**

- **Delivery Address Section**
  - List of saved addresses (radio selection)
  - "Add New Address" button
  - Address form with:
    - Label (Home/Work/Other)
    - Address line
    - Landmark
    - Map integration for pin location
    - Auto-detect current location option
  - Distance validation (show error if > 10km)
  - Delivery charges display

- **Order Summary**
  - Items list
  - Subtotal
  - Delivery charges
  - Taxes (GST)
  - Total amount
  - Apply offer code

- **Payment Method**
  - Cash on Delivery (if not blocked)
  - Pay Online (Razorpay)

- **Special Instructions** (textarea)

- **Place Order** button

### 3.5 Order Confirmation & Tracking
**Route: /order/:orderId**

- Order ID and timestamp
- Order status timeline:
  - Order Placed
  - Order Accepted (shows preparation time)
  - Preparing
  - Ready for Delivery
  - Delivered

- **Timer Display**
  - Countdown timer showing estimated delivery time
  - Updates when restaurant accepts order

- Order details (items, address, payment)
- Cancel order option (only if status is PENDING)
- Call restaurant button
- Download invoice

### 3.6 User Profile
**Route: /profile**

- **My Profile Tab**
  - Name, phone, email
  - Edit profile option

- **My Addresses Tab**
  - List of saved addresses
  - Add/Edit/Delete options
  - Set default address

- **Order History Tab**
  - List of past orders
  - Filter by status
  - Reorder option
  - View details

- **Logout** button

### 3.7 Offers Page
**Route: /offers**

- Grid of all active offers
- Offer details: discount, min order, validity
- "Apply Offer" button (copies code)

---

## **Phase 4: Frontend - Admin Dashboard** (Days 15-19)

### 4.1 Admin Login
**Route: /admin/login**

- Email and password form
- "Login" button
- Protected route (redirect if not authenticated)

### 4.2 Dashboard Overview
**Route: /admin/dashboard**

#### Key Metrics Cards
- Today's revenue
- Total orders (today)
- Pending orders count
- Active users count

#### Charts
- Revenue chart (last 7 days)
- Order status distribution (pie chart)
- Popular items (bar chart)

#### Recent Orders Table
- Order ID, customer name, amount, status, time
- Quick actions: Accept, View details

### 4.3 Order Management
**Route: /admin/orders**

#### Features:
- **Filters**
  - Status filter (All, Pending, Accepted, Preparing, etc.)
  - Date range filter
  - Payment method filter

- **Orders Table**
  - Columns: Order ID, Customer, Items, Amount, Payment, Status, Time
  - Actions: View, Accept, Update Status, Cancel

- **Order Detail Modal**
  - Full order information
  - Customer details
  - Delivery address with map
  - Items list
  - Payment details
  - Status update dropdown
  - Set preparation time (when accepting)
  - Print invoice

- **Real-time Updates**
  - New order notification sound
  - Auto-refresh on new orders

### 4.4 Menu Management
**Route: /admin/menu**

#### Features:
- **Add New Item** button
- **Menu Items Table**
  - Columns: Image, Name, Category, Price, Veg/Non-veg, Available, Actions
  - Actions: Edit, Delete, Toggle availability

- **Add/Edit Item Form**
  - Name, description, category
  - Price
  - Image upload (Cloudinary)
  - Veg/Non-veg toggle
  - Availability toggle
  - Customizations (add multiple):
    - Customization name
    - Options with prices
    - Required/Optional

### 4.5 User Management
**Route: /admin/users**

#### Features:
- **Users Table**
  - Columns: Name, Phone, Email, Total Orders, Status, Actions
  - Search by name/phone

- **User Actions**
  - View order history
  - Block/Unblock user
  - Block/Unblock COD
  - View addresses

- **Filters**
  - Blocked users
  - COD blocked users
  - Active users

### 4.6 Offers Management
**Route: /admin/offers**

#### Features:
- **Add New Offer** button
- **Offers Table**
  - Columns: Title, Discount, Min Order, Valid Till, Status, Actions
  - Actions: Edit, Delete, Toggle active

- **Add/Edit Offer Form**
  - Title and description
  - Discount type (Percentage/Flat)
  - Discount value
  - Min order amount
  - Max discount (for percentage)
  - Validity period
  - Active toggle

### 4.7 Restaurant Settings
**Route: /admin/settings**

#### Tabs:

**General Settings**
- Restaurant name, description
- Logo and banner upload
- Contact details
- Address with map

**Operating Hours**
- Day-wise opening and closing times
- Open/Closed toggle for each day

**Delivery Settings**
- Delivery radius (default 10km)
- Minimum order amount
- Average preparation time
- Delivery charge rules

**Restaurant Status**
- Open/Close restaurant toggle
- Temporary closure message

---

## **Phase 5: Advanced Features** (Days 20-23)

### 5.1 Real-time Order Updates (Socket.io)

#### Server-side Events:
```javascript
// Emit to customer when order status changes
socket.to(userId).emit('orderStatusUpdate', { orderId, status, estimatedTime });

// Emit to admin when new order is placed
socket.to('admin').emit('newOrder', orderData);
```

#### Client-side Listeners:
- Customer: Listen for order status updates
- Admin: Listen for new orders, play notification sound

### 5.2 Map Integration (React-Leaflet)

#### Features:
- Display restaurant location
- Display delivery address
- Draw circle showing 10km delivery radius
- Calculate and display route distance
- Pin location selector for new addresses

### 5.3 Image Optimization
- Compress images before upload
- Generate thumbnails for menu items
- Lazy loading for images
- WebP format support

### 5.4 PWA Features (Optional but Recommended)
- Service worker for offline support
- Add to home screen prompt
- Push notifications for order updates
- Offline order history viewing

### 5.5 Search & Filters
- Debounced search for menu items
- Advanced filtering with multiple criteria
- Sort by price, popularity, etc.

### 5.6 Order Timer Logic
```javascript
// When restaurant accepts order
const preparationTime = 30; // minutes set by restaurant
const estimatedDeliveryTime = new Date(Date.now() + preparationTime * 60000);

// On customer order page
const [timeRemaining, setTimeRemaining] = useState(null);

useEffect(() => {
  const interval = setInterval(() => {
    const remaining = estimatedDeliveryTime - Date.now();
    if (remaining > 0) {
      setTimeRemaining(Math.ceil(remaining / 60000)); // minutes
    } else {
      setTimeRemaining(0);
    }
  }, 1000);
  return () => clearInterval(interval);
}, [estimatedDeliveryTime]);
```

---

## **Phase 6: Testing & Quality Assurance** (Days 24-26)

### 6.1 Unit Testing
- Test utility functions (distance calculation, delivery charges)
- Test Redux reducers and actions
- Test API controllers

### 6.2 Integration Testing
- Test complete user flows:
  - Registration → Browse → Add to cart → Checkout → Payment
  - Admin login → Accept order → Update status
- Test payment gateway integration (sandbox mode)
- Test SMS OTP flow

### 6.3 Manual Testing Checklist

#### Customer Side:
- [ ] Landing page loads correctly
- [ ] Menu items display with images
- [ ] Add to cart triggers login modal
- [ ] OTP is received and verified
- [ ] Cart updates correctly
- [ ] Address validation works (10km check)
- [ ] Delivery charges calculated correctly
- [ ] Payment gateway integration works
- [ ] Order confirmation page shows timer
- [ ] Order status updates in real-time
- [ ] Order history displays correctly
- [ ] Profile editing works
- [ ] Blocked user cannot place order
- [ ] COD blocked user cannot select COD

#### Admin Side:
- [ ] Admin login works
- [ ] Dashboard metrics are accurate
- [ ] New order notification appears
- [ ] Order acceptance sets timer
- [ ] Status updates reflect on customer side
- [ ] Menu item CRUD operations work
- [ ] Image upload works
- [ ] User blocking works
- [ ] COD blocking works
- [ ] Offers CRUD operations work
- [ ] Restaurant settings update correctly

### 6.4 Performance Testing
- Test with 100+ menu items
- Test with 50+ concurrent users
- Optimize database queries (add indexes)
- Implement pagination for large datasets

### 6.5 Security Testing
- Test for SQL injection (not applicable for MongoDB, but test NoSQL injection)
- Test for XSS attacks
- Verify JWT expiration and refresh
- Test rate limiting on OTP endpoint
- Verify CORS settings
- Test file upload restrictions

---

## **Phase 7: Deployment** (Days 27-28)

### 7.1 Backend Deployment (Render/Railway/Heroku)

#### Using Render (Free Tier):
1. Create account on Render.com
2. Connect GitHub repository
3. Create new Web Service
4. Configure environment variables:
   - MONGODB_URI
   - JWT_SECRET
   - RAZORPAY_KEY_ID
   - RAZORPAY_KEY_SECRET
   - SMS_API_KEY
   - CLOUDINARY_URL
5. Set build command: `npm install`
6. Set start command: `npm start`
7. Deploy

### 7.2 Frontend Deployment (Vercel/Netlify)

#### Using Vercel (Free Tier):
1. Create account on Vercel.com
2. Import GitHub repository
3. Configure build settings:
   - Framework: Vite
   - Build command: `npm run build`
   - Output directory: `dist`
4. Add environment variables:
   - VITE_API_URL (backend URL)
   - VITE_RAZORPAY_KEY_ID
5. Deploy

### 7.3 Database Setup
- MongoDB Atlas (Free tier: 512MB)
- Create database and collections
- Set up indexes:
  - User: phone (unique)
  - Order: orderId (unique), userId, createdAt
  - MenuItem: restaurantId, category
- Configure IP whitelist (allow all for cloud deployment)

### 7.4 Domain & SSL
- Purchase domain (optional, use free subdomain initially)
- Configure DNS settings
- SSL certificates (automatic with Vercel/Netlify)

### 7.5 Post-Deployment Checklist
- [ ] Test all API endpoints on production
- [ ] Verify SMS OTP works
- [ ] Test payment gateway in live mode
- [ ] Check CORS configuration
- [ ] Verify image uploads work
- [ ] Test real-time features
- [ ] Monitor error logs
- [ ] Set up error tracking (Sentry - free tier)

---

## **Phase 8: Launch & Monitoring** (Day 29-30)

### 8.1 Pre-Launch Tasks
- Create admin account
- Upload restaurant information
- Add menu items with images
- Create initial offers
- Test complete flow end-to-end

### 8.2 Soft Launch
- Share with limited users (friends/family)
- Gather feedback
- Monitor for bugs
- Fix critical issues

### 8.3 Monitoring Setup
- Set up Google Analytics
- Monitor server logs
- Track error rates
- Monitor payment success rates
- Track user engagement metrics

### 8.4 Documentation
- Create user guide for customers
- Create admin manual for restaurant owner
- Document API endpoints
- Create troubleshooting guide

---

## **Cost Breakdown (Monthly)**

### Free Tier Services:
- **MongoDB Atlas**: Free (512MB)
- **Vercel/Netlify**: Free (100GB bandwidth)
- **Render**: Free (750 hours/month)
- **Cloudinary**: Free (25GB storage, 25GB bandwidth)
- **OpenStreetMap**: Free

### Paid Services:
- **SMS (2Factor.in)**: ₹0.15 per SMS
  - Estimated: 100 orders/month × 1 OTP = ₹15/month
- **Razorpay**: 2% per transaction (only on successful payments)
  - No setup fee, no monthly fee
- **Domain** (optional): ₹500-1000/year

### **Total Estimated Cost: ₹15-50/month** (excluding payment gateway fees)

---

## **Scalability Considerations**

### When to Upgrade:
- **MongoDB**: Upgrade when data exceeds 512MB
- **Hosting**: Upgrade when traffic increases significantly
- **Cloudinary**: Upgrade when image storage/bandwidth exceeds free tier

### Future Enhancements:
- Multi-restaurant support
- Loyalty program
- Referral system
- Table booking
- Restaurant reviews and ratings
- Multiple payment options (UPI, wallets)
- Email notifications
- WhatsApp order updates
- Analytics dashboard for owner
- Inventory management
- Staff management
- Rider assignment (if adding delivery)

---

## **Risk Mitigation**

### Technical Risks:
- **SMS delivery failure**: Implement retry mechanism, show manual contact option
- **Payment gateway downtime**: Show error message, allow COD fallback
- **Server downtime**: Use reliable hosting, implement health checks
- **Database connection issues**: Implement connection pooling, retry logic

### Business Risks:
- **User blocking**: Provide clear communication about why user is blocked
- **Order cancellations**: Set clear cancellation policy, allow only before acceptance
- **Fraudulent orders**: Implement order verification for high-value orders

---

## **Success Metrics**

### Key Performance Indicators:
- **User Acquisition**: New registrations per week
- **Order Conversion**: Cart to order completion rate
- **Average Order Value**: Total revenue / number of orders
- **Customer Retention**: Repeat order rate
- **Payment Success Rate**: Successful payments / total payment attempts
- **Order Fulfillment Time**: Average time from order to delivery
- **Customer Satisfaction**: Based on repeat orders and feedback

---

## **Timeline Summary**

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Phase 1: Setup | 2 days | Project structure, database schema |
| Phase 2: Backend | 5 days | Complete REST API, authentication |
| Phase 3: Customer Frontend | 7 days | Landing page, menu, cart, checkout, profile |
| Phase 4: Admin Dashboard | 5 days | Order management, menu, users, settings |
| Phase 5: Advanced Features | 4 days | Real-time updates, maps, PWA |
| Phase 6: Testing | 3 days | Unit, integration, manual testing |
| Phase 7: Deployment | 2 days | Production deployment |
| Phase 8: Launch | 2 days | Soft launch, monitoring |

**Total: 30 days (approximately 1 month)**

---

## **Next Steps**

1. **Review this plan** with your client
2. **Confirm requirements** and make adjustments
3. **Set up accounts** for third-party services
4. **Initialize project** and start Phase 1
5. **Create task breakdown** in task.md for tracking progress

---

## **Important Notes**

> [!IMPORTANT]
> - Always test payment gateway in **sandbox mode** before going live
> - Implement proper **error handling** and **logging** throughout
> - Keep **API keys and secrets** secure in environment variables
> - Implement **rate limiting** to prevent abuse
> - Regular **database backups** are essential

> [!WARNING]
> - The 10km distance check is critical - ensure accurate geocoding
> - User blocking features should be used carefully with proper communication
> - Payment webhook verification is crucial for security

> [!TIP]
> - Start with MVP features and add enhancements later
> - Use React DevTools and Redux DevTools for debugging
> - Implement comprehensive logging for easier troubleshooting
> - Consider adding analytics from day one to track user behavior

