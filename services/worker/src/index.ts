import 'dotenv/config';
import { Worker } from 'bullmq';
import { connection } from './queues';
import { emailProcessor } from './processors/email.processor';
import { reminderProcessor } from './processors/reminder.processor';

console.log('[Worker] Starting BullMQ workers...');

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

// Global event handlers
[emailWorker, reminderWorker].forEach((worker) => {
  worker.on('completed', (job) => {
    console.log(`[Worker] Job completed: ${job.id} in queue ${worker.name}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Worker] Job failed: ${job?.id} — ${err.message}`);
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] Shutting down...');
  await emailWorker.close();
  await reminderWorker.close();
  process.exit(0);
});
