import Link from 'next/link'
import { LogOut, UserRound } from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { BrandMark } from '@/components/brand/brand-mark'

export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/5 bg-background/80 px-5 py-3.5 backdrop-blur-xl">
      <div className="flex items-center gap-2">
        <BrandMark size="sm" />
        <span className="text-sm font-semibold">Gym Routines</span>
      </div>

      <div className="flex items-center gap-1">
        <Link
          href="/perfil"
          aria-label="Mi perfil"
          className="flex size-11 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-text-primary"
        >
          <UserRound size={20} strokeWidth={1.75} />
        </Link>
        <form action={logout}>
          <button
            type="submit"
            aria-label="Cerrar sesión"
            className="flex size-11 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-text-primary"
          >
            <LogOut size={18} strokeWidth={1.75} />
          </button>
        </form>
      </div>
    </header>
  )
}
