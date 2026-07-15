/**
 * Sube la media local (thumbnails 180x180 y GIF) del dataset a un bucket
 * PRIVADO de Supabase Storage y actualiza image_url / gif_url en `exercises`.
 *
 * Uso personal (un solo usuario): el bucket es privado; la app mostrará la
 * media solo mediante signed URLs temporales para la sesión autenticada.
 * Se conserva la atribución © Gym Visual en la columna source_attribution.
 *
 * Ejecutar:
 *   pnpm upload:media
 *   LIMIT=30 pnpm upload:media     # prueba con una muestra
 */
import { readFileSync } from 'node:fs'
import { resolve, dirname, extname } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const DATASET_PATH =
  process.env.DATASET_PATH ??
  '/Users/DiegoCumbe/Documents/personal/projects/exercises-dataset/data/exercises.json'
// La media (images/, videos/) está en la raíz del repo, junto a data/.
const REPO_ROOT = resolve(dirname(resolve(DATASET_PATH)), '..')
const LIMIT = process.env.LIMIT ? Number(process.env.LIMIT) : undefined
const BUCKET = 'exercise-media'
const CONCURRENCY = 8

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.')
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

type RawExercise = { id: string; image?: string; gif_url?: string }

function contentTypeFor(ext: string): string {
  const e = ext.toLowerCase()
  if (e === '.png') return 'image/png'
  if (e === '.gif') return 'image/gif'
  return 'image/jpeg'
}

async function ensureBucket() {
  const { data: buckets, error } = await supabase.storage.listBuckets()
  if (error) throw error
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
      public: false,
    })
    if (createErr) throw createErr
    console.log(`Bucket privado "${BUCKET}" creado.`)
  } else {
    console.log(`Bucket "${BUCKET}" ya existe.`)
  }
}

async function uploadOne(e: RawExercise) {
  if (!e.image || !e.gif_url) return

  const imgExt = extname(e.image)
  const imgObject = `${e.id}${imgExt}`
  const gifObject = `${e.id}.gif`

  const imgBytes = readFileSync(resolve(REPO_ROOT, e.image))
  const gifBytes = readFileSync(resolve(REPO_ROOT, e.gif_url))

  const up1 = await supabase.storage
    .from(BUCKET)
    .upload(imgObject, imgBytes, { contentType: contentTypeFor(imgExt), upsert: true })
  if (up1.error) throw new Error(`img ${e.id}: ${up1.error.message}`)

  const up2 = await supabase.storage
    .from(BUCKET)
    .upload(gifObject, gifBytes, { contentType: 'image/gif', upsert: true })
  if (up2.error) throw new Error(`gif ${e.id}: ${up2.error.message}`)

  const { error: updErr } = await supabase
    .from('exercises')
    .update({ image_url: imgObject, gif_url: gifObject })
    .eq('source', 'gymvisual-dataset')
    .eq('external_id', e.id)
  if (updErr) throw new Error(`update ${e.id}: ${updErr.message}`)
}

async function main() {
  await ensureBucket()

  const raw = JSON.parse(readFileSync(resolve(DATASET_PATH), 'utf-8')) as RawExercise[]
  const items = LIMIT ? raw.slice(0, LIMIT) : raw
  console.log(`Subiendo media de ${items.length} de ${raw.length} ejercicios…`)

  let done = 0
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(uploadOne))
    done += batch.length
    if (done % 80 === 0 || done === items.length) {
      console.log(`  ${done}/${items.length}`)
    }
  }

  console.log('✅ Media subida y filas actualizadas.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
