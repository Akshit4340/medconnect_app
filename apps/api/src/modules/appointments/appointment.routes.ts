import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../../shared/middleware/auth';
import {
  createAppointment,
  updateAppointmentStatus,
  getAvailableSlots,
  listAppointments,
  getTenantStats,
} from './appointment.service';
import { getPatientByUserId } from '../users/patient.service';
import { getDoctorByUserId } from '../users/doctor.service';
import { getPaginationParams } from '../../shared/utils/pagination';

import type { AppointmentStatus } from '@medconnect/types';

const router = Router();

// ─── POST /appointments ───────────────────────────────────────────────────────

router.post(
  '/',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { doctorId, scheduledAt, durationMinutes, notes } = req.body;

      if (!doctorId || !scheduledAt) {
        res.status(400).json({
          success: false,
          error: 'doctorId and scheduledAt are required',
        });
        return;
      }

      const appointment = await createAppointment(
        req.user!.tenantId,
        req.user!.userId,
        { doctorId, scheduledAt, durationMinutes, notes },
      );
      res.status(201).json({ success: true, data: appointment });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  },
);

// ─── GET /appointments ────────────────────────────────────────────────────────

router.get(
  '/',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    const validStatuses: AppointmentStatus[] = [
      'pending',
      'confirmed',
      'completed',
      'cancelled',
    ];
    const statusParam = req.query.status as string | undefined;
    const status = validStatuses.includes(statusParam as AppointmentStatus)
      ? (statusParam as AppointmentStatus)
      : undefined;
    try {
      const { limit, cursor } = getPaginationParams(
        req.query as Record<string, unknown>,
      );
      let queryDoctorId = req.query.doctorId as string | undefined;
      let queryPatientId = req.query.patientId as string | undefined;

      try {
        if (req.user!.role === 'patient') {
          const profile = await getPatientByUserId(
            req.user!.tenantId,
            req.user!.userId,
          );
          queryPatientId = profile.id;
        } else if (req.user!.role === 'doctor') {
          const profile = await getDoctorByUserId(
            req.user!.tenantId,
            req.user!.userId,
          );
          queryDoctorId = profile.id;
        }
      } catch {
        // Profile not created yet or not found, they have no appointments
        res.json({
          success: true,
          data: [],
          items: [],
          meta: { hasMore: false },
        });
        return;
      }

      const result = await listAppointments(req.user!.tenantId, {
        doctorId: queryDoctorId,
        patientId: queryPatientId,
        status: status,
        cursor,
        limit,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  },
);

// ─── PATCH /appointments/:id/status ──────────────────────────────────────────

router.patch(
  '/:id/status',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { status, cancellationReason } = req.body;

      if (!status) {
        res.status(400).json({ success: false, error: 'status is required' });
        return;
      }

      const appointment = await updateAppointmentStatus(
        req.user!.tenantId,
        req.params.id,
        status,
        cancellationReason,
      );
      res.json({ success: true, data: appointment });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  },
);

// ─── GET /appointments/slots ──────────────────────────────────────────────────

router.get(
  '/slots',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { doctorId, date } = req.query;

      if (!doctorId || !date) {
        res
          .status(400)
          .json({ success: false, error: 'doctorId and date are required' });
        return;
      }

      const slots = await getAvailableSlots(
        req.user!.tenantId,
        doctorId as string,
        date as string,
      );
      res.json({ success: true, data: slots });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  },
);

// ─── GET /appointments/admin/stats ────────────────────────────────────────────

router.get(
  '/admin/stats',
  requireAuth,
  requireRole('admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = await getTenantStats(req.user!.tenantId);
      res.json({ success: true, data: stats });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  },
);

export default router;
