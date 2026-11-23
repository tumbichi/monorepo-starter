import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Partial Prerendering: shell estático + features que streamean dentro de <Suspense>.
  // Ver docs/ARCHITECTURE.md → "Datos: servidor y cliente".
  cacheComponents: true,
  // El prefetch de links también trae solo el shell estático (recomendado para proyectos nuevos).
  partialPrefetching: true,
  // Workspace packages ship raw TypeScript.
  transpilePackages: ['@repo/ui', '@repo/db'],
  // Native Postgres driver stays on the Node side, unbundled.
  serverExternalPackages: ['pg', '@prisma/adapter-pg'],
};

export default nextConfig;
