-- Índice único para importaciones idempotentes del dataset.
-- Los ejercicios personalizados (source='custom', external_id NULL) no chocan:
-- en Postgres los NULL se consideran distintos en índices únicos.
drop index if exists public.exercises_external_id_idx;

create unique index exercises_source_external_uidx
  on public.exercises (source, external_id);
