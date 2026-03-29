import { Job } from 'bullmq';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: Number(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function emailProcessor(job: Job) {
  const { to, subject, html } = job.data as {
    to: string;
    subject: string;
    html: string;
  };

  console.log(`[Email] Sending to ${to}: ${subject}`);

  const info = await transporter.sendMail({
    from: '"MedConnect" <noreply@medconnect.com>',
    to,
    subject,
    html,
  });

  console.log(`[Email] Sent: ${info.messageId}`);
  return { messageId: info.messageId };
}
