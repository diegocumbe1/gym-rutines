import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  Check,
  ChevronDown,
  ChevronLeft,
  Dumbbell,
  Plus,
  Search,
  X,
} from 'lucide-react'
import { getTemplate } from '@/lib/data/templates'
import {
  getExercise,
  listExercisesPage,
  listSimilarExercises,
} from '@/lib/data/exercises'
import { addExerciseToTemplate } from '@/app/actions/templates'
import { ExercisesPagination } from '@/components/exercises/exercises-pagination'
import { BODY_PARTS, bodyPartLabel } from '@/lib/exercises/labels'
import { getSignedMediaUrl, getSignedMediaUrls } from '@/lib/supabase/storage'

const PAGE_SIZE = 40

type AddPageQuery = {
  q?: string
  part?: string
  page?: number
  detail?: string
}

function addPageHref(templateId: string, query: AddPageQuery = {}) {
  const params = new URLSearchParams()
  if (query.q) params.set('q', query.q)
  if (query.part) params.set('part', query.part)
  if (query.page && query.page > 1) params.set('page', String(query.page))
  if (query.detail) params.set('detail', query.detail)

  const qs = params.toString()
  const path = qs
    ? `/templates/${templateId}/add?${qs}`
    : `/templates/${templateId}/add`

  return query.detail ? `${path}#exercise-${query.detail}` : path
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

function Thumb({
  src,
  alt,
  className,
}: {
  src?: string | null
  alt: string
  className: string
}) {
  return (
    <div
      className={`flex items-center justify-center overflow-hidden bg-surface-2 ${className}`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ) : (
        <Dumbbell size={22} strokeWidth={1.5} className="text-text-disabled" />
      )}
    </div>
  )
}

export default async function AddExercisePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{
    q?: string
    part?: string
    page?: string
    detail?: string
  }>
}) {
  const { id } = await params
  const { q, part, page: pageParam, detail } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)

  const template = await getTemplate(id)
  if (!template) notFound()

  const [{ exercises, total, relaxed }, selectedExercise] = await Promise.all([
    listExercisesPage({
      search: q,
      bodyPart: part,
      page,
      pageSize: PAGE_SIZE,
    }),
    detail ? getExercise(detail) : Promise.resolve(null),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  if (total > 0 && page > totalPages) {
    redirect(addPageHref(id, { q, part, page: totalPages, detail }))
  }
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const to = Math.min(page * PAGE_SIZE, total)

  const listMedia = await getSignedMediaUrls(
    exercises
      .map((exercise) => exercise.image_url)
      .filter((path): path is string => Boolean(path))
  )
  const selectedMedia = selectedExercise
    ? await getSignedMediaUrl(selectedExercise.gif_url ?? selectedExercise.image_url)
    : null
  const similarExercises = selectedExercise
    ? await listSimilarExercises(selectedExercise, 6)
    : []
  const similarMedia = await getSignedMediaUrls(
    similarExercises
      .map((exercise) => exercise.image_url)
      .filter((path): path is string => Boolean(path))
  )
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
            placeholder="Buscar por nombre…"
            aria-label="Buscar ejercicio por nombre"
            className="w-full rounded-xl border border-white/10 bg-surface-2 py-2.5 pl-10 pr-3 text-base text-text-primary outline-none transition-colors placeholder:text-text-disabled focus:border-highlight"
          />
          {part && <input type="hidden" name="part" value={part} />}
        </form>

        <div className="-mx-5 overflow-x-auto px-5">
          <div className="flex gap-2 pb-0.5">
            <FilterChip href={addPageHref(id, { q })} active={!part}>
              Todos
            </FilterChip>
            {BODY_PARTS.map((bodyPart) => (
              <FilterChip
                key={bodyPart}
                href={addPageHref(id, { q, part: bodyPart })}
                active={part === bodyPart}
              >
                {bodyPartLabel(bodyPart)}
              </FilterChip>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm text-text-muted">
        <p>
          {total === 0 ? '0 ejercicios' : `${from}-${to} de ${total} ejercicios`}
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
            Prueba con otro nombre o quita el filtro de zona.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {exercises.map((e) => {
            const added = already.has(e.id)
            const isSelected = selectedExercise?.id === e.id
            const thumb = e.image_url ? listMedia.get(e.image_url) : null
            return (
              <li
                id={`exercise-${e.id}`}
                key={e.id}
                className={`crystal-surface overflow-hidden rounded-xl ${
                  isSelected ? 'border-highlight/40' : ''
                }`}
                style={{ scrollMarginTop: '180px', scrollMarginBottom: '96px' }}
              >
                <div className="grid grid-cols-[76px_1fr] gap-3 p-2">
                  <Link
                    href={
                      isSelected
                        ? addPageHref(id, { q, part, page })
                        : addPageHref(id, { q, part, page, detail: e.id })
                    }
                    scroll={!isSelected}
                    aria-label={`Ver detalle de ${e.name}`}
                    className="block"
                  >
                    <Thumb
                      src={thumb}
                      alt={e.name}
                      className="aspect-square rounded-lg"
                    />
                  </Link>

                  <div className="flex min-w-0 flex-col justify-between gap-2 py-0.5">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-medium capitalize">
                        {e.name}
                      </p>
                      <p className="line-clamp-1 text-xs text-text-muted">
                        {bodyPartLabel(e.body_part)}
                        {e.equipment ? ` · ${e.equipment}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        href={
                          isSelected
                            ? addPageHref(id, { q, part, page })
                            : addPageHref(id, { q, part, page, detail: e.id })
                        }
                        scroll={!isSelected}
                        className="flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-2 text-xs font-semibold text-text-secondary transition-colors hover:text-text-primary"
                      >
                        {isSelected ? (
                          <X size={15} strokeWidth={1.75} />
                        ) : (
                          <ChevronDown size={15} strokeWidth={1.75} />
                        )}
                        {isSelected ? 'Cerrar' : 'Detalle'}
                      </Link>

                      {added ? (
                        <span className="flex items-center gap-1 text-xs text-success">
                          <Check size={16} strokeWidth={2} /> Añadido
                        </span>
                      ) : (
                        <form action={addExerciseToTemplate} className="flex-1">
                          <input type="hidden" name="template_id" value={id} />
                          <input type="hidden" name="exercise_id" value={e.id} />
                          <button
                            type="submit"
                            className="flex w-full items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-text-primary transition-colors hover:bg-primary-hover"
                          >
                            <Plus size={16} strokeWidth={2} /> Añadir
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>

                {isSelected && selectedExercise && (
                  <div className="border-t border-white/5 p-3 pt-4">
                    <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                      <Thumb
                        src={selectedMedia}
                        alt={selectedExercise.name}
                        className="aspect-square rounded-xl border border-white/5"
                      />

                      <div className="space-y-4">
                        <dl className="grid grid-cols-2 gap-2">
                          <Meta label="Objetivo" value={selectedExercise.target} />
                          <Meta label="Equipo" value={selectedExercise.equipment} />
                          <Meta
                            label="Grupo"
                            value={selectedExercise.muscle_group}
                          />
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

                        {similarExercises.length > 0 && (
                          <div className="space-y-2 border-t border-white/5 pt-3">
                            <p className="text-xs font-semibold uppercase text-text-muted">
                              Alternativas similares
                            </p>
                            <ul className="grid gap-2">
                              {similarExercises.map((similar) => {
                                const similarAlready = already.has(similar.id)
                                const similarThumb = similar.image_url
                                  ? similarMedia.get(similar.image_url)
                                  : null
                                return (
                                  <li
                                    key={similar.id}
                                    className="rounded-xl border border-white/5 bg-surface/60 p-2"
                                  >
                                    <div className="grid grid-cols-[56px_1fr_auto] items-center gap-2">
                                      <Link
                                        href={addPageHref(id, {
                                          q,
                                          part,
                                          page,
                                          detail: similar.id,
                                        })}
                                        scroll
                                        aria-label={`Ver ${similar.name}`}
                                      >
                                        <Thumb
                                          src={similarThumb}
                                          alt={similar.name}
                                          className="aspect-square rounded-lg"
                                        />
                                      </Link>
                                      <div className="min-w-0">
                                        <Link
                                          href={addPageHref(id, {
                                            q,
                                            part,
                                            page,
                                            detail: similar.id,
                                          })}
                                          scroll
                                          className="line-clamp-1 text-sm font-medium capitalize text-text-primary"
                                        >
                                          {similar.name}
                                        </Link>
                                        <p className="line-clamp-1 text-xs text-text-muted">
                                          {bodyPartLabel(similar.body_part)}
                                          {similar.target
                                            ? ` · ${similar.target}`
                                            : ''}
                                        </p>
                                        <p className="line-clamp-1 text-[11px] text-text-disabled">
                                          {similar.reason}
                                          {similar.equipment
                                            ? ` · ${similar.equipment}`
                                            : ''}
                                        </p>
                                      </div>
                                      {similarAlready ? (
                                        <span className="flex items-center gap-1 pr-1 text-xs text-success">
                                          <Check size={15} strokeWidth={2} />{' '}
                                          Añadido
                                        </span>
                                      ) : (
                                        <form action={addExerciseToTemplate}>
                                          <input
                                            type="hidden"
                                            name="template_id"
                                            value={id}
                                          />
                                          <input
                                            type="hidden"
                                            name="exercise_id"
                                            value={similar.id}
                                          />
                                          <button
                                            type="submit"
                                            aria-label={`Añadir ${similar.name}`}
                                            className="flex size-9 items-center justify-center rounded-lg bg-primary text-text-primary transition-colors hover:bg-primary-hover"
                                          >
                                            <Plus size={17} strokeWidth={2} />
                                          </button>
                                        </form>
                                      )}
                                    </div>
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <ExercisesPagination
        page={page}
        totalPages={totalPages}
        buildHref={(target) => addPageHref(id, { q, part, page: target })}
      />

      <Link
        href={`/templates/${id}`}
        className="block rounded-xl bg-primary py-3 text-center text-sm font-semibold text-text-primary transition-colors hover:bg-primary-hover"
      >
        Listo
      </Link>
    </div>
  )
}
