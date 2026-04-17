import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../../shared/middleware/auth';
import {
  createOrUpdateNote,
  getNoteByAppointment,
  getPatientNotes,
  toggleNoteVisibility,
  createPrescription,
  getPatientPrescriptions,
  searchNotes,
  createAuditLog,
} from './medical-records.service';

const router = Router();

// ─── POST /medical/notes/:appointmentId ───────────────────────────────────────

router.post(
  '/notes/:appointmentId',
  requireAuth,
  requireRole('doctor'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const note = await createOrUpdateNote(
        req.user!.tenantId,
        req.user!.userId,
        req.params.appointmentId,
        req.body.soap,
      );
      res.status(201).json({ success: true, data: note });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  },
);

// ─── GET /medical/notes/:appointmentId ────────────────────────────────────────

router.get(
  '/notes/:appointmentId',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const note = await getNoteByAppointment(
        req.user!.tenantId,
        req.params.appointmentId,
        req.user!.userId,
        req.user!.role,
      );
      res.json({ success: true, data: note });
    } catch (err) {
      res.status(404).json({ success: false, error: (err as Error).message });
    }
  },
);

// ─── GET /medical/patients/:patientId/notes ───────────────────────────────────

router.get(
  '/patients/:patientId/notes',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const notes = await getPatientNotes(
        req.user!.tenantId,
        req.params.patientId,
        req.user!.role,
      );
      res.json({ success: true, data: notes });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  },
);

// ─── PATCH /medical/notes/:noteId/visibility ──────────────────────────────────

router.patch(
  '/notes/:noteId/visibility',
  requireAuth,
  requireRole('doctor'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const note = await toggleNoteVisibility(
        req.user!.tenantId,
        req.params.noteId,
        req.body.isVisible,
      );
      res.json({ success: true, data: note });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  },
);

// ─── POST /medical/prescriptions ─────────────────────────────────────────────

router.post(
  '/prescriptions',
  requireAuth,
  requireRole('doctor'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const prescription = await createPrescription(
        req.user!.tenantId,
        req.body,
      );
      res.status(201).json({ success: true, data: prescription });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  },
);

// ─── GET /medical/patients/:patientId/prescriptions ───────────────────────────

router.get(
  '/patients/:patientId/prescriptions',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const prescriptions = await getPatientPrescriptions(
        req.user!.tenantId,
        req.params.patientId,
      );
      res.json({ success: true, data: prescriptions });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  },
);

// ─── GET /medical/patients/:patientId/search?q= ───────────────────────────────

router.get(
  '/patients/:patientId/search',
  requireAuth,
  requireRole('doctor', 'admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { q } = req.query;
      if (!q) {
        res.status(400).json({ success: false, error: 'q param required' });
        return;
      }
      const notes = await searchNotes(
        req.user!.tenantId,
        req.params.patientId,
        q as string,
      );
      res.json({ success: true, data: notes });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  },
);

export default router;
