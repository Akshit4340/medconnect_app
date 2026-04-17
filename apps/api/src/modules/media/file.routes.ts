import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../../shared/middleware/auth';
import { s3, getUploadPresignedUrl, getFileUrl } from '../../config/storage';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from '../../config/logger';
import { fromBuffer } from 'file-type';

const router = Router();
const BUCKET = process.env.MINIO_BUCKET || 'medconnect-files';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit enforced here
});

// ─── POST /files/upload ── Direct upload via multipart form ──────────────────

router.post(
  '/upload',
  requireAuth,
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: 'No file uploaded' });
        return;
      }

      // Check MIME type using binary magic numbers
      const typeInfo = await fromBuffer(req.file.buffer);

      const allowedMimes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];

      if (!typeInfo || !allowedMimes.includes(typeInfo.mime)) {
        res
          .status(400)
          .json({ success: false, error: 'Invalid or disallowed file type' });
        return;
      }

      const category = (req.body.category as string) || 'other';
      const appointmentId = req.body.appointmentId as string | undefined;
      const ext = typeInfo.ext || 'bin';
      const key = `uploads/${req.user!.tenantId}/${category}/${uuidv4()}.${ext}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: key,
          Body: req.file.buffer,
          ContentType: typeInfo.mime,
          Metadata: {
            'tenant-id': req.user!.tenantId,
            'uploaded-by': req.user!.userId,
            'original-name': req.file.originalname,
            ...(appointmentId ? { 'appointment-id': appointmentId } : {}),
          },
        }),
      );

      const fileUrl = getFileUrl(key);

      logger.info('File uploaded', {
        key,
        userId: req.user!.userId,
        originalName: req.file.originalname,
        size: req.file.size,
      });

      res.status(201).json({
        success: true,
        data: {
          key,
          url: fileUrl, // In a real robust system, this is just the key, but we kept it for compat
          originalName: req.file.originalname,
          contentType: typeInfo.mime,
          size: req.file.size,
        },
      });
    } catch (err) {
      logger.error('File upload failed', { error: (err as Error).message });
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  },
);

// ─── POST /files/presigned-url ── Generate presigned URL for browser upload ──

router.post(
  '/presigned-url',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { fileName, contentType, category } = req.body;

      if (!fileName || !contentType) {
        res.status(400).json({
          success: false,
          error: 'fileName and contentType are required',
        });
        return;
      }

      const ext = fileName.split('.').pop() || 'bin';
      const fileCategory = category || 'other';
      const key = `uploads/${req.user!.tenantId}/${fileCategory}/${uuidv4()}.${ext}`;

      const presignedUrl = await getUploadPresignedUrl(key, contentType);

      res.json({
        success: true,
        data: { presignedUrl, key }, // Only returning the key and presignedUrl (per prompt: "Store only the object key... never the full presigned URL")
      });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  },
);

// ─── GET /files/download/:key(*) ── Generate presigned download URL ──────────

router.get(
  '/download/*',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const key = req.params[0];

      if (!key) {
        res.status(400).json({ success: false, error: 'File key is required' });
        return;
      }

      const command = new GetObjectCommand({
        Bucket: BUCKET,
        Key: key,
      });

      // TTL max 15 minutes = 900 seconds
      const presignedUrl = await getSignedUrl(s3, command, {
        expiresIn: 900,
      });

      res.json({
        success: true,
        data: { url: presignedUrl },
      });
    } catch (err) {
      res.status(404).json({ success: false, error: 'File not found' });
    }
  },
);

export default router;
