import { pgPool } from '../config/database';
import { logger } from '../config/logger';
import { buildCursorPaginatedResult } from '../utils/pagination';
import type {
  Patient,
  CreatePatientInput,
  PaginatedResult,
} from '@medconnect/types';

export async function createPatientProfile(
  tenantId: string,
  userId: string,
  input: CreatePatientInput,
): Promise<Patient> {
  const userResult = await pgPool.query(
    'SELECT id, role FROM users WHERE id = $1 AND tenant_id = $2 AND is_active = true',
    [userId, tenantId],
  );

  if (userResult.rows.length === 0) {
    throw new Error('User not found in this tenant');
  }

  const existing = await pgPool.query(
    'SELECT id FROM patients WHERE tenant_id = $1 AND user_id = $2',
    [tenantId, userId],
  );

  if (existing.rows.length > 0) {
    throw new Error('Patient profile already exists for this user');
  }

  const result = await pgPool.query(
    `INSERT INTO patients
      (tenant_id, user_id, date_of_birth, blood_group, allergies,
       medical_summary, emergency_contact_name, emergency_contact_phone)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      tenantId,
      userId,
      input.dateOfBirth ?? null,
      input.bloodGroup ?? null,
      input.allergies ?? null,
      input.medicalSummary ?? null,
      input.emergencyContactName ?? null,
      input.emergencyContactPhone ?? null,
    ],
  );

  logger.info('Patient profile created', {
    patientId: result.rows[0].id,
    tenantId,
  });
  return mapPatient(result.rows[0]);
}

export async function getPatientById(
  tenantId: string,
  patientId: string,
): Promise<Patient> {
  const result = await pgPool.query(
    `SELECT p.*, u.first_name, u.last_name, u.email
     FROM patients p
     JOIN users u ON u.id = p.user_id
     WHERE p.id = $1 AND p.tenant_id = $2`,
    [patientId, tenantId],
  );

  if (result.rows.length === 0) throw new Error('Patient not found');
  return mapPatient(result.rows[0]);
}

export async function getPatientByUserId(
  tenantId: string,
  userId: string,
): Promise<Patient> {
  const result = await pgPool.query(
    `SELECT p.*, u.first_name, u.last_name, u.email
     FROM patients p
     JOIN users u ON u.id = p.user_id
     WHERE p.user_id = $1 AND p.tenant_id = $2`,
    [userId, tenantId],
  );

  if (result.rows.length === 0) throw new Error('Patient profile not found');
  return mapPatient(result.rows[0]);
}

export async function updatePatientProfile(
  tenantId: string,
  patientId: string,
  input: Partial<CreatePatientInput>,
): Promise<Patient> {
  const setClauses: string[] = ['updated_at = NOW()'];
  const values: unknown[] = [];
  let idx = 1;

  const fieldMap: Record<string, string> = {
    dateOfBirth: 'date_of_birth',
    bloodGroup: 'blood_group',
    allergies: 'allergies',
    medicalSummary: 'medical_summary',
    emergencyContactName: 'emergency_contact_name',
    emergencyContactPhone: 'emergency_contact_phone',
  };

  for (const [key, col] of Object.entries(fieldMap)) {
    if (input[key as keyof typeof input] !== undefined) {
      setClauses.push(`${col} = $${idx++}`);
      values.push(input[key as keyof typeof input]);
    }
  }

  values.push(patientId, tenantId);

  const result = await pgPool.query(
    `UPDATE patients
     SET ${setClauses.join(', ')}
     WHERE id = $${idx++} AND tenant_id = $${idx}
     RETURNING *`,
    values,
  );

  if (result.rows.length === 0) throw new Error('Patient not found');
  return mapPatient(result.rows[0]);
}

export async function listPatients(
  tenantId: string,
  params: { limit?: number; cursor?: string },
): Promise<PaginatedResult<Patient>> {
  const limit = Math.min(params.limit || 20, 100);
  const fetchLimit = limit + 1;
  const conditions = ['p.tenant_id = $1'];
  const values: unknown[] = [tenantId];
  let idx = 2;

  if (params.cursor) {
    conditions.push(`p.id > $${idx++}`);
    values.push(params.cursor);
  }

  values.push(fetchLimit);

  const result = await pgPool.query(
    `SELECT p.*, u.first_name, u.last_name, u.email
     FROM patients p
     JOIN users u ON u.id = p.user_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY p.id
     LIMIT $${idx}`,
    values,
  );

  return buildCursorPaginatedResult(result.rows.map(mapPatient), limit);
}

function mapPatient(row: Record<string, unknown>): Patient {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    userId: row.user_id as string,
    dateOfBirth: row.date_of_birth as Date | undefined,
    bloodGroup: row.blood_group as string | undefined,
    allergies: row.allergies as string[] | undefined,
    medicalSummary: row.medical_summary as string | undefined,
    emergencyContactName: row.emergency_contact_name as string | undefined,
    emergencyContactPhone: row.emergency_contact_phone as string | undefined,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}
