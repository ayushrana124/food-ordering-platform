import mongoose from 'mongoose';
import config from './config';

const connectDB = async (): Promise<void> => {
    try {
        // Tuned for a small single-process deployment (one restaurant, ~100 orders/day).
        // The driver default of 100 pooled sockets is far more than this workload needs
        // and is a real memory cost on a 1 GB box — and more connections than a shared
        // MongoDB Atlas tier will happily grant.
        const conn = await mongoose.connect(config.mongodbUri, {
            // Tunable via MONGO_POOL_SIZE if a burst ever needs more headroom.
            maxPoolSize: parseInt(process.env.MONGO_POOL_SIZE || '10', 10),
            minPoolSize: 1,
            serverSelectionTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            // Close idle sockets so a sleeping restaurant doesn't hold connections all night.
            maxIdleTimeMS: 60000,
            // Reads/writes are small; fail fast rather than queueing forever if Mongo is down.
            waitQueueTimeoutMS: 10000,
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${(error as Error).message}`);
        process.exit(1);
    }
};

export default connectDB;
