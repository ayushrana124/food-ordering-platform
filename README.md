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

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB Atlas account
- Cloudinary account
- Razorpay account
- 2Factor.in account

### Installation

1. Clone the repository
```bash
git clone <repository-url>
cd BuntyPizza
```

2. Install backend dependencies
```bash
cd server
npm install
```

3. Install frontend dependencies
```bash
cd ../client
npm install
```

4. Configure environment variables (see .env.example files)

5. Run development servers
```bash
# Backend (from server directory)
npm run dev

# Frontend (from client directory)
npm run dev
```

## Documentation

Detailed implementation guides are available in the `docs/implementation-guide/` directory:
- Phase 1: Project Setup & Architecture
- Phase 2: Backend API Development
- Phase 3: Customer Frontend
- Phase 4: Admin Dashboard
- Phase 5-8: Advanced Features, Testing & Deployment

## License

MIT

## Author

Built for BuntyPizza
