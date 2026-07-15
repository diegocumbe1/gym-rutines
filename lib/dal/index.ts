import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Data Access Layer (DAL) — CLAUDE.md §13.
 *
 * Centraliza la verificación de sesión. Se llama CERCA del acceso a datos
 * (Server Components, Server Actions, Route Handlers), no solo en `proxy.ts`.
 * `cache()` de React memoiza el resultado durante un mismo render pass.
 */

/**
 * Exige sesión. Si no hay usuario, redirige a /login (no retorna).
 * Devuelve el id del usuario para las consultas posteriores.
 */
export const verifySession = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return { isAuth: true as const, userId: user.id }
})

/**
 * Devuelve el usuario actual o `null` sin redirigir.
 * Útil para UI condicional (mostrar/ocultar según sesión).
 */
export const getUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return user
})
