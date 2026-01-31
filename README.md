# Restaurant Ordering Platform

A complete end-to-end restaurant ordering website built with MERN stack, replacing third-party delivery platforms with direct customer ordering.

## Features

### Customer Features
- SMS OTP-based authentication
- Browse menu with filters (category, veg/non-veg, price)
- Shopping cart with real-time updates
- Multiple delivery addresses with map integration
- 10km delivery radius validation
- Online payment (Razorpay) and Cash on Delivery
- Real-time order tracking with countdown timer
- Order history and profile management

### Admin Features
- Dashboard with analytics and statistics
- Real-time order management with notifications
- Menu management (CRUD operations)
- User management (block/unblock, COD control)
- Offers and promotions management
- Restaurant settings configuration

## Tech Stack

### Frontend
- React.js with Vite
- Redux Toolkit for state management
- React Router for navigation
- Tailwind CSS for styling
- React Leaflet for maps
- Socket.io-client for real-time updates

### Backend
- Node.js with Express.js
- MongoDB with Mongoose ODM
- JWT authentication
- Socket.io for real-time features
- Cloudinary for image storage
- Razorpay for payments
- 2Factor.in for SMS OTP

## Project Structure

```
restaurant-ordering-platform/
├── client/          # React frontend
├── server/          # Node.js backend
└── docs/            # Documentation
```


