import { Job } from 'bullmq';
import { emailQueue } from '../queues';

export async function reminderProcessor(job: Job) {
  const { appointmentId, patientEmail, doctorName, scheduledAt, type } =
    job.data as {
      appointmentId: string;
      patientEmail: string;
      doctorName: string;
      scheduledAt: string;
      type: '24h' | '1h';
    };

  const timeLabel = type === '24h' ? '24 hours' : '1 hour';
  const formattedDate = new Date(scheduledAt).toLocaleString();

  console.log(
    `[Reminder] Sending ${type} reminder for appointment ${appointmentId}`,
  );

  await emailQueue.add('appointment-reminder', {
    to: patientEmail,
    subject: `Reminder: Your appointment is in ${timeLabel}`,
    html: `
      <h2>Appointment Reminder</h2>
      <p>Your appointment is coming up in <strong>${timeLabel}</strong>.</p>
      <p><strong>Doctor:</strong> ${doctorName}</p>
      <p><strong>Date & Time:</strong> ${formattedDate}</p>
      <p>Please be ready 5 minutes before your scheduled time.</p>
    `,
  });

  return { sent: true };
}
