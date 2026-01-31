# Phase 3: Customer Frontend (Days 8-14)

## Overview
Build the complete customer-facing website with landing page, menu browsing, cart, checkout, and order tracking.

---

## 3.1 Setup Redux Store

### Store Configuration (`src/redux/store.js`)
```javascript
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import menuReducer from './slices/menuSlice';
import orderReducer from './slices/orderSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    menu: menuReducer,
    order: orderReducer
  }
});
```

### Auth Slice (`src/redux/slices/authSlice.js`)
```javascript
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  user: null,
  token: localStorage.getItem('token') || null,
  isAuthenticated: !!localStorage.getItem('token')
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      localStorage.setItem('token', action.payload.token);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
    },
    updateUser: (state, action) => {
      state.user = action.payload;
    }
  }
});

export const { setCredentials, logout, updateUser } = authSlice.actions;
export default authSlice.reducer;
```

### Cart Slice (`src/redux/slices/cartSlice.js`)
```javascript
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  total: 0
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const existingItem = state.items.find(
        item => item.id === action.payload.id &&
        JSON.stringify(item.customizations) === JSON.stringify(action.payload.customizations)
      );
      
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.items.push({ ...action.payload, quantity: 1 });
      }
      
      calculateTotal(state);
    },
    removeFromCart: (state, action) => {
      state.items = state.items.filter(item => item.cartId !== action.payload);
      calculateTotal(state);
    },
    updateQuantity: (state, action) => {
      const item = state.items.find(item => item.cartId === action.payload.cartId);
      if (item) {
        item.quantity = action.payload.quantity;
        calculateTotal(state);
      }
    },
    clearCart: (state) => {
      state.items = [];
      state.total = 0;
    }
  }
});

function calculateTotal(state) {
  state.total = state.items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);
}

export const { addToCart, removeFromCart, updateQuantity, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
```

---

## 3.2 API Service Setup

### API Configuration (`src/services/api.js`)
```javascript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const sendOTP = (phone) => api.post('/auth/send-otp', { phone });
export const verifyOTP = (phone, otp) => api.post('/auth/verify-otp', { phone, otp });

// User APIs
export const getProfile = () => api.get('/users/profile');
export const updateProfile = (data) => api.put('/users/profile', data);
export const addAddress = (data) => api.post('/users/address', data);
export const updateAddress = (addressId, data) => api.put(`/users/address/${addressId}`, data);
export const deleteAddress = (addressId) => api.delete(`/users/address/${addressId}`);

// Menu APIs
export const getRestaurantInfo = () => api.get('/menu/restaurant');
export const getMenuItems = (params) => api.get('/menu', { params });
export const getMenuItem = (id) => api.get(`/menu/${id}`);
export const getOffers = () => api.get('/menu/offers');

// Order APIs
export const createOrder = (data) => api.post('/orders', data);
export const getOrder = (id) => api.get(`/orders/${id}`);
export const cancelOrder = (id) => api.put(`/orders/${id}/cancel`);
export const getUserOrders = (params) => api.get('/users/orders', { params });

// Payment APIs
export const createPaymentOrder = (orderId) => api.post('/payment/create-order', { orderId });
export const verifyPayment = (data) => api.post('/payment/verify', data);

export default api;
```

---

## 3.3 Landing Page

### Main App (`src/App.jsx`)
```javascript
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import { Toaster } from 'react-hot-toast';

import LandingPage from './pages/customer/LandingPage';
import MenuPage from './pages/customer/MenuPage';
import CartPage from './pages/customer/CartPage';
import CheckoutPage from './pages/customer/CheckoutPage';
import OrderTrackingPage from './pages/customer/OrderTrackingPage';
import ProfilePage from './pages/customer/ProfilePage';
import OffersPage from './pages/customer/OffersPage';

function App() {
  return (
    <Provider store={store}>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/order/:orderId" element={<OrderTrackingPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/offers" element={<OffersPage />} />
        </Routes>
      </Router>
    </Provider>
  );
}

export default App;
```

### Landing Page (`src/pages/customer/LandingPage.jsx`)
```javascript
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/customer/Navbar';
import HeroSection from '../../components/customer/HeroSection';
import MenuPreview from '../../components/customer/MenuPreview';
import OffersSection from '../../components/customer/OffersSection';
import AboutSection from '../../components/customer/AboutSection';
import Footer from '../../components/customer/Footer';
import LoginModal from '../../components/customer/LoginModal';
import { getRestaurantInfo, getMenuItems, getOffers } from '../../services/api';

function LandingPage() {
  const [restaurant, setRestaurant] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [offers, setOffers] = useState([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [restaurantRes, menuRes, offersRes] = await Promise.all([
        getRestaurantInfo(),
        getMenuItems({ limit: 12 }),
        getOffers()
      ]);
      
      setRestaurant(restaurantRes.data.restaurant);
      setMenuItems(menuRes.data.menuItems);
      setOffers(offersRes.data.offers);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar onLoginClick={() => setShowLoginModal(true)} />
      <HeroSection restaurant={restaurant} />
      <MenuPreview menuItems={menuItems} />
      <OffersSection offers={offers} />
      <AboutSection restaurant={restaurant} />
      <Footer />
      
      {showLoginModal && (
        <LoginModal onClose={() => setShowLoginModal(false)} />
      )}
    </div>
  );
}

export default LandingPage;
```

### Navbar Component (`src/components/customer/Navbar.jsx`)
```javascript
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { FiShoppingCart, FiUser } from 'react-icons/fi';

function Navbar({ onLoginClick }) {
  const { isAuthenticated, user } = useSelector(state => state.auth);
  const { items } = useSelector(state => state.cart);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-orange-600">
            Restaurant Name
          </Link>
          
          <div className="hidden md:flex space-x-6">
            <Link to="/" className="text-gray-700 hover:text-orange-600">Home</Link>
            <Link to="/menu" className="text-gray-700 hover:text-orange-600">Menu</Link>
            <Link to="/offers" className="text-gray-700 hover:text-orange-600">Offers</Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link to="/cart" className="relative">
              <FiShoppingCart className="text-2xl text-gray-700 hover:text-orange-600" />
              {items.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  {items.length}
                </span>
              )}
            </Link>
            
            {isAuthenticated ? (
              <Link to="/profile" className="flex items-center space-x-2">
                <FiUser className="text-2xl text-gray-700" />
                <span className="hidden md:block">{user?.name || 'Profile'}</span>
              </Link>
            ) : (
              <button
                onClick={onLoginClick}
                className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
```

### Hero Section (`src/components/customer/HeroSection.jsx`)
```javascript
function HeroSection({ restaurant }) {
  return (
    <div className="relative h-96 bg-gradient-to-r from-orange-500 to-red-600">
      {restaurant?.banner && (
        <img
          src={restaurant.banner}
          alt="Restaurant"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
        />
      )}
      
      <div className="relative container mx-auto px-4 h-full flex flex-col justify-center items-center text-white text-center">
        <h1 className="text-5xl font-bold mb-4">
          {restaurant?.name || 'Welcome to Our Restaurant'}
        </h1>
        <p className="text-xl mb-8">
          {restaurant?.description || 'Delicious food delivered to your doorstep'}
        </p>
        <a
          href="#menu"
          className="bg-white text-orange-600 px-8 py-3 rounded-full font-semibold text-lg hover:bg-gray-100 transition"
        >
          Order Now
        </a>
      </div>
    </div>
  );
}

export default HeroSection;
```

### Menu Preview (`src/components/customer/MenuPreview.jsx`)
```javascript
import { Link } from 'react-router-dom';
import MenuItemCard from './MenuItemCard';

function MenuPreview({ menuItems }) {
  return (
    <section id="menu" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Our Menu</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {menuItems.map(item => (
            <MenuItemCard key={item._id} item={item} />
          ))}
        </div>
        
        <div className="text-center mt-8">
          <Link
            to="/menu"
            className="inline-block bg-orange-600 text-white px-8 py-3 rounded-lg hover:bg-orange-700"
          >
            View Full Menu
          </Link>
        </div>
      </div>
    </section>
  );
}

export default MenuPreview;
```

### Menu Item Card (`src/components/customer/MenuItemCard.jsx`)
```javascript
import { useDispatch, useSelector } from 'react-redux';
import { addToCart } from '../../redux/slices/cartSlice';
import { useState } from 'react';
import toast from 'react-hot-toast';

function MenuItemCard({ item }) {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector(state => state.auth);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }
    
    dispatch(addToCart({
      id: item._id,
      name: item.name,
      price: item.price,
      image: item.image,
      cartId: Date.now() + Math.random()
    }));
    
    toast.success('Added to cart!');
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition">
      <img
        src={item.image || '/placeholder.jpg'}
        alt={item.name}
        className="w-full h-48 object-cover"
      />
      
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">{item.name}</h3>
          <span className={`px-2 py-1 rounded text-xs ${item.isVeg ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {item.isVeg ? 'VEG' : 'NON-VEG'}
          </span>
        </div>
        
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{item.description}</p>
        
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-orange-600">₹{item.price}</span>
          <button
            onClick={handleAddToCart}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
          >
            Add to Cart
          </button>
        </div>
      </div>
      
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
    </div>
  );
}

export default MenuItemCard;
```

---

## 3.4 Login Modal

### Login Modal (`src/components/customer/LoginModal.jsx`)
```javascript
import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../../redux/slices/authSlice';
import { sendOTP, verifyOTP } from '../../services/api';
import toast from 'react-hot-toast';
import { FiX } from 'react-icons/fi';

function LoginModal({ onClose }) {
  const dispatch = useDispatch();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // 'phone' or 'otp'
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    
    if (!/^[6-9]\d{9}$/.test(phone)) {
      toast.error('Please enter a valid phone number');
      return;
    }
    
    setLoading(true);
    try {
      await sendOTP(phone);
      toast.success('OTP sent successfully!');
      setStep('otp');
      setCountdown(30);
      
      // Countdown timer
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    if (otp.length !== 6) {
      toast.error('Please enter 6-digit OTP');
      return;
    }
    
    setLoading(true);
    try {
      const response = await verifyOTP(phone, otp);
      dispatch(setCredentials({
        user: response.data.user,
        token: response.data.token
      }));
      toast.success('Login successful!');
      onClose();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <FiX className="text-2xl" />
        </button>
        
        <h2 className="text-2xl font-bold mb-6">Login</h2>
        
        {step === 'phone' ? (
          <form onSubmit={handleSendOTP}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter 10-digit phone number"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                maxLength={10}
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 disabled:bg-gray-400"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Enter OTP</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                maxLength={6}
                required
                autoFocus
              />
              <p className="text-sm text-gray-500 mt-2">
                OTP sent to {phone}
              </p>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 disabled:bg-gray-400 mb-3"
            >
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>
            
            <button
              type="button"
              onClick={handleSendOTP}
              disabled={countdown > 0}
              className="w-full text-orange-600 hover:text-orange-700 disabled:text-gray-400"
            >
              {countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default LoginModal;
```

---

## 3.5 Cart & Checkout

### Cart Page (`src/pages/customer/CartPage.jsx`)
```javascript
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { removeFromCart, updateQuantity } from '../../redux/slices/cartSlice';
import Navbar from '../../components/customer/Navbar';
import { FiTrash2, FiPlus, FiMinus } from 'react-icons/fi';

function CartPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, total } = useSelector(state => state.cart);

  const handleQuantityChange = (cartId, newQuantity) => {
    if (newQuantity < 1) return;
    dispatch(updateQuantity({ cartId, quantity: newQuantity }));
  };

  const handleRemove = (cartId) => {
    dispatch(removeFromCart(cartId));
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Your cart is empty</h2>
          <button
            onClick={() => navigate('/menu')}
            className="bg-orange-600 text-white px-6 py-3 rounded-lg"
          >
            Browse Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Shopping Cart</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {items.map(item => (
              <div key={item.cartId} className="bg-white rounded-lg shadow-md p-4 mb-4">
                <div className="flex items-center">
                  <img
                    src={item.image || '/placeholder.jpg'}
                    alt={item.name}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                  
                  <div className="flex-1 ml-4">
                    <h3 className="text-lg font-semibold">{item.name}</h3>
                    <p className="text-orange-600 font-bold">₹{item.price}</p>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleQuantityChange(item.cartId, item.quantity - 1)}
                      className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                      <FiMinus />
                    </button>
                    <span className="font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(item.cartId, item.quantity + 1)}
                      className="p-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                    >
                      <FiPlus />
                    </button>
                  </div>
                  
                  <button
                    onClick={() => handleRemove(item.cartId)}
                    className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <FiTrash2 className="text-xl" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              <h3 className="text-xl font-bold mb-4">Order Summary</h3>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{total}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Delivery charges</span>
                  <span>Calculated at checkout</span>
                </div>
              </div>
              
              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>₹{total}</span>
                </div>
              </div>
              
              <button
                onClick={() => navigate('/checkout')}
                className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CartPage;
```

### Checkout Page (`src/pages/customer/CheckoutPage.jsx`)
```javascript
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { getProfile, createOrder, createPaymentOrder, verifyPayment } from '../../services/api';
import AddressSelector from '../../components/customer/AddressSelector';
import toast from 'react-hot-toast';

function CheckoutPage() {
  const navigate = useNavigate();
  const { items, total } = useSelector(state => state.cart);
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('ONLINE');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [deliveryCharges, setDeliveryCharges] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await getProfile();
      setAddresses(response.data.user.addresses);
      const defaultAddr = response.data.user.addresses.find(addr => addr.isDefault);
      if (defaultAddr) setSelectedAddress(defaultAddr);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      toast.error('Please select a delivery address');
      return;
    }

    setLoading(true);
    try {
      const orderData = {
        items: items.map(item => ({
          menuItemId: item.id,
          name: item.name,
          quantity: item.quantity,
          customizations: item.customizations || []
        })),
        deliveryAddress: selectedAddress,
        paymentMethod,
        specialInstructions
      };

      const orderResponse = await createOrder(orderData);
      const order = orderResponse.data.order;

      if (paymentMethod === 'ONLINE') {
        // Initialize Razorpay
        const paymentOrderRes = await createPaymentOrder(order._id);
        
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: paymentOrderRes.data.amount,
          currency: paymentOrderRes.data.currency,
          order_id: paymentOrderRes.data.razorpayOrderId,
          name: 'Restaurant Name',
          description: `Order #${order.orderId}`,
          handler: async function (response) {
            try {
              await verifyPayment({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                orderId: order._id
              });
              
              toast.success('Order placed successfully!');
              navigate(`/order/${order._id}`);
            } catch (error) {
              toast.error('Payment verification failed');
            }
          }
        };

        const razorpay = new window.Razorpay(options);
        razorpay.open();
      } else {
        toast.success('Order placed successfully!');
        navigate(`/order/${order._id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Checkout</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Address Selection */}
            <AddressSelector
              addresses={addresses}
              selectedAddress={selectedAddress}
              onSelectAddress={setSelectedAddress}
              onAddressesUpdate={setAddresses}
            />
            
            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold mb-4">Payment Method</h3>
              
              <div className="space-y-3">
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value="ONLINE"
                    checked={paymentMethod === 'ONLINE'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <span>Pay Online (Cards, UPI, Wallets)</span>
                </label>
                
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    value="COD"
                    checked={paymentMethod === 'COD'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-3"
                  />
                  <span>Cash on Delivery</span>
                </label>
              </div>
            </div>
            
            {/* Special Instructions */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold mb-4">Special Instructions</h3>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Any special requests? (optional)"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
                rows={3}
              />
            </div>
          </div>
          
          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
              <h3 className="text-xl font-bold mb-4">Order Summary</h3>
              
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{total}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Charges</span>
                  <span>₹{deliveryCharges}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes (5%)</span>
                  <span>₹{(total * 0.05).toFixed(2)}</span>
                </div>
              </div>
              
              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>₹{(total + deliveryCharges + total * 0.05).toFixed(2)}</span>
                </div>
              </div>
              
              <button
                onClick={handlePlaceOrder}
                disabled={loading || !selectedAddress}
                className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 disabled:bg-gray-400"
              >
                {loading ? 'Processing...' : 'Place Order'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;
```

---

## 3.6 Order Tracking

### Order Tracking Page (`src/pages/customer/OrderTrackingPage.jsx`)
```javascript
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getOrder } from '../../services/api';
import io from 'socket.io-client';
import Navbar from '../../components/customer/Navbar';

function OrderTrackingPage() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);

  useEffect(() => {
    fetchOrder();
    
    // Setup socket connection
    const socket = io(import.meta.env.VITE_SOCKET_URL);
    const userId = localStorage.getItem('userId');
    
    socket.emit('join', userId);
    
    socket.on('orderStatusUpdate', (data) => {
      if (data.orderId === orderId) {
        fetchOrder();
      }
    });
    
    return () => socket.disconnect();
  }, [orderId]);

  useEffect(() => {
    if (order?.estimatedDeliveryTime) {
      const interval = setInterval(() => {
        const remaining = new Date(order.estimatedDeliveryTime) - Date.now();
        if (remaining > 0) {
          setTimeRemaining(Math.ceil(remaining / 60000));
        } else {
          setTimeRemaining(0);
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [order]);

  const fetchOrder = async () => {
    try {
      const response = await getOrder(orderId);
      setOrder(response.data.order);
    } catch (error) {
      console.error('Error fetching order:', error);
    }
  };

  const statusSteps = [
    { key: 'PENDING', label: 'Order Placed' },
    { key: 'ACCEPTED', label: 'Order Accepted' },
    { key: 'PREPARING', label: 'Preparing' },
    { key: 'READY', label: 'Ready' },
    { key: 'DELIVERED', label: 'Delivered' }
  ];

  const getCurrentStepIndex = () => {
    return statusSteps.findIndex(step => step.key === order?.orderStatus);
  };

  if (!order) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Order Tracking</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold">Order #{order.orderId}</h2>
              <p className="text-gray-600">
                {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
            
            {timeRemaining !== null && timeRemaining > 0 && (
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">
                  {timeRemaining} min
                </div>
                <div className="text-sm text-gray-600">Estimated Time</div>
              </div>
            )}
          </div>
          
          {/* Status Timeline */}
          <div className="relative">
            <div className="flex justify-between">
              {statusSteps.map((step, index) => (
                <div key={step.key} className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    index <= getCurrentStepIndex()
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="text-sm mt-2 text-center">{step.label}</div>
                </div>
              ))}
            </div>
            <div className="absolute top-5 left-0 right-0 h-1 bg-gray-300 -z-10">
              <div
                className="h-full bg-orange-600 transition-all"
                style={{ width: `${(getCurrentStepIndex() / (statusSteps.length - 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>
        
        {/* Order Details */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4">Order Details</h3>
          
          <div className="space-y-3">
            {order.items.map((item, index) => (
              <div key={index} className="flex justify-between">
                <span>{item.name} x {item.quantity}</span>
                <span>₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          
          <div className="border-t mt-4 pt-4">
            <div className="flex justify-between font-bold">
              <span>Total</span>
              <span>₹{order.total}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OrderTrackingPage;
```

---

## Checklist

- [ ] Setup Redux store with slices
- [ ] Create API service layer
- [ ] Build landing page with hero section
- [ ] Create menu preview component
- [ ] Build login modal with OTP flow
- [ ] Create menu item card component
- [ ] Build cart page with quantity controls
- [ ] Create checkout page with address selector
- [ ] Integrate map for address selection
- [ ] Implement 10km distance validation
- [ ] Integrate Razorpay payment
- [ ] Build order tracking page with timer
- [ ] Setup Socket.io for real-time updates
- [ ] Create user profile page
- [ ] Test complete user flow
- [ ] Ensure responsive design

---

## Next Phase

Proceed to [Phase 4: Admin Dashboard](file:///C:/Users/welcome/.gemini/antigravity/brain/5dae8491-6a0e-49f7-977b-98355a9f8dbe/phase-4-admin-dashboard.md)
