import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Dumbbell, Search } from 'lucide-react'
import { listExercisesPage } from '@/lib/data/exercises'
import { ExercisesPagination } from '@/components/exercises/exercises-pagination'
import { getSignedMediaUrls } from '@/lib/supabase/storage'
import { BODY_PARTS, bodyPartLabel } from '@/lib/exercises/labels'

const PAGE_SIZE = 60

function buildHref(q?: string, part?: string, page?: number) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (part) params.set('part', part)
  if (page && page > 1) params.set('page', String(page))
  const qs = params.toString()
  return qs ? `/exercises?${qs}` : '/exercises'
}

function Chip({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
        active
          ? 'border-highlight/40 bg-primary text-text-primary'
          : 'border-white/10 text-text-muted hover:text-text-secondary'
      }`}
    >
      {children}
    </Link>
  )
}

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; part?: string; page?: string }>
}) {
  const { q, part, page: pageParam } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const { exercises, total, relaxed } = await listExercisesPage({
    search: q,
    bodyPart: part,
    page,
    pageSize: PAGE_SIZE,
  })
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  if (total > 0 && page > totalPages) {
    redirect(buildHref(q, part, totalPages))
  }
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, total)

  const paths = exercises
    .map((e) => e.image_url)
    .filter((p): p is string => Boolean(p))
  const signed = await getSignedMediaUrls(paths)

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Ejercicios</h1>

      <form className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          name="q"
          defaultValue={q}
          placeholder="Buscar ejercicio…"
          aria-label="Buscar ejercicio"
          className="w-full rounded-xl border border-white/10 bg-surface-2 py-2.5 pl-10 pr-3 text-base text-text-primary outline-none transition-colors placeholder:text-text-disabled focus:border-highlight"
        />
        {part && <input type="hidden" name="part" value={part} />}
      </form>

      <div className="flex flex-wrap gap-2">
        <Chip href={buildHref(q, undefined)} active={!part}>
          Todos
        </Chip>
        {BODY_PARTS.map((bp) => (
          <Chip key={bp} href={buildHref(q, bp)} active={part === bp}>
            {bodyPartLabel(bp)}
          </Chip>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 text-sm text-text-muted">
        <p>
          {total === 0
            ? '0 ejercicios'
            : `${from}-${to} de ${total} ejercicios`}
        </p>
        {totalPages > 1 && (
          <p className="font-mono text-xs">
            Página {page} / {totalPages}
          </p>
        )}
      </div>

      {relaxed && (
        <p className="rounded-xl border border-white/10 bg-surface/60 px-3 py-2 text-xs text-text-muted">
          No hay coincidencias exactas para «{q}». Mostramos ejercicios
          similares.
        </p>
      )}

      {exercises.length === 0 ? (
        <div className="crystal-surface rounded-2xl p-6 text-center">
          <p className="text-text-secondary">No se encontraron ejercicios.</p>
          <p className="mt-1 text-sm text-text-muted">
            ¿Ya importaste el catálogo? Ejecuta <code>pnpm import:exercises</code>.
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {exercises.map((e) => {
            const thumb = e.image_url ? signed.get(e.image_url) : null
            return (
              <li key={e.id}>
                <Link
                  href={`/exercises/${e.id}`}
                  className="crystal-surface block overflow-hidden rounded-2xl transition-colors hover:border-highlight/30"
                >
                  <div className="flex aspect-square items-center justify-center bg-surface-2">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt={e.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Dumbbell
                        size={28}
                        strokeWidth={1.5}
                        className="text-text-disabled"
                      />
                    )}
                  </div>
                  <div className="space-y-0.5 p-3">
                    <p className="line-clamp-1 text-sm font-medium capitalize">
                      {e.name}
                    </p>
                    <p className="text-xs text-text-muted">
                      {bodyPartLabel(e.body_part)}
                    </p>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <ExercisesPagination
        page={page}
        totalPages={totalPages}
        buildHref={(target) => buildHref(q, part, target)}
      />
    </div>
  )
}
