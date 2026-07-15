import Link from 'next/link'
import {
  CalendarPlus,
  ChevronRight,
  Eye,
  ExternalLink,
  RefreshCw,
  Share2,
  Trash2,
  X,
} from 'lucide-react'
import {
  deleteWorkoutSession,
  enableSessionPublicShare,
  refreshSessionFromTemplate,
} from '@/app/actions/sessions'
import { getSessionsForDate } from '@/lib/data/sessions'
import { getSignedMediaUrl } from '@/lib/supabase/storage'
import { addDays, dateLabel, todayDateString } from '@/lib/dates'

function dayHref(date: string, detailId?: string) {
  const today = todayDateString()
  const params = new URLSearchParams()
  if (date !== today) params.set('date', date)
  if (detailId) params.set('detail', detailId)

  const qs = params.toString()
  const path = qs ? `/?${qs}` : '/'
  return detailId ? `${path}#session-exercise-${detailId}` : path
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

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; detail?: string }>
}) {
  const today = todayDateString()
  const tomorrow = addDays(today, 1)
  const { date, detail } = await searchParams
  const selectedDate = date ?? today
  const sessions = await getSessionsForDate(selectedDate)
  const selectedExercise = sessions
    .flatMap((session) => session.exercises)
    .find((exercise) => exercise.id === detail)
  const selectedMedia = selectedExercise?.exercise
    ? await getSignedMediaUrl(
        selectedExercise.exercise.gif_url ?? selectedExercise.exercise.image_url
      )
    : null

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="font-mono text-sm text-text-muted">
          {selectedDate}
        </p>
        <h1 className="text-2xl font-bold">{dateLabel(selectedDate)}</h1>
      </div>

      <div className="flex gap-2">
        <Chip href={dayHref(today)} active={selectedDate === today}>
          Hoy
        </Chip>
        <Chip href={dayHref(tomorrow)} active={selectedDate === tomorrow}>
          Mañana
        </Chip>
      </div>

      {sessions.length === 0 ? (
        <div className="crystal-surface space-y-4 rounded-2xl p-6 text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-surface-2">
            <CalendarPlus size={22} strokeWidth={1.75} className="text-text-muted" />
          </div>
          <div className="space-y-1">
            <p className="text-text-secondary">
              No tienes una rutina para {selectedDate === today ? 'hoy' : 'este día'}.
            </p>
            <p className="text-sm text-text-muted">
              Elige una plantilla y prográmala para hoy o mañana.
            </p>
          </div>
          <Link
            href="/templates"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-primary-hover"
          >
            Ver plantillas <ChevronRight size={16} strokeWidth={1.75} />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <section key={session.id} className="crystal-surface rounded-2xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase text-text-muted">
                    {session.status === 'planned' ? 'Planificada' : session.status}
                  </p>
                  <h2 className="mt-1 text-lg font-bold capitalize">
                    {session.title}
                  </h2>
                  <p className="text-sm text-text-muted">
                    {session.exercises.length}{' '}
                    {session.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}
                  </p>
                </div>
              </div>

              <ol className="mt-4 space-y-2">
                {session.exercises.map((exercise, index) => (
                  <li
                    key={exercise.id}
                    id={`session-exercise-${exercise.id}`}
                    className="overflow-hidden rounded-xl border border-white/5 bg-surface/70"
                    style={{ scrollMarginTop: '96px', scrollMarginBottom: '96px' }}
                  >
                    <div className="flex items-start justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="text-xs text-text-muted">
                          {index + 1} · {exercise.muscle_group ?? '—'}
                        </p>
                        <p className="line-clamp-1 font-medium capitalize">
                          {exercise.exercise_name}
                        </p>
                        <p className="mt-1 font-mono text-xs text-text-muted">
                          {exercise.target_sets ?? '—'} x{' '}
                          {exercise.target_reps_min ?? '—'}-
                          {exercise.target_reps_max ?? '—'}
                          {exercise.target_weight
                            ? ` · sug. ${exercise.target_weight} kg`
                            : ''}
                          {exercise.rest_seconds
                            ? ` · ${exercise.rest_seconds}s`
                            : ''}
                        </p>
                      </div>
                      <Link
                        href={
                          detail === exercise.id
                            ? dayHref(selectedDate)
                            : dayHref(selectedDate, exercise.id)
                        }
                        scroll={detail !== exercise.id}
                        className="flex shrink-0 items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:border-white/20 hover:text-text-primary"
                      >
                        {detail === exercise.id ? (
                          <X size={15} strokeWidth={1.75} />
                        ) : (
                          <Eye size={15} strokeWidth={1.75} />
                        )}
                        {detail === exercise.id ? 'Cerrar' : 'Detalle'}
                      </Link>
                    </div>

                    {detail === exercise.id && (
                      <div className="border-t border-white/5 p-3 pt-4">
                        <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
                          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-surface-2">
                            {selectedMedia ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={selectedMedia}
                                alt={exercise.exercise_name}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <p className="px-4 text-center text-sm text-text-muted">
                                Sin imagen todavía
                              </p>
                            )}
                          </div>

                          <div className="space-y-4">
                            <div>
                              <p className="text-xs uppercase text-text-muted">
                                {exercise.exercise?.name ?? 'Ejercicio'}
                              </p>
                              <h3 className="mt-1 text-base font-bold capitalize">
                                {exercise.exercise_name}
                              </h3>
                            </div>

                            <dl className="grid grid-cols-2 gap-2">
                              <Meta label="Objetivo" value={exercise.exercise?.target} />
                              <Meta label="Equipo" value={exercise.exercise?.equipment} />
                              <Meta label="Grupo" value={exercise.exercise?.muscle_group} />
                              <Meta label="Parte" value={exercise.exercise?.body_part} />
                            </dl>

                            {exercise.exercise?.instructions && (
                              <p className="line-clamp-5 text-sm leading-relaxed text-text-secondary">
                                {exercise.exercise.instructions}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ol>

              <div className="mt-4 grid gap-2">
                {session.template_id && (
                  <form action={refreshSessionFromTemplate}>
                    <input type="hidden" name="id" value={session.id} />
                    <input type="hidden" name="date" value={selectedDate} />
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:border-highlight/30 hover:text-text-primary"
                    >
                      <RefreshCw size={16} strokeWidth={1.75} /> Actualizar desde plantilla
                    </button>
                  </form>
                )}
                {session.is_public && session.public_share_id ? (
                  <Link
                    href={`/share/sessions/${session.public_share_id}`}
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:border-highlight/30 hover:text-text-primary"
                  >
                    <ExternalLink size={16} strokeWidth={1.75} /> Abrir link público
                  </Link>
                ) : (
                  <form action={enableSessionPublicShare}>
                    <input type="hidden" name="id" value={session.id} />
                    <input type="hidden" name="date" value={selectedDate} />
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:border-highlight/30 hover:text-text-primary"
                    >
                      <Share2 size={16} strokeWidth={1.75} /> Compartir público
                    </button>
                  </form>
                )}
                <form action={deleteWorkoutSession}>
                  <input type="hidden" name="id" value={session.id} />
                  <input type="hidden" name="date" value={selectedDate} />
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-text-muted transition-colors hover:border-danger/40 hover:text-danger"
                  >
                    <Trash2 size={16} strokeWidth={1.75} /> Eliminar rutina
                  </button>
                </form>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
