import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refresca la sesión de Supabase en cada request y sincroniza las cookies
 * de auth entre la request y la response. Se llama desde `proxy.ts` (raíz).
 *
 * Importante: `supabase.auth.getUser()` revalida el token con el servidor de
 * Supabase; es lo que mantiene la sesión viva. No usar `getSession()` aquí.
 *
 * Devuelve la response (con las cookies actualizadas) y el `user` para que
 * `proxy.ts` decida las redirecciones.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  return { response, user }
}
