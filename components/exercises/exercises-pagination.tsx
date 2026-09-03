import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

function PaginationLink({
  href,
  disabled,
  direction,
  children,
}: {
  href: string
  disabled?: boolean
  direction: 'prev' | 'next'
  children: React.ReactNode
}) {
  const Icon = direction === 'prev' ? ChevronLeft : ChevronRight
  const content = (
    <>
      {direction === 'prev' && <Icon size={17} strokeWidth={1.75} />}
      {children}
      {direction === 'next' && <Icon size={17} strokeWidth={1.75} />}
    </>
  )

  if (disabled) {
    return (
      <span
        aria-disabled="true"
        className="inline-flex items-center gap-1 rounded-lg border border-white/5 px-3 py-2 text-sm text-text-disabled"
      >
        {content}
      </span>
    )
  }

  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-highlight/30 hover:text-text-primary"
    >
      {content}
    </Link>
  )
}

/**
 * Navegación anterior/siguiente para listados paginados de ejercicios.
 * `buildHref` recibe el número de página destino.
 */
export function ExercisesPagination({
  page,
  totalPages,
  buildHref,
  label = 'Paginación de ejercicios',
}: {
  page: number
  totalPages: number
  buildHref: (page: number) => string
  label?: string
}) {
  if (totalPages <= 1) return null

  return (
    <nav
      aria-label={label}
      className="flex items-center justify-between gap-3 border-t border-white/5 pt-4"
    >
      <PaginationLink
        href={buildHref(page - 1)}
        direction="prev"
        disabled={page <= 1}
      >
        Anterior
      </PaginationLink>
      <p className="font-mono text-xs text-text-muted">
        {page} / {totalPages}
      </p>
      <PaginationLink
        href={buildHref(page + 1)}
        direction="next"
        disabled={page >= totalPages}
      >
        Siguiente
      </PaginationLink>
    </nav>
  )
}
