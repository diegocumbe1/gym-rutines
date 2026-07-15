import 'server-only'

import { createClient } from '@/lib/supabase/server'

const BUCKET = 'exercise-media'
const DEFAULT_EXPIRES = 60 * 60 // 1 hora

/**
 * Genera un signed URL temporal para un objeto del bucket privado.
 * Devuelve null si no hay ruta o falla (la UI muestra un placeholder).
 */
export async function getSignedMediaUrl(
  path: string | null | undefined,
  expiresIn = DEFAULT_EXPIRES
): Promise<string | null> {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://')) return path

  const supabase = await createClient()
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn)
  return data?.signedUrl ?? null
}

/**
 * Firma varias rutas de una vez (para listas). Devuelve un mapa ruta -> URL.
 */
export async function getSignedMediaUrls(
  paths: string[],
  expiresIn = DEFAULT_EXPIRES
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (paths.length === 0) return map

  const external = paths.filter(
    (path) => path.startsWith('http://') || path.startsWith('https://')
  )
  external.forEach((path) => map.set(path, path))

  const storagePaths = paths.filter(
    (path) => !path.startsWith('http://') && !path.startsWith('https://')
  )
  if (storagePaths.length === 0) return map

  const supabase = await createClient()
  const { data } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(storagePaths, expiresIn)

  data?.forEach((item) => {
    if (item.path && item.signedUrl) map.set(item.path, item.signedUrl)
  })
  return map
}
