# monorepo-starter

Base para proyectos nuevos: pnpm workspaces + Turborepo con los paquetes compartidos de siempre (UI, ESLint, TypeScript y DB) y una app Next.js de ejemplo ya conectada.

## Crear un proyecto nuevo

### Opción A: `create-turbo` (recomendada)

```bash
pnpm dlx create-turbo@latest --example https://github.com/<usuario>/monorepo-starter --package-manager pnpm mi-proyecto
```

Copia el repo **sin el historial de git**, instala dependencias y hace el primer commit. Requiere que el repo del starter sea **público** en GitHub; si es privado, usá la opción B.

Para partir de una versión fija del starter (un tag o una rama), usá la URL completa: `https://github.com/<usuario>/monorepo-starter/tree/<tag-o-rama>`.

### Opción B: template de GitHub

Marcá el repo como template una sola vez (**Settings → General → Template repository**). Después:

```bash
gh repo create mi-proyecto --private --template <usuario>/monorepo-starter --clone
cd mi-proyecto && pnpm install
```

O usá el botón **Use this template** en GitHub. Funciona con repos privados y crea el repo remoto en el mismo paso.

## Checklist después de crear el proyecto

**Identidad**

- [ ] `name` en el `package.json` raíz.
- [ ] `metadata` (`title`, `description`) en `apps/web/src/app/layout.tsx`.
- [ ] Este README: reemplazá el título y la descripción, y borrá las secciones "Crear un proyecto nuevo" y "Checklist después de crear el proyecto".

**Base de datos**

- [ ] En `docker-compose.yml`, cambiá `POSTGRES_DB` y los puertos (`5439` de Postgres y `5051` de pgAdmin) por unos que no use otro proyecto tuyo. Si no, los contenedores de proyectos distintos chocan.
- [ ] Actualizá `DATABASE_URL` en `apps/web/.env.example` y `packages/db/.env.example` con esa DB y ese puerto.
- [ ] Reemplazá el modelo `Example` de `packages/db/prisma/schema.prisma` por los tuyos y creá la migración inicial: `pnpm --filter @repo/db db:migrate --name init`.

**Docs**

- [ ] `docs/DEPLOYMENT.md`: completá la tabla de variables de entorno y la lista de flujos críticos.
- [ ] `AGENTS.md`: agregá lo propio del proyecto (dominio, reglas de negocio, integraciones externas).

**Deploy**

- [ ] Creá el proyecto en Vercel siguiendo `docs/DEPLOYMENT.md` → Configuración inicial.

**Lo que no uses**

- [ ] **Sin DB:** eliminá `packages/db` y `docker-compose.yml`, y en `apps/web` sacá `@repo/db` (de `package.json` y de `transpilePackages` en `next.config.ts`). Sacá también `db:deploy` de `apps/web/vercel.json` y `DATABASE_URL`/`DIRECT_URL` de `turbo.json`.
- [ ] **Otra app en lugar de `web` (o además de ella):** `pnpm turbo gen workspace --copy`. Copiá también su `vercel.json` y cambiá el `--filter=web`.

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
pnpm --filter @repo/db db:migrate     # aplica las migraciones (la primera vez: crea la inicial)
pnpm dev                              # http://localhost:3000
```

## Comandos

| Comando                                                         | Qué hace                                                                                                |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `pnpm dev` / `build` / `lint` / `check-types`                   | Tareas de Turborepo en todo el monorepo                                                                 |
| `pnpm --filter @repo/db db:migrate`                             | Crea y aplica una migración a partir de los cambios del schema                                          |
| `pnpm --filter @repo/db db:deploy`                              | Aplica las migraciones pendientes (producción, ver `docs/DEPLOYMENT.md`)                                |
| `pnpm --filter @repo/db db:generate` / `db:reset` / `db:studio` | Prisma                                                                                                  |
| `pnpm gen package`                                              | Crea `packages/<nombre>` (`@repo/<nombre>`, TypeScript o React) con tsconfig y ESLint compartidos       |
| `pnpm turbo gen workspace --copy`                               | Crea una app o paquete nuevo copiando uno existente (por ejemplo, otra app Next a partir de `apps/web`) |

## UI

Agregar componentes de shadcn desde `packages/ui`:

```bash
cd packages/ui && pnpm dlx shadcn@latest add <componente>
```

Se importan como `@repo/ui/components/<componente>`. El tema se cambia en `packages/ui/src/styles/globals.css`. Cada app usa el preset con `presets: [uiPreset]` y agrega `../../packages/ui/src/**/*.{ts,tsx}` a `content`.
