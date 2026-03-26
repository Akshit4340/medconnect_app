import nodemailer from 'nodemailer';
import { logger } from './logger';

// In development, use Ethereal (fake SMTP — no real emails sent)
// In production, swap to SendGrid, SES, or Resend
export async function createTransporter() {
  if (process.env.NODE_ENV === 'development') {
    // Creates a test account automatically
    const testAccount = await nodemailer.createTestAccount();

    logger.info('Ethereal test email account created', {
      user: testAccount.user,
      pass: testAccount.pass,
      previewUrl: 'https://ethereal.email',
    });

    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  }

  // Production transport
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}
