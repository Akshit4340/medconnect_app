import { pgPool } from '../../config/database';
import { logger } from '../../config/logger';
import { buildCursorPaginatedResult } from '../../shared/utils/pagination';
import type {
  Appointment,
  AppointmentStatus,
  CreateAppointmentInput,
  PaginatedResult,
} from '@medconnect/types';

// ─── Create appointment with conflict detection ───────────────────────────────

export async function createAppointment(
  tenantId: string,
  patientUserId: string,
  input: CreateAppointmentInput,
): Promise<Appointment> {
  const client = await pgPool.connect();

  try {
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');

    // 1. Verify doctor exists in tenant and lock the doctor row to serialize bookings
    const doctorResult = await client.query(
      'SELECT id FROM doctors WHERE id = $1 AND tenant_id = $2 AND is_available = true FOR UPDATE',
      [input.doctorId, tenantId],
    );

    if (doctorResult.rows.length === 0) {
      throw new Error('Doctor not found or unavailable');
    }

    // 2. Get patient profile
    const patientResult = await client.query(
      'SELECT id FROM patients WHERE user_id = $1 AND tenant_id = $2',
      [patientUserId, tenantId],
    );

    if (patientResult.rows.length === 0) {
      throw new Error(
        'Patient profile not found. Please create your profile first.',
      );
    }

    const patientId = patientResult.rows[0].id;
    const duration = input.durationMinutes ?? 30;
    const scheduledAt = new Date(input.scheduledAt);
    const scheduledEnd = new Date(scheduledAt.getTime() + duration * 60000);

    // 3. Conflict detection with SELECT FOR UPDATE (row-level lock)
    // Locks the doctor's appointments to prevent double-booking
    const conflict = await client.query(
      `SELECT id FROM appointments
       WHERE doctor_id = $1
         AND tenant_id = $2
         AND status NOT IN ('cancelled')
         AND scheduled_at < $3
         AND (scheduled_at + (duration_minutes || ' minutes')::interval) > $4
       FOR UPDATE`,
      [input.doctorId, tenantId, scheduledEnd, scheduledAt],
    );

    if (conflict.rows.length > 0) {
      throw new Error(
        'This time slot is already booked. Please choose another time.',
      );
    }

    // 4. Create appointment
    const result = await client.query(
      `INSERT INTO appointments
        (tenant_id, doctor_id, patient_id, status, scheduled_at, duration_minutes, notes)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6)
       RETURNING *`,
      [
        tenantId,
        input.doctorId,
        patientId,
        scheduledAt,
        duration,
        input.notes ?? null,
      ],
    );

    await client.query('COMMIT');

    logger.info('Appointment created', {
      appointmentId: result.rows[0].id,
      doctorId: input.doctorId,
      patientId,
    });

    return mapAppointment(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Update appointment status (state machine) ────────────────────────────────

const validTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

export async function updateAppointmentStatus(
  tenantId: string,
  appointmentId: string,
  newStatus: AppointmentStatus,
  cancellationReason?: string,
): Promise<Appointment> {
  // Get current status
  const current = await pgPool.query(
    'SELECT status FROM appointments WHERE id = $1 AND tenant_id = $2',
    [appointmentId, tenantId],
  );

  if (current.rows.length === 0) throw new Error('Appointment not found');

  const currentStatus = current.rows[0].status as AppointmentStatus;
  const allowed = validTransitions[currentStatus];

  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Cannot transition from '${currentStatus}' to '${newStatus}'. ` +
        `Allowed: ${allowed.join(', ') || 'none'}`,
    );
  }

  const result = await pgPool.query(
    `UPDATE appointments
     SET status = $1,
         cancellation_reason = $2,
         updated_at = NOW()
     WHERE id = $3 AND tenant_id = $4
     RETURNING *`,
    [newStatus, cancellationReason ?? null, appointmentId, tenantId],
  );

  logger.info('Appointment status updated', {
    appointmentId,
    from: currentStatus,
    to: newStatus,
  });

  return mapAppointment(result.rows[0]);
}

// ─── Get available slots for a doctor on a given date ─────────────────────────

export async function getAvailableSlots(
  tenantId: string,
  doctorId: string,
  date: string,
): Promise<{ startTime: string; endTime: string; available: boolean }[]> {
  const targetDate = new Date(date);
  const dayOfWeek = targetDate.getDay(); // 0=Sun, 6=Sat

  // Get doctor's recurring slots for this day
  const slotsResult = await pgPool.query(
    `SELECT start_time, end_time, slot_duration_minutes
     FROM availability_slots
     WHERE doctor_id = $1 AND tenant_id = $2
       AND day_of_week = $3 AND is_active = true`,
    [doctorId, tenantId, dayOfWeek],
  );

  if (slotsResult.rows.length === 0) return [];

  // Get existing bookings for that day
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const bookings = await pgPool.query(
    `SELECT scheduled_at, duration_minutes FROM appointments
     WHERE doctor_id = $1 AND tenant_id = $2
       AND scheduled_at BETWEEN $3 AND $4
       AND status NOT IN ('cancelled')`,
    [doctorId, tenantId, startOfDay, endOfDay],
  );

  const bookedTimes = bookings.rows.map((b: Record<string, unknown>) => ({
    start: new Date(b.scheduled_at as string).getTime(),
    end:
      new Date(b.scheduled_at as string).getTime() +
      Number(b.duration_minutes) * 60000,
  }));

  // Generate all time slots from recurring schedule
  const result: { startTime: string; endTime: string; available: boolean }[] =
    [];

  for (const slot of slotsResult.rows) {
    const [startH, startM] = (slot.start_time as string).split(':').map(Number);
    const [endH, endM] = (slot.end_time as string).split(':').map(Number);
    const duration = slot.slot_duration_minutes as number;

    let current = new Date(date);
    current.setHours(startH, startM, 0, 0);

    const slotEnd = new Date(date);
    slotEnd.setHours(endH, endM, 0, 0);

    while (current.getTime() + duration * 60000 <= slotEnd.getTime()) {
      const slotStart = current.getTime();
      const slotFinish = slotStart + duration * 60000;

      const isBooked = bookedTimes.some(
        (b) => b.start < slotFinish && b.end > slotStart,
      );

      result.push({
        startTime: current.toISOString(),
        endTime: new Date(slotFinish).toISOString(),
        available: !isBooked,
      });

      current = new Date(slotFinish);
    }
  }

  return result;
}

// ─── List appointments ─────────────────────────────────────────────────────────

export async function listAppointments(
  tenantId: string,
  filters: {
    doctorId?: string;
    patientId?: string;
    status?: AppointmentStatus;
    cursor?: string;
    limit?: number;
  },
): Promise<PaginatedResult<Appointment>> {
  const limit = Math.min(filters.limit || 20, 100);
  const fetchLimit = limit + 1;
  const conditions = ['a.tenant_id = $1'];
  const values: unknown[] = [tenantId];
  let idx = 2;

  if (filters.doctorId) {
    conditions.push(`a.doctor_id = $${idx++}`);
    values.push(filters.doctorId);
  }
  if (filters.patientId) {
    conditions.push(`a.patient_id = $${idx++}`);
    values.push(filters.patientId);
  }
  if (filters.status) {
    conditions.push(`a.status = $${idx++}`);
    values.push(filters.status);
  }
  if (filters.cursor) {
    conditions.push(`a.id > $${idx++}`);
    values.push(filters.cursor);
  }

  values.push(fetchLimit);

  const result = await pgPool.query(
    `SELECT a.* FROM appointments a
     WHERE ${conditions.join(' AND ')}
     ORDER BY a.scheduled_at DESC
     LIMIT $${idx}`,
    values,
  );

  return buildCursorPaginatedResult(result.rows.map(mapAppointment), limit);
}

// ─── Admin stats ──────────────────────────────────────────────────────────────

export async function getTenantStats(tenantId: string): Promise<{
  totalUsers: number;
  totalDoctors: number;
  totalPatients: number;
  totalAppointments: number;
  appointmentsByStatus: Record<string, number>;
}> {
  const [users, doctors, patients, appointments, byStatus] = await Promise.all([
    pgPool.query('SELECT COUNT(*) FROM users WHERE tenant_id = $1', [tenantId]),
    pgPool.query('SELECT COUNT(*) FROM doctors WHERE tenant_id = $1', [
      tenantId,
    ]),
    pgPool.query('SELECT COUNT(*) FROM patients WHERE tenant_id = $1', [
      tenantId,
    ]),
    pgPool.query('SELECT COUNT(*) FROM appointments WHERE tenant_id = $1', [
      tenantId,
    ]),
    pgPool.query(
      `SELECT status, COUNT(*) as count
       FROM appointments WHERE tenant_id = $1
       GROUP BY status`,
      [tenantId],
    ),
  ]);

  const statusMap: Record<string, number> = {};
  for (const row of byStatus.rows) {
    statusMap[row.status as string] = Number(row.count);
  }

  return {
    totalUsers: Number(users.rows[0].count),
    totalDoctors: Number(doctors.rows[0].count),
    totalPatients: Number(patients.rows[0].count),
    totalAppointments: Number(appointments.rows[0].count),
    appointmentsByStatus: statusMap,
  };
}

function mapAppointment(row: Record<string, unknown>): Appointment {
  return {
    id: row.id as string,
    tenantId: row.tenant_id as string,
    doctorId: row.doctor_id as string,
    patientId: row.patient_id as string,
    status: row.status as AppointmentStatus,
    scheduledAt: row.scheduled_at as Date,
    durationMinutes: row.duration_minutes as number,
    notes: row.notes as string | undefined,
    cancellationReason: row.cancellation_reason as string | undefined,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
  };
}
