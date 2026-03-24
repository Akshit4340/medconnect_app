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

export interface Patient {
  id: string;
  tenantId: string;
  userId: string;
  dateOfBirth: Date;
  bloodGroup?: string;
  allergies?: string[];
  createdAt: Date;
  updatedAt: Date;
}

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
