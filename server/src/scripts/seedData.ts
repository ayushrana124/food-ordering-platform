/**
 * Seed Data Script
 * Creates admin, restaurant, and sample menu items for testing.
 *
 * Usage:
 *   npx ts-node src/scripts/seedData.ts
 *
 * Environment:
 *   Requires MONGODB_URI in .env
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import config from '../config/config';
import Admin from '../models/Admin';
import Restaurant from '../models/Restaurant';
import MenuItem from '../models/MenuItem';
import Offer from '../models/Offer';
import Category from '../models/Category';

async function seed() {
    try {
        await mongoose.connect(config.mongodbUri);
        console.log('✅ Connected to MongoDB\n');

        // ── 1. Restaurant ───────────────────────────────────────────────────
        let restaurant = await Restaurant.findOne();
        if (restaurant) {
            console.log('🏪 Restaurant already exists — skipping');
        } else {
            restaurant = await Restaurant.create({
                name: 'Bunty Pizza & Restaurant',
                description: 'Fresh, handcrafted pizzas & more — delivered to your doorstep',
                address: {
                    addressLine: '42 Main Street, New Delhi',
                    coordinates: { lat: 28.6139, lng: 77.209 },
                },
                phone: '+91 98765 43210',
                isOpen: true,
                deliveryRadius: 10,
                minOrderAmount: 149,
                avgPreparationTime: 30,
                openingHours: {
                    monday: { open: '10:00', close: '23:00', isOpen: true },
                    tuesday: { open: '10:00', close: '23:00', isOpen: true },
                    wednesday: { open: '10:00', close: '23:00', isOpen: true },
                    thursday: { open: '10:00', close: '23:00', isOpen: true },
                    friday: { open: '10:00', close: '23:00', isOpen: true },
                    saturday: { open: '10:00', close: '23:00', isOpen: true },
                    sunday: { open: '10:00', close: '23:00', isOpen: true },
                },
            } as any);
            console.log('🏪 Created restaurant:', restaurant.name);
        }

        const restaurantId = restaurant._id;

        // 2. Admin — delete & recreate to ensure correct password
        const adminEmail = 'admin@buntypizza.com';
        const adminPassword = 'Admin@123';
        await Admin.deleteOne({ email: adminEmail });
        await Admin.create({
            name: 'Admin',
            email: adminEmail,
            password: adminPassword, // pre-save hook will hash this
            role: 'OWNER',
            restaurantId,
        });
        console.log(`👤 Created admin: ${adminEmail} / ${adminPassword}`);

        // ── 3. Menu Items ───────────────────────────────────────────────────
        const existingItems = await MenuItem.countDocuments({ restaurantId });
        if (existingItems > 0) {
            console.log(`🍕 ${existingItems} menu items already exist — skipping`);
        } else {
            const items = [
                // ── Pizzas ──
                {
                    restaurantId,
                    name: 'Margherita Pizza',
                    description: 'Classic cheese pizza with fresh mozzarella, tangy tomato sauce, and basil',
                    category: 'Pizzas',
                    price: 199,
                    isVeg: true,
                    isAvailable: true,
                    image: 'https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400',
                    customizations: [
                        {
                            name: 'Size',
                            options: [
                                { name: 'Regular', price: 0 },
                                { name: 'Medium', price: 80 },
                                { name: 'Large', price: 150 },
                            ],
                            required: true,
                        },
                        {
                            name: 'Crust',
                            options: [
                                { name: 'Thin Crust', price: 0 },
                                { name: 'Cheese Burst', price: 60 },
                                { name: 'Pan Crust', price: 30 },
                            ],
                            required: false,
                        },
                    ],
                },
                {
                    restaurantId,
                    name: 'Pepperoni Pizza',
                    description: 'Loaded with spicy pepperoni, mozzarella cheese, and classic pizza sauce',
                    category: 'Pizzas',
                    price: 299,
                    isVeg: false,
                    isAvailable: true,
                    image: 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400',
                    customizations: [
                        {
                            name: 'Size',
                            options: [
                                { name: 'Regular', price: 0 },
                                { name: 'Medium', price: 80 },
                                { name: 'Large', price: 150 },
                            ],
                            required: true,
                        },
                    ],
                },
                {
                    restaurantId,
                    name: 'Farmhouse Pizza',
                    description: 'Loaded with capsicum, onion, tomato, mushroom, and crispy corn',
                    category: 'Pizzas',
                    price: 249,
                    isVeg: true,
                    isAvailable: true,
                    image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400',
                    customizations: [
                        {
                            name: 'Size',
                            options: [
                                { name: 'Regular', price: 0 },
                                { name: 'Medium', price: 80 },
                                { name: 'Large', price: 150 },
                            ],
                            required: true,
                        },
                    ],
                },
                {
                    restaurantId,
                    name: 'BBQ Chicken Pizza',
                    description: 'Smoky BBQ sauce, grilled chicken, onion rings, and mozzarella',
                    category: 'Pizzas',
                    price: 349,
                    isVeg: false,
                    isAvailable: true,
                    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400',
                    customizations: [
                        {
                            name: 'Size',
                            options: [
                                { name: 'Regular', price: 0 },
                                { name: 'Medium', price: 80 },
                                { name: 'Large', price: 150 },
                            ],
                            required: true,
                        },
                    ],
                },

                // ── Burgers ──
                {
                    restaurantId,
                    name: 'Classic Veg Burger',
                    description: 'Crunchy veg patty with lettuce, tomato, onion, and special sauce',
                    category: 'Burgers',
                    price: 129,
                    isVeg: true,
                    isAvailable: true,
                    image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=400',
                    customizations: [
                        {
                            name: 'Add-ons',
                            options: [
                                { name: 'Extra Cheese', price: 30 },
                                { name: 'Jalapenos', price: 20 },
                            ],
                            required: false,
                        },
                    ],
                },
                {
                    restaurantId,
                    name: 'Chicken Zinger Burger',
                    description: 'Crispy fried chicken fillet with coleslaw and chipotle mayo',
                    category: 'Burgers',
                    price: 179,
                    isVeg: false,
                    isAvailable: true,
                    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400',
                    customizations: [
                        {
                            name: 'Add-ons',
                            options: [
                                { name: 'Extra Cheese', price: 30 },
                                { name: 'Bacon', price: 50 },
                            ],
                            required: false,
                        },
                    ],
                },

                // ── Sides ──
                {
                    restaurantId,
                    name: 'Garlic Bread',
                    description: 'Freshly baked bread with garlic butter and herbs',
                    category: 'Sides',
                    price: 99,
                    isVeg: true,
                    isAvailable: true,
                    image: 'https://images.unsplash.com/photo-1619531040576-f9416740661b?w=400',
                    customizations: [
                        {
                            name: 'Type',
                            options: [
                                { name: 'Plain', price: 0 },
                                { name: 'With Cheese', price: 40 },
                            ],
                            required: false,
                        },
                    ],
                },
                {
                    restaurantId,
                    name: 'French Fries',
                    description: 'Crispy golden fries with ketchup',
                    category: 'Sides',
                    price: 89,
                    isVeg: true,
                    isAvailable: true,
                    image: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400',
                    customizations: [
                        {
                            name: 'Seasoning',
                            options: [
                                { name: 'Classic Salt', price: 0 },
                                { name: 'Peri Peri', price: 15 },
                                { name: 'Cheese Loaded', price: 40 },
                            ],
                            required: false,
                        },
                    ],
                },
                {
                    restaurantId,
                    name: 'Chicken Wings (6 pcs)',
                    description: 'Spicy buffalo wings served with ranch dip',
                    category: 'Sides',
                    price: 199,
                    isVeg: false,
                    isAvailable: true,
                    image: 'https://images.unsplash.com/photo-1608039829572-9b0189cf38c3?w=400',
                    customizations: [],
                },

                // ── Beverages ──
                {
                    restaurantId,
                    name: 'Coca-Cola (300ml)',
                    description: 'Chilled, refreshing Coca-Cola',
                    category: 'Beverages',
                    price: 40,
                    isVeg: true,
                    isAvailable: true,
                    image: 'https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400',
                    customizations: [],
                },
                {
                    restaurantId,
                    name: 'Mango Lassi',
                    description: 'Thick mango yogurt shake topped with a dash of cardamom',
                    category: 'Beverages',
                    price: 79,
                    isVeg: true,
                    isAvailable: true,
                    image: 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=400',
                    customizations: [],
                },
                {
                    restaurantId,
                    name: 'Cold Coffee',
                    description: 'Creamy iced coffee blended with milk and chocolate',
                    category: 'Beverages',
                    price: 99,
                    isVeg: true,
                    isAvailable: true,
                    image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400',
                    customizations: [],
                },

                // ── Desserts ──
                {
                    restaurantId,
                    name: 'Chocolate Lava Cake',
                    description: 'Warm chocolate cake with a gooey molten center, served with ice cream',
                    category: 'Desserts',
                    price: 149,
                    isVeg: true,
                    isAvailable: true,
                    image: 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=400',
                    customizations: [],
                },
                {
                    restaurantId,
                    name: 'Gulab Jamun (2 pcs)',
                    description: 'Soft, syrup-soaked milk dumplings',
                    category: 'Desserts',
                    price: 69,
                    isVeg: true,
                    isAvailable: true,
                    image: 'https://images.unsplash.com/photo-1666190070039-b956fdb3a08e?w=400',
                    customizations: [],
                },
            ];

            await MenuItem.insertMany(items);
            console.log(`🍕 Created ${items.length} menu items across ${[...new Set(items.map(i => i.category))].length} categories`);
        }

        // ── 4. Offers ────────────────────────────────────────────────────────
        const existingOffers = await Offer.countDocuments({ restaurantId });
        if (existingOffers > 0) {
            console.log(`🏷️  ${existingOffers} offers already exist — skipping`);
        } else {
            const now = new Date();
            const in90Days = new Date(Date.now() + 90 * 86400000);
            await Offer.insertMany([
                {
                    restaurantId,
                    title: 'Buy 2 Get 1 FREE',
                    description: 'On any pizza from our menu. No minimum order required.',
                    discountType: 'PERCENTAGE',
                    discountValue: 33,
                    minOrderAmount: 0,
                    code: 'B2G1',
                    validFrom: now,
                    validTill: in90Days,
                    isActive: true,
                    label: 'Today Only',
                    headline: 'Buy 2\nGet 1 FREE',
                    ctaText: 'Order Now',
                    colorTheme: '#E8A317',
                },
                {
                    restaurantId,
                    title: '50% Off First Order',
                    description: 'Create an account and place your first online order.',
                    discountType: 'PERCENTAGE',
                    discountValue: 50,
                    minOrderAmount: 0,
                    code: 'FIRST50',
                    validFrom: now,
                    validTill: in90Days,
                    isActive: true,
                    label: 'New User',
                    headline: '50% Off\nFirst Order',
                    ctaText: 'Claim Offer',
                    colorTheme: '#16A34A',
                },
                {
                    restaurantId,
                    title: 'Mega Combo @ ₹599',
                    description: '2 Pizzas + Garlic Bread + 2 Drinks. Serves 4 people comfortably.',
                    discountType: 'FLAT',
                    discountValue: 599,
                    minOrderAmount: 0,
                    code: 'COMBO599',
                    validFrom: now,
                    validTill: in90Days,
                    isActive: true,
                    label: 'Best Value',
                    headline: 'Mega Combo\n@ ₹599',
                    ctaText: 'Build Combo',
                    colorTheme: '#7C3AED',
                },
            ]);
            console.log('🏷️  Created 3 offers');
        }

        // ── 5. Categories ────────────────────────────────────────────────────
        const existingCats = await Category.countDocuments({ restaurantId });
        if (existingCats > 0) {
            console.log(`📂 ${existingCats} categories already exist — skipping`);
        } else {
            await Category.insertMany([
                { restaurantId, name: 'Pizzas', icon: 'Pizza', displayOrder: 0, colorScheme: { bg: '#FFFCF5', border: '#F0CA5A', color: '#9A7209', iconBg: '#FFFBF0' } },
                { restaurantId, name: 'Sides', icon: 'Utensils', displayOrder: 1, colorScheme: { bg: '#F0FAF4', border: '#86EFAC', color: '#16A34A', iconBg: '#DCFCE7' } },
                { restaurantId, name: 'Desserts', icon: 'Cake', displayOrder: 2, colorScheme: { bg: '#FDF2F8', border: '#F0ABFC', color: '#A21CAF', iconBg: '#FAE8FF' } },
                { restaurantId, name: 'Beverages', icon: 'Coffee', displayOrder: 3, colorScheme: { bg: '#EFF6FF', border: '#93C5FD', color: '#2563EB', iconBg: '#DBEAFE' } },
                { restaurantId, name: 'Value Deals', icon: 'Tag', displayOrder: 4, colorScheme: { bg: '#FFF7ED', border: '#FDBA74', color: '#EA580C', iconBg: '#FFEDD5' } },
                { restaurantId, name: 'Combos', icon: 'Package', displayOrder: 5, colorScheme: { bg: '#F5F3FF', border: '#C4B5FD', color: '#7C3AED', iconBg: '#EDE9FE' } },
                { restaurantId, name: 'Just Launched', icon: 'Zap', displayOrder: 6, colorScheme: { bg: '#ECFDF5', border: '#6EE7B7', color: '#059669', iconBg: '#D1FAE5' } },
                { restaurantId, name: 'Bestsellers', icon: 'Star', displayOrder: 7, colorScheme: { bg: '#FFFBEB', border: '#FCD34D', color: '#D97706', iconBg: '#FEF3C7' } },
            ]);
            console.log('📂 Created 8 categories');
        }

        console.log('\n🎉 Seed complete!');
        console.log('──────────────────────────────────────');
        console.log('Admin login:  admin@buntypizza.com / Admin@123');
        console.log('Admin panel:  http://localhost:5173/admin/login');
        console.log('Customer app: http://localhost:5173/menu');
        console.log('──────────────────────────────────────');
    } catch (err) {
        console.error('❌ Seed failed:', err);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

seed();
