import { Router, Request, Response, NextFunction } from 'express';
import {
  registerUser,
  loginUser,
  refreshTokens,
  logoutUser,
  requestPasswordReset,
  resetPassword,
} from './auth.service';
import { requireAuth } from '../../shared/middleware/auth';
import passport from 'passport';
import { issueTokensForOAuthUser } from './auth.service';
import type { OAuthUserRow } from './auth.service';

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

// ─── POST /auth/forgot-password ───────────────────────────────────────────────

router.post(
  '/forgot-password',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, tenantSubdomain } = req.body;

      if (!email || !tenantSubdomain) {
        res.status(400).json({
          success: false,
          error: 'email and tenantSubdomain are required',
        });
        return;
      }

      await requestPasswordReset(email, tenantSubdomain);

      // Always return success — don't reveal if email exists
      res.status(200).json({
        success: true,
        message: 'If that email exists, a reset link has been sent',
      });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ success: false, error: error.message });
    }
  },
);

// ─── POST /auth/reset-password ────────────────────────────────────────────────

router.post(
  '/reset-password',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { token, newPassword } = req.body;

      if (!token || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'token and newPassword are required',
        });
        return;
      }

      await resetPassword(token, newPassword);

      res.status(200).json({
        success: true,
        message:
          'Password reset successfully. Please log in with your new password.',
      });
    } catch (err) {
      const error = err as Error;
      res.status(400).json({ success: false, error: error.message });
    }
  },
);

// ─── GET /auth/google ─────────────────────────────────────────────────────────
// Initiates Google OAuth — pass tenantSubdomain as query param
// e.g. GET /auth/google?tenant=demo

router.get('/google', (req: Request, res: Response, next: NextFunction) => {
  const tenant = (req.query.tenant as string) || 'demo';
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    state: tenant, // passed back to callback so we know which tenant
  })(req, res, next);
});

// ─── GET /auth/google/callback ────────────────────────────────────────────────

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/auth/login',
  }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
        return;
      }

      const tokens = await issueTokensForOAuthUser(
        req.user as unknown as OAuthUserRow,
      );

      // Redirect to frontend with tokens in query params
      // In production use httpOnly cookies instead
      res.redirect(
        `${process.env.FRONTEND_URL}/auth/callback?` +
          `accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`,
      );
    } catch (err) {
      console.error('OAuth callback error:', err);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
  },
);

export default router;
