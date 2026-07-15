'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Check,
  CheckCircle2,
  Eye,
  Pause,
  Play,
  Timer,
  X,
} from 'lucide-react'
import {
  completeWorkoutSession,
  saveWorkoutSet,
  startWorkoutSession,
} from '@/app/actions/sessions'
import type { SessionExercise, WorkoutSession, WorkoutSet } from '@/lib/data/sessions'

function dayHref(date: string, detailId?: string) {
  const params = new URLSearchParams()
  const today = new Date().toISOString().slice(0, 10)
  if (date !== today) params.set('date', date)
  if (detailId) params.set('detail', detailId)

  const qs = params.toString()
  const path = qs ? `/?${qs}` : '/'
  return detailId ? `${path}#session-exercise-${detailId}` : path
}

function formatTime(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function setKey(set: WorkoutSet) {
  return set.id
}

function Meta({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl border border-white/5 bg-surface/70 p-3">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="mt-0.5 line-clamp-2 text-sm capitalize text-text-primary">
        {value && value.length > 0 ? value : '-'}
      </dd>
    </div>
  )
}

function fallbackSets(exercise: SessionExercise): WorkoutSet[] {
  if (exercise.workout_sets.length > 0) return exercise.workout_sets

  const count = Math.max(1, exercise.target_sets ?? 1)
  return Array.from({ length: count }, (_, index) => ({
    id: `pending-${exercise.id}-${index + 1}`,
    set_number: index + 1,
    target_reps: exercise.target_reps_max ?? exercise.target_reps_min,
    target_weight: exercise.target_weight,
    actual_reps: null,
    actual_weight: null,
    rest_seconds: null,
    is_completed: false,
    completed_at: null,
  }))
}

type SetDraft = {
  actual_reps: string
  actual_weight: string
  rest_seconds: string
  is_completed: boolean
}

type ActiveTimer = {
  setId: string
  targetRest: number
  startedAt: number
}

export function WorkoutSessionCard({
  session,
  selectedDate,
  detailId,
  selectedMedia,
}: {
  session: WorkoutSession
  selectedDate: string
  detailId?: string
  selectedMedia: string | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const sets = useMemo(
    () => session.exercises.flatMap((exercise) => fallbackSets(exercise)),
    [session.exercises]
  )
  const persistedSets = sets.filter((set) => !set.id.startsWith('pending-'))
  const hasStarted = session.status !== 'planned' || persistedSets.length > 0
  const completedSets = sets.filter((set) => set.is_completed).length
  const totalSets = sets.length
  const progress = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0

  const [drafts, setDrafts] = useState<Record<string, SetDraft>>(() =>
    Object.fromEntries(
      sets.map((set) => [
        setKey(set),
        {
          actual_reps: set.actual_reps?.toString() ?? set.target_reps?.toString() ?? '',
          actual_weight: set.actual_weight?.toString() ?? '',
          rest_seconds: set.rest_seconds?.toString() ?? '',
          is_completed: set.is_completed,
        },
      ])
    )
  )

  useEffect(() => {
    if (!activeTimer) return
    const id = window.setInterval(() => {
      setElapsed(Math.floor((Date.now() - activeTimer.startedAt) / 1000))
    }, 250)
    return () => window.clearInterval(id)
  }, [activeTimer])

  function updateDraft(setId: string, patch: Partial<SetDraft>) {
    setDrafts((current) => ({
      ...current,
      [setId]: {
        ...(current[setId] ?? {
          actual_reps: '',
          actual_weight: '',
          rest_seconds: '',
          is_completed: false,
        }),
        ...patch,
      },
    }))
  }

  function submitSet(set: WorkoutSet, completed: boolean, restSeconds?: number) {
    if (set.id.startsWith('pending-')) return
    const draft = drafts[set.id]
    const data = new FormData()
    data.set('id', set.id)
    data.set('is_completed', String(completed))
    if (draft?.actual_reps) data.set('actual_reps', draft.actual_reps)
    if (draft?.actual_weight) data.set('actual_weight', draft.actual_weight)
    if (restSeconds !== undefined) data.set('rest_seconds', String(restSeconds))
    else if (draft?.rest_seconds) data.set('rest_seconds', draft.rest_seconds)

    updateDraft(set.id, {
      is_completed: completed,
      rest_seconds:
        restSeconds !== undefined ? String(restSeconds) : draft?.rest_seconds ?? '',
    })

    startTransition(async () => {
      await saveWorkoutSet(data)
      router.refresh()
    })
  }

  function startSession() {
    const data = new FormData()
    data.set('id', session.id)
    startTransition(async () => {
      await startWorkoutSession(data)
      router.refresh()
    })
  }

  function finishSession() {
    const data = new FormData()
    data.set('id', session.id)
    startTransition(async () => {
      await completeWorkoutSession(data)
      router.refresh()
    })
  }

  return (
    <section className="crystal-surface rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase text-text-muted">
            {session.status === 'planned'
              ? 'Planificada'
              : session.status === 'in_progress'
                ? 'En progreso'
                : session.status === 'completed'
                  ? 'Completada'
                  : session.status}
          </p>
          <h2 className="mt-1 text-lg font-bold capitalize">{session.title}</h2>
          <p className="text-sm text-text-muted">
            {session.exercises.length}{' '}
            {session.exercises.length === 1 ? 'ejercicio' : 'ejercicios'} ·{' '}
            {completedSets}/{totalSets} series
          </p>
        </div>

        {!hasStarted ? (
          <button
            type="button"
            disabled={isPending}
            onClick={startSession}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-3 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            <Play size={16} strokeWidth={1.75} />
            Iniciar
          </button>
        ) : (
          <div className="rounded-xl border border-white/10 px-3 py-2 text-right">
            <p className="font-mono text-sm text-text-primary">{progress}%</p>
            <p className="text-xs text-text-muted">avance</p>
          </div>
        )}
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div
          className="h-full rounded-full bg-highlight transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>

      {activeTimer && (
        <div className="sticky top-[72px] z-20 mt-4 rounded-2xl border border-highlight/30 bg-surface-2/95 p-3 shadow-[0_0_30px_rgba(49,93,168,0.14)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-1 text-xs uppercase text-text-muted">
                <Timer size={14} strokeWidth={1.75} /> Descanso
              </p>
              <p className="mt-1 font-mono text-3xl font-semibold text-text-primary">
                {formatTime(elapsed)}
              </p>
              <p className="text-xs text-text-muted">
                Objetivo {formatTime(activeTimer.targetRest || 0)}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-primary-hover"
              onClick={() => {
                const target = sets.find((set) => set.id === activeTimer.setId)
                if (target) submitSet(target, true, elapsed)
                setActiveTimer(null)
                setElapsed(0)
              }}
            >
              <Pause size={16} strokeWidth={1.75} />
              Cortar
            </button>
          </div>
        </div>
      )}

      <ol className="mt-4 space-y-2">
        {session.exercises.map((exercise, index) => {
          const exerciseSets = fallbackSets(exercise)
          const done = exerciseSets.filter((set) => set.is_completed).length
          return (
            <li
              key={exercise.id}
              id={`session-exercise-${exercise.id}`}
              className="overflow-hidden rounded-xl border border-white/5 bg-surface/70"
              style={{ scrollMarginTop: '120px', scrollMarginBottom: '96px' }}
            >
              <div className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="text-xs text-text-muted">
                    {index + 1} · {exercise.muscle_group ?? '-'}
                  </p>
                  <p className="line-clamp-1 font-medium capitalize">
                    {exercise.exercise_name}
                  </p>
                  <p className="mt-1 font-mono text-xs text-text-muted">
                    {done}/{exerciseSets.length} series · {exercise.target_reps_min ?? '-'}
                    -{exercise.target_reps_max ?? '-'} reps
                    {exercise.rest_seconds ? ` · ${exercise.rest_seconds}s` : ''}
                  </p>
                </div>
                <Link
                  href={
                    detailId === exercise.id
                      ? dayHref(selectedDate)
                      : dayHref(selectedDate, exercise.id)
                  }
                  scroll={detailId !== exercise.id}
                  className="flex shrink-0 items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:border-white/20 hover:text-text-primary"
                >
                  {detailId === exercise.id ? (
                    <X size={15} strokeWidth={1.75} />
                  ) : (
                    <Eye size={15} strokeWidth={1.75} />
                  )}
                  {detailId === exercise.id ? 'Cerrar' : 'Detalle'}
                </Link>
              </div>

              {hasStarted && (
                <div className="space-y-2 border-t border-white/5 p-3">
                  {exerciseSets.map((set) => {
                    const draft = drafts[set.id]
                    const pending = set.id.startsWith('pending-')
                    return (
                      <div
                        key={set.id}
                        className={`rounded-xl border p-3 ${
                          draft?.is_completed || set.is_completed
                            ? 'border-success/25 bg-success/5'
                            : 'border-white/5 bg-background/35'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <button
                            type="button"
                            disabled={pending || isPending}
                            onClick={() =>
                              submitSet(set, !(draft?.is_completed ?? set.is_completed))
                            }
                            className={`flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                              draft?.is_completed || set.is_completed
                                ? 'border-success/40 bg-success/10 text-success'
                                : 'border-white/10 text-text-muted hover:text-text-primary'
                            }`}
                            aria-label={`Marcar serie ${set.set_number}`}
                          >
                            <Check size={17} strokeWidth={2} />
                          </button>

                          <div className="grid min-w-0 flex-1 grid-cols-3 gap-2">
                            <label className="space-y-1">
                              <span className="text-[11px] text-text-muted">
                                Serie
                              </span>
                              <div className="rounded-lg border border-white/5 bg-surface-2 px-2 py-2 text-center font-mono text-sm">
                                {set.set_number}
                              </div>
                            </label>
                            <label className="space-y-1">
                              <span className="text-[11px] text-text-muted">
                                Reps
                              </span>
                              <input
                                inputMode="numeric"
                                value={draft?.actual_reps ?? ''}
                                disabled={pending}
                                onChange={(event) =>
                                  updateDraft(set.id, {
                                    actual_reps: event.target.value,
                                  })
                                }
                                className="w-full rounded-lg border border-white/10 bg-surface-2 px-2 py-2 text-center font-mono text-sm outline-none focus:border-highlight"
                              />
                            </label>
                            <label className="space-y-1">
                              <span className="text-[11px] text-text-muted">
                                Peso
                              </span>
                              <input
                                inputMode="decimal"
                                value={draft?.actual_weight ?? ''}
                                disabled={pending}
                                onChange={(event) =>
                                  updateDraft(set.id, {
                                    actual_weight: event.target.value,
                                  })
                                }
                                className="w-full rounded-lg border border-white/10 bg-surface-2 px-2 py-2 text-center font-mono text-sm outline-none focus:border-highlight"
                              />
                            </label>
                          </div>
                        </div>

                        <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                          <label className="space-y-1">
                            <span className="text-[11px] text-text-muted">
                              Descanso real
                            </span>
                            <input
                              inputMode="numeric"
                              value={draft?.rest_seconds ?? ''}
                              disabled={pending}
                              onChange={(event) =>
                                updateDraft(set.id, {
                                  rest_seconds: event.target.value,
                                })
                              }
                              className="w-full rounded-lg border border-white/10 bg-surface-2 px-2 py-2 font-mono text-sm outline-none focus:border-highlight"
                              placeholder={`${exercise.rest_seconds ?? 90}s`}
                            />
                          </label>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => {
                              setActiveTimer({
                                setId: set.id,
                                targetRest: exercise.rest_seconds ?? 90,
                                startedAt: Date.now(),
                              })
                              setElapsed(0)
                              submitSet(set, true)
                            }}
                            className="self-end rounded-lg border border-highlight/30 px-3 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-primary hover:text-text-primary disabled:opacity-50"
                          >
                            Timer
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {!hasStarted && (
                <div className="border-t border-white/5 px-3 py-2 text-xs text-text-muted">
                  Inicia la rutina para marcar series y registrar reps, peso y descanso.
                </div>
              )}

              {detailId === exercise.id && (
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
          )
        })}
      </ol>

      {hasStarted && completedSets === totalSets && session.status !== 'completed' && (
        <button
          type="button"
          disabled={isPending}
          onClick={finishSession}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-success px-4 py-3 text-sm font-semibold text-background transition-opacity disabled:opacity-60"
        >
          <CheckCircle2 size={17} strokeWidth={2} />
          Finalizar rutina
        </button>
      )}
    </section>
  )
}
