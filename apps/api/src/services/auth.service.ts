import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { pgPool } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../config/logger';
import { createTransporter } from '../config/email';
import crypto from 'crypto';
import type {
  RegisterInput,
  LoginInput,
  AuthTokens,
  JwtPayload,
  User,
} from '@medconnect/types';
import nodemailer from 'nodemailer';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_SECONDS = 60 * 60 * 24 * 7; // 7 days

// ─── Token helpers ────────────────────────────────────────────────────────────

function generateAccessToken(payload: JwtPayload): string {
  // Access token does NOT contain tokenId
  const { tokenId: _, ...accessPayload } = payload;
  return jwt.sign(accessPayload, JWT_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

function generateRefreshToken(payload: JwtPayload): {
  token: string;
  tokenId: string;
} {
  // Each refresh token gets a unique UUID so we can look it up directly
  const tokenId = uuidv4();
  const token = jwt.sign({ ...payload, tokenId }, JWT_SECRET, {
    expiresIn: '7d',
  });
  return { token, tokenId };
}

// Direct O(1) Redis key — no wildcard scanning needed
function refreshTokenKey(userId: string, tokenId: string): string {
  return `refresh:${userId}:${tokenId}`;
}

// ─── Issue tokens + store in Redis ───────────────────────────────────────────

async function issueTokenPair(payload: JwtPayload): Promise<AuthTokens> {
  const accessToken = generateAccessToken(payload);
  const { token: refreshToken, tokenId } = generateRefreshToken(payload);

  // Store refresh token in Redis with direct key lookup
  await redis.set(
    refreshTokenKey(payload.userId, tokenId),
    refreshToken,
    'EX',
    REFRESH_EXPIRES_SECONDS,
  );

  logger.debug('Issued token pair', { userId: payload.userId, tokenId });

  return {
    accessToken,
    refreshToken,
    expiresIn: 15 * 60,
  };
}

// ─── Register ─────────────────────────────────────────────────────────────────

export async function registerUser(
  input: RegisterInput,
): Promise<{ user: Partial<User>; tokens: AuthTokens }> {
  const tenantResult = await pgPool.query(
    'SELECT id FROM tenants WHERE subdomain = $1 AND is_active = true',
    [input.tenantSubdomain],
  );

  if (tenantResult.rows.length === 0) {
    throw new Error(`Tenant '${input.tenantSubdomain}' not found`);
  }

  const tenantId = tenantResult.rows[0].id;

  const existingUser = await pgPool.query(
    'SELECT id FROM users WHERE tenant_id = $1 AND email = $2',
    [tenantId, input.email.toLowerCase()],
  );

  if (existingUser.rows.length > 0) {
    throw new Error('Email already registered for this tenant');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const userResult = await pgPool.query(
    `INSERT INTO users
      (tenant_id, email, password_hash, first_name, last_name, role)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, tenant_id, email, first_name, last_name, role`,
    [
      tenantId,
      input.email.toLowerCase(),
      passwordHash,
      input.firstName,
      input.lastName,
      input.role,
    ],
  );

  const user = userResult.rows[0];

  const payload: JwtPayload = {
    userId: user.id,
    tenantId: user.tenant_id,
    email: user.email,
    role: user.role,
  };

  const tokens = await issueTokenPair(payload);

  logger.info('User registered', { userId: user.id, tenantId });

  return {
    user: {
      id: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
    },
    tokens,
  };
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginUser(
  input: LoginInput,
): Promise<{ user: Partial<User>; tokens: AuthTokens }> {
  const tenantResult = await pgPool.query(
    'SELECT id FROM tenants WHERE subdomain = $1 AND is_active = true',
    [input.tenantSubdomain],
  );

  if (tenantResult.rows.length === 0) {
    throw new Error('Invalid credentials');
  }

  const tenantId = tenantResult.rows[0].id;

  const userResult = await pgPool.query(
    `SELECT id, tenant_id, email, password_hash, first_name, last_name,
            role, is_active
     FROM users
     WHERE tenant_id = $1 AND email = $2`,
    [tenantId, input.email.toLowerCase()],
  );

  if (userResult.rows.length === 0) {
    throw new Error('Invalid credentials');
  }

  const user = userResult.rows[0];

  if (!user.is_active) {
    throw new Error('Account is disabled');
  }

  const isPasswordValid = await bcrypt.compare(
    input.password,
    user.password_hash,
  );

  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  const payload: JwtPayload = {
    userId: user.id,
    tenantId: user.tenant_id,
    email: user.email,
    role: user.role,
  };

  const tokens = await issueTokenPair(payload);

  await pgPool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [
    user.id,
  ]);

  logger.info('User logged in', { userId: user.id, tenantId });

  return {
    user: {
      id: user.id,
      tenantId: user.tenant_id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
    },
    tokens,
  };
}

// ─── Refresh ──────────────────────────────────────────────────────────────────

export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  // 1. Verify JWT signature and expiry
  let payload: JwtPayload;
  try {
    payload = jwt.verify(refreshToken, JWT_SECRET) as JwtPayload;
  } catch (err) {
    logger.warn('Refresh token JWT verification failed', { err });
    throw new Error('Invalid refresh token');
  }

  // 2. tokenId must exist in the refresh token
  if (!payload.tokenId) {
    throw new Error('Invalid refresh token format');
  }

  // 3. Direct O(1) lookup — no wildcard scan
  const key = refreshTokenKey(payload.userId, payload.tokenId);
  const storedToken = await redis.get(key);

  if (!storedToken) {
    logger.warn('Refresh token not found in Redis', {
      userId: payload.userId,
      tokenId: payload.tokenId,
    });
    throw new Error('Refresh token revoked or expired');
  }

  if (storedToken !== refreshToken) {
    logger.warn('Refresh token mismatch', { userId: payload.userId });
    throw new Error('Refresh token revoked or expired');
  }

  // 4. Delete old token (rotation)
  await redis.del(key);

  // 5. Issue new pair
  const newPayload: JwtPayload = {
    userId: payload.userId,
    tenantId: payload.tenantId,
    email: payload.email,
    role: payload.role,
  };

  return issueTokenPair(newPayload);
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function logoutUser(
  userId: string,
  refreshToken: string,
): Promise<void> {
  // Decode without verifying (token might be expired on logout — that's fine)
  const decoded = jwt.decode(refreshToken) as JwtPayload | null;

  if (decoded?.tokenId) {
    const key = refreshTokenKey(userId, decoded.tokenId);
    await redis.del(key);
    logger.info('Refresh token deleted on logout', { userId });
  }
}

const RESET_TOKEN_TTL = 60 * 60; // 1 hour in seconds

function resetTokenKey(token: string): string {
  return `reset:${token}`;
}

export async function requestPasswordReset(
  email: string,
  tenantSubdomain: string,
): Promise<void> {
  // 1. Find tenant
  const tenantResult = await pgPool.query(
    'SELECT id FROM tenants WHERE subdomain = $1 AND is_active = true',
    [tenantSubdomain],
  );

  if (tenantResult.rows.length === 0) return; // Silent — don't reveal tenant existence

  const tenantId = tenantResult.rows[0].id;

  // 2. Find user
  const userResult = await pgPool.query(
    'SELECT id, email, first_name FROM users WHERE tenant_id = $1 AND email = $2',
    [tenantId, email.toLowerCase()],
  );

  // Silent return — don't reveal if email exists (security best practice)
  if (userResult.rows.length === 0) return;

  const user = userResult.rows[0];

  // 3. Generate a secure random token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // 4. Store in Redis: reset:{token} → userId, expires in 1 hour
  await redis.set(resetTokenKey(resetToken), user.id, 'EX', RESET_TOKEN_TTL);

  // 5. Send email
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

  const transporter = await createTransporter();

  const info = await transporter.sendMail({
    from: '"MedConnect" <noreply@medconnect.com>',
    to: user.email,
    subject: 'Reset your MedConnect password',
    html: `
      <h2>Hi ${user.first_name},</h2>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="
        display: inline-block;
        padding: 12px 24px;
        background: #1D9E75;
        color: white;
        text-decoration: none;
        border-radius: 6px;
      ">Reset Password</a>
      <p>This link expires in <strong>1 hour</strong>.</p>
      <p>If you didn't request this, ignore this email.</p>
    `,
  });

  // In development, log the Ethereal preview URL
  if (process.env.NODE_ENV === 'development') {
    logger.info('Password reset email preview', {
      url: nodemailer.getTestMessageUrl(info),
    });
  }

  logger.info('Password reset email sent', { userId: user.id });
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<void> {
  if (newPassword.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  // 1. Look up token in Redis
  const userId = await redis.get(resetTokenKey(token));

  if (!userId) {
    throw new Error('Reset token is invalid or has expired');
  }

  // 2. Hash new password
  const passwordHash = await bcrypt.hash(newPassword, 12);

  // 3. Update password in Postgres
  await pgPool.query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [passwordHash, userId],
  );

  // 4. Delete reset token from Redis (one-time use)
  await redis.del(resetTokenKey(token));

  // 5. Revoke all existing refresh tokens (force re-login everywhere)
  const refreshKeys = await redis.keys(`refresh:${userId}:*`);
  if (refreshKeys.length > 0) {
    await redis.del(...refreshKeys);
  }

  logger.info('Password reset successful', { userId });
}

// Used by OAuth strategies to issue tokens for an authenticated user
export async function issueTokensForOAuthUser(user: {
  id: string;
  tenant_id: string;
  email: string;
  role: string;
}): Promise<AuthTokens> {
  const payload: JwtPayload = {
    userId: user.id,
    tenantId: user.tenant_id,
    email: user.email,
    role: user.role as any,
  };
  return issueTokenPair(payload);
}
