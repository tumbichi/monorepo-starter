# Deployment

Cómo se deployan las apps de este monorepo. Por defecto: **cada app Next.js es un proyecto de Vercel** y la base de datos es un **PostgreSQL gestionado** (cualquier proveedor).

## Tabla de Contenidos

1. [Configuración inicial](#configuración-inicial)
2. [Checklist pre-deploy](#checklist-pre-deploy)
3. [Migraciones de base de datos](#migraciones-de-base-de-datos)
4. [Deploy de las apps](#deploy-de-las-apps)
5. [Variables de entorno](#variables-de-entorno)
6. [Verificaciones post-deploy](#verificaciones-post-deploy)
7. [Rollback](#rollback)
8. [Troubleshooting](#troubleshooting)

---

## Configuración inicial

Se hace una sola vez por proyecto.

### Base de datos

1. Crear una base PostgreSQL en el proveedor elegido (Neon, Supabase, Railway, RDS, etc.).
2. Obtener dos URLs:
   - **Pooled** (PgBouncer o el pooler del proveedor): la usa la app en runtime → `DATABASE_URL`.
   - **Directa** (sin pooler): la usan las migraciones → `DIRECT_URL`.

   Si el proveedor da una sola URL, alcanza con `DATABASE_URL`.

> **Por qué el pooler:** `@repo/db` abre un `Pool` de `pg` por instancia. En Vercel cada función serverless es una instancia, así que sin pooler las conexiones se agotan rápido.

### Vercel (una vez por app)

1. **New Project** → importar el repo de GitHub.
2. **Root Directory:** `apps/<app>` (ej. `apps/web`). Vercel detecta el monorepo y pnpm solo.
3. **Build Command:** no tocarlo; lo define `apps/<app>/vercel.json` (ver [Deploy de las apps](#deploy-de-las-apps)).
4. Cargar las [variables de entorno](#variables-de-entorno) para **Production** y **Preview**.
5. Opcional: en **Settings → Git → Ignored Build Step**, usar `pnpm dlx turbo-ignore` para no rebuildear la app cuando un push no la afecta.

### Primera migración

En un proyecto recién creado desde el starter todavía no hay migraciones. Después de definir el schema:

```bash
pnpm --filter @repo/db db:migrate --name init
```

Esto crea `packages/db/prisma/migrations/<timestamp>_init/`. Esa carpeta se commitea.

---

## Checklist pre-deploy

```bash
git checkout main && git pull

pnpm lint
pnpm check-types
pnpm build
```

- [ ] Las migraciones nuevas están commiteadas en `packages/db/prisma/migrations/`.
- [ ] Ninguna migración ya aplicada en producción fue editada.
- [ ] Si la migración es destructiva (borra o renombra columnas/tablas), está planificada (ver [Cambios destructivos](#cambios-destructivos)).
- [ ] Las variables de entorno nuevas están cargadas en Vercel **antes** del deploy.
- [ ] Flujos críticos del proyecto probados localmente (ver [Verificaciones post-deploy](#verificaciones-post-deploy)).

---

## Migraciones de base de datos

> ⚠️ **Las migraciones se aplican antes que el código nuevo.** El código nuevo asume el schema nuevo; al revés, la app rompe.

### En desarrollo

```bash
# 1. Editar packages/db/prisma/schema.prisma
# 2. Crear y aplicar la migración en la DB local
pnpm --filter @repo/db db:migrate --name descripcion_del_cambio
# 3. Revisar el SQL generado en packages/db/prisma/migrations/<timestamp>_descripcion_del_cambio/
# 4. Commitear schema + migración juntos
```

Si la DB local queda en un estado inconsistente: `pnpm --filter @repo/db db:reset` (borra todo y reaplica las migraciones).

### En producción

Es automático: el build de producción de Vercel corre `pnpm --filter @repo/db db:deploy` (`prisma migrate deploy`) antes de `next build`. Si la migración falla, el build falla y el deploy anterior sigue activo.

Para aplicarlas a mano (ej. antes de un deploy manual):

```bash
DIRECT_URL="postgresql://..." pnpm --filter @repo/db db:deploy
```

### Deploys de preview

El `vercel.json` aplica migraciones **solo** cuando `VERCEL_ENV=production`. Los previews no migran nada, así que:

- **Nunca** apuntar el entorno Preview a la base de producción.
- Si un preview incluye cambios de schema, necesita su propia base (una DB de staging o un branch del proveedor, si lo soporta) con la migración aplicada a mano.

### Cambios destructivos

Borrar o renombrar una columna en un solo deploy rompe la versión anterior que todavía está sirviendo tráfico durante el deploy. Hacerlo en dos pasos:

1. **Deploy 1:** agregar lo nuevo (columna nueva, nullable o con default) y hacer que el código escriba en ambos lados / deje de leer lo viejo.
2. **Deploy 2:** borrar lo viejo.

---

## Deploy de las apps

### Automático (recomendado)

Cada push a `main` deploya a producción; cada push a otra rama o PR genera un deploy de preview.

El build de cada app lo define su `vercel.json`:

```json
{
  "buildCommand": "cd ../.. && if [ \"$VERCEL_ENV\" = \"production\" ]; then pnpm --filter @repo/db db:deploy; fi && pnpm turbo run build --filter=web"
}
```

Para una app nueva, copiar `apps/web/vercel.json` y cambiar `--filter=web` por el nombre de la app. Si la app no usa `@repo/db`, sacar la parte de `db:deploy`.

### Manual

```bash
cd apps/web
pnpm dlx vercel        # preview
pnpm dlx vercel --prod # producción
```

---

## Variables de entorno

### Turborepo

Turborepo 2 corre en **modo estricto**: las variables que no están declaradas en `turbo.json` (`tasks.build.env` o `globalEnv`) no llegan al build y tampoco invalidan la caché. **Cada variable nueva que use el build se agrega también ahí.** Las `NEXT_PUBLIC_*` ya están cubiertas con un wildcard.

### Por app

Completar esta tabla en cada proyecto.

#### `apps/web`

| Variable       | Entorno             | Descripción                                                   |
| -------------- | ------------------- | ------------------------------------------------------------- |
| `DATABASE_URL` | Production, Preview | Conexión a Postgres (pooled en producción)                    |
| `DIRECT_URL`   | Production          | Conexión directa para `prisma migrate deploy` (si hay pooler) |

- Las variables `NEXT_PUBLIC_*` se embeben en el bundle del cliente **en el build**: cambiarlas requiere redeployar.
- Los secretos nunca llevan prefijo `NEXT_PUBLIC_`.

---

## Verificaciones post-deploy

### Genéricas

- [ ] La app responde en su dominio de producción.
- [ ] Las páginas principales cargan sin errores (revisar la consola del navegador).
- [ ] Los logs de Vercel (**Deployment → Logs** / **Functions**) no muestran errores nuevos.
- [ ] Si hubo migración, el log del build muestra `All migrations have been successfully applied` (o `No pending migrations`).

### Flujos críticos del proyecto

Listar acá los flujos que se prueban después de cada deploy (login, checkout, CRUD principal, etc.):

- [ ] …

---

## Rollback

### Código

En Vercel: **Deployments** → elegir el último deployment sano → **⋯ → Instant Rollback** (o **Promote to Production**). Es inmediato y no rebuildea.

> El rollback de código **no** revierte migraciones. Si el deploy incluía una migración, el código viejo tiene que ser compatible con el schema nuevo; por eso los [cambios destructivos](#cambios-destructivos) van en dos pasos.

### Base de datos

> ⚠️ Puede causar pérdida de datos. Solo en emergencias.

Prisma no tiene "migrate down". Opciones:

1. **Migración inversa** (preferida): crear una migración nueva que deshaga el cambio y deployarla como cualquier otra.
2. **Restaurar un backup** desde el panel del proveedor (point-in-time recovery si lo ofrece).

Si una migración falló a mitad de camino en producción, queda marcada como fallida y bloquea las siguientes. Después de corregir el problema a mano:

```bash
DIRECT_URL="postgresql://..." pnpm --filter @repo/db exec prisma migrate resolve --config prisma7.config.ts --rolled-back <nombre_de_la_migracion>
```

---

## Troubleshooting

### El build falla en Vercel

1. Verificar que pasa local: `pnpm build`.
2. Revisar el log de build en Vercel.
3. ¿Falta una variable? Confirmar que está cargada en Vercel **y** declarada en `turbo.json`.
4. ¿Error de `<Suspense>` / dynamic data? Con `cacheComponents` activado, toda lectura dinámica fuera de un `<Suspense>` rompe el build (ver `docs/ARCHITECTURE.md`).

### Falla `prisma migrate deploy`

1. ¿`DIRECT_URL` apunta a la conexión directa? Las migraciones no funcionan a través de PgBouncer en modo transacción.
2. ¿Hay una migración marcada como fallida? Ver [Rollback → Base de datos](#base-de-datos).
3. ¿Se editó una migración ya aplicada? Prisma detecta el cambio de checksum y aborta. Revertir la edición y crear una migración nueva.

### Errores de conexión en runtime (`too many connections`, timeouts)

1. `DATABASE_URL` tiene que ser la URL **pooled** del proveedor.
2. Verificar que la base está activa (algunos proveedores suspenden bases inactivas en el plan gratuito).
