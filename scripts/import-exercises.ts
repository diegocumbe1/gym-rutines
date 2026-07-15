/**
 * Importa el catálogo de ejercicios (metadatos MIT) del dataset externo a la
 * tabla `exercises` de Supabase.
 *
 * Reglas (CLAUDE.md §20):
 *   - Solo metadatos/texto (licencia MIT). En español cuando está disponible.
 *   - NO se importan imágenes ni GIF aquí (media © Gym Visual):
 *     image_url y gif_url las gestiona scripts/upload-media.ts.
 *   - Idempotente: upsert por (source, external_id).
 *   - Usa la SERVICE ROLE key (salta RLS para insertar filas globales user_id NULL).
 *
 * Ejecutar:
 *   pnpm import:exercises
 *   LIMIT=60 pnpm import:exercises          # solo una selección inicial
 *   DATASET_PATH=/otra/ruta/exercises.json pnpm import:exercises
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const DATASET_PATH =
  process.env.DATASET_PATH ??
  '/Users/DiegoCumbe/Documents/personal/projects/exercises-dataset/data/exercises.json'
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : undefined

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  console.error(
    'Faltan variables. Asegúrate de tener NEXT_PUBLIC_SUPABASE_URL y ' +
      'SUPABASE_SERVICE_ROLE_KEY en .env.local.'
  )
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

type RawExercise = {
  id: string
  name: string
  body_part?: string
  equipment?: string
  muscle_group?: string
  target?: string
  secondary_muscles?: string[]
  instructions?: Record<string, string>
  attribution?: string
}

// Prioriza español; cae a inglés si faltara.
function pickInstructions(instr?: Record<string, string>): string | null {
  if (!instr) return null
  return instr.es ?? instr.en ?? null
}

async function main() {
  const raw = JSON.parse(
    readFileSync(resolve(DATASET_PATH), 'utf-8')
  ) as RawExercise[]

  const items = LIMIT ? raw.slice(0, LIMIT) : raw
  console.log(`Importando ${items.length} de ${raw.length} ejercicios…`)

  const rows = items.map((e) => ({
    user_id: null,
    name: e.name,
    muscle_group: e.muscle_group ?? null,
    body_part: e.body_part ?? null,
    equipment: e.equipment ?? null,
    target: e.target ?? null,
    secondary_muscles: e.secondary_muscles ?? null,
    instructions: pickInstructions(e.instructions),
    source: 'gymvisual-dataset',
    external_id: e.id,
    source_attribution: e.attribution ?? '© Gym visual — https://gymvisual.com/',
  }))

  const chunkSize = 500
  let done = 0
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const { error } = await supabase
      .from('exercises')
      .upsert(chunk, { onConflict: 'source,external_id' })

    if (error) {
      console.error(`Error en el lote ${i}-${i + chunk.length}:`, error.message)
      process.exit(1)
    }
    done += chunk.length
    console.log(`  ${done}/${rows.length}`)
  }

  console.log('✅ Importación completa.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
