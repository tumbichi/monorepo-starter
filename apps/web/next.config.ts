import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Workspace packages ship raw TypeScript.
  transpilePackages: ['@repo/ui', '@repo/db'],
  // Native Postgres driver stays on the Node side, unbundled.
  serverExternalPackages: ['pg', '@prisma/adapter-pg'],
};

export default nextConfig;
