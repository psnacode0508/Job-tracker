import dns from 'node:dns';
dns.setServers(['8.8.8.8', '1.1.1.1']);

import mongoose from 'mongoose';

// Enable NoSQL injection protection globally
mongoose.set('sanitizeFilter', true);

/**
 * Connect to MongoDB database.
 * Logs connection host on success.
 * Exits process with code 1 on failure.
 */
export const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!uri) {
      throw new Error('Missing MONGODB_URI / MONGO_URI environment variable');
    }

    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
