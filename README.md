# monorepo-starter

Base para proyectos nuevos: pnpm workspaces + Turborepo con los paquetes compartidos de siempre (UI, ESLint, TypeScript y DB) y una app Next.js de ejemplo ya conectada.

## Crear un proyecto nuevo

```bash
pnpm dlx create-turbo@latest --example https://github.com/<usuario>/monorepo-starter mi-proyecto
```

`create-turbo` copia el repo sin el historial de git, instala dependencias y hace el primer commit. Otras opciones: el botón **Use this template** de GitHub (marcando el repo como template en Settings) o `gh repo create mi-proyecto --template <usuario>/monorepo-starter --clone`.

Después de crear el proyecto:

1. Renombrá `name` en el `package.json` raíz, el `title` en `apps/web/app/layout.tsx` y la DB en `docker-compose.yml` y en los `.env.example`.
2. Reemplazá `docs/ARCHITECTURE.md` y el modelo `Example` de `packages/db/prisma/schema.prisma` por los tuyos.
3. Borrá lo que no uses: si no hay DB, eliminá `packages/db`, `docker-compose.yml` y `@repo/db` de `apps/web` (dependencia y `transpilePackages` en `next.config.ts`).

## Stack

pnpm 11 · Node 26 · Turborepo 2 · TypeScript 7 · Next.js 16 · React 19 · Tailwind 3 + shadcn/ui · Prisma 7 + PostgreSQL 15 (Docker).

```
apps/web                    Next.js (App Router) que consume @repo/ui y @repo/db
packages/ui                 Componentes shadcn, tema (tokens HSL), preset de Tailwind
packages/db                 Schema de Prisma, cliente con adapter pg (singleton)
packages/eslint-config      base / react / nextjs (flat config)
packages/typescript-config  base / react / nextjs
turbo/generators            Generador `pnpm gen package`
```

Las versiones compartidas viven en el `catalog:` de `pnpm-workspace.yaml`: para actualizar React, Next o TypeScript se cambia ahí una sola vez.

Los paquetes internos no se compilan: exportan TypeScript directo y Next los transpila (`transpilePackages`).

## Puesta en marcha

```bash
nvm use
pnpm install                          # también genera el cliente de Prisma
docker compose up -d                  # Postgres en localhost:5439 (+ pgAdmin en :5051)
cp apps/web/.env.example apps/web/.env.local
cp packages/db/.env.example packages/db/.env
pnpm --filter @repo/db db:push        # sin migraciones: el schema se sincroniza con push
pnpm dev                              # http://localhost:3000
```

## Comandos

| Comando | Qué hace |
|---|---|
| `pnpm dev` / `build` / `lint` / `check-types` | Tareas de Turborepo en todo el monorepo |
| `pnpm --filter @repo/db db:generate` / `db:push` / `db:studio` | Prisma |
| `pnpm gen package` | Crea `packages/<nombre>` (`@repo/<nombre>`, TypeScript o React) con tsconfig y ESLint compartidos |
| `pnpm turbo gen workspace --copy` | Crea una app o paquete nuevo copiando uno existente (por ejemplo, otra app Next a partir de `apps/web`) |

## UI

Agregar componentes de shadcn desde `packages/ui`:

```bash
cd packages/ui && pnpm dlx shadcn@latest add <componente>
```

Se importan como `@repo/ui/components/<componente>`. El tema se cambia en `packages/ui/src/styles/globals.css`. Cada app usa el preset con `presets: [uiPreset]` y agrega `../../packages/ui/src/**/*.{ts,tsx}` a `content`.
