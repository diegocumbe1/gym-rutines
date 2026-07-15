'use server'

import type { ZodError } from 'zod'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loginSchema, signupSchema } from '@/lib/validations/auth'

export type AuthState =
  | {
      errors?: Record<string, string[]>
      message?: string
      ok?: boolean
    }
  | undefined

// Convierte los issues de Zod en { campo: [mensajes] } (agnóstico de versión).
function fieldErrors(error: ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form')
    ;(result[key] ??= []).push(issue.message)
  }
  return result
}

export async function login(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) {
    return { message: 'Correo o contraseña incorrectos.' }
  }

  redirect('/')
}

export async function signup(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp(parsed.data)
  if (error) {
    // No exponemos el detalle interno; damos una pista útil.
    console.error('signup error:', error.message)
    const alreadyExists = error.message.toLowerCase().includes('already')
    return {
      message: alreadyExists
        ? 'Ese correo ya está registrado. Intenta iniciar sesión.'
        : 'No se pudo crear la cuenta. Inténtalo de nuevo.',
    }
  }

  // Si la confirmación por correo está activada, no hay sesión todavía.
  if (!data.session) {
    return {
      ok: true,
      message: 'Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.',
    }
  }

  redirect('/')
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
