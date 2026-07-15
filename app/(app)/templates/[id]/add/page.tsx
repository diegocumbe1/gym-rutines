import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Check, ChevronLeft, Eye, Plus, Search, X } from 'lucide-react'
import { getTemplate } from '@/lib/data/templates'
import {
  bodyPartFromSearch,
  getExercise,
  listExercises,
} from '@/lib/data/exercises'
import { addExerciseToTemplate } from '@/app/actions/templates'
import { BODY_PARTS, bodyPartLabel } from '@/lib/exercises/labels'
import { getSignedMediaUrl } from '@/lib/supabase/storage'

function addPageHref(templateId: string, query?: string, detailId?: string) {
  const params = new URLSearchParams()
  if (query) params.set('q', query)
  if (detailId) params.set('detail', detailId)

  const qs = params.toString()
  const path = qs
    ? `/templates/${templateId}/add?${qs}`
    : `/templates/${templateId}/add`

  return detailId ? `${path}#exercise-${detailId}` : path
}

function FilterChip({
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
      className={`shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? 'border-highlight/40 bg-primary text-text-primary'
          : 'border-white/10 bg-surface/60 text-text-muted hover:text-text-secondary'
      }`}
    >
      {children}
    </Link>
  )
}

function Meta({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl border border-white/5 bg-surface/70 p-3">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="mt-0.5 line-clamp-2 text-sm capitalize text-text-primary">
        {value && value.length > 0 ? value : '—'}
      </dd>
    </div>
  )
}

export default async function AddExercisePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ q?: string; detail?: string }>
}) {
  const { id } = await params
  const { q, detail } = await searchParams

  const template = await getTemplate(id)
  if (!template) notFound()

  const searchBodyPart = bodyPartFromSearch(q)
  const [exercises, selectedExercise] = await Promise.all([
    listExercises({
      search: searchBodyPart ? undefined : q,
      bodyPart: searchBodyPart,
      limit: 120,
    }),
    detail ? getExercise(detail) : Promise.resolve(null),
  ])
  const selectedMedia = selectedExercise
    ? await getSignedMediaUrl(selectedExercise.gif_url ?? selectedExercise.image_url)
    : null
  const already = new Set(
    template.exercises.map((te) => te.exercise?.id).filter(Boolean)
  )
  const selectedAlready = selectedExercise
    ? already.has(selectedExercise.id)
    : false

  return (
    <div className="space-y-5">
      <Link
        href={`/templates/${id}`}
        className="inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
      >
        <ChevronLeft size={18} strokeWidth={1.75} /> {template.name}
      </Link>

      <h1 className="text-xl font-bold">Añadir ejercicios</h1>

      <div className="sticky top-[57px] z-20 -mx-5 space-y-3 border-b border-white/5 bg-background/95 px-5 py-3 backdrop-blur-xl">
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
        </form>

        <div className="-mx-5 overflow-x-auto px-5">
          <div className="flex gap-2 pb-0.5">
            <FilterChip href={`/templates/${id}/add`} active={!q}>
              Todos
            </FilterChip>
            <FilterChip
              href={addPageHref(id, 'maquina')}
              active={q === 'maquina' || q === 'máquina'}
            >
              Máquinas
            </FilterChip>
            <FilterChip href={addPageHref(id, 'prensa')} active={q === 'prensa'}>
              Prensa
            </FilterChip>
            {BODY_PARTS.map((part) => (
              <FilterChip
                key={part}
                href={addPageHref(id, part)}
                active={q === part}
              >
                {bodyPartLabel(part)}
              </FilterChip>
            ))}
          </div>
        </div>
      </div>

      <ul className="space-y-2">
        {exercises.map((e) => {
          const added = already.has(e.id)
          const isSelected = selectedExercise?.id === e.id
          return (
            <li
              id={`exercise-${e.id}`}
              key={e.id}
              className={`crystal-surface overflow-hidden rounded-xl ${
                isSelected ? 'border-highlight/40' : ''
              }`}
              style={{ scrollMarginTop: '180px', scrollMarginBottom: '96px' }}
            >
              <div className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-medium capitalize">
                    {e.name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {bodyPartLabel(e.body_part)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={isSelected ? addPageHref(id, q) : addPageHref(id, q, e.id)}
                    scroll={!isSelected}
                    className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:border-white/20 hover:text-text-primary"
                  >
                    {isSelected ? (
                      <X size={15} strokeWidth={1.75} />
                    ) : (
                      <Eye size={15} strokeWidth={1.75} />
                    )}
                    {isSelected ? 'Cerrar' : 'Detalle'}
                  </Link>
                  {added ? (
                    <span className="flex items-center gap-1 text-xs text-success">
                      <Check size={16} strokeWidth={2} /> Añadido
                    </span>
                  ) : (
                    <form action={addExerciseToTemplate}>
                      <input type="hidden" name="template_id" value={id} />
                      <input type="hidden" name="exercise_id" value={e.id} />
                      <button
                        type="submit"
                        className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-text-primary transition-colors hover:bg-primary-hover"
                      >
                        <Plus size={16} strokeWidth={2} /> Añadir
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {isSelected && selectedExercise && (
                <div className="border-t border-white/5 p-3 pt-4">
                  <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                    <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-surface-2">
                      {selectedMedia ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={selectedMedia}
                          alt={selectedExercise.name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <p className="px-4 text-center text-sm text-text-muted">
                          Sin imagen todavía
                        </p>
                      )}
                    </div>

                    <div className="space-y-4">
                      <dl className="grid grid-cols-2 gap-2">
                        <Meta label="Objetivo" value={selectedExercise.target} />
                        <Meta label="Equipo" value={selectedExercise.equipment} />
                        <Meta label="Grupo" value={selectedExercise.muscle_group} />
                        <Meta
                          label="Secundarios"
                          value={selectedExercise.secondary_muscles?.join(', ')}
                        />
                      </dl>

                      {selectedExercise.instructions && (
                        <p className="line-clamp-4 text-sm leading-relaxed text-text-secondary">
                          {selectedExercise.instructions}
                        </p>
                      )}

                      {selectedAlready ? (
                        <span className="inline-flex items-center gap-1 text-sm font-medium text-success">
                          <Check size={16} strokeWidth={2} /> Ya está añadido
                        </span>
                      ) : (
                        <form action={addExerciseToTemplate}>
                          <input type="hidden" name="template_id" value={id} />
                          <input
                            type="hidden"
                            name="exercise_id"
                            value={selectedExercise.id}
                          />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-primary-hover"
                          >
                            <Plus size={16} strokeWidth={2} /> Añadir ejercicio
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <Link
        href={`/templates/${id}`}
        className="block rounded-xl bg-primary py-3 text-center text-sm font-semibold text-text-primary transition-colors hover:bg-primary-hover"
      >
        Listo
      </Link>
    </div>
  )
}
