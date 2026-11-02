---
name: liga-fit
description: Construir o modificar Liga Fit, la capa de gamificación de Gym Routines (avatar personalizable con foto, talla y peso que evoluciona según el objetivo; mapa isométrico del gimnasio con zonas que se iluminan; puntos de experiencia, niveles y racha semanal calculados desde las sesiones completadas). Úsala cuando pidan "Liga Fit", "gamificación", "avatar", "mapa isométrico", "Mi gym", "Mi evolución", "XP", "niveles", "racha semanal", "retos", o conectar el juego con las rutinas.
---

# Liga Fit — gamificación de Gym Routines

Liga Fit convierte los entrenamientos reales en progreso de juego. No es un juego aparte: **lee las sesiones y series que ya guarda la app** y las muestra como avatar, mapa y niveles.

Esta skill **complementa** `CLAUDE.md` y `AGENTS.md`; ante conflicto mandan ellos (Next 16, Server Actions, DAL, RLS, pnpm, sin `cacheComponents`). Para todo lo visual aplica la skill de diseño en `skills/midnight-crystal-design/SKILL.md` (léela antes de escribir UI).

## Decisiones tomadas (no re-discutir sin el dueño)

- **Mapa isométrico** como pantalla principal "Mi gym", con la lista de zonas debajo (híbrido). Se hace en **SVG + React**, sin Phaser ni canvas.
- **Avatar personalizable** a partir de:
  - Foto **opcional**, analizada **solo en el dispositivo** (canvas) para sugerir tono de piel y color de pelo. La foto **no se sube ni se guarda**.
  - Cuerpo del avatar: masculino, femenino o neutro.
  - Talla y peso → silueta.
- **El avatar evoluciona según el objetivo, nunca "más delgado = mejor":**
  - `fuerza`: gana hombros, brazos y piernas aunque el peso suba.
  - `grasa`: se estiliza la cintura.
  - `bienestar`: cambia con la constancia.
- **El peso es privado:** nunca aparece en rankings, ligas, links públicos ni compartidos.
- **Puntos, racha y niveles se calculan** desde `workout_sessions` completadas. En la fase A no hay tabla de eventos de puntos.
- **Datos sensibles (Ley 1581 de Colombia):** foto, peso y talla son datos sensibles. Exigen consentimiento explícito antes de guardar medidas, explicar para qué se usan y permitir borrarlas desde el perfil.

Prototipos de referencia (abrir en el navegador):
- `docs/liga-fit/preview-mapa-isometrico.html`: proyección isométrica (`iso(x, y, z)`), cajas con 3 caras y avatar que camina.
- `docs/liga-fit/preview-avatar.html`: avatar SVG paramétrico (`avatarSVG`, `bodyParams`), extracción de color de la foto y la pantalla "Mi evolución".

Los prototipos usan morado y lima; en la app **se adaptan a Midnight Crystal**. Copia la lógica, no los colores.

## Fases

### Fase A — gamificación personal (lo que se construye ahora)
Sobre los entrenos del propio usuario. **Sin gimnasios, sin multi-tenant, sin entrenadores** (siguen fuera de alcance en `CLAUDE.md`).

### Fase B — gimnasios (solo con decisión explícita del dueño)
Requiere ampliar el alcance de `CLAUDE.md`. Incluiría:
- Sedes y membresías.
- Check-in con QR rotativo en recepción.
- Rol de entrenador, que registra medidas en la valoración física mensual.
- Liga por sede, ordenada por constancia y no por kilos.
- Premios y canjes validados en recepción.
- Panel del dueño: asistencias por hora, rutinas terminadas y alerta de abandono a los 7–10 días.

**No construir nada de la fase B sin que el dueño lo pida.**

## Modelo de datos (fase A)

Una migración nueva en `supabase/migrations/` con RLS desde el inicio (`user_id = auth.uid()` para todo):

- `game_profiles`:
  - Llave: `user_id` (pk, fk a `auth.users`).
  - Campos: `avatar` (jsonb con `body`, `skin`, `hair` y `accessory`), `goal` (`fuerza` | `grasa` | `bienestar`), `weekly_target` (int, 2–5), `height_cm` (int, nullable), `measurements_consent_at` (timestamptz, nullable), `created_at` y `updated_at`.
- `body_measurements`:
  - Campos: `id`, `user_id`, `measured_at` (date), `weight_kg` (numeric), `waist_cm` (nullable), `body_fat_pct` (nullable), `source` (`self` | `trainer`; en la fase A siempre `self`) y `created_at`.
  - Solo se puede insertar si `game_profiles.measurements_consent_at` no es nulo. Valídalo en la DAL y, si es posible, también con una política o un check.

No tocar las tablas existentes. Las rutas de compartir públicas (`app/share/*`) **no deben** exponer nada de estas tablas.

## Reglas de juego (lib/game/, funciones puras y testeables)

- **Zonas del mapa:** se derivan de `exercises.body_part` (claves de `lib/exercises/labels.ts`). Propuesta de 6 zonas:
  - Pecho y hombros → `chest`, `shoulders`
  - Espalda → `back`, `neck`
  - Brazos → `upper arms`, `lower arms`
  - Piernas → `upper legs`, `lower legs`
  - Core → `waist`
  - Cardio → `cardio`

  Reutiliza la lógica de `lib/workouts/history-stats.ts` (`weeklyFrequency`) y `lib/workouts/muscle-map.ts`; no la dupliques.
- **Puntos de experiencia por sesión completada:** 100 de base + 5 por serie completada (máximo 40 series contadas) + 50 si la sesión completa la meta semanal. Una sesión cuenta una sola vez.
- **Niveles:** curva suave, nivel n desde `100 × n^1.5` XP acumulado. Muestra cuánto falta para el siguiente.
- **Racha semanal:** semanas consecutivas (lunes a domingo, usa `lib/dates.ts`) en las que se cumple `weekly_target`. La semana en curso no rompe la racha hasta que termine.
- **Retos personales de la semana:**
  - "Semana balanceada": entrenar 4 zonas distintas.
  - "Hora valle": sesión completada entre 10:00 y 16:00 da ×1,5 XP en esa sesión.
- **Evolución del avatar:**
  - `fat` (0–1) sale del IMC solo como orientación de silueta: `(imc − 19) / 15`, limitado a 0–1.
  - `muscle` (0–1) sale de la constancia (semanas con la meta cumplida ÷ 40) × el factor del objetivo (fuerza 1, grasa 0,55, bienestar 0,4).
  - Con `fuerza` se reduce `fat` en `muscle × 0,25`.
  - Mensajes siempre positivos y relativos al objetivo; nunca juzgar el cuerpo.

## Pantallas (fase A)

Agregar una pestaña en `components/layout/bottom-nav.tsx`, por ejemplo **"Liga"** con un ícono de lucide, que lleva a `app/(app)/liga/`:

1. `liga/` — **Mi gym**: encabezado con el avatar, el nivel, la racha y los días de la semana; mapa isométrico con las zonas entrenadas esta semana iluminadas; lista de zonas debajo; reto de la semana. Al tocar una zona se ven las sesiones de la semana en esa zona.
2. `liga/avatar/` — **Crear o editar avatar**: foto opcional (análisis en el cliente), cuerpo, piel, pelo, accesorio, objetivo y meta semanal. Componente cliente; se guarda con un Server Action.
3. `liga/evolucion/` — **Mi evolución**: avatar "al empezar" vs "hoy", historial de medidas (privado 🔒), botón para registrar una medida (pide consentimiento la primera vez) y botón para borrar todas las medidas.

Server Components para leer (vía la DAL); componentes cliente solo para el mapa animado, el editor de avatar y la foto.

## Orden de trabajo sugerido

1. Leer `CLAUDE.md`, `AGENTS.md`, la skill de diseño y los dos prototipos.
2. Migración y tipos, y aplicarla en Supabase local o de desarrollo.
3. `lib/game/` con funciones puras: zonas, XP, niveles, racha, retos y parámetros del avatar.
4. DAL (`lib/dal/`) y Server Actions (`app/actions/game.ts`) con validación Zod en `lib/validations/`.
5. Componentes:
   - `components/game/avatar.tsx` (SVG paramétrico).
   - `components/game/iso-map.tsx`.
   - `components/game/photo-colors.ts`.
6. Pantallas y pestaña de navegación.
7. Verificar con `pnpm build` y `pnpm lint`, y probar en el celular. Revisar que `app/share/*` no filtre datos del juego.
8. Actualizar `CLAUDE.md`: mover "gamificación personal (Liga Fit)" a dentro del alcance y dejar gimnasios y entrenadores como fase B.

## Para demos con prospectos

No mostrar datos reales del dueño ni de su familia: usar una **cuenta demo** con datos de ejemplo, sembrados con un script en `scripts/`, por ejemplo `seed-liga-demo.ts`, siguiendo el patrón de los scripts existentes.
