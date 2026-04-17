import { Job } from 'bullmq';
import { emailQueue } from '../queues';

interface NotificationData {
  type:
    | 'appointment_confirmed'
    | 'appointment_cancelled'
    | 'appointment_reminder'
    | 'general';
  recipientEmail: string;
  recipientName: string;
  title: string;
  message: string;
  metadata?: Record<string, string>;
}

export async function notificationProcessor(
  job: Job,
): Promise<{ sent: boolean }> {
  const data = job.data as NotificationData;

  console.log(
    `[Notification] Processing ${data.type} notification for ${data.recipientEmail}`,
  );

  const htmlByType: Record<string, string> = {
    appointment_confirmed: `
      <h2>Appointment Confirmed</h2>
      <p>Hi ${data.recipientName},</p>
      <p>${data.message}</p>
      <p>You can manage your appointment from your MedConnect dashboard.</p>
    `,
    appointment_cancelled: `
      <h2>Appointment Cancelled</h2>
      <p>Hi ${data.recipientName},</p>
      <p>${data.message}</p>
      <p>If you need to rebook, please visit your MedConnect dashboard.</p>
    `,
    appointment_reminder: `
      <h2>Appointment Reminder</h2>
      <p>Hi ${data.recipientName},</p>
      <p>${data.message}</p>
      <p>Please be ready 5 minutes before your scheduled time.</p>
    `,
    general: `
      <h2>${data.title}</h2>
      <p>Hi ${data.recipientName},</p>
      <p>${data.message}</p>
    `,
  };

  const html = htmlByType[data.type] || htmlByType.general;

  // Dispatch via email queue
  await emailQueue.add(
    'notification-email',
    {
      to: data.recipientEmail,
      subject: data.title,
      html,
    },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    },
  );

  console.log(
    `[Notification] Dispatched email for ${data.type} to ${data.recipientEmail}`,
  );

  return { sent: true };
}
