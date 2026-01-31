# Phases 5-8: Advanced Features, Testing, Deployment & Launch (Days 20-30)

## Phase 5: Advanced Features (Days 20-23)

### 5.1 Real-time Order Updates (Socket.io)

Already implemented in previous phases, but ensure:

**Server-side (`server.js`):**
```javascript
io.on('connection', (socket) => {
  console.log('New client connected');
  
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined`);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// In order controller, emit events:
req.io.to(order.userId.toString()).emit('orderStatusUpdate', {
  orderId: order._id,
  status: order.orderStatus,
  estimatedDeliveryTime: order.estimatedDeliveryTime
});

req.io.to('admin').emit('newOrder', order);
```

**Client-side:**
```javascript
import io from 'socket.io-client';

const socket = io(import.meta.env.VITE_SOCKET_URL);
socket.emit('join', userId);

socket.on('orderStatusUpdate', (data) => {
  // Update order status in UI
});
```

---

### 5.2 Map Integration (React-Leaflet)

**Address Selector with Map (`src/components/customer/AddressSelector.jsx`):**
```javascript
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useState } from 'react';

function AddressSelector({ addresses, selectedAddress, onSelectAddress, onAddressesUpdate }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    label: 'Home',
    addressLine: '',
    landmark: '',
    coordinates: { lat: 0, lng: 0 }
  });

  function LocationMarker() {
    useMapEvents({
      click(e) {
        setNewAddress({
          ...newAddress,
          coordinates: { lat: e.latlng.lat, lng: e.latlng.lng }
        });
      }
    });
    
    return newAddress.coordinates.lat !== 0 ? (
      <Marker position={[newAddress.coordinates.lat, newAddress.coordinates.lng]} />
    ) : null;
  }

  const handleAddAddress = async () => {
    try {
      await addAddress(newAddress);
      toast.success('Address added!');
      // Refresh addresses
      const response = await getProfile();
      onAddressesUpdate(response.data.user.addresses);
      setShowAddForm(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add address');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-xl font-bold mb-4">Delivery Address</h3>
      
      {/* Saved Addresses */}
      <div className="space-y-3 mb-4">
        {addresses.map(addr => (
          <label key={addr._id} className="flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              checked={selectedAddress?._id === addr._id}
              onChange={() => onSelectAddress(addr)}
              className="mt-1 mr-3"
            />
            <div>
              <div className="font-semibold">{addr.label}</div>
              <div className="text-sm text-gray-600">{addr.addressLine}</div>
              {addr.landmark && <div className="text-sm text-gray-500">Landmark: {addr.landmark}</div>}
            </div>
          </label>
        ))}
      </div>
      
      <button
        onClick={() => setShowAddForm(!showAddForm)}
        className="text-orange-600 hover:text-orange-700"
      >
        + Add New Address
      </button>
      
      {/* Add Address Form */}
      {showAddForm && (
        <div className="mt-4 p-4 border rounded-lg">
          <div className="mb-3">
            <label className="block mb-2">Label</label>
            <select
              value={newAddress.label}
              onChange={(e) => setNewAddress({ ...newAddress, label: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            >
              <option value="Home">Home</option>
              <option value="Work">Work</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div className="mb-3">
            <label className="block mb-2">Address</label>
            <input
              type="text"
              value={newAddress.addressLine}
              onChange={(e) => setNewAddress({ ...newAddress, addressLine: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Enter full address"
            />
          </div>
          
          <div className="mb-3">
            <label className="block mb-2">Landmark (optional)</label>
            <input
              type="text"
              value={newAddress.landmark}
              onChange={(e) => setNewAddress({ ...newAddress, landmark: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="Nearby landmark"
            />
          </div>
          
          <div className="mb-3">
            <label className="block mb-2">Pin Location on Map</label>
            <MapContainer
              center={[28.6139, 77.2090]} // Default: Delhi
              zoom={13}
              style={{ height: '300px', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />
              <LocationMarker />
            </MapContainer>
          </div>
          
          <button
            onClick={handleAddAddress}
            className="w-full bg-orange-600 text-white py-2 rounded-lg hover:bg-orange-700"
          >
            Save Address
          </button>
        </div>
      )}
    </div>
  );
}

export default AddressSelector;
```

---

### 5.3 PWA Features (Optional)

**Create `public/manifest.json`:**
```json
{
  "name": "Restaurant Ordering",
  "short_name": "Restaurant",
  "description": "Order delicious food online",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ea580c",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

**Create Service Worker (`public/sw.js`):**
```javascript
const CACHE_NAME = 'restaurant-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
```

**Register in `src/main.jsx`:**
```javascript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

---

## Phase 6: Testing & Quality Assurance (Days 24-26)

### 6.1 Manual Testing Checklist

#### Customer Side Testing
```
[ ] Landing page loads correctly with restaurant info
[ ] Menu items display with correct images and prices
[ ] Veg/Non-veg indicators show correctly
[ ] Add to cart triggers login modal for non-authenticated users
[ ] OTP is received within 30 seconds
[ ] OTP verification works correctly
[ ] Invalid OTP shows error message
[ ] Cart updates when items are added
[ ] Cart item quantity can be increased/decreased
[ ] Items can be removed from cart
[ ] Checkout page shows all cart items
[ ] Address can be added with map selection
[ ] Distance validation works (10km limit)
[ ] Delivery charges calculated correctly based on distance
[ ] Payment method selection works (COD/Online)
[ ] Razorpay payment integration works in test mode
[ ] Order is created successfully
[ ] Order confirmation page shows correct details
[ ] Timer countdown works on order tracking page
[ ] Order status updates in real-time
[ ] Order history shows all past orders
[ ] Profile can be edited
[ ] Addresses can be added/edited/deleted
[ ] Blocked user cannot place orders
[ ] COD blocked user cannot select COD option
[ ] Logout works correctly
```

#### Admin Side Testing
```
[ ] Admin login works with correct credentials
[ ] Admin login fails with incorrect credentials
[ ] Dashboard shows correct statistics
[ ] New order notification appears with sound
[ ] Orders can be filtered by status
[ ] Orders can be filtered by payment method
[ ] Order details modal shows complete information
[ ] Order can be accepted with preparation time
[ ] Order status can be updated
[ ] Real-time status update reflects on customer side
[ ] Menu items can be added with image upload
[ ] Menu items can be edited
[ ] Menu items can be deleted
[ ] Item availability can be toggled
[ ] Users list shows all registered users
[ ] Users can be blocked/unblocked
[ ] COD can be blocked/unblocked for users
[ ] Offers can be created
[ ] Offers can be edited/deleted
[ ] Restaurant settings can be updated
[ ] Opening hours can be configured
[ ] Restaurant can be opened/closed
```

---

### 6.2 Performance Testing

**Test with Load:**
```bash
# Install artillery for load testing
npm install -g artillery

# Create test-load.yml
config:
  target: 'http://localhost:5000'
  phases:
    - duration: 60
      arrivalRate: 10

scenarios:
  - name: 'Browse menu'
    flow:
      - get:
          url: '/api/menu'
```

**Run test:**
```bash
artillery run test-load.yml
```

---

### 6.3 Security Testing

**Checklist:**
```
[ ] JWT tokens expire correctly
[ ] Protected routes require authentication
[ ] Admin routes require admin authentication
[ ] Rate limiting works on OTP endpoint
[ ] SQL/NoSQL injection attempts are blocked
[ ] XSS attempts are sanitized
[ ] CORS is properly configured
[ ] Environment variables are not exposed
[ ] File upload restrictions are in place
[ ] Payment webhook signature is verified
```

---

## Phase 7: Deployment (Days 27-28)

### 7.1 Backend Deployment (Render)

**Steps:**
1. Create account on [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect GitHub repository
4. Configure:
   - **Name:** restaurant-backend
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

5. Add Environment Variables:
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret_here
JWT_EXPIRE=7d
SMS_API_KEY=your_sms_key
SMS_API_URL=https://2factor.in/API/V1
RAZORPAY_KEY_ID=your_razorpay_key
RAZORPAY_KEY_SECRET=your_razorpay_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLIENT_URL=https://your-frontend-url.vercel.app
```

6. Click "Create Web Service"
7. Wait for deployment (5-10 minutes)
8. Note the deployed URL (e.g., `https://restaurant-backend.onrender.com`)

---

### 7.2 Frontend Deployment (Vercel)

**Steps:**
1. Create account on [vercel.com](https://vercel.com)
2. Click "Add New" → "Project"
3. Import GitHub repository
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** client
   - **Build Command:** `npm run build`
   - **Output Directory:** dist

5. Add Environment Variables:
```
VITE_API_URL=https://restaurant-backend.onrender.com
VITE_RAZORPAY_KEY_ID=your_razorpay_key
VITE_SOCKET_URL=https://restaurant-backend.onrender.com
```

6. Click "Deploy"
7. Wait for deployment (2-3 minutes)
8. Note the deployed URL (e.g., `https://restaurant.vercel.app`)

---

### 7.3 Database Setup (MongoDB Atlas)

**Steps:**
1. Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create free cluster (M0)
3. Create database user
4. Whitelist IP: `0.0.0.0/0` (allow from anywhere)
5. Get connection string
6. Update `MONGODB_URI` in Render environment variables

**Create Indexes:**
```javascript
// Connect to MongoDB and run:
db.users.createIndex({ phone: 1 }, { unique: true });
db.orders.createIndex({ orderId: 1 }, { unique: true });
db.orders.createIndex({ userId: 1 });
db.orders.createIndex({ createdAt: -1 });
db.menuitems.createIndex({ restaurantId: 1, category: 1 });
```

---

### 7.4 Post-Deployment Verification

**Checklist:**
```
[ ] Backend health check endpoint responds
[ ] Frontend loads correctly
[ ] API calls work from frontend to backend
[ ] CORS is configured correctly
[ ] SMS OTP is received
[ ] Payment gateway works in live mode
[ ] Image uploads work
[ ] Socket.io connections work
[ ] Database queries are fast
[ ] Error logs are accessible
```

---

## Phase 8: Launch & Monitoring (Days 29-30)

### 8.1 Pre-Launch Setup

**Create Admin Account:**
```javascript
// Run this script on server or use MongoDB Compass
const bcrypt = require('bcryptjs');

const admin = {
  email: 'admin@restaurant.com',
  password: await bcrypt.hash('SecurePassword123!', 12),
  name: 'Restaurant Owner',
  role: 'OWNER',
  restaurantId: 'your_restaurant_id'
};

db.admins.insertOne(admin);
```

**Upload Restaurant Data:**
1. Login to admin panel
2. Update restaurant information
3. Upload logo and banner
4. Configure opening hours
5. Set delivery radius and charges
6. Add menu items with images
7. Create initial offers

---

### 8.2 Monitoring Setup

**Google Analytics:**
```html
<!-- Add to index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

**Error Tracking (Sentry):**
```bash
npm install @sentry/react
```

```javascript
// src/main.jsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "your_sentry_dsn",
  environment: "production"
});
```

---

### 8.3 Documentation

**Create User Guide (`docs/user-guide.md`):**
```markdown
# Customer User Guide

## How to Order
1. Visit the website
2. Browse the menu
3. Click "Add to Cart" on items you want
4. Login with your phone number (OTP will be sent)
5. Verify OTP
6. Go to cart and click "Proceed to Checkout"
7. Select or add delivery address
8. Choose payment method
9. Place order
10. Track your order in real-time

## FAQs
- How do I track my order?
- What if I want to cancel?
- Payment methods accepted?
```

**Create Admin Manual (`docs/admin-manual.md`):**
```markdown
# Admin Manual

## Managing Orders
1. Login to admin panel
2. Go to Orders section
3. New orders will appear with notification
4. Click "View Details" to see order information
5. Accept order and set preparation time
6. Update status as order progresses

## Managing Menu
1. Go to Menu Management
2. Click "Add New Item"
3. Fill in details and upload image
4. Save item
5. Toggle availability as needed

## Managing Users
1. Go to User Management
2. Search for users
3. Block/unblock users if needed
4. Block/unblock COD for specific users
```

---

### 8.4 Success Metrics to Track

**Week 1:**
- Total registrations
- Total orders
- Average order value
- Payment success rate
- Customer retention (repeat orders)

**Week 2-4:**
- Revenue growth
- Popular menu items
- Peak ordering times
- Customer feedback
- Technical issues

---

### 8.5 Launch Checklist

```
[ ] All features tested and working
[ ] Admin account created
[ ] Restaurant data uploaded
[ ] Menu items added with images
[ ] Payment gateway in live mode
[ ] SMS service has sufficient credits
[ ] Monitoring tools configured
[ ] Error tracking setup
[ ] Analytics configured
[ ] User guide created
[ ] Admin manual created
[ ] Backup strategy in place
[ ] Support contact information added
[ ] Terms & conditions page added
[ ] Privacy policy page added
[ ] Social media links added
[ ] Domain configured (if using custom domain)
[ ] SSL certificate active
[ ] Performance optimized
[ ] Mobile responsiveness verified
[ ] Cross-browser testing done
```

---

## Final Notes

### Maintenance Tasks
- **Daily:** Monitor orders, check error logs
- **Weekly:** Review analytics, update menu
- **Monthly:** Database backup, security audit

### Scaling Considerations
- Upgrade MongoDB when data exceeds 512MB
- Upgrade hosting when traffic increases
- Consider CDN for images
- Implement caching (Redis)
- Add more payment options

### Future Enhancements
- Multi-restaurant support
- Loyalty program
- Referral system
- Push notifications
- Email notifications
- WhatsApp integration
- Table booking
- Reviews and ratings

---

## Congratulations! 🎉

Your restaurant ordering platform is now live and ready to serve customers!

**Support Resources:**
- MongoDB Atlas Docs: https://docs.atlas.mongodb.com
- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- Razorpay Docs: https://razorpay.com/docs
- React Docs: https://react.dev
- Express Docs: https://expressjs.com
