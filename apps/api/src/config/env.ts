import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load the repo-root .env first, then a local override.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.API_PORT ?? 4000),
  // PostgreSQL (Supabase) connection strings. `databaseUrl` is the pooled
  // connection used by the app at runtime; `directUrl` is the non-pooled
  // connection Prisma uses for migrations / db push. Prisma reads these from
  // process.env itself — they are surfaced here for fail-fast validation.
  databaseUrl: required('DATABASE_URL'),
  directUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET', 'dev-access-secret'),
    refreshSecret: required('JWT_REFRESH_SECRET', 'dev-refresh-secret'),
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtlDays: Number(process.env.JWT_REFRESH_TTL_DAYS ?? 7),
  },
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  s3: {
    region: process.env.AWS_REGION,
    bucket: process.env.S3_BUCKET,
    // Credentials are resolved by the AWS SDK default chain (env vars or IAM
    // role). We only need region + bucket here to know storage is configured.
    get configured() {
      return Boolean(this.region && this.bucket);
    },
  },
  // Outbound messaging providers. Any unset provider is simply skipped at send
  // time (the in-app Notification row is still written).
  email: {
    resendApiKey: process.env.RESEND_API_KEY,
    from: process.env.EMAIL_FROM,
    get configured() {
      return Boolean(this.resendApiKey && this.from);
    },
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    smsFrom: process.env.TWILIO_SMS_FROM,
    whatsappFrom: process.env.TWILIO_WHATSAPP_FROM,
    get smsConfigured() {
      return Boolean(this.accountSid && this.authToken && this.smsFrom);
    },
    get whatsappConfigured() {
      return Boolean(this.accountSid && this.authToken && this.whatsappFrom);
    },
  },
};
