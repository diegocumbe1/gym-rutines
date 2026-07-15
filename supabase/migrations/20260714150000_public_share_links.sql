-- Public read-only share links for templates and scheduled sessions.

alter table public.workout_templates
  add column if not exists is_public boolean not null default false,
  add column if not exists public_share_id uuid;

alter table public.workout_sessions
  add column if not exists is_public boolean not null default false,
  add column if not exists public_share_id uuid;

create unique index if not exists workout_templates_public_share_id_uidx
  on public.workout_templates (public_share_id)
  where public_share_id is not null;

create unique index if not exists workout_sessions_public_share_id_uidx
  on public.workout_sessions (public_share_id)
  where public_share_id is not null;
