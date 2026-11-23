# Arquitectura y Convenciones

Este documento describe la arquitectura del monorepo y la estructura estándar de las apps Next.js que viven en él.

El objetivo es una base de código **escalable, mantenible y desacoplada**, donde las piezas (módulos, componentes, hooks, utils) sean **reutilizables e independientes**, al punto de poder extraerse a una librería sin reescribirlas. Para eso combinamos:

- **Monorepo** (pnpm workspaces + Turborepo): apps desplegables y paquetes compartidos.
- **Module Pattern**: dentro de cada app, el código se divide por dominio de negocio.
- **Feature Pattern (Smart/Dumb)**: una evolución semántica de Container/Presentational, adaptada a React Server Components.

---

## 🏗️ Conceptos Core

1. **El router es solo un punto de entrada.** `src/app/` define rutas y lee la URL; la lógica de negocio y las vistas viven en los módulos.
2. **Module Pattern.** El código se agrupa verticalmente por dominio (ej. `Auth`, `Budget`, `Portfolio`). Cada módulo es un micro-ecosistema con una API pública.
3. **Feature Pattern (Smart/Dumb):**
   - **Features (Smart):** orquestan. Leen sus propios datos (en el servidor o vía hooks en el cliente), manejan estados de carga/error y componen la UI.
   - **Components (Dumb/Presentacionales):** solo reciben `props` y emiten eventos (`callbacks`). No saben de dónde vienen los datos.
4. **Agnóstico vs. consciente del framework.**
   - **Agnósticos** (extraíbles a una lib tal cual): `components/`, `utils/`, `types/` y los hooks que no dependen de Next.
   - **Conscientes de RSC/Next**: `features/`, `services/`, `actions/`. Saben si corren en el servidor o en el cliente.

---

## 🗂️ Nivel Monorepo

```text
apps/                     # Apps desplegables
└── web/                  # App Next.js (estructura descrita más abajo)
packages/                 # Código compartido entre apps
├── ui/                   # @repo/ui — componentes base (shadcn/ui), estilos y preset de Tailwind
├── db/                   # @repo/db — cliente Prisma, schema y enums
├── eslint-config/        # @repo/eslint-config
└── typescript-config/    # @repo/typescript-config
docs/                     # Documentación (este archivo)
```

**Reglas de dependencia entre workspaces:**

1. Las apps importan de los paquetes, **nunca al revés**.
2. Una app **nunca** importa de otra app. Si dos apps necesitan lo mismo, eso va en un paquete.
3. Los paquetes se consumen por su nombre (`@repo/ui/components/button`), nunca por ruta relativa (`../../packages/...`).
4. Las versiones compartidas se definen una sola vez en el `catalog` de `pnpm-workspace.yaml`.

---

## 📂 Estructura de una App

```text
apps/web/
├── src/
│   ├── app/          # 1. Capa de Enrutamiento (Next.js)
│   ├── core/         # 2. Capa Compartida de la app
│   └── modules/      # 3. Capa de Dominio / Negocio
└── tests/
    └── e2e/          # Tests end-to-end de flujos críticos (Playwright)
```

### 1. Capa de Enrutamiento (`src/app/`)

Es la capa más externa y pertenece exclusivamente a Next.js.

- **Responsabilidad:** rutas, layouts, metadatos (SEO), `loading.tsx`/`error.tsx`, y Route Handlers (`app/api/`).
- **Regla de oro:** las páginas son **finas**. Leen lo que le pertenece a la URL (`params`, `searchParams`) o a la sesión (ej. el id del usuario autenticado) y renderizan una o más Features pasándoles esos valores.
- La página **no** lee datos de dominio para pasárselos a la Feature: eso lo hace la Feature (ver [Datos: servidor y cliente](#-datos-servidor-y-cliente)).
- Los Route Handlers (`app/api/**/route.ts`) son finos: validan el request y delegan en `services/` del módulo correspondiente.

### 2. Capa Compartida (`src/core/`)

Código **transversal a toda la app** y agnóstico a cualquier dominio. Parte de lo que antes vivía acá ahora vive en paquetes del monorepo:

| Carpeta       | Contenido                                                            | Nota en el monorepo                                                                                                 |
| ------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `components/` | Componentes genéricos propios de esta app                            | Las primitivas (botones, inputs, modales) vienen de `@repo/ui`. Acá solo va lo genérico que no aplica a otras apps. |
| `layout/`     | Estructura de la app (Navbar, Sidebar, Footer)                       |                                                                                                                     |
| `hooks/`      | Hooks globales (ej. `useMediaQuery`)                                 |                                                                                                                     |
| `lib/`        | Configuración de librerías (ej. instancia de axios en `lib/http.ts`) |                                                                                                                     |
| `utils/`      | Funciones utilitarias genéricas (formateadores, etc.)                |                                                                                                                     |
| `types/`      | Tipos compartidos por varios módulos                                 |                                                                                                                     |
| `contexts/`   | Providers globales                                                   | Patrón directorio: `contexts/[Nombre]/index.ts` + `Provider.tsx` + `hooks/`                                         |

El cliente de base de datos **no** vive en `core/`: es `@repo/db`.

> Cuando algo de `core/` lo necesita una segunda app, se promueve a un paquete (ver [De módulo a librería](#-de-módulo-a-librería)).

### 3. Capa de Dominio (`src/modules/`)

Es el corazón de la app. El código se agrupa por contexto de negocio (ej. `Budget`, `Auth`, `Reports`) y cada módulo tiene su estructura encapsulada:

```text
src/modules/Budget/
├── __tests__/      # Tests unitarios y de integración del módulo
├── actions/        # Server Actions ('use server'): mutaciones y lecturas invocables desde el cliente
├── components/     # Dumb components (UI específica del módulo)
├── features/       # Smart components (orquestadores, puntos de entrada para las páginas)
├── hooks/          # Lógica de React del lado del cliente
├── services/       # Acceso a datos del lado del servidor (server-only): @repo/db, APIs externas
├── types/          # Interfaces y tipos del módulo
├── utils/          # Funciones auxiliares puras del módulo
└── index.ts        # API pública del módulo
```

No todas las carpetas son obligatorias: se crean a medida que hacen falta.

#### Anatomía de un Módulo

- **`features/` (Smart):**
  Los puntos de entrada para las páginas. Una Feature lee sus propios datos, maneja los estados de carga y error, y pasa datos limpios a los componentes hijos. Puede ser un Server Component, un Client Component, o una combinación de ambos (ver abajo).
- **`components/` (Dumb):**
  Componentes puramente visuales (ej. `ExpenseItem.tsx`, `CategoryBadge.tsx`). Reciben `data` e invocan callbacks como `onDelete` u `onUpdate`. Son altamente testeables y predecibles. Pueden ser Server o Client Components según necesiten interactividad, pero nunca leen datos.
- **`services/` (server-only):**
  Funciones asíncronas que acceden a datos desde el servidor: `@repo/db` (Prisma) o APIs externas. Cada archivo empieza con `import 'server-only'` para que nunca termine en el bundle del cliente. Son la **única** puerta a la base de datos.
- **`actions/` (Server Actions):**
  Archivos con `'use server'`. Son el puente entre el cliente y el servidor: mutaciones (crear, editar, borrar) y, cuando hace falta, lecturas desde el cliente. Validan la entrada, verifican permisos y delegan en `services/`. Después de mutar, revalidan lo que corresponda (`revalidatePath`, `revalidateTag`, `updateTag`).
- **`hooks/` (cliente):**
  Lógica de React del lado del cliente: estado, efectos y **toda lectura de datos que ocurra en el cliente**. Un hook obtiene datos llamando a una action o a un endpoint HTTP (con axios vía `core/lib/http.ts`, o `fetch`). No usamos librerías de data fetching (React Query, SWR): los hooks son propios.
- **`index.ts`:**
  La API pública del módulo. Exporta las Features (y los tipos/utils que otros módulos puedan necesitar). Desde fuera del módulo solo se importa desde acá.

---

## 🔀 Datos: servidor y cliente

### Lectura en el servidor (caso por defecto)

Si una Feature necesita datos del servidor, **los lee ella misma**. No se pasan datos de la página a la Feature por props: eso solo agrega acoplamiento.

La app usa **Partial Prerendering** (`cacheComponents: true` y `partialPrefetching: true` en `next.config.ts`):

1. En el build se pre-renderiza todo lo estático: layout, encabezados, textos de la página.
2. Cada Feature que lee datos se renderiza dentro de un `<Suspense>`; mientras tanto se muestra su skeleton.
3. El servidor streamea el HTML de cada Feature a medida que sus datos están listos, en la misma respuesta (sin requests extra del cliente).

El resultado: la página aparece al instante y cada Feature carga de forma independiente.

**Regla: la Feature trae su propio loader.** El `<Suspense>` vive dentro del archivo de la Feature, no en la página:

```tsx
// src/modules/Budget/features/budget-board.feature.tsx
import { Suspense } from "react";
import { getBudgets } from "../services/budgets.service";
import { BudgetList } from "../components/BudgetList";
import { BudgetBoardSkeleton } from "../components/BudgetBoardSkeleton";

export function BudgetBoard({ userId }: BudgetBoardProps) {
  return (
    <Suspense fallback={<BudgetBoardSkeleton />}>
      <BudgetBoardContent userId={userId} />
    </Suspense>
  );
}

async function BudgetBoardContent({ userId }: BudgetBoardProps) {
  const budgets = await getBudgets(userId);
  return <BudgetList budgets={budgets} />;
}
```

```tsx
// src/app/budgets/page.tsx
import { BudgetBoard } from "@/modules/Budget";

export default async function BudgetsPage() {
  const { userId } = await getSession();
  return <BudgetBoard userId={userId} />;
}
```

> Con `cacheComponents` activado, cualquier lectura dinámica (datos sin cachear, `cookies()`, `headers()`, `params`) que no esté dentro de un `<Suspense>` hace fallar el build. Esto es intencional: obliga a cumplir esta regla.

`loading.tsx` queda reservado para cargas de página completa; la granularidad normal es por Feature.

### Features interactivas: servidor + cliente

Un Server Component no puede pasar funciones comunes (callbacks) a un Client Component; solo Server Actions. Cuando una Feature necesita estado o interactividad, se divide en dos mitades:

- **`BudgetBoard`** (servidor): lee los datos iniciales.
- **`BudgetBoardClient`** (`'use client'`): recibe los datos iniciales por props, maneja el estado con hooks, invoca actions y pasa callbacks a los dumb components.

Es el único caso en que una Feature recibe datos por props, y es entre sus propias mitades. Ambas viven en `features/`; solo la mitad de servidor se exporta en `index.ts`.

### Lectura en el cliente

Si algo se tiene que leer desde el cliente (ej. búsqueda en vivo, polling, datos que dependen de interacción), **siempre se hace a través de un hook** del módulo. El hook llama a una action o a un endpoint HTTP; nunca importa `services/`.

### Mutaciones

Siempre por **Server Actions** en `actions/`. La action valida, verifica permisos, llama al service y revalida la caché.

### Deduplicación y caché

- **Mismo request:** si varias Features de una página piden los mismos datos, el service se envuelve en `React.cache()` y la query se ejecuta una sola vez.
- **Entre requests:** datos que pueden cachearse se marcan con `'use cache'` (con `cacheLife`/`cacheTag`) y se invalidan desde las actions.

---

## 🔄 Reglas de Dependencia

1. **Página:** `src/app` solo importa de la API pública de los módulos (`@/modules/X`), de `core/` y de los paquetes.
2. **Módulos:**
   - Un módulo **no** importa de las carpetas internas de otro módulo; solo de su `index.ts`.
   - Si dos módulos necesitan compartir algo que no es una Feature, ese algo probablemente pertenece a `core/` (o a un paquete).
   - Sin dependencias circulares entre módulos.
3. **Feature:** importa `components`, `hooks`, `services` y `actions` de su propio módulo, más `core/` y paquetes. Una Feature de servidor no importa hooks; una de cliente no importa services.
4. **Component (Dumb):** **no** importa de `features/`, `hooks/`, `services/` ni `actions/`. Solo de otros `components/`, `utils/`, `types/`, `core/components` y `@repo/ui`.
5. **Hook:** puede importar `actions/`, `utils/`, `types/` y `core/`. **Nunca** `services/`.
6. **Action:** importa `services/`, `utils/` y `types/`. No importa nada de React.
7. **Service:** importa `@repo/db`, `utils/` y `types/`. No importa nada de React ni de `actions/`.

```text
page ──▶ feature ──▶ components (dumb)
           │  │
  servidor │  │ cliente
           ▼  ▼
     services  hooks ──▶ actions ──▶ services ──▶ @repo/db
```

---

## 🏷️ Convenciones de Nombres

| Tipo        | Formato                  | Ejemplo                    |
| ----------- | ------------------------ | -------------------------- |
| Módulos     | `PascalCase/`            | `modules/Budget/`          |
| Features    | `kebab-case.feature.tsx` | `budget-board.feature.tsx` |
| Componentes | `PascalCase.tsx`         | `ExpenseItem.tsx`          |
| Hooks       | `useCamelCase.ts`        | `useExpenseCrud.ts`        |
| Actions     | `kebab-case.actions.ts`  | `expenses.actions.ts`      |
| Services    | `kebab-case.service.ts`  | `expenses.service.ts`      |
| Utils       | `camelCase.ts`           | `formatCurrency.ts`        |
| Props       | `NombreComponenteProps`  | `ExpenseItemProps`         |

Las directivas `'use client'`, `'use server'` o `import 'server-only'` van siempre en la primera línea del archivo.

---

## 🧪 Testing

| Qué                           | Cómo                    | Dónde                   |
| ----------------------------- | ----------------------- | ----------------------- |
| Dumb components, utils, hooks | Unitarios               | `modules/X/__tests__/`  |
| Services y actions            | Unitarios / integración | `modules/X/__tests__/`  |
| Features y flujos críticos    | E2E con Playwright      | `apps/<app>/tests/e2e/` |

Las Features de servidor (async Server Components) no se testean unitariamente: se cubren con E2E.

---

## 📦 De módulo a librería

La arquitectura está pensada para que extraer código sea mover una carpeta, no reescribirla:

1. **Módulo → paquete.** Cuando dos apps necesitan el mismo módulo, se mueve a `packages/<nombre>` conservando su estructura interna y pasa a ser `@repo/<nombre>`. Como desde afuera solo se importaba su `index.ts`, la migración se reduce a cambiar `@/modules/X` por `@repo/<nombre>`.
2. **`core/` → paquete.** Un hook, util o componente genérico que necesita una segunda app se promueve a un paquete existente (ej. `@repo/ui`) o a uno nuevo.
3. **Requisito:** que se hayan respetado las [reglas de dependencia](#-reglas-de-dependencia). Un módulo que importa internals de otro, o un componente dumb que lee datos, no se puede extraer limpio.

Al crear un paquete nuevo: agregarlo a `transpilePackages` en el `next.config.ts` de las apps que lo consumen.

---

## 💡 Ejemplo de Flujo

1. El usuario entra a `/budgets`.
2. Next sirve al instante el shell pre-renderizado: layout, navbar y el skeleton de `BudgetBoard`.
3. `src/app/budgets/page.tsx` obtiene el `userId` de la sesión y renderiza `<BudgetBoard userId={userId} />`.
4. `BudgetBoard` (en `modules/Budget/features/`) llama a `getBudgets()` de `budgets.service.ts`, que consulta `@repo/db`.
5. Cuando llegan los datos, el servidor streamea `BudgetBoardClient` con los budgets iniciales, que reemplaza al skeleton.
6. El usuario borra un gasto: `<ExpenseItem onDelete={...} />` dispara el callback, `BudgetBoardClient` llama a `deleteExpense()` de `expenses.actions.ts`, la action delega en el service y revalida el tag `budgets`.
