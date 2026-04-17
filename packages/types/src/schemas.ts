import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleSchema = z.enum(['admin', 'doctor', 'patient']);

export const appointmentStatusSchema = z.enum([
  'pending',
  'confirmed',
  'completed',
  'cancelled',
]);

// ─── Auth schemas ─────────────────────────────────────────────────────────────

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
  role: userRoleSchema.exclude(['admin']),
  tenantSubdomain: z.string().min(1, 'Clinic subdomain is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
  tenantSubdomain: z.string().min(1, 'Clinic subdomain is required'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

// ─── Doctor schemas ───────────────────────────────────────────────────────────

export const createDoctorSchema = z.object({
  specialisation: z.string().min(1, 'Specialisation is required'),
  licenseNumber: z.string().min(1, 'License number is required'),
  bio: z.string().optional(),
  consultationFee: z.number().min(0).optional(),
});

export const updateDoctorSchema = z.object({
  specialisation: z.string().min(1).optional(),
  bio: z.string().optional(),
  consultationFee: z.number().min(0).optional(),
  isAvailable: z.boolean().optional(),
});

export const availabilitySlotSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Must be HH:MM format'),
  slotDurationMinutes: z.number().min(5).max(120),
});

// ─── Patient schemas ──────────────────────────────────────────────────────────

export const createPatientSchema = z.object({
  dateOfBirth: z.string().optional(),
  bloodGroup: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  medicalSummary: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
});

// ─── Appointment schemas ──────────────────────────────────────────────────────

export const createAppointmentSchema = z.object({
  doctorId: z.string().uuid('Invalid doctor ID'),
  scheduledAt: z.string().min(1, 'Please select a time slot'),
  durationMinutes: z.number().min(5).max(120).default(30),
  notes: z.string().optional(),
});

// ─── SOAP Note schemas ────────────────────────────────────────────────────────

export const soapNoteSchema = z.object({
  subjective: z.string().min(1, 'Subjective section is required'),
  objective: z.string().min(1, 'Objective section is required'),
  assessment: z.string().min(1, 'Assessment section is required'),
  plan: z.string().min(1, 'Plan section is required'),
});

// ─── Prescription schemas ─────────────────────────────────────────────────────

export const medicationSchema = z.object({
  name: z.string().min(1, 'Medication name is required'),
  dosage: z.string().min(1, 'Dosage is required'),
  frequency: z.string().min(1, 'Frequency is required'),
  duration: z.string().min(1, 'Duration is required'),
});

export const createPrescriptionSchema = z.object({
  appointmentId: z.string().uuid(),
  doctorId: z.string().uuid(),
  patientId: z.string().uuid(),
  medications: z
    .array(medicationSchema)
    .min(1, 'At least one medication required'),
  instructions: z.string().optional(),
  validUntil: z.string().optional(),
});

// ─── File upload schemas ──────────────────────────────────────────────────────

export const fileUploadRequestSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  category: z
    .enum(['medical-document', 'lab-report', 'imaging', 'other'])
    .default('other'),
  appointmentId: z.string().uuid().optional(),
  patientId: z.string().uuid().optional(),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type LoginSchemaInput = z.infer<typeof loginSchema>;
export type RegisterSchemaInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateDoctorSchemaInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorSchemaInput = z.infer<typeof updateDoctorSchema>;
export type AvailabilitySlotInput = z.infer<typeof availabilitySlotSchema>;
export type CreatePatientSchemaInput = z.infer<typeof createPatientSchema>;
export type CreateAppointmentSchemaInput = z.infer<
  typeof createAppointmentSchema
>;
export type SoapNoteInput = z.infer<typeof soapNoteSchema>;
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type FileUploadRequestInput = z.infer<typeof fileUploadRequestSchema>;
