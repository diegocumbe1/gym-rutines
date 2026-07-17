-- Exercise tracking modes for strength, bodyweight, timed, and one-off work.

alter table public.template_exercises
  add column if not exists tracking_type text not null default 'sets_reps_weight',
  add column if not exists target_duration_seconds integer;

alter table public.session_exercises
  add column if not exists tracking_type text not null default 'sets_reps_weight',
  add column if not exists target_duration_seconds integer,
  add column if not exists actual_duration_seconds integer,
  add column if not exists is_completed boolean not null default false,
  add column if not exists completed_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'template_exercises_tracking_type_chk'
  ) then
    alter table public.template_exercises
      add constraint template_exercises_tracking_type_chk
      check (tracking_type in ('sets_reps_weight', 'bodyweight_reps', 'duration', 'single'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'session_exercises_tracking_type_chk'
  ) then
    alter table public.session_exercises
      add constraint session_exercises_tracking_type_chk
      check (tracking_type in ('sets_reps_weight', 'bodyweight_reps', 'duration', 'single'));
  end if;
end $$;
