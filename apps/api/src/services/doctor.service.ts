import { pgPool } from '../config/database';
import { logger } from '../config/logger';
import {
  getPaginationParams,
  buildCursorPaginatedResult,
} from '../utils/pagination';
import type {
  Doctor,
  CreateDoctorInput,
  UpdateDoctorInput,
  AvailabilitySlot,
  PaginatedResult,
} from '@medconnect/types';

// ─── Create doctor profile ────────────────────────────────────────────────────

export async function createDoctorProfile(
  tenantId: string,
  userId: string,
  input: CreateDoctorInput,
): Promise<Doctor> {
  // Verify user exists and belongs to tenant
  const userResult = await pgPool.query(
    `SELECT id, role FROM users
     WHERE id = $1 AND tenant_id = $2 AND is_active = true`,
    [userId, tenantId],
  );

  if (userResult.rows.length === 0) {
    throw new Error('User not found in this tenant');
  }

  if (userResult.rows[0].role !== 'doctor') {
    throw new Error('User must have doctor role to create a doctor profile');
  }

  // Check for duplicate license number within tenant
  const existing = await pgPool.query(
    'SELECT id FROM doctors WHERE tenant_id = $1 AND license_number = $2',
    [tenantId, input.licenseNumber],
  );

  if (existing.rows.length > 0) {
    throw new Error('License number already registered in this tenant');
  }

  const result = await pgPool.query(
    `INSERT INTO doctors
      (tenant_id, user_id, specialisation, license_number, bio, consultation_fee)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      tenantId,
      userId,
      input.specialisation,
      input.licenseNumber,
      input.bio ?? null,
      input.consultationFee ?? 0,
    ],
  );

  logger.info('Doctor profile created', {
    doctorId: result.rows[0].id,
    tenantId,
  });
  return mapDoctor(result.rows[0]);
}

// ─── Get doctor by ID ─────────────────────────────────────────────────────────

export async function getDoctorById(
  tenantId: string,
  doctorId: string,
): Promise<Doctor> {
  const result = await pgPool.query(
    `SELECT d.*, u.first_name, u.last_name, u.email
     FROM doctors d
     JOIN users u ON u.id = d.user_id
     WHERE d.id = $1 AND d.tenant_id = $2`,
    [doctorId, tenantId],
  );

  if (result.rows.length === 0) {
    throw new Error('Doctor not found');
  }

  return mapDoctor(result.rows[0]);
}

// ─── Update doctor profile ────────────────────────────────────────────────────

export async function updateDoctorProfile(
  tenantId: string,
  doctorId: string,
  input: UpdateDoctorInput,
): Promise<Doctor> {
  const setClauses: string[] = ['updated_at = NOW()'];
  const values: unknown[] = [];
  let idx = 1;

  if (input.specialisation !== undefined) {
    setClauses.push(`specialisation = $${idx++}`);
    values.push(input.specialisation);
  }
  if (input.bio !== undefined) {
    setClauses.push(`bio = $${idx++}`);
    values.push(input.bio);
  }
  if (input.consultationFee !== undefined) {
    setClauses.push(`consultation_fee = $${idx++}`);
    values.push(input.consultationFee);
  }
  if (input.isAvailable !== undefined) {
    setClauses.push(`is_available = $${idx++}`);
    values.push(input.isAvailable);
  }

  values.push(doctorId, tenantId);

  const result = await pgPool.query(
    `UPDATE doctors
     SET ${setClauses.join(', ')}
     WHERE id = $${idx++} AND tenant_id = $${idx}
     RETURNING *`,
    values,
  );

  if (result.rows.length === 0) {
    throw new Error('Doctor not found');
  }

  return mapDoctor(result.rows[0]);
}

// ─── Search doctors ───────────────────────────────────────────────────────────

export async function searchDoctors(
  tenantId: string,
  filters: {
    specialisation?: string;
    isAvailable?: boolean;
    cursor?: string;
    limit?: number;
  },
): Promise<PaginatedResult<Doctor>> {
  const { limit = 20, cursor } = filters;
  const fetchLimit = limit + 1; // fetch one extra to detect hasMore

  const conditions: string[] = ['d.tenant_id = $1'];
  const values: unknown[] = [tenantId];
  let idx = 2;

  if (filters.specialisation) {
    conditions.push(`d.specialisation ILIKE $${idx++}`);
    values.push(`%${filters.specialisation}%`);
  }

  if (filters.isAvailable !== undefined) {
    conditions.push(`d.is_available = $${idx++}`);
    values.push(filters.isAvailable);
  }

  if (cursor) {
    conditions.push(`d.id > $${idx++}`);
    values.push(cursor);
  }

  values.push(fetchLimit);

  const result = await pgPool.query(
    `SELECT d.*, u.first_name, u.last_name, u.email
     FROM doctors d
     JOIN users u ON u.id = d.user_id
     WHERE ${conditions.join(' AND ')}
     ORDER BY d.id
     LIMIT $${idx}`,
    values,
  );

  return buildCursorPaginatedResult(result.rows.map(mapDoctor), limit);
}

// ─── Availability slots ───────────────────────────────────────────────────────

export async function setAvailabilitySlots(
  tenantId: string,
  doctorId: string,
  slots: Omit<AvailabilitySlot, 'id' | 'tenantId' | 'doctorId' | 'isActive'>[],
): Promise<AvailabilitySlot[]> {
  const client = await pgPool.connect();

  try {
    await client.query('BEGIN');

    // Delete existing slots for this doctor
    await client.query(
      'DELETE FROM availability_slots WHERE doctor_id = $1 AND tenant_id = $2',
      [doctorId, tenantId],
    );

    if (slots.length === 0) {
      await client.query('COMMIT');
      return [];
    }

    // Insert all new slots
    const insertedSlots: AvailabilitySlot[] = [];

    for (const slot of slots) {
      const result = await client.query(
        `INSERT INTO availability_slots
          (tenant_id, doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          tenantId,
          doctorId,
          slot.dayOfWeek,
          slot.startTime,
          slot.endTime,
          slot.slotDurationMinutes,
        ],
      );
      insertedSlots.push(mapSlot(result.rows[0]));
    }

    await client.query('COMMIT');
    logger.info('Availability slots updated', {
      doctorId,
      count: slots.length,
    });
    return insertedSlots;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getDoctorSlots(
  tenantId: string,
  doctorId: string,
): Promise<AvailabilitySlot[]> {
  const result = await pgPool.query(
    `SELECT * FROM availability_slots
     WHERE doctor_id = $1 AND tenant_id = $2 AND is_active = true
     ORDER BY day_of_week, start_time`,
    [doctorId, tenantId],
  );
  return result.rows.map(mapSlot);
}

// ─── Update avatar URL ────────────────────────────────────────────────────────

export async function updateDoctorAvatar(
  tenantId: string,
  doctorId: string,
  avatarUrl: string,
): Promise<void> {
  await pgPool.query(
    'UPDATE doctors SET avatar_url = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3',
    [avatarUrl, doctorId, tenantId],
  );
}

// ─── Row mappers ──────────────────────────────────────────────────────────────

function mapDoctor(row: Record<string, unknown>): Doctor {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    userId: row.user_id as string,
    specialisation: row.specialisation as string,
    licenseNumber: row.license_number as string,
    bio: row.bio as string | undefined,
    avatarUrl: row.avatar_url as string | undefined,
    consultationFee: Number(row.consultation_fee),
    isAvailable: row.is_available as boolean,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}

function mapSlot(row: Record<string, unknown>): AvailabilitySlot {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    doctorId: row.doctor_id as string,
    dayOfWeek: row.day_of_week as number,
    startTime: row.start_time as string,
    endTime: row.end_time as string,
    slotDurationMinutes: row.slot_duration_minutes as number,
    isActive: row.is_active as boolean,
  };
}
