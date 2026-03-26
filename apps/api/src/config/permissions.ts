import { UserRole } from '@medconnect/types';

// Define every action in the system
export type Action =
  | 'read:own_profile'
  | 'update:own_profile'
  | 'read:any_profile'
  | 'read:patients'
  | 'read:doctors'
  | 'create:appointment'
  | 'read:own_appointments'
  | 'read:any_appointments'
  | 'update:appointment_status'
  | 'cancel:own_appointment'
  | 'create:medical_note'
  | 'read:own_medical_notes'
  | 'read:any_medical_notes'
  | 'manage:tenant_users'
  | 'read:tenant_stats';

// Map roles to allowed actions
const rolePermissions: Record<UserRole, Action[]> = {
  patient: [
    'read:own_profile',
    'update:own_profile',
    'read:doctors',
    'create:appointment',
    'read:own_appointments',
    'cancel:own_appointment',
    'read:own_medical_notes',
  ],
  doctor: [
    'read:own_profile',
    'update:own_profile',
    'read:any_profile',
    'read:patients',
    'read:doctors',
    'read:any_appointments',
    'update:appointment_status',
    'create:medical_note',
    'read:any_medical_notes',
  ],
  admin: [
    'read:own_profile',
    'update:own_profile',
    'read:any_profile',
    'read:patients',
    'read:doctors',
    'create:appointment',
    'read:own_appointments',
    'read:any_appointments',
    'update:appointment_status',
    'cancel:own_appointment',
    'create:medical_note',
    'read:own_medical_notes',
    'read:any_medical_notes',
    'manage:tenant_users',
    'read:tenant_stats',
  ],
};

export function hasPermission(role: UserRole, action: Action): boolean {
  return rolePermissions[role]?.includes(action) ?? false;
}
