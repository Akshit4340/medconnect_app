import {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { logger } from './logger';

export const s3 = new S3Client({
  endpoint: process.env.MINIO_ENDPOINT || 'http://localhost:9000',
  region: process.env.MINIO_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.MINIO_ACCESS_KEY || 'medconnect',
    secretAccessKey: process.env.MINIO_SECRET_KEY || 'secret12345',
  },
  forcePathStyle: true, // required for MinIO
});

const BUCKET = process.env.MINIO_BUCKET || 'medconnect-files';

// Create bucket if it doesn't exist
export async function ensureBucket(): Promise<void> {
  try {
    await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
    logger.info('MinIO bucket exists', { bucket: BUCKET });
  } catch {
    await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
    logger.info('MinIO bucket created', { bucket: BUCKET });
  }
}

// Generate a presigned URL for direct browser upload
export async function getUploadPresignedUrl(
  key: string,
  contentType: string,
  expiresIn = 300, // 5 minutes
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

// Public URL for accessing a stored file
export function getFileUrl(key: string): string {
  return `${process.env.MINIO_ENDPOINT}/${BUCKET}/${key}`;
}
