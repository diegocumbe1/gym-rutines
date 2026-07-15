-- =============================================================================
-- Gym Routines — Esquema inicial + RLS
-- =============================================================================
-- Modelo (CLAUDE.md §8):
--   profiles            perfil del usuario (1:1 con auth.users)
--   exercises           catálogo (globales importados + personalizados)
--   workout_templates   plantillas reutilizables (Pull, Push, Legs...)
--   template_exercises  ejercicios configurados dentro de una plantilla
--   workout_sessions    entrenamiento por fecha (calendario). Estados:
--                       planned / in_progress / completed / cancelled
--   session_exercises   SNAPSHOT de los ejercicios de esa sesión
--   workout_sets        series realizadas (objetivo vs real)
--
-- Reglas clave:
--   - Editar una plantilla NO cambia sesiones pasadas (snapshot).
--   - Peso/reps sugeridos != realizados.
--   - RLS en todas las tablas de usuario: user_id = auth.uid().
--   - Media (image_url/gif_url) queda nula: no servimos GIF de Gym Visual.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Funciones utilitarias
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- profiles
-- =============================================================================
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  weight_unit  text not null default 'kg',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Crear el perfil automáticamente al registrarse un usuario.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- exercises (catálogo)
--   user_id NULL  -> ejercicio global/importado (insertado por el script con
--                    service role, que salta la RLS).
--   user_id != NULL -> ejercicio personalizado del usuario.
-- =============================================================================
create table public.exercises (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users (id) on delete cascade,
  name               text not null,
  muscle_group       text,
  body_part          text,
  equipment          text,
  target             text,
  secondary_muscles  text[],
  instructions       text,               -- español cuando esté disponible
  image_url          text,               -- nulo por ahora (licencia media)
  gif_url            text,               -- nulo por ahora (licencia media)
  source             text not null default 'custom', -- 'custom' | 'gymvisual-dataset'
  external_id        text,               -- trazabilidad con el dataset externo
  source_attribution text,
  created_at         timestamptz not null default now()
);

create index exercises_user_id_idx on public.exercises (user_id);
create index exercises_muscle_group_idx on public.exercises (muscle_group);
create index exercises_external_id_idx on public.exercises (source, external_id);

-- =============================================================================
-- workout_templates
-- =============================================================================
create table public.workout_templates (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index workout_templates_user_id_idx on public.workout_templates (user_id);

create trigger workout_templates_set_updated_at
  before update on public.workout_templates
  for each row execute function public.set_updated_at();

-- =============================================================================
-- template_exercises
-- =============================================================================
create table public.template_exercises (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  template_id     uuid not null references public.workout_templates (id) on delete cascade,
  exercise_id     uuid not null references public.exercises (id) on delete restrict,
  position        integer not null default 0,
  target_sets     integer,
  target_reps_min integer,
  target_reps_max integer,
  target_weight   numeric(6, 2),
  rest_seconds    integer,        -- objetivo de descanso (alimenta el timer)
  target_rir      integer,
  notes           text,
  created_at      timestamptz not null default now()
);

create index template_exercises_template_id_idx
  on public.template_exercises (template_id, position);

-- =============================================================================
-- workout_sessions (calendario + ejecución)
--   template_id se conserva como referencia pero puede quedar NULL si se borra
--   la plantilla; la sesión sobrevive gracias al snapshot en session_exercises.
-- =============================================================================
create table public.workout_sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  template_id    uuid references public.workout_templates (id) on delete set null,
  title          text not null,           -- snapshot del nombre de la plantilla
  scheduled_date date not null,           -- fecha en el calendario
  status         text not null default 'planned'
                 check (status in ('planned', 'in_progress', 'completed', 'cancelled')),
  started_at     timestamptz,
  completed_at   timestamptz,
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index workout_sessions_user_date_idx
  on public.workout_sessions (user_id, scheduled_date);
create index workout_sessions_status_idx
  on public.workout_sessions (user_id, status);

create trigger workout_sessions_set_updated_at
  before update on public.workout_sessions
  for each row execute function public.set_updated_at();

-- =============================================================================
-- session_exercises (SNAPSHOT de los ejercicios de la sesión)
--   Guarda exercise_name para sobrevivir al borrado del ejercicio del catálogo,
--   y exercise_id (nullable) para poder comparar progreso a lo largo del tiempo.
-- =============================================================================
create table public.session_exercises (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  session_id      uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id     uuid references public.exercises (id) on delete set null,
  position        integer not null default 0,
  exercise_name   text not null,          -- snapshot
  muscle_group    text,                   -- snapshot (opcional)
  target_sets     integer,
  target_reps_min integer,
  target_reps_max integer,
  target_weight   numeric(6, 2),
  rest_seconds    integer,
  target_rir      integer,
  notes           text,
  created_at      timestamptz not null default now()
);

create index session_exercises_session_id_idx
  on public.session_exercises (session_id, position);
create index session_exercises_exercise_id_idx
  on public.session_exercises (exercise_id);

-- =============================================================================
-- workout_sets (series realizadas: objetivo vs real)
-- =============================================================================
create table public.workout_sets (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  session_exercise_id uuid not null references public.session_exercises (id) on delete cascade,
  set_number          integer not null,
  is_warmup           boolean not null default false,
  target_reps         integer,
  target_weight       numeric(6, 2),
  actual_reps         integer,
  actual_weight       numeric(6, 2),
  rir                 integer,
  rest_seconds        integer,            -- descanso realizado (opcional)
  is_completed        boolean not null default false,
  completed_at        timestamptz,
  created_at          timestamptz not null default now()
);

create index workout_sets_session_exercise_idx
  on public.workout_sets (session_exercise_id, set_number);

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles          enable row level security;
alter table public.exercises         enable row level security;
alter table public.workout_templates enable row level security;
alter table public.template_exercises enable row level security;
alter table public.workout_sessions  enable row level security;
alter table public.session_exercises enable row level security;
alter table public.workout_sets      enable row level security;

-- profiles: cada quien ve/edita solo el suyo.
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles_insert" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy "profiles_update" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- exercises: se ven los globales (user_id null) + los propios; se escriben solo
-- los propios. Los globales los inserta el script con service role (salta RLS).
create policy "exercises_select" on public.exercises
  for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));

create policy "exercises_insert" on public.exercises
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "exercises_update" on public.exercises
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "exercises_delete" on public.exercises
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- Tablas de usuario: acceso total solo a filas propias.
create policy "workout_templates_all" on public.workout_templates
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "template_exercises_all" on public.template_exercises
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "workout_sessions_all" on public.workout_sessions
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "session_exercises_all" on public.session_exercises
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "workout_sets_all" on public.workout_sets
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
