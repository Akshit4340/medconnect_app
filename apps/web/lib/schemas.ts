import { z } from 'zod/v3';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  tenantSubdomain: z.string().min(1, 'Clinic subdomain is required'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['patient', 'doctor']),
  tenantSubdomain: z.string().min(1, 'Clinic subdomain is required'),
});

export const bookingSchema = z.object({
  doctorId: z.string().uuid('Invalid doctor'),
  scheduledAt: z.string().min(1, 'Please select a time slot'),
  durationMinutes: z.number().default(30),
  notes: z.string().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type BookingInput = z.infer<typeof bookingSchema>;
