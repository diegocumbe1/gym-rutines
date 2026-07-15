-- Política de lectura para el bucket privado `exercise-media`.
-- Permite a usuarios autenticados generar signed URLs (SELECT sobre los objetos).
-- El bucket se crea (privado) desde el script scripts/upload-media.ts.
-- Uso personal: la media nunca se expone con URL pública, solo signed URLs
-- temporales servidas a la sesión autenticada.
create policy "exercise_media_read_authenticated"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'exercise-media');
