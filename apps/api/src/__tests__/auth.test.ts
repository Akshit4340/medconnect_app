import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

jest.mock('uuid');

// ─── Mock all external dependencies ──────────────────────────────────────────

jest.mock('../config/database', () => ({
  pgPool: {
    query: jest.fn(),
  },
}));

jest.mock('../config/redis', () => ({
  redis: {
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn(),
    del: jest.fn().mockResolvedValue(1),
    keys: jest.fn().mockResolvedValue([]),
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

jest.mock('../config/email', () => ({
  createTransporter: jest.fn().mockResolvedValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  }),
}));

// Import after mocks are set up
import { pgPool } from '../config/database';
import { redis } from '../config/redis';
import {
  registerUser,
  loginUser,
  refreshTokens,
  logoutUser,
} from '../services/auth.service';

const mockPgQuery = pgPool.query as jest.Mock;
const mockRedisSet = redis.set as jest.Mock;
const mockRedisGet = redis.get as jest.Mock;
const mockRedisDel = redis.del as jest.Mock;
const mockRedisKeys = redis.keys as jest.Mock;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockTenantId = uuidv4();
const mockUserId = uuidv4();

const mockTenantRow = { rows: [{ id: mockTenantId }] };
const mockEmptyRows = { rows: [] };

// ─── Register tests ───────────────────────────────────────────────────────────

describe('registerUser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should register a new user and return tokens', async () => {
    mockPgQuery
      .mockResolvedValueOnce(mockTenantRow) // tenant lookup
      .mockResolvedValueOnce(mockEmptyRows) // email uniqueness check
      .mockResolvedValueOnce({
        // insert user
        rows: [
          {
            id: mockUserId,
            tenant_id: mockTenantId,
            email: 'test@test.com',
            first_name: 'Test',
            last_name: 'User',
            role: 'patient',
          },
        ],
      });

    const result = await registerUser({
      email: 'test@test.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'patient',
      tenantSubdomain: 'demo',
    });

    expect(result.user.email).toBe('test@test.com');
    expect(result.tokens.accessToken).toBeDefined();
    expect(result.tokens.refreshToken).toBeDefined();
    expect(mockRedisSet).toHaveBeenCalledTimes(1);
  });

  it('should throw if tenant not found', async () => {
    mockPgQuery.mockResolvedValueOnce(mockEmptyRows);

    await expect(
      registerUser({
        email: 'test@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'patient',
        tenantSubdomain: 'nonexistent',
      }),
    ).rejects.toThrow("Tenant 'nonexistent' not found");
  });

  it('should throw if email already registered', async () => {
    mockPgQuery
      .mockResolvedValueOnce(mockTenantRow)
      .mockResolvedValueOnce({ rows: [{ id: mockUserId }] }); // email exists

    await expect(
      registerUser({
        email: 'existing@test.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
        role: 'patient',
        tenantSubdomain: 'demo',
      }),
    ).rejects.toThrow('Email already registered');
  });
});

// ─── Login tests ──────────────────────────────────────────────────────────────

describe('loginUser', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should login with correct credentials', async () => {
    const passwordHash = await bcrypt.hash('password123', 12);

    mockPgQuery
      .mockResolvedValueOnce(mockTenantRow)
      .mockResolvedValueOnce({
        rows: [
          {
            id: mockUserId,
            tenant_id: mockTenantId,
            email: 'test@test.com',
            password_hash: passwordHash,
            first_name: 'Test',
            last_name: 'User',
            role: 'patient',
            is_active: true,
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [] }); // last_login update

    const result = await loginUser({
      email: 'test@test.com',
      password: 'password123',
      tenantSubdomain: 'demo',
    });

    expect(result.user.email).toBe('test@test.com');
    expect(result.tokens.accessToken).toBeDefined();
  });

  it('should throw with wrong password', async () => {
    const passwordHash = await bcrypt.hash('correctpassword', 12);

    mockPgQuery.mockResolvedValueOnce(mockTenantRow).mockResolvedValueOnce({
      rows: [
        {
          id: mockUserId,
          password_hash: passwordHash,
          is_active: true,
        },
      ],
    });

    await expect(
      loginUser({
        email: 'test@test.com',
        password: 'wrongpassword',
        tenantSubdomain: 'demo',
      }),
    ).rejects.toThrow('Invalid credentials');
  });

  it('should throw for disabled account', async () => {
    const passwordHash = await bcrypt.hash('password123', 12);

    mockPgQuery.mockResolvedValueOnce(mockTenantRow).mockResolvedValueOnce({
      rows: [
        {
          id: mockUserId,
          password_hash: passwordHash,
          is_active: false,
        },
      ],
    });

    await expect(
      loginUser({
        email: 'test@test.com',
        password: 'password123',
        tenantSubdomain: 'demo',
      }),
    ).rejects.toThrow('Account is disabled');
  });
});

// ─── Refresh token tests ──────────────────────────────────────────────────────

describe('refreshTokens', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should issue new token pair when valid refresh token provided', async () => {
    const tokenId = uuidv4();
    const payload = {
      userId: mockUserId,
      tenantId: mockTenantId,
      email: 'test@test.com',
      role: 'patient' as const,
      tokenId,
    };

    const refreshToken = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'dev-secret-change-in-production',
      { expiresIn: '7d' },
    );

    mockRedisGet.mockResolvedValueOnce(refreshToken);

    const result = await refreshTokens(refreshToken);

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(mockRedisDel).toHaveBeenCalledTimes(1);
    expect(mockRedisSet).toHaveBeenCalledTimes(1);
  });

  it('should throw if refresh token not in Redis', async () => {
    const tokenId = uuidv4();
    const refreshToken = jwt.sign(
      {
        userId: mockUserId,
        tenantId: mockTenantId,
        email: 'test@test.com',
        role: 'patient',
        tokenId,
      },
      process.env.JWT_SECRET || 'dev-secret-change-in-production',
      { expiresIn: '7d' },
    );

    mockRedisGet.mockResolvedValueOnce(null); // not in Redis

    await expect(refreshTokens(refreshToken)).rejects.toThrow(
      'Refresh token revoked or expired',
    );
  });
});

// ─── Logout tests ─────────────────────────────────────────────────────────────

describe('logoutUser', () => {
  it('should delete refresh token from Redis on logout', async () => {
    const tokenId = uuidv4();
    const refreshToken = jwt.sign(
      { userId: mockUserId, tokenId },
      process.env.JWT_SECRET || 'dev-secret-change-in-production',
    );

    await logoutUser(mockUserId, refreshToken);

    expect(mockRedisDel).toHaveBeenCalledWith(
      `refresh:${mockUserId}:${tokenId}`,
    );
  });
});
