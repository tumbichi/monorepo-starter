# AGENTS.md

Guía para agentes de IA que trabajan en este repo. La arquitectura completa (capas, módulos, features, flujo de datos y reglas de dependencia) está en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): **leela antes de crear archivos o mover código**. El proceso de deploy y migraciones en producción está en [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

## Stack

pnpm 11 · Node 26 · Turborepo 2 · TypeScript 7 · Next.js 16 (App Router) · React 19 · Tailwind CSS 3 + shadcn/ui · Prisma 7 + PostgreSQL 15.

Varias de estas versiones pueden ser más nuevas que tu conocimiento. Puntos a tener en cuenta:

- **Next 16** con `cacheComponents` y `partialPrefetching` activados. `params`, `searchParams`, `cookies()` y `headers()` son asíncronos, y toda lectura dinámica debe estar dentro de un `<Suspense>`. Si no, el build falla.
- **Tailwind 3**, no v4. La configuración está en `tailwind.config.ts`; cada app usa el preset de `@repo/ui`.
- **Prisma 7**: la configuración está en `packages/db/prisma7.config.ts` y el cliente se genera en `packages/db/lib/prisma`.

Ante la duda, consultá la documentación de la versión instalada en `node_modules` antes de asumir una API.

## Comandos

**Solo `pnpm`.** No uses `npm`, `npx` ni `yarn`; en su lugar usá `pnpm exec` o `pnpm dlx`.

```bash
pnpm dev                              # Todas las apps (Turborepo)
pnpm build                            # Build de todo el monorepo
pnpm lint                             # ESLint (--max-warnings 0)
pnpm check-types                      # Chequeo de tipos
pnpm format                           # Prettier

pnpm --filter web <script>            # Correr un script en un solo workspace

docker compose up -d                  # Postgres en localhost:5439 (+ pgAdmin en :5051)
pnpm --filter @repo/db db:generate    # Regenerar el cliente tras cambiar el schema
pnpm --filter @repo/db db:migrate     # Crear y aplicar una migración tras cambiar el schema
pnpm --filter @repo/db db:reset       # Borrar la DB local y reaplicar todas las migraciones
pnpm --filter @repo/db db:studio      # Explorar la DB

pnpm gen package                      # Crear packages/<nombre>
```

No hay test runner configurado todavía. Cuando se agregue, la ubicación de los tests está definida en `docs/ARCHITECTURE.md` → Testing.

**Antes de dar una tarea por terminada:** correr `pnpm lint` y `pnpm check-types`. Si se tocó configuración, routing o data fetching, correr también `pnpm --filter web build`.

## Monorepo

- Las dependencias compartidas (React, Next, TypeScript, etc.) se versionan en el `catalog` de `pnpm-workspace.yaml` y se referencian con `"catalog:"`. No fijes versiones sueltas en un `package.json` si la dependencia ya está en el catálogo.
- Los paquetes internos exportan TypeScript sin compilar. Si una app consume un paquete nuevo, hay que agregarlo a `transpilePackages` en su `next.config.ts`.
- Se importa siempre por nombre de paquete (`@repo/ui/components/button`), nunca con rutas relativas entre workspaces.
- Dentro de una app, el alias es `@/*` → `src/*` (ej. `@/modules/Budget`, `@/core/utils/formatDate`).

## Convenciones de Código

### TypeScript

- Modo `strict`. No lo desactives por archivo ni por línea.
- `interface` para props y formas de objetos; `type` para uniones, intersecciones y tipos derivados de Prisma.
- Las props se llaman `NombreComponenteProps`.
- Evitar `any`. Si es inevitable, dejar un comentario explicando por qué.
- Usar `import type` para los imports que son solo de tipos.

### Imports (orden)

1. Directiva `'use client'`, `'use server'` o `import 'server-only'` (primera línea, si aplica)
2. React / Next
3. Librerías de terceros
4. Paquetes del monorepo (`@repo/*`)
5. Alias de la app (`@/core/*`, `@/modules/*`)
6. Imports relativos dentro del mismo módulo

### Componentes

- **Named exports** (`export function BudgetBoard`), así funcionan los `index.ts` de los módulos. `export default` solo donde Next lo exige (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, etc.).
- Los componentes son Server Components por defecto. Agregá `'use client'` solo cuando hace falta (estado, efectos, eventos, APIs del navegador).
- Los nombres de archivo siguen la tabla de `docs/ARCHITECTURE.md` → Convenciones de Nombres.

### Estilos y UI

- Primero buscá el componente en `@repo/ui`. Para sumar uno de shadcn: `cd packages/ui && pnpm dlx shadcn@latest add <componente>`.
- No modifiques los componentes generados de shadcn para un caso puntual: componelos o agregá una variante. Si un cambio tiene que aplicar a todas las apps, se hace en `packages/ui`.
- `cn()` para clases condicionales: `import { cn } from '@repo/ui/lib/utils'`.
- El tema (tokens HSL) se cambia en `packages/ui/src/styles/globals.css`. No hardcodees colores.
- Íconos: solo `lucide-react`.

### Datos

- La base de datos se accede **solo** desde `services/` (server-only), con `import { prisma } from '@repo/db'`.
- Las mutaciones se hacen solo con Server Actions en `actions/`, que después revalidan (`revalidatePath`, `revalidateTag` o `updateTag`).
- Las lecturas desde el cliente se hacen solo con hooks propios del módulo, que llaman a una action o a un endpoint (axios o `fetch`). No hay React Query ni SWR.
- Después de cambiar `schema.prisma`: `pnpm --filter @repo/db db:migrate --name <descripcion>`. Las migraciones generadas (`packages/db/prisma/migrations/`) se commitean; nunca edites una que ya se aplicó en producción.

### Errores

- En actions y services, dejá que los errores propaguen. Usá try/catch solo para agregar contexto o traducir el error a uno de dominio.
- En el cliente, usá try/catch en los handlers async: `console.error()` y feedback con `toast.error()` de `sonner` (el `<Toaster />` ya está montado en el layout raíz).

### Idioma

- Todo texto visible al usuario (labels, toasts, mensajes de error, metadata) va en **español**.
- El código (nombres de variables, funciones, archivos) va en inglés.

## Variables de Entorno

- `apps/web/.env.local` y `packages/db/.env`. Los dos parten de su `.env.example`.
- Solo las variables con prefijo `NEXT_PUBLIC_` llegan al cliente. Los secretos nunca llevan ese prefijo.
- Nunca commitees archivos `.env*` salvo los `.env.example`.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": true` in the root `turbo.json` or `turbo.jsonc` to opt in; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
