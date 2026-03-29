import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { logger } from './logger';

const bullConnection = new Redis(
  process.env.REDIS_URL || 'redis://localhost:6379',
  {
    maxRetriesPerRequest: null,
  },
);

bullConnection.on('error', (err) => {
  logger.error('BullMQ Redis connection error', { error: err.message });
});

export const emailQueue = new Queue('email', { connection: bullConnection });
export const reminderQueue = new Queue('reminders', {
  connection: bullConnection,
});
export const pdfQueue = new Queue('pdf', { connection: bullConnection });

// Schedule appointment reminders when booking is confirmed
export async function scheduleAppointmentReminders(data: {
  appointmentId: string;
  patientEmail: string;
  doctorName: string;
  scheduledAt: string;
}): Promise<void> {
  const appointmentTime = new Date(data.scheduledAt).getTime();
  const now = Date.now();

  // 24-hour reminder
  const delay24h = appointmentTime - now - 24 * 60 * 60 * 1000;
  if (delay24h > 0) {
    await reminderQueue.add(
      'reminder-24h',
      { ...data, type: '24h' },
      {
        delay: delay24h,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        jobId: `reminder-24h-${data.appointmentId}`,
      },
    );
  }

  // 1-hour reminder
  const delay1h = appointmentTime - now - 60 * 60 * 1000;
  if (delay1h > 0) {
    await reminderQueue.add(
      'reminder-1h',
      { ...data, type: '1h' },
      {
        delay: delay1h,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        jobId: `reminder-1h-${data.appointmentId}`,
      },
    );
  }
}
