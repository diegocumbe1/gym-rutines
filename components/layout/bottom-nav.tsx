'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, ClipboardList, Dumbbell, History, type LucideIcon } from 'lucide-react'

type NavItem = { href: string; label: string; icon: LucideIcon }

const items: NavItem[] = [
  { href: '/', label: 'Hoy', icon: Home },
  { href: '/templates', label: 'Plantillas', icon: ClipboardList },
  { href: '/exercises', label: 'Ejercicios', icon: Dumbbell },
  { href: '/history', label: 'Historial', icon: History },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-surface/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl">
      <ul className="mx-auto flex max-w-md items-stretch">
        {items.map(({ href, label, icon: Icon }) => {
          const active =
            href === '/' ? pathname === '/' : pathname.startsWith(href)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                  active ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <Icon
                  size={22}
                  strokeWidth={1.75}
                  className={active ? 'text-highlight' : ''}
                />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
