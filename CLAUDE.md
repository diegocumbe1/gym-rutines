@AGENTS.md

# Gym Routines — Reglas del proyecto

> Este archivo **complementa** `AGENTS.md` (importado arriba). `AGENTS.md` manda en lo referente a Next.js 16 y sus breaking changes; aquí se definen las reglas de producto, dominio y arquitectura del MVP. Ante conflicto sobre APIs del framework, gana `AGENTS.md` y la documentación local en `node_modules/next/dist/docs/`.

## 1. Visión del producto

**Gym Routines** (nombre temporal; subdominio futuro `gym.uselynko.com`) es una app para **crear, planificar y ejecutar rutinas de gimnasio**, registrar series con peso y repeticiones, y consultar el historial.

Uso inicial: **personal, familia y círculo cercano**. No es un producto comercial ni multi-usuario a escala. Se optimiza para usarse **con una mano, durante el entrenamiento**.

## 2. Alcance del MVP

Funcionalidades incluidas:

- Autenticación.
- Biblioteca de ejercicios.
- Plantillas de rutinas.
- Planificación semanal.
- Iniciar entrenamiento.
- Registrar series.
- Registrar peso y repeticiones.
- Marcar series completadas.
- Finalizar sesión.
- Consultar historial básico.

Mantener el alcance pequeño. Ante la duda, preferir la solución más simple que cumpla estas funciones.

## 3. Funcionalidades fuera de alcance

No implementar (salvo decisión explícita posterior del propietario del proyecto):

- Multi-tenant, organizaciones, gimnasios.
- Entrenadores, clientes.
- Pagos, suscripciones.
- Inteligencia artificial.
- Nutrición.
- Integración con Notion.
- Redes sociales, chat.
- Planes médicos, recomendaciones clínicas.
- Aplicación móvil nativa.
- **Cache Components de Next.js** (`cacheComponents`, `use cache`, `cacheLife`, `cacheTag`, PPR).
- Imágenes y GIF del dataset externo **sin licencia propia**.

## 4. Stack técnico confirmado

Valores verificados por inspección del repositorio (no asumidos):

| Área | Valor |
|---|---|
| Framework | Next.js **16.2.10** (App Router) |
| React | **19.2.4** |
| Lenguaje | TypeScript 5, `strict: true`, alias `@/*` → raíz |
| Estilos | Tailwind CSS **v4** (config por CSS en `app/globals.css`, sin `tailwind.config.js`) |
| Componentes | shadcn/ui (a instalar; verificar compatibilidad con Tailwind v4 + React 19) |
| Backend/DB | Supabase (a instalar: `@supabase/supabase-js` + `@supabase/ssr`) |
| Validación | Zod (a instalar) |
| Gestor de paquetes | **pnpm** (usar `pnpm`, nunca `npm`/`yarn`) |
| Bundler | Turbopack (default en Next 16) |

No cambiar de gestor de paquetes ni introducir un `tailwind.config.js` sin motivo.

## 5. Reglas específicas de Next.js 16

- **Antes de usar cualquier API del framework**, consultar `AGENTS.md` y la documentación local en `node_modules/next/dist/docs/`. **No asumir convenciones de versiones anteriores.**
- Usar **`proxy.ts`**, no `middleware.ts` (renombrado en Next 16; exporta `proxy()`).
- Tratar como **asíncronas** las APIs de request: `await cookies()`, `await headers()`, y `params` / `searchParams` (`const { id } = await params`).
- **No activar `cacheComponents`** durante el MVP. No introducir `use cache`, `cacheLife`, `cacheTag`, `updateTag` ni PPR salvo decisión explícita posterior.
- Mutaciones vía **Server Actions** (`'use server'`) + `useActionState` (React 19).
- No usar patrones deprecados de datos/caché de versiones anteriores.

## 6. Arquitectura general

- **App Router** con Server Components por defecto y datos obtenidos en el servidor.
- Rutas públicas de auth en el grupo `(auth)`; rutas protegidas en el grupo `(app)`.
- Acceso a datos centralizado en una **DAL** (`lib/dal/`), no disperso en componentes.
- Mutaciones y auth vía **Server Actions** en `app/actions/`.
- Autorización verificada **cerca del dato** (DAL), no solo en `proxy.ts` ni en layouts.
- Seguridad reforzada en la base con **RLS** desde la primera migración.

## 7. Organización de carpetas

Dirección inicial (documentada, **no crear todavía** en este paso):

```text
app/
├── (auth)/
│   ├── login/
│   └── signup/
├── (app)/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── exercises/
│   ├── templates/
│   ├── plan/
│   ├── workout/[sessionId]/
│   └── history/
├── actions/
├── globals.css
├── layout.tsx
└── proxy.ts

components/
├── ui/
├── exercises/
├── templates/
├── workouts/
└── layout/

lib/
├── supabase/
├── dal/
├── validations/
└── utils/

scripts/
└── import-exercises.ts

supabase/
└── migrations/
```

Sin carpeta `src/` (coherente con el proyecto actual y el alias `@/*` a la raíz).

## 8. Dominio del producto

### Exercise
Ejercicio del catálogo. Debe distinguir: información **propia** vs **importada**, **fuente externa**, instrucciones, grupo muscular, equipamiento e **imagen opcional**.

### WorkoutTemplate
Plantilla reutilizable (ej. Push A, Pull A, Legs A, Upper, Arms, Full Body, Functional).

### WorkoutTemplateExercise
Ejercicio configurado dentro de una plantilla: orden, series objetivo, repeticiones mín/máx, peso sugerido, descanso, RIR, notas.

### WeeklyPlan (calendario)
Asignación de una plantilla a una fecha. En el MVP **no es una tabla aparte**: se realiza mediante `workout_sessions.scheduled_date` + estado `planned`. "La rutina de hoy" = la sesión cuyo `scheduled_date` es hoy. Al elegir una plantilla para un día se crea la sesión copiando (snapshot) sus ejercicios.

### WorkoutSession
Entrenamiento en el calendario y su ejecución. Estados: `planned`, `in_progress`, `completed`, `cancelled`. Guarda `scheduled_date` (fecha) y un snapshot del nombre de la plantilla.

### WorkoutSet
Serie realizada en una sesión. Debe diferenciar: serie de **calentamiento** vs **efectiva**, **objetivo** vs **resultado real**, peso, repeticiones, RIR, estado completado.

### Reglas de dominio
- Una **plantilla** y una **sesión** no son lo mismo.
- Modificar una plantilla **no** debe modificar sesiones pasadas.
- Una sesión conserva un **snapshot histórico** de los ejercicios ejecutados.
- **Peso sugerido ≠ peso realizado**; **repeticiones objetivo ≠ repeticiones realizadas**.
- Una serie de calentamiento debe identificarse claramente.
- Las sesiones incompletas deben poder **retomarse o cancelarse**.
- El historial se conserva aunque una plantilla se elimine o cambie.
- Unidad de peso por defecto en el MVP: **kilogramo (`kg`)**.
- No generar recomendaciones médicas. No prometer resultados físicos garantizados. No asumir que todos los usuarios pueden realizar todos los ejercicios.

## 9. Reglas de TypeScript

- Mantener `strict: true`.
- No usar `any` salvo justificación explícita comentada.
- Preferir tipos concretos; evitar type assertions innecesarias.
- Validar entradas externas **antes** de tratarlas como tipos internos.
- Funciones y componentes pequeños; evitar abstracciones sin uso real.
- Evitar archivos genéricos tipo `helpers.ts`; usar nombres específicos por dominio.

## 10. Server Components y Client Components

- **Server Components por defecto.**
- Usar Client Components (`'use client'`) solo cuando se necesiten: hooks, eventos, estado local, APIs del navegador o interactividad.
- No convertir layouts completos en Client Components sin necesidad.
- No pasar datos sensibles de sesión a componentes cliente.

## 11. Server Actions

- Mutaciones y auth con Server Actions (`'use server'`) en `app/actions/`.
- Tratar cada Server Action como un **endpoint público**: verificar sesión y autorización al inicio.
- Validar el payload con Zod antes de tocar la base.
- Formularios con `useActionState` para estado de envío y errores.
- Devolver errores en español, comprensibles, sin filtrar detalles internos.

## 12. Acceso a Supabase

- Separar cliente de **navegador** y de **servidor**; usar `@supabase/ssr`.
- **Nunca** exponer la service role key ni usar cliente administrativo en el navegador.
- No acceder a Supabase desde componentes presentacionales; centralizar consultas en `lib/dal/`.
- Manejar siempre `{ error }` de forma explícita; no ignorarlo.

## 13. Autenticación y autorización

- Auth con Supabase (`@supabase/ssr`), sesión por cookie en el servidor.
- DAL con `verifySession()` (memoizado con `cache()` de React) + `getUser()`.
- Verificar autorización **cerca del acceso a datos**; no confiar únicamente en redirecciones de `proxy.ts` o layouts (los layouts no re-renderizan por navegación).
- `proxy.ts` sirve para chequeos optimistas y redirecciones, no como única defensa.

## 14. Row Level Security

- **RLS activada desde la primera migración**, en todas las tablas con datos de usuario.
- Políticas basadas en `auth.uid() = user_id`.
- El uso personal **no** exime de RLS: es la línea de defensa principal contra fugas entre usuarios.

## 15. Validación y manejo de errores

- Usar Zod (una vez instalado) para validar: formularios, parámetros, identificadores, datos importados y payloads de Server Actions.
- No confiar en valores enviados por el cliente.
- Estados de UI obligatorios: `loading`, `empty`, `error`, `success`, `disabled`.
- Mensajes de error en **español**, sin exponer detalles internos de base de datos.

## 16. Convenciones de nombres

- Componentes: `PascalCase`. Hooks: `useCamelCase`. Utilidades/variables: `camelCase`.
- Server Actions: verbos claros (`createTemplate`, `logSet`, `finishSession`).
- Nombres de dominio en inglés en el código (`WorkoutSession`, `WorkoutSet`); texto de UI en español.
- Archivos con nombre específico por dominio; evitar `utils.ts` genéricos salvo el helper `cn` de shadcn/ui.
- Tablas y columnas en `snake_case` (`workout_sessions`, `set_logs`, `user_id`).

## 17. Diseño mobile-first

- Mobile-first, optimizado para uso **durante el entrenamiento**.
- Botones grandes y fáciles de pulsar; campos de peso/repeticiones accesibles con una mano.
- Evitar flujos con demasiados pasos y modales largos (preferir página o bottom sheet).
- Incluir siempre los estados de UI: loading, empty, error, success, disabled.

## 18. Accesibilidad

- Buen contraste y navegación por teclado.
- No depender únicamente del color para transmitir estado (añadir texto/iconos).
- Etiquetas (`label`) asociadas a inputs; foco visible; targets táctiles amplios.

## 19. Seguridad

- No exponer secretos ni service role key al cliente; secretos solo en variables de entorno del servidor.
- RLS + verificación de autorización en la DAL y en cada Server Action / Route Handler.
- Validar toda entrada externa; no confiar en el cliente.
- No commitear `.env*` (ya en `.gitignore`).

## 20. Dataset externo

Repositorio local (solo como **fuente offline** de datos):
`/Users/DiegoCumbe/Documents/personal/projects/exercises-dataset`

- **No** usarlo como dependencia de runtime; **no** importar su `index.html`.
- **No** incluir `exercises.json` completo en el bundle del cliente.
- **Licencia dual:** texto/metadatos bajo **MIT** (usables); imágenes y GIF son **© Gym Visual**, propietarios — "clonar el repo no es una licencia". **No copiar ni servir la media sin licencia propia de Gym Visual.**
- Importar posteriormente **solo metadatos permitidos**, con un script reproducible.
- Guardar trazabilidad: `external_id`, `source`, `source_attribution`.
- Usar el **español** cuando esté disponible (el dataset incluye `es`).
- No depender permanentemente de la estructura externa; mapear a nuestro propio modelo.
- El MVP puede funcionar inicialmente **sin imágenes** (`image_url` nulo).

## 21. Migraciones y scripts

- Esquema de base gestionado con migraciones SQL en `supabase/migrations/`.
- Cada migración de tablas de usuario incluye su **RLS** correspondiente.
- Importación del dataset mediante `scripts/import-exercises.ts`: reproducible, idempotente, leyendo el JSON desde el checkout local externo (no dentro del repo ni commiteado).
- No commitear archivos del dataset externo ni su media dentro de este proyecto.

## 22. Pruebas y validaciones

- Antes de dar por terminado un cambio: `pnpm lint` y `pnpm build` deben pasar sin errores.
- Verificar el flujo afectado de forma real (no solo compilación) cuando tenga superficie ejecutable.
- Comprobar los estados de UI (loading/empty/error/success) del flujo tocado.
- Confirmar que las políticas RLS impiden el acceso a datos de otros usuarios.

## 23. Definición de terminado

Una funcionalidad está terminada cuando:

- Respeta el alcance del MVP y estas reglas.
- Server Components/Client Components usados correctamente (mínimo `'use client'`).
- Entradas validadas con Zod; errores manejados y mostrados en español.
- Autorización verificada cerca del dato; RLS cubre la tabla.
- UI mobile-first con estados loading/empty/error/success/disabled y accesible.
- `pnpm lint` y `pnpm build` pasan; el flujo se probó de extremo a extremo.

## 24. Instrucciones para Claude Code

- Respetar `AGENTS.md`: leer la documentación local de Next 16 antes de escribir código del framework.
- Mantener el alcance pequeño; no añadir funciones fuera de §3.
- No modificar dependencias, configuración de Next, ni lockfiles sin que se pida explícitamente.
- Usar `pnpm` para cualquier comando de paquetes.
- Preguntar antes de acciones difíciles de revertir o decisiones de producto ambiguas.
- Reportar con honestidad: si `lint`/`build` fallan o un paso se omitió, decirlo.
