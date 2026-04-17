jest.mock('../config/database', () => ({
  pgPool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
}));

jest.mock('../config/redis', () => ({
  redis: {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    del: jest.fn().mockResolvedValue(1),
  },
}));

jest.mock('../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../config/queues', () => ({
  emailQueue: { add: jest.fn() },
  reminderQueue: { add: jest.fn() },
  pdfQueue: { add: jest.fn() },
  scheduleAppointmentReminders: jest.fn(),
}));

import { pgPool } from '../config/database';
import {
  createAppointment,
  updateAppointmentStatus,
  listAppointments,
} from '../modules/appointments/appointment.service';

const mockPgQuery = pgPool.query as jest.Mock;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const tenantId = '11111111-1111-1111-1111-111111111111';
const doctorId = '22222222-2222-2222-2222-222222222222';
const patientUserId = '33333333-3333-3333-3333-333333333333';
const patientProfileId = '55555555-5555-5555-5555-555555555555';
const appointmentId = '44444444-4444-4444-4444-444444444444';

// ─── createAppointment ────────────────────────────────────────────────────────

describe('createAppointment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should create an appointment when no conflict exists', async () => {
    const mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    (pgPool as unknown as { connect: jest.Mock }).connect.mockResolvedValueOnce(
      mockClient,
    );

    // BEGIN
    mockClient.query.mockResolvedValueOnce({});
    // Doctor exists check
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: doctorId }],
    });
    // Patient profile lookup
    mockClient.query.mockResolvedValueOnce({
      rows: [{ id: patientProfileId }],
    });
    // Conflict check (SELECT FOR UPDATE) — no conflicts
    mockClient.query.mockResolvedValueOnce({ rows: [] });
    // INSERT appointment
    mockClient.query.mockResolvedValueOnce({
      rows: [
        {
          id: appointmentId,
          tenant_id: tenantId,
          doctor_id: doctorId,
          patient_id: patientProfileId,
          scheduled_at: new Date('2026-04-20T10:00:00Z'),
          duration_minutes: 30,
          status: 'pending',
          notes: 'Test appointment',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
    });
    // COMMIT
    mockClient.query.mockResolvedValueOnce({});

    const result = await createAppointment(tenantId, patientUserId, {
      doctorId,
      scheduledAt: '2026-04-20T10:00:00Z',
      durationMinutes: 30,
      notes: 'Test appointment',
    });

    expect(result.id).toBe(appointmentId);
    expect(result.status).toBe('pending');
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('should throw when doctor is not found', async () => {
    const mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };

    (pgPool as unknown as { connect: jest.Mock }).connect.mockResolvedValueOnce(
      mockClient,
    );

    // BEGIN
    mockClient.query.mockResolvedValueOnce({});
    // Doctor NOT found
    mockClient.query.mockResolvedValueOnce({ rows: [] });

    await expect(
      createAppointment(tenantId, patientUserId, {
        doctorId,
        scheduledAt: '2026-04-20T10:00:00Z',
        durationMinutes: 30,
      }),
    ).rejects.toThrow('Doctor not found or unavailable');

    expect(mockClient.release).toHaveBeenCalled();
  });
});

// ─── updateAppointmentStatus ──────────────────────────────────────────────────

describe('updateAppointmentStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should update status from pending to confirmed', async () => {
    // First call gets current status
    mockPgQuery
      .mockResolvedValueOnce({
        rows: [{ status: 'pending' }],
      })
      // Second call updates the status
      .mockResolvedValueOnce({
        rows: [
          {
            id: appointmentId,
            tenant_id: tenantId,
            doctor_id: doctorId,
            patient_id: patientProfileId,
            status: 'confirmed',
            scheduled_at: new Date('2026-04-20T10:00:00Z'),
            duration_minutes: 30,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

    const result = await updateAppointmentStatus(
      tenantId,
      appointmentId,
      'confirmed',
    );

    expect(result.status).toBe('confirmed');
  });

  it('should reject invalid status transitions', async () => {
    // Appointment is already completed
    mockPgQuery.mockResolvedValueOnce({
      rows: [{ status: 'completed' }],
    });

    await expect(
      updateAppointmentStatus(tenantId, appointmentId, 'pending'),
    ).rejects.toThrow();
  });
});

// ─── listAppointments ─────────────────────────────────────────────────────────

describe('listAppointments', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should list appointments with cursor pagination', async () => {
    mockPgQuery.mockResolvedValueOnce({
      rows: [
        {
          id: appointmentId,
          tenant_id: tenantId,
          doctor_id: doctorId,
          patient_id: patientProfileId,
          status: 'confirmed',
          scheduled_at: new Date('2026-04-20T10:00:00Z'),
          duration_minutes: 30,
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
    });

    const result = await listAppointments(tenantId, { limit: 10 });

    expect(result.data.length).toBe(1);
    expect(result.data[0].id).toBe(appointmentId);
    expect(result.hasMore).toBe(false);
  });
});
