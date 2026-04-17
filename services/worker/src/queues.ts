import { Queue } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(
  process.env.REDIS_URL || 'redis://localhost:6379',
  {
    maxRetriesPerRequest: null,
  },
);

export const emailQueue = new Queue('email', { connection });
export const reminderQueue = new Queue('reminders', { connection });
export const notificationQueue = new Queue('notifications', { connection });
export const pdfQueue = new Queue('pdf', { connection });

export { connection };
