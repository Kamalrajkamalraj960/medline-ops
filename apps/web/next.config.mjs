import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The web app talks to the API purely over HTTP via NEXT_PUBLIC_API_URL.

  // Emit a self-contained server bundle for Docker/Node deploys.
  output: 'standalone',
  // In a monorepo, trace files from the repo root so the standalone build
  // includes workspace dependencies correctly.
  outputFileTracingRoot: path.join(__dirname, '../../'),
};

export default nextConfig;
