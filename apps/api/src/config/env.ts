import { z } from 'zod/v3';

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.string().transform(Number).default('3001'),
    DATABASE_URL: z.string().url(),
    REDIS_URL: z.string().url(),
    MONGODB_URL: z.string().url(),
    JWT_SECRET: z.string().min(32),
    REFRESH_TOKEN_SECRET: z.string().min(32).optional(),
    FRONTEND_URL: z.string().url().default('http://localhost:3000'),
    MINIO_ROOT_USER: z.string().optional(),
    MINIO_ROOT_PASSWORD: z.string().optional(),
    MINIO_ENDPOINT: z.string().default('minio'),
    MINIO_PORT: z.string().transform(Number).default('9000'),
    MINIO_SECURE: z
      .string()
      .transform((val) => val === 'true')
      .default('false'),
  })
  .passthrough();

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
