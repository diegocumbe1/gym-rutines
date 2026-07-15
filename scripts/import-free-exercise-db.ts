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

async function main() {
  console.log(`Leyendo ${DATA_URL}...`)
  const res = await fetch(DATA_URL)
  if (!res.ok) throw new Error(`No se pudo descargar free-exercise-db: ${res.status}`)

  const raw = (await res.json()) as FreeExercise[]
  const items = LIMIT ? raw.slice(0, LIMIT) : raw

  const { data: existing, error } = await supabase
    .from('exercises')
    .select('name,source,external_id')

  if (error) throw new Error(error.message)

  const existingNames = new Set(
    (existing ?? []).map((item) => normalize(String(item.name ?? '')))
  )
  const existingExternalIds = new Set(
    (existing ?? [])
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
