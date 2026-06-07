import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';
import { HttpError } from './http-error.js';

// Lazily create one client. Credentials come from the AWS SDK default chain
// (AWS_ACCESS_KEY_ID/SECRET env vars locally, or an IAM role in production).
let client: S3Client | null = null;
function s3(): S3Client {
  if (!env.s3.configured) {
    throw new HttpError(503, 'File storage is not configured (set AWS_REGION and S3_BUCKET).', 'STORAGE_UNCONFIGURED');
  }
  client ??= new S3Client({ region: env.s3.region });
  return client;
}

export const storageConfigured = () => env.s3.configured;

const PRESIGN_TTL = 300; // 5 minutes

/** Sanitises a user-supplied filename for use inside an object key. */
function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-120) || 'file';
}

/** Deterministic-ish key under a document's folder. */
export function buildDocumentKey(caseId: string, documentId: string, fileName: string): string {
  return `documents/${caseId}/${documentId}/${Date.now()}-${safeName(fileName)}`;
}

/** Presigned PUT URL — the browser uploads the file directly to S3. */
export async function presignUpload(key: string, contentType: string): Promise<string> {
  const cmd = new PutObjectCommand({ Bucket: env.s3.bucket, Key: key, ContentType: contentType });
  return getSignedUrl(s3(), cmd, { expiresIn: PRESIGN_TTL });
}

/** Presigned GET URL — for viewing/downloading a private object. */
export async function presignDownload(key: string, downloadName?: string): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: env.s3.bucket,
    Key: key,
    ...(downloadName ? { ResponseContentDisposition: `attachment; filename="${safeName(downloadName)}"` } : {}),
  });
  return getSignedUrl(s3(), cmd, { expiresIn: PRESIGN_TTL });
}
