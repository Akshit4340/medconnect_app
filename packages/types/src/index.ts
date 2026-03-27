// ─── Tenant ───────────────────────────────────────────────────────────────────

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  plan: 'free' | 'pro' | 'enterprise';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── User & Roles ─────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'doctor' | 'patient';

export interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Appointment ──────────────────────────────────────────────────────────────

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled';

export interface Appointment {
  id: string;
  tenantId: string;
  doctorId: string;
  patientId: string;
  status: AppointmentStatus;
  scheduledAt: Date;
  durationMinutes: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Doctor ───────────────────────────────────────────────────────────────────

export interface Doctor {
  id: string;
  tenantId: string;
  userId: string;
  specialisation: string;
  licenseNumber: string;
  bio?: string;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Patient ──────────────────────────────────────────────────────────────────

// ─── API Helpers ──────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ─── Request context (used in Express middleware) ─────────────────────────────

export interface TenantContext {
  tenantId: string;
  subdomain: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantSubdomain: string;
}

export interface LoginInput {
  email: string;
  password: string;
  tenantSubdomain: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface JwtPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: UserRole;
  tokenId?: string; // present only in refresh tokens
}

// ─── Doctor ───────────────────────────────────────────────────────────────────

export interface Doctor {
  id: string;
  tenantId: string;
  userId: string;
  specialisation: string;
  licenseNumber: string;
  bio?: string;
  avatarUrl?: string;
  consultationFee: number;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDoctorInput {
  specialisation: string;
  licenseNumber: string;
  bio?: string;
  consultationFee?: number;
}

export interface UpdateDoctorInput {
  specialisation?: string;
  bio?: string;
  consultationFee?: number;
  isAvailable?: boolean;
}

export interface AvailabilitySlot {
  id: string;
  tenantId: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  isActive: boolean;
}

// ─── Patient ──────────────────────────────────────────────────────────────────

export interface Patient {
  id: string;
  tenantId: string;
  userId: string;
  dateOfBirth?: Date;
  bloodGroup?: string;
  allergies?: string[];
  medicalSummary?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePatientInput {
  dateOfBirth?: string;
  bloodGroup?: string;
  allergies?: string[];
  medicalSummary?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
}

// ─── Appointment ──────────────────────────────────────────────────────────────

export interface Appointment {
  id: string;
  tenantId: string;
  doctorId: string;
  patientId: string;
  status: AppointmentStatus;
  scheduledAt: Date;
  durationMinutes: number;
  notes?: string;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAppointmentInput {
  doctorId: string;
  scheduledAt: string;
  durationMinutes?: number;
  notes?: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginationParams {
  limit?: number;
  cursor?: string;
}

export interface PaginatedResult<T> {
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
  total: number;
}
