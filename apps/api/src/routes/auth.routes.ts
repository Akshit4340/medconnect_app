import { Router, Request, Response } from 'express';
import {
  registerUser,
  loginUser,
  refreshTokens,
  logoutUser,
} from '../services/auth.service';
import { requireAuth } from '../middleware/auth';

const router = Router();

// ─── POST /auth/register ──────────────────────────────────────────────────────

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName, role, tenantSubdomain } =
      req.body;

    // Basic validation
    if (!email || !password || !firstName || !lastName || !tenantSubdomain) {
      res.status(400).json({
        success: false,
        error:
          'Missing required fields: email, password, firstName, lastName, tenantSubdomain',
      });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters',
      });
      return;
    }

    const result = await registerUser({
      email,
      password,
      firstName,
      lastName,
      role: role || 'patient',
      tenantSubdomain,
    });

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (err) {
    const error = err as Error;
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ─── POST /auth/login ─────────────────────────────────────────────────────────

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, tenantSubdomain } = req.body;

    if (!email || !password || !tenantSubdomain) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: email, password, tenantSubdomain',
      });
      return;
    }

    const result = await loginUser({ email, password, tenantSubdomain });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    const error = err as Error;
    res.status(401).json({
      success: false,
      error: error.message,
    });
  }
});

// ─── POST /auth/refresh ───────────────────────────────────────────────────────

router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'refreshToken is required',
      });
      return;
    }

    const tokens = await refreshTokens(refreshToken);

    res.status(200).json({
      success: true,
      data: tokens,
    });
  } catch (err) {
    const error = err as Error;
    res.status(401).json({
      success: false,
      error: error.message,
    });
  }
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────

router.post(
  '/logout',
  requireAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!req.user) {
        res.status(401).json({ success: false, error: 'Not authenticated' });
        return;
      }

      if (refreshToken) {
        await logoutUser(req.user.userId, refreshToken);
      }

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  },
);

// ─── GET /auth/me ─────────────────────────────────────────────────────────────

router.get('/me', requireAuth, (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    data: req.user,
  });
});

export default router;
