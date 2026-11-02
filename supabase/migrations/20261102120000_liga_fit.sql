-- =============================================================================
-- Liga Fit (fase A) — gamificación personal
-- =============================================================================
--   game_profiles      avatar, objetivo y meta semanal (1:1 con auth.users)
--   body_measurements  medidas corporales privadas del usuario
--
-- Reglas clave:
--   - Puntos, nivel y racha NO se guardan: se calculan desde workout_sessions.
--   - Talla y medidas son datos sensibles (Ley 1581): solo se guardan con
--     consentimiento explícito (measurements_consent_at), impuesto aquí además
--     de en la DAL.
--   - Ninguna ruta pública (app/share) lee estas tablas.
-- =============================================================================

-- =============================================================================
-- game_profiles
-- =============================================================================
create table public.game_profiles (
  user_id                 uuid primary key references auth.users (id) on delete cascade,
  -- { body, skin, hair, accessory }; la forma la valida Zod en el servidor.
  avatar                  jsonb not null default '{}'::jsonb
                          check (jsonb_typeof(avatar) = 'object'),
  goal                    text not null default 'bienestar'
                          check (goal in ('fuerza', 'grasa', 'bienestar')),
  weekly_target           integer not null default 3
                          check (weekly_target between 2 and 5),
  height_cm               integer
                          check (height_cm between 120 and 230),
  measurements_consent_at timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  -- La talla también es dato sensible: sin consentimiento no se guarda.
  constraint game_profiles_height_requires_consent
    check (height_cm is null or measurements_consent_at is not null)
);

create trigger game_profiles_set_updated_at
  before update on public.game_profiles
  for each row execute function public.set_updated_at();

-- =============================================================================
-- body_measurements
-- =============================================================================
create table public.body_measurements (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  measured_at  date not null,
  weight_kg    numeric(5, 2) not null check (weight_kg between 25 and 300),
  waist_cm     numeric(5, 1) check (waist_cm between 40 and 250),
  body_fat_pct numeric(4, 1) check (body_fat_pct between 2 and 70),
  -- En la fase A siempre 'self'; 'trainer' queda para la fase B.
  source       text not null default 'self' check (source in ('self', 'trainer')),
  created_at   timestamptz not null default now()
);

create index body_measurements_user_date_idx
  on public.body_measurements (user_id, measured_at);

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.game_profiles     enable row level security;
alter table public.body_measurements enable row level security;

create policy "game_profiles_all" on public.game_profiles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "body_measurements_select" on public.body_measurements
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Insertar o editar exige el consentimiento vigente del propio usuario.
create policy "body_measurements_insert" on public.body_measurements
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.game_profiles gp
      where gp.user_id = (select auth.uid())
        and gp.measurements_consent_at is not null
    )
  );

create policy "body_measurements_update" on public.body_measurements
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.game_profiles gp
      where gp.user_id = (select auth.uid())
        and gp.measurements_consent_at is not null
    )
  );

-- Borrar siempre se permite: es el derecho de supresión.
create policy "body_measurements_delete" on public.body_measurements
  for delete to authenticated
  using (user_id = (select auth.uid()));
