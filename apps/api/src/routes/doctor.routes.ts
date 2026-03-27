import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import {
  requireAuth,
  requireRole,
  requirePermission,
} from '../middleware/auth';
import {
  createDoctorProfile,
  getDoctorById,
  updateDoctorProfile,
  searchDoctors,
  setAvailabilitySlots,
  getDoctorSlots,
  updateDoctorAvatar,
} from '../services/doctor.service';
import { getUploadPresignedUrl, getFileUrl } from '../config/storage';
import { getPaginationParams } from '../utils/pagination';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

// ─── POST /doctors ────────────────────────────────────────────────────────────

router.post(
  '/',
  requireAuth,
  requireRole('doctor', 'admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const tenantId = req.user!.tenantId;
      const userId = req.body.userId || req.user!.userId;
      const doctor = await createDoctorProfile(tenantId, userId, req.body);
      res.status(201).json({ success: true, data: doctor });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  },
);

// ─── GET /doctors/search ──────────────────────────────────────────────────────

router.get(
  '/search',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { limit, cursor } = getPaginationParams(
        req.query as Record<string, unknown>,
      );
      const result = await searchDoctors(req.user!.tenantId, {
        specialisation: req.query.specialisation as string,
        isAvailable: req.query.isAvailable === 'true' ? true : undefined,
        cursor,
        limit,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  },
);

// ─── GET /doctors/:id ─────────────────────────────────────────────────────────

router.get(
  '/:id',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const doctor = await getDoctorById(req.user!.tenantId, req.params.id);
      res.json({ success: true, data: doctor });
    } catch (err) {
      res.status(404).json({ success: false, error: (err as Error).message });
    }
  },
);

// ─── PATCH /doctors/:id ───────────────────────────────────────────────────────

router.patch(
  '/:id',
  requireAuth,
  requireRole('doctor', 'admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const doctor = await updateDoctorProfile(
        req.user!.tenantId,
        req.params.id,
        req.body,
      );
      res.json({ success: true, data: doctor });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  },
);

// ─── GET /doctors/:id/slots ───────────────────────────────────────────────────

router.get(
  '/:id/slots',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const slots = await getDoctorSlots(req.user!.tenantId, req.params.id);
      res.json({ success: true, data: slots });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  },
);

// ─── PUT /doctors/:id/slots ───────────────────────────────────────────────────

router.put(
  '/:id/slots',
  requireAuth,
  requireRole('doctor', 'admin'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const slots = await setAvailabilitySlots(
        req.user!.tenantId,
        req.params.id,
        req.body.slots,
      );
      res.json({ success: true, data: slots });
    } catch (err) {
      res.status(400).json({ success: false, error: (err as Error).message });
    }
  },
);

// ─── POST /doctors/:id/avatar ─────────────────────────────────────────────────

router.post(
  '/:id/avatar',
  requireAuth,
  requireRole('doctor', 'admin'),
  upload.single('avatar'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded' });
        return;
      }

      const ext = req.file.originalname.split('.').pop();
      const key = `avatars/doctors/${req.params.id}/${uuidv4()}.${ext}`;

      // Get presigned URL and inform client (or upload directly here)
      const presignedUrl = await getUploadPresignedUrl(key, req.file.mimetype);
      const fileUrl = getFileUrl(key);

      await updateDoctorAvatar(req.user!.tenantId, req.params.id, fileUrl);

      res.json({
        success: true,
        data: { fileUrl, presignedUrl, key },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  },
);

export default router;
