export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  createdAt: Date;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  role: 'admin' | 'doctor' | 'patient';
  createdAt: Date;
}

export interface Appointment {
  id: string;
  tenantId: string;
  doctorId: string;
  patientId: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  scheduledAt: Date;
}
