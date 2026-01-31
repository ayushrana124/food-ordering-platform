# Phase 4: Admin Dashboard (Days 15-19)

## Overview
Build comprehensive admin dashboard for restaurant management including orders, menu, users, and settings.

---

## 4.1 Admin Login

### Admin Login Page (`src/pages/admin/AdminLogin.jsx`)
```javascript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../../services/adminApi';
import toast from 'react-hot-toast';

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await adminLogin(email, password);
      localStorage.setItem('adminToken', response.data.token);
      localStorage.setItem('admin', JSON.stringify(response.data.admin));
      toast.success('Login successful!');
      navigate('/admin/dashboard');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">Admin Login</h1>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600"
              required
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 disabled:bg-gray-400"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;
```

---

## 4.2 Dashboard Overview

### Dashboard Page (`src/pages/admin/Dashboard.jsx`)
```javascript
import { useState, useEffect } from 'react';
import { getOrderStats, getRecentOrders } from '../../services/adminApi';
import AdminLayout from '../../components/admin/AdminLayout';
import StatsCard from '../../components/admin/StatsCard';
import RecentOrdersTable from '../../components/admin/RecentOrdersTable';
import { FiDollarSign, FiShoppingBag, FiClock, FiUsers } from 'react-icons/fi';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, ordersRes] = await Promise.all([
        getOrderStats(),
        getRecentOrders()
      ]);
      
      setStats(statsRes.data);
      setRecentOrders(ordersRes.data.orders);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatsCard
          title="Today's Revenue"
          value={`₹${stats?.todayRevenue || 0}`}
          icon={<FiDollarSign />}
          color="green"
        />
        <StatsCard
          title="Today's Orders"
          value={stats?.todayOrders || 0}
          icon={<FiShoppingBag />}
          color="blue"
        />
        <StatsCard
          title="Pending Orders"
          value={stats?.pendingOrders || 0}
          icon={<FiClock />}
          color="orange"
        />
        <StatsCard
          title="Active Users"
          value={stats?.activeUsers || 0}
          icon={<FiUsers />}
          color="purple"
        />
      </div>
      
      {/* Recent Orders */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Recent Orders</h2>
        <RecentOrdersTable orders={recentOrders} onRefresh={fetchData} />
      </div>
    </AdminLayout>
  );
}

export default Dashboard;
```

### Stats Card Component (`src/components/admin/StatsCard.jsx`)
```javascript
function StatsCard({ title, value, icon, color }) {
  const colorClasses = {
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600'
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm mb-1">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colorClasses[color]}`}>
          <div className="text-2xl">{icon}</div>
        </div>
      </div>
    </div>
  );
}

export default StatsCard;
```

---

## 4.3 Order Management

### Orders Page (`src/pages/admin/Orders.jsx`)
```javascript
import { useState, useEffect } from 'react';
import { getOrders, acceptOrder, updateOrderStatus } from '../../services/adminApi';
import AdminLayout from '../../components/admin/AdminLayout';
import OrdersTable from '../../components/admin/OrdersTable';
import OrderDetailModal from '../../components/admin/OrderDetailModal';
import io from 'socket.io-client';
import toast from 'react-hot-toast';

function Orders() {
  const [orders, setOrders] = useState([]);
  const [filters, setFilters] = useState({ status: '', paymentMethod: '' });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchOrders();
    
    // Setup socket for new orders
    const socket = io(import.meta.env.VITE_SOCKET_URL);
    socket.emit('join', 'admin');
    
    socket.on('newOrder', (order) => {
      toast.success('New order received!');
      playNotificationSound();
      fetchOrders();
    });
    
    return () => socket.disconnect();
  }, [filters]);

  const fetchOrders = async () => {
    try {
      const response = await getOrders(filters);
      setOrders(response.data.orders);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const playNotificationSound = () => {
    const audio = new Audio('/notification.mp3');
    audio.play();
  };

  const handleAcceptOrder = async (orderId, preparationTime) => {
    try {
      await acceptOrder(orderId, preparationTime);
      toast.success('Order accepted!');
      fetchOrders();
      setShowModal(false);
    } catch (error) {
      toast.error('Failed to accept order');
    }
  };

  const handleUpdateStatus = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status);
      toast.success('Order status updated!');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold mb-8">Order Management</h1>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="PREPARING">Preparing</option>
            <option value="READY">Ready</option>
            <option value="DELIVERED">Delivered</option>
          </select>
          
          <select
            value={filters.paymentMethod}
            onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Payment Methods</option>
            <option value="COD">Cash on Delivery</option>
            <option value="ONLINE">Online Payment</option>
          </select>
        </div>
      </div>
      
      {/* Orders Table */}
      <OrdersTable
        orders={orders}
        onViewDetails={(order) => {
          setSelectedOrder(order);
          setShowModal(true);
        }}
        onUpdateStatus={handleUpdateStatus}
      />
      
      {/* Order Detail Modal */}
      {showModal && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setShowModal(false)}
          onAccept={handleAcceptOrder}
          onUpdateStatus={handleUpdateStatus}
        />
      )}
    </AdminLayout>
  );
}

export default Orders;
```

### Order Detail Modal (`src/components/admin/OrderDetailModal.jsx`)
```javascript
import { useState } from 'react';
import { FiX } from 'react-icons/fi';

function OrderDetailModal({ order, onClose, onAccept, onUpdateStatus }) {
  const [preparationTime, setPreparationTime] = useState(30);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Order #{order.orderId}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX className="text-2xl" />
          </button>
        </div>
        
        {/* Customer Info */}
        <div className="mb-6">
          <h3 className="font-bold mb-2">Customer Details</h3>
          <p>Name: {order.userId.name}</p>
          <p>Phone: {order.userId.phone}</p>
        </div>
        
        {/* Delivery Address */}
        <div className="mb-6">
          <h3 className="font-bold mb-2">Delivery Address</h3>
          <p>{order.deliveryAddress.addressLine}</p>
          <p>Landmark: {order.deliveryAddress.landmark}</p>
          <p>Distance: {order.distance} km</p>
        </div>
        
        {/* Items */}
        <div className="mb-6">
          <h3 className="font-bold mb-2">Items</h3>
          {order.items.map((item, index) => (
            <div key={index} className="flex justify-between py-2 border-b">
              <span>{item.name} x {item.quantity}</span>
              <span>₹{item.price * item.quantity}</span>
            </div>
          ))}
        </div>
        
        {/* Payment Info */}
        <div className="mb-6">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>₹{order.subtotal}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery Charges</span>
            <span>₹{order.deliveryCharges}</span>
          </div>
          <div className="flex justify-between">
            <span>Taxes</span>
            <span>₹{order.taxes}</span>
          </div>
          <div className="flex justify-between font-bold text-lg mt-2">
            <span>Total</span>
            <span>₹{order.total}</span>
          </div>
          <p className="mt-2">Payment: {order.paymentMethod}</p>
        </div>
        
        {/* Actions */}
        {order.orderStatus === 'PENDING' && (
          <div className="mb-4">
            <label className="block mb-2">Preparation Time (minutes)</label>
            <input
              type="number"
              value={preparationTime}
              onChange={(e) => setPreparationTime(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg mb-4"
            />
            <button
              onClick={() => onAccept(order._id, preparationTime)}
              className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700"
            >
              Accept Order
            </button>
          </div>
        )}
        
        {order.orderStatus !== 'PENDING' && order.orderStatus !== 'DELIVERED' && (
          <select
            value={order.orderStatus}
            onChange={(e) => onUpdateStatus(order._id, e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
          >
            <option value="ACCEPTED">Accepted</option>
            <option value="PREPARING">Preparing</option>
            <option value="READY">Ready</option>
            <option value="DELIVERED">Delivered</option>
          </select>
        )}
      </div>
    </div>
  );
}

export default OrderDetailModal;
```

---

## 4.4 Menu Management

### Menu Management Page (`src/pages/admin/MenuManagement.jsx`)
```javascript
import { useState, useEffect } from 'react';
import { getMenuItems, addMenuItem, updateMenuItem, deleteMenuItem, toggleAvailability } from '../../services/adminApi';
import AdminLayout from '../../components/admin/AdminLayout';
import MenuItemForm from '../../components/admin/MenuItemForm';
import toast from 'react-hot-toast';

function MenuManagement() {
  const [menuItems, setMenuItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    fetchMenuItems();
  }, []);

  const fetchMenuItems = async () => {
    try {
      const response = await getMenuItems();
      setMenuItems(response.data.menuItems);
    } catch (error) {
      console.error('Error fetching menu items:', error);
    }
  };

  const handleAddItem = async (formData) => {
    try {
      await addMenuItem(formData);
      toast.success('Menu item added!');
      fetchMenuItems();
      setShowForm(false);
    } catch (error) {
      toast.error('Failed to add item');
    }
  };

  const handleUpdateItem = async (id, formData) => {
    try {
      await updateMenuItem(id, formData);
      toast.success('Menu item updated!');
      fetchMenuItems();
      setShowForm(false);
      setEditingItem(null);
    } catch (error) {
      toast.error('Failed to update item');
    }
  };

  const handleDeleteItem = async (id) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteMenuItem(id);
        toast.success('Menu item deleted!');
        fetchMenuItems();
      } catch (error) {
        toast.error('Failed to delete item');
      }
    }
  };

  const handleToggleAvailability = async (id) => {
    try {
      await toggleAvailability(id);
      toast.success('Availability updated!');
      fetchMenuItems();
    } catch (error) {
      toast.error('Failed to update availability');
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Menu Management</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700"
        >
          Add New Item
        </button>
      </div>
      
      {/* Menu Items Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">Image</th>
              <th className="px-6 py-3 text-left">Name</th>
              <th className="px-6 py-3 text-left">Category</th>
              <th className="px-6 py-3 text-left">Price</th>
              <th className="px-6 py-3 text-left">Type</th>
              <th className="px-6 py-3 text-left">Available</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {menuItems.map(item => (
              <tr key={item._id} className="border-t">
                <td className="px-6 py-4">
                  <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded" />
                </td>
                <td className="px-6 py-4">{item.name}</td>
                <td className="px-6 py-4">{item.category}</td>
                <td className="px-6 py-4">₹{item.price}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${item.isVeg ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {item.isVeg ? 'VEG' : 'NON-VEG'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleToggleAvailability(item._id)}
                    className={`px-3 py-1 rounded ${item.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                  >
                    {item.isAvailable ? 'Available' : 'Unavailable'}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => {
                      setEditingItem(item);
                      setShowForm(true);
                    }}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item._id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Form Modal */}
      {showForm && (
        <MenuItemForm
          item={editingItem}
          onSubmit={editingItem ? handleUpdateItem : handleAddItem}
          onClose={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      )}
    </AdminLayout>
  );
}

export default MenuManagement;
```

---

## 4.5 User Management

### Users Page (`src/pages/admin/Users.jsx`)
```javascript
import { useState, useEffect } from 'react';
import { getUsers, toggleUserBlock, toggleCODBlock } from '../../services/adminApi';
import AdminLayout from '../../components/admin/AdminLayout';
import toast from 'react-hot-toast';

function Users() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [search]);

  const fetchUsers = async () => {
    try {
      const response = await getUsers({ search });
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleToggleBlock = async (userId) => {
    try {
      await toggleUserBlock(userId);
      toast.success('User status updated!');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update user status');
    }
  };

  const handleToggleCOD = async (userId) => {
    try {
      await toggleCODBlock(userId);
      toast.success('COD status updated!');
      fetchUsers();
    } catch (error) {
      toast.error('Failed to update COD status');
    }
  };

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold mb-8">User Management</h1>
      
      {/* Search */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or phone..."
          className="w-full px-4 py-2 border rounded-lg"
        />
      </div>
      
      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">Name</th>
              <th className="px-6 py-3 text-left">Phone</th>
              <th className="px-6 py-3 text-left">Email</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-left">COD</th>
              <th className="px-6 py-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user._id} className="border-t">
                <td className="px-6 py-4">{user.name || 'N/A'}</td>
                <td className="px-6 py-4">{user.phone}</td>
                <td className="px-6 py-4">{user.email || 'N/A'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${user.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {user.isBlocked ? 'Blocked' : 'Active'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${user.isCODBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {user.isCODBlocked ? 'Blocked' : 'Allowed'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleToggleBlock(user._id)}
                    className="text-blue-600 hover:text-blue-800 mr-3"
                  >
                    {user.isBlocked ? 'Unblock' : 'Block'}
                  </button>
                  <button
                    onClick={() => handleToggleCOD(user._id)}
                    className="text-orange-600 hover:text-orange-800"
                  >
                    {user.isCODBlocked ? 'Allow COD' : 'Block COD'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}

export default Users;
```

---

## 4.6 Restaurant Settings

### Settings Page (`src/pages/admin/Settings.jsx`)
```javascript
import { useState, useEffect } from 'react';
import { getRestaurantInfo, updateRestaurant } from '../../services/adminApi';
import AdminLayout from '../../components/admin/AdminLayout';
import toast from 'react-hot-toast';

function Settings() {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchRestaurant();
  }, []);

  const fetchRestaurant = async () => {
    try {
      const response = await getRestaurantInfo();
      setRestaurant(response.data.restaurant);
    } catch (error) {
      console.error('Error fetching restaurant:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await updateRestaurant(restaurant);
      toast.success('Settings updated!');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setLoading(false);
    }
  };

  if (!restaurant) return <div>Loading...</div>;

  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold mb-8">Restaurant Settings</h1>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block mb-2">Restaurant Name</label>
            <input
              type="text"
              value={restaurant.name}
              onChange={(e) => setRestaurant({ ...restaurant, name: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          
          <div>
            <label className="block mb-2">Phone</label>
            <input
              type="tel"
              value={restaurant.phone}
              onChange={(e) => setRestaurant({ ...restaurant, phone: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block mb-2">Description</label>
            <textarea
              value={restaurant.description}
              onChange={(e) => setRestaurant({ ...restaurant, description: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
              rows={3}
            />
          </div>
          
          <div>
            <label className="block mb-2">Delivery Radius (km)</label>
            <input
              type="number"
              value={restaurant.deliveryRadius}
              onChange={(e) => setRestaurant({ ...restaurant, deliveryRadius: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          
          <div>
            <label className="block mb-2">Min Order Amount (₹)</label>
            <input
              type="number"
              value={restaurant.minOrderAmount}
              onChange={(e) => setRestaurant({ ...restaurant, minOrderAmount: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          
          <div>
            <label className="block mb-2">Avg Preparation Time (min)</label>
            <input
              type="number"
              value={restaurant.avgPreparationTime}
              onChange={(e) => setRestaurant({ ...restaurant, avgPreparationTime: e.target.value })}
              className="w-full px-4 py-2 border rounded-lg"
            />
          </div>
          
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={restaurant.isOpen}
                onChange={(e) => setRestaurant({ ...restaurant, isOpen: e.target.checked })}
                className="mr-2"
              />
              Restaurant is Open
            </label>
          </div>
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="mt-6 bg-orange-600 text-white px-8 py-3 rounded-lg hover:bg-orange-700 disabled:bg-gray-400"
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </form>
    </AdminLayout>
  );
}

export default Settings;
```

---

## Checklist

- [ ] Create admin login page
- [ ] Build dashboard with stats cards
- [ ] Create order management page
- [ ] Implement real-time order notifications
- [ ] Build order detail modal
- [ ] Create menu management page
- [ ] Build menu item form with image upload
- [ ] Create user management page
- [ ] Implement user blocking functionality
- [ ] Implement COD blocking
- [ ] Create offers management page
- [ ] Build restaurant settings page
- [ ] Setup admin routing
- [ ] Test all admin features

---

## Next Phase

Proceed to [Phase 5-8: Advanced Features, Testing & Deployment](file:///C:/Users/welcome/.gemini/antigravity/brain/5dae8491-6a0e-49f7-977b-98355a9f8dbe/phase-5-8-final.md)
