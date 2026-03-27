import { Router, Request, Response } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import {
  createPatientProfile,
  getPatientById,
  getPatientByUserId,
  updatePatientProfile,
  listPatients,
} from '../services/patient.service';
import { getPaginationParams } from '../utils/pagination';

const router = Router();

// ─── POST /patients ───────────────────────────────────────────────────────────

router.post(
  '/',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const patient = await createPatientProfile(
        req.user!.tenantId,
        req.user!.userId,
        req.body,
      );
      res.status(201).json({ success: true, data: patient });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  },
);

// ─── GET /patients/me ─────────────────────────────────────────────────────────

router.get(
  '/me',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const patient = await getPatientByUserId(
        req.user!.tenantId,
        req.user!.userId,
      );
      res.json({ success: true, data: patient });
    } catch (err) {
      res.status(404).json({ success: false, error: (err as Error).message });
    }
  },
);

// ─── GET /patients ─────────────────────────────────────────────────────────────

router.get(
  '/',
  requireAuth,
  requireRole('doctor', 'admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { limit, cursor } = getPaginationParams(
        req.query as Record<string, unknown>,
      );
      const result = await listPatients(req.user!.tenantId, { limit, cursor });
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  },
);

// ─── GET /patients/:id ────────────────────────────────────────────────────────

router.get(
  '/:id',
  requireAuth,
  requireRole('doctor', 'admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const patient = await getPatientById(req.user!.tenantId, req.params.id);
      res.json({ success: true, data: patient });
    } catch (err) {
      res.status(404).json({ success: false, error: (err as Error).message });
    }
  },
);

// ─── PATCH /patients/:id ──────────────────────────────────────────────────────

router.patch(
  '/:id',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const patient = await updatePatientProfile(
        req.user!.tenantId,
        req.params.id,
        req.body,
      );
      res.json({ success: true, data: patient });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  },
);

export default router;
