'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getGameProfile } from '@/lib/data/game'
import { todayDateString } from '@/lib/dates'
import { gameProfileSchema, measurementSchema } from '@/lib/validations/game'

export type GameFormState = { error?: string; ok?: boolean } | undefined

function field(formData: FormData, key: string) {
  return formData.get(key) ?? undefined
}

export async function saveGameProfile(
  _prev: GameFormState,
  formData: FormData
): Promise<GameFormState> {
  const { userId } = await verifySession()

  const parsed = gameProfileSchema.safeParse({
    avatar: {
      body: field(formData, 'body'),
      skin: field(formData, 'skin'),
      hair: field(formData, 'hair'),
      accessory: field(formData, 'accessory'),
    },
    goal: field(formData, 'goal'),
    weekly_target: field(formData, 'weekly_target'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Revisa los datos del avatar.' }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('game_profiles')
    .upsert({ user_id: userId, ...parsed.data }, { onConflict: 'user_id' })

  if (error) return { error: 'No se pudo guardar tu avatar. Inténtalo de nuevo.' }

  revalidatePath('/liga', 'layout')
  redirect('/liga')
}

/** Consentimiento explícito (Ley 1581) para guardar talla y medidas. */
export async function grantMeasurementsConsent(
  _prev: GameFormState,
  formData: FormData
): Promise<GameFormState> {
  const { userId } = await verifySession()

  if (formData.get('consent') !== 'on') {
    return { error: 'Para guardar medidas necesitas aceptar el tratamiento de estos datos.' }
  }

  const profile = await getGameProfile()
  if (!profile) return { error: 'Primero crea tu avatar.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('game_profiles')
    .update({ measurements_consent_at: new Date().toISOString() })
    .eq('user_id', userId)

  if (error) return { error: 'No se pudo registrar tu autorización. Inténtalo de nuevo.' }

  revalidatePath('/liga', 'layout')
  return { ok: true }
}

export async function logMeasurement(
  _prev: GameFormState,
  formData: FormData
): Promise<GameFormState> {
  const { userId } = await verifySession()

  // Verificación cerca del dato; la RLS lo vuelve a exigir en la base.
  const profile = await getGameProfile()
  if (!profile?.measurements_consent_at) {
    return { error: 'Antes de guardar medidas necesitas dar tu autorización.' }
  }

  const parsed = measurementSchema.safeParse({
    measured_at: field(formData, 'measured_at'),
    weight_kg: field(formData, 'weight_kg'),
    waist_cm: field(formData, 'waist_cm'),
    body_fat_pct: field(formData, 'body_fat_pct'),
    height_cm: field(formData, 'height_cm'),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Revisa los datos de la medida.' }
  }

  const { height_cm, ...measurement } = parsed.data
  if (measurement.measured_at > todayDateString()) {
    return { error: 'La fecha no puede ser futura.' }
  }

  const supabase = await createClient()

  if (height_cm !== undefined && height_cm !== profile.height_cm) {
    const { error } = await supabase
      .from('game_profiles')
      .update({ height_cm })
      .eq('user_id', userId)
    if (error) return { error: 'No se pudo guardar tu talla. Inténtalo de nuevo.' }
  }

  const { error } = await supabase.from('body_measurements').insert({
    user_id: userId,
    measured_at: measurement.measured_at,
    weight_kg: measurement.weight_kg,
    waist_cm: measurement.waist_cm ?? null,
    body_fat_pct: measurement.body_fat_pct ?? null,
    source: 'self',
  })
  if (error) return { error: 'No se pudo guardar la medida. Inténtalo de nuevo.' }

  revalidatePath('/liga', 'layout')
  return { ok: true }
}

/**
 * Derecho de supresión: borra todas las medidas y la talla, y retira el
 * consentimiento. Para volver a guardar medidas habrá que autorizar de nuevo.
 */
export async function deleteAllMeasurements(formData: FormData) {
  const { userId } = await verifySession()
  // Solo se vuelve a páginas conocidas, nunca a una URL enviada por el cliente.
  const returnTo = formData.get('return_to') === '/perfil' ? '/perfil' : '/liga/evolucion'

  const supabase = await createClient()
  const { error } = await supabase.from('body_measurements').delete().eq('user_id', userId)
  if (error) throw new Error('No se pudieron borrar tus medidas.')

  const { error: profileError } = await supabase
    .from('game_profiles')
    .update({ height_cm: null, measurements_consent_at: null })
    .eq('user_id', userId)
  if (profileError) throw new Error('No se pudo retirar tu autorización.')

  revalidatePath('/liga', 'layout')
  revalidatePath('/perfil')
  redirect(`${returnTo}?borrado=1`)
}
