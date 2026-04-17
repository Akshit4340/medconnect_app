import 'dotenv/config';
import { Worker } from 'bullmq';
import { connection } from './queues';
import { emailProcessor } from './processors/email.processor';
import { reminderProcessor } from './processors/reminder.processor';
import { notificationProcessor } from './processors/notification.processor';
import { logger } from './logger';

logger.info('Starting BullMQ workers...');

// Email worker
const emailWorker = new Worker('email', emailProcessor, {
  connection,
  concurrency: 5,
});

// Reminder worker
const reminderWorker = new Worker('reminders', reminderProcessor, {
  connection,
  concurrency: 2,
});

// Notification worker
const notificationWorker = new Worker('notifications', notificationProcessor, {
  connection,
  concurrency: 3,
});

// Global event handlers
[emailWorker, reminderWorker, notificationWorker].forEach((worker) => {
  worker.on('completed', (job) => {
    logger.info(`Job completed: ${job.id} in queue ${worker.name}`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`Job failed: ${job?.id} — ${err.message}`, {
      queue: worker.name,
      jobId: job?.id,
      error: err.message,
    });
  });
});

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down...');
  await emailWorker.close();
  await reminderWorker.close();
  await notificationWorker.close();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
