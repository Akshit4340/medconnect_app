import mongoose from 'mongoose';
import { logger } from './logger';

export async function connectMongoDB(): Promise<void> {
  const url = process.env.MONGODB_URL || 'mongodb://localhost:27017/medconnect';

  try {
    await mongoose.connect(url);
    logger.info('MongoDB connected');
  } catch (err) {
    logger.error('MongoDB connection failed', { err });
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB error', { err });
  });
}
