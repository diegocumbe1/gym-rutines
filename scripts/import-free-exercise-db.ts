/**
 * Importa ejercicios complementarios desde yuhonas/free-exercise-db.
 *
 * Reglas:
 * - Solo inserta ejercicios que no existan por nombre normalizado.
 * - Idempotente por (source, external_id).
 * - Usa imágenes públicas del repo como image_url; no sube nada al bucket.
 * - Mantiene attribution/licencia para trazabilidad.
 *
 * Uso:
 *   pnpm import:free-exercises
 *   DRY_RUN=1 pnpm import:free-exercises
 *   PRUNE_DUPLICATES=1 pnpm import:free-exercises
 *   LIMIT=50 pnpm import:free-exercises
 */
import { createClient } from '@supabase/supabase-js'

const SOURCE = 'free-exercise-db'
const DATA_URL =
  process.env.FREE_EXERCISE_DB_URL ??
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
const IMAGE_BASE_URL =
  'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/'
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : undefined
const DRY_RUN = process.env.DRY_RUN === '1'
const PRUNE_DUPLICATES = process.env.PRUNE_DUPLICATES === '1'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error(
    'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.'
  )
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

type FreeExercise = {
  id: string
  name: string
  equipment: string | null
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
  images: string[]
}

type ExistingExercise = {
  id: string
  name: string | null
  source: string | null
  external_id: string | null
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function equipment(value: string | null) {
  if (!value) return null
  const v = value.toLowerCase()
  if (v === 'body only') return 'body weight'
  if (v === 'kettlebells') return 'kettlebell'
  if (v === 'e-z curl bar') return 'ez barbell'
  return v
}

function bodyPart(primaryMuscles: string[]) {
  const primary = primaryMuscles[0]?.toLowerCase()
  if (!primary) return null

  if (['quadriceps', 'hamstrings', 'glutes', 'adductors', 'abductors'].includes(primary)) {
    return 'upper legs'
  }
  if (['calves'].includes(primary)) return 'lower legs'
  if (['chest'].includes(primary)) return 'chest'
  if (['shoulders', 'traps'].includes(primary)) return 'shoulders'
  if (['biceps', 'triceps'].includes(primary)) return 'upper arms'
  if (['forearms'].includes(primary)) return 'lower arms'
  if (['lats', 'middle back', 'lower back'].includes(primary)) return 'back'
  if (['abdominals'].includes(primary)) return 'waist'
  if (['neck'].includes(primary)) return 'neck'

  return null
}

function target(primaryMuscles: string[]) {
  return primaryMuscles[0]?.toLowerCase() ?? null
}

function imageUrl(images: string[]) {
  const first = images[0]
  return first ? `${IMAGE_BASE_URL}${first}` : null
}

async function fetchAllExercises() {
  const pageSize = 1000
  const rows: ExistingExercise[] = []

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from('exercises')
      .select('id,name,source,external_id')
      .range(from, to)

    if (error) throw new Error(error.message)

    rows.push(...((data ?? []) as ExistingExercise[]))
    if (!data || data.length < pageSize) break
  }

  return rows
}

async function pruneDuplicateSourceRows(existing: ExistingExercise[]) {
  const baseNames = new Set(
    existing
      .filter((item) => item.source !== SOURCE)
      .map((item) => normalize(String(item.name ?? '')))
      .filter(Boolean)
  )
  const duplicateRows = existing.filter(
    (item) =>
      item.source === SOURCE && baseNames.has(normalize(String(item.name ?? '')))
  )

  console.log(`Duplicados de ${SOURCE} contra fuentes base: ${duplicateRows.length}`)

  if (!PRUNE_DUPLICATES || duplicateRows.length === 0) return existing

  const chunkSize = 200
  let deleted = 0
  for (let i = 0; i < duplicateRows.length; i += chunkSize) {
    const chunk = duplicateRows.slice(i, i + chunkSize)
    const { error } = await supabase
      .from('exercises')
      .delete()
      .in(
        'id',
        chunk.map((item) => item.id)
      )

    if (error) throw new Error(`No se pudieron eliminar duplicados: ${error.message}`)
    deleted += chunk.length
    console.log(`  duplicados eliminados ${deleted}/${duplicateRows.length}`)
  }

  const duplicateIds = new Set(duplicateRows.map((item) => item.id))
  return existing.filter((item) => !duplicateIds.has(item.id))
}

async function main() {
  console.log(`Leyendo ${DATA_URL}...`)
  const res = await fetch(DATA_URL)
  if (!res.ok) throw new Error(`No se pudo descargar free-exercise-db: ${res.status}`)

  const raw = (await res.json()) as FreeExercise[]
  const items = LIMIT ? raw.slice(0, LIMIT) : raw

  const existing = await pruneDuplicateSourceRows(await fetchAllExercises())

  const existingNames = new Set(
    existing.map((item) => normalize(String(item.name ?? ''))).filter(Boolean)
  )
  const existingExternalIds = new Set(
    existing
      .filter((item) => item.source === SOURCE && item.external_id)
      .map((item) => String(item.external_id))
  )

  const rows = items
    .filter((item) => !existingExternalIds.has(item.id))
    .filter((item) => !existingNames.has(normalize(item.name)))
    .map((item) => ({
      user_id: null,
      name: item.name,
      muscle_group: target(item.primaryMuscles),
      body_part: bodyPart(item.primaryMuscles),
      equipment: equipment(item.equipment),
      target: target(item.primaryMuscles),
      secondary_muscles: item.secondaryMuscles?.map((m) => m.toLowerCase()) ?? [],
      instructions: item.instructions?.join('\n\n') ?? null,
      image_url: imageUrl(item.images),
      gif_url: null,
      source: SOURCE,
      external_id: item.id,
      source_attribution:
        'free-exercise-db — Public Domain / Unlicense — https://github.com/yuhonas/free-exercise-db',
    }))

  console.log(`Dataset: ${raw.length}`)
  console.log(`Evaluados: ${items.length}`)
  console.log(`Nuevos por insertar: ${rows.length}`)

  if (DRY_RUN) {
    console.table(
      rows.slice(0, 25).map((row) => ({
        name: row.name,
        equipment: row.equipment,
        body_part: row.body_part,
        target: row.target,
      }))
    )
    return
  }

  const chunkSize = 500
  let done = 0
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const { error: insertError } = await supabase
      .from('exercises')
      .upsert(chunk, { onConflict: 'source,external_id' })

    if (insertError) throw new Error(insertError.message)
    done += chunk.length
    console.log(`  ${done}/${rows.length}`)
  }

  console.log('✅ Importación complementaria completa.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
