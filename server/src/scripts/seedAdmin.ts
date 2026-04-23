/**
 * Seed Admin Script
 * Creates a default admin account and restaurant if none exist.
 *
 * Usage:
 *   npx ts-node src/scripts/seedAdmin.ts
 *
 * Environment:
 *   Requires MONGODB_URI in .env
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import config from '../config/config';
import Admin from '../models/Admin';
import Restaurant from '../models/Restaurant';

const DEFAULTS = {
    admin: {
        name: 'DiamondPizza',
        email: 'admin@diamondpizza.com',
        password: 'Admin@123',
        role: 'OWNER' as const,
    },
    restaurant: {
        name: 'Diamond Pizza and Restaurant',
        description: 'Fresh, handcrafted food delivered to your doorstep',
        address: {
            addressLine: 'Near IndianOil Petrol Pump, Mooradabad Road, Noorpur',
            coordinates: { lat: 28.6139, lng: 77.209 },
        },
        phone: '+91 98765 43210',
        isOpen: true,
        deliveryRadius: 10,
        minOrderAmount: 40,
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
    },
};

async function seed() {
    try {
        await mongoose.connect(config.mongodbUri);
        console.log('Connected to MongoDB');

        // 1. Restaurant
        await Restaurant.deleteMany({});
        const restaurant = await Restaurant.create(DEFAULTS.restaurant as any);
        console.log('Created default restaurant:', restaurant.name);

        // 2. Admin
        await Admin.deleteMany({});
        const hashedPassword = await bcrypt.hash(DEFAULTS.admin.password, 12);
        await Admin.create({
            ...DEFAULTS.admin,
            password: hashedPassword,
            restaurantId: restaurant._id,
        });
        console.log(`Created admin: ${DEFAULTS.admin.email} / ${DEFAULTS.admin.password}`);

        console.log('\nSeed complete!');
    } catch (err) {
        console.error('Seed failed:', err);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
    }
}

seed();
