import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

/**
 * Next.js 16: este archivo era `middleware.ts` en versiones anteriores.
 * Exporta `proxy()` por defecto.
 *
 * Responsabilidad (chequeos optimistas, según CLAUDE.md §13):
 *   1. Refrescar la sesión de Supabase en cada request.
 *   2. Redirigir usuarios no autenticados fuera de rutas protegidas.
 *   3. Redirigir usuarios autenticados fuera de las páginas de auth.
 *
 * La defensa real de datos vive en la DAL y en la RLS, no aquí.
 */

// Rutas públicas (accesibles sin sesión). El resto es protegido.
const PUBLIC_ROUTES = ['/login', '/signup', '/share']

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

export default async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request)
  const { pathname } = request.nextUrl
  const isPublic = isPublicRoute(pathname)

  // No autenticado en ruta protegida -> a /login
  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return withCookies(NextResponse.redirect(url), response)
  }

  // Autenticado visitando una página de auth -> al inicio
  if (user && isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return withCookies(NextResponse.redirect(url), response)
  }

  return response
}

// Copia las cookies de sesión refrescadas a la response de redirección.
function withCookies(target: NextResponse, source: NextResponse) {
  source.cookies.getAll().forEach((cookie) => {
    target.cookies.set(cookie)
  })
  return target
}

export const config = {
  // Ejecutar en todas las rutas excepto assets estáticos e imágenes.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
