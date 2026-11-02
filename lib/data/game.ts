import 'server-only'

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { listSessionHistory } from '@/lib/data/sessions'
import { DEFAULT_AVATAR, GOALS, type AvatarConfig, type Goal } from '@/lib/game/avatar-options'
import type { GameSession } from '@/lib/game/weeks'
import { avatarSchema } from '@/lib/validations/game'

/**
 * Datos de Liga Fit. Todo es privado del usuario: nada de esto se expone en
 * las rutas públicas de `app/share`.
 */

export type GameProfile = {
  avatar: AvatarConfig
  goal: Goal
  weekly_target: number
  /** Dato sensible: solo existe con consentimiento. */
  height_cm: number | null
  measurements_consent_at: string | null
}

export type BodyMeasurement = {
  id: string
  measured_at: string
  weight_kg: number
  waist_cm: number | null
  body_fat_pct: number | null
}

function isGoal(value: string): value is Goal {
  return GOALS.includes(value as Goal)
}

/** Perfil de juego del usuario, o `null` si aún no ha creado su avatar. */
export const getGameProfile = cache(async (): Promise<GameProfile | null> => {
  const { userId } = await verifySession()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('game_profiles')
    .select('avatar,goal,weekly_target,height_cm,measurements_consent_at')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  // El jsonb viene de la base: se valida antes de usarlo como tipo interno.
  const avatar = avatarSchema.safeParse(data.avatar)
  return {
    avatar: avatar.success ? avatar.data : DEFAULT_AVATAR,
    goal: isGoal(data.goal) ? data.goal : 'bienestar',
    weekly_target: data.weekly_target,
    height_cm: data.height_cm,
    measurements_consent_at: data.measurements_consent_at,
  }
})

/** Sesiones completadas con las que se calculan puntos, nivel y racha. */
export async function listGameSessions(): Promise<GameSession[]> {
  return listSessionHistory({ completedOnly: true, limit: 1000 })
}

/** Medidas del usuario, de la más antigua a la más reciente. */
export async function listMeasurements(): Promise<BodyMeasurement[]> {
  const { userId } = await verifySession()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('body_measurements')
    .select('id,measured_at,weight_kg,waist_cm,body_fat_pct')
    .eq('user_id', userId)
    .order('measured_at', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)

  // numeric puede llegar como string desde PostgREST.
  return (data ?? []).map((row) => ({
    id: row.id,
    measured_at: row.measured_at,
    weight_kg: Number(row.weight_kg),
    waist_cm: row.waist_cm === null ? null : Number(row.waist_cm),
    body_fat_pct: row.body_fat_pct === null ? null : Number(row.body_fat_pct),
  }))
}
