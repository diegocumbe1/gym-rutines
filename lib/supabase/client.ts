import { createBrowserClient } from '@supabase/ssr'

/**
 * Cliente de Supabase para Client Components (navegador).
 * Usa únicamente variables NEXT_PUBLIC_*. La seguridad real la aporta la RLS.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
