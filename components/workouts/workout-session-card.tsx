'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Pause,
  Play,
  RotateCcw,
  X,
} from 'lucide-react'
import {
  completeWorkoutSession,
  moveSessionExercise,
  saveSessionExercise,
  saveWorkoutSet,
  startWorkoutSession,
} from '@/app/actions/sessions'
import type { SessionExercise, WorkoutSession, WorkoutSet } from '@/lib/data/sessions'
import {
  formatDuration,
  trackingTypeLabel,
  tracksSets,
  tracksWeight,
} from '@/lib/workouts/tracking'

function dayHref(date: string, detailId?: string) {
  const params = new URLSearchParams()
  const today = new Date().toISOString().slice(0, 10)
  if (date !== today) params.set('date', date)
  if (detailId) params.set('detail', detailId)

  const qs = params.toString()
  const path = qs ? `/?${qs}` : '/'
  return detailId ? `${path}#session-exercise-${detailId}` : path
}

function formatClock(seconds: number) {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function elapsedBetween(startedAt: string | null, completedAt: string | null) {
  if (!startedAt || !completedAt) return 0
  return Math.max(
    0,
    Math.floor(
      (new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000
    )
  )
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
  if (!tracksSets(exercise.tracking_type)) return []
  if (exercise.workout_sets.length > 0) return exercise.workout_sets

  const count = Math.max(1, exercise.target_sets ?? 1)
  return Array.from({ length: count }, (_, index) => ({
    id: `pending-${exercise.id}-${index + 1}`,
    set_number: index + 1,
    target_reps: exercise.target_reps_max ?? exercise.target_reps_min,
    target_weight: tracksWeight(exercise.tracking_type)
      ? exercise.target_weight
      : null,
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
  is_completed: boolean
}

type ExerciseDraft = {
  actual_duration_seconds: string
  is_completed: boolean
}

function exerciseSummary(exercise: SessionExercise, done: number, total: number) {
  if (tracksSets(exercise.tracking_type)) {
    return `${done}/${total} series · ${exercise.target_reps_min ?? '-'}-${exercise.target_reps_max ?? '-'} reps${exercise.rest_seconds ? ` · ${exercise.rest_seconds}s` : ''}`
  }
  if (exercise.tracking_type === 'duration') {
    return `${exercise.is_completed ? 'Completado' : 'Pendiente'} · ${formatDuration(exercise.target_duration_seconds) || 'sin tiempo'}${exercise.rest_seconds ? ` · ${exercise.rest_seconds}s` : ''}`
  }
  return `${exercise.is_completed ? 'Completado' : 'Pendiente'} · una vez`
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
  const [now, setNow] = useState(() => Date.now())
  const [timerBaseSeconds, setTimerBaseSeconds] = useState(() =>
    session.status === 'completed'
      ? elapsedBetween(session.started_at, session.completed_at)
      : 0
  )
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null)
  const [expandedCompleted, setExpandedCompleted] = useState<
    Record<string, boolean>
  >({})
  const setsByExercise = useMemo(
    () =>
      Object.fromEntries(
        session.exercises.map((exercise) => [exercise.id, fallbackSets(exercise)])
      ),
    [session.exercises]
  )
  const sets = useMemo(() => Object.values(setsByExercise).flat(), [setsByExercise])
  const persistedSets = sets.filter((set) => !set.id.startsWith('pending-'))
  const hasStarted = session.status !== 'planned' || persistedSets.length > 0

  const progressUnits = session.exercises.reduce(
    (acc, exercise) => {
      const exerciseSets = setsByExercise[exercise.id] ?? []
      if (tracksSets(exercise.tracking_type)) {
        acc.done += exerciseSets.filter((set) => set.is_completed).length
        acc.total += exerciseSets.length
      } else {
        acc.done += exercise.is_completed ? 1 : 0
        acc.total += 1
      }
      return acc
    },
    { done: 0, total: 0 }
  )
  const progress =
    progressUnits.total > 0
      ? Math.round((progressUnits.done / progressUnits.total) * 100)
      : 0

  const [drafts, setDrafts] = useState<Record<string, SetDraft>>(() =>
    Object.fromEntries(
      sets.map((set) => [
        setKey(set),
        {
          actual_reps: set.actual_reps?.toString() ?? set.target_reps?.toString() ?? '',
          actual_weight: set.actual_weight?.toString() ?? '',
          is_completed: set.is_completed,
        },
      ])
    )
  )
  const [exerciseDrafts, setExerciseDrafts] = useState<Record<string, ExerciseDraft>>(
    () =>
      Object.fromEntries(
        session.exercises.map((exercise) => [
          exercise.id,
          {
            actual_duration_seconds:
              exercise.actual_duration_seconds?.toString() ??
              exercise.target_duration_seconds?.toString() ??
              '',
            is_completed: exercise.is_completed,
          },
        ])
      )
  )

  const timerRunning = timerStartedAt !== null
  const sessionElapsed = timerStartedAt
    ? timerBaseSeconds + Math.floor((now - timerStartedAt) / 1000)
    : timerBaseSeconds

  useEffect(() => {
    if (!hasStarted || !timerRunning) return
    const id = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => window.clearInterval(id)
  }, [hasStarted, timerRunning])

  function updateDraft(setId: string, patch: Partial<SetDraft>) {
    setDrafts((current) => ({
      ...current,
      [setId]: {
        ...(current[setId] ?? {
          actual_reps: '',
          actual_weight: '',
          is_completed: false,
        }),
        ...patch,
      },
    }))
  }

  function updateExerciseDraft(exerciseId: string, patch: Partial<ExerciseDraft>) {
    setExerciseDrafts((current) => ({
      ...current,
      [exerciseId]: {
        ...(current[exerciseId] ?? {
          actual_duration_seconds: '',
          is_completed: false,
        }),
        ...patch,
      },
    }))
  }

  function submitSet(
    set: WorkoutSet,
    completed: boolean,
    includeWeight: boolean
  ) {
    if (set.id.startsWith('pending-')) return
    const draft = drafts[set.id]
    const data = new FormData()
    data.set('id', set.id)
    data.set('is_completed', String(completed))
    if (draft?.actual_reps) data.set('actual_reps', draft.actual_reps)
    if (includeWeight && draft?.actual_weight) {
      data.set('actual_weight', draft.actual_weight)
    }

    updateDraft(set.id, { is_completed: completed })

    startTransition(async () => {
      await saveWorkoutSet(data)
      router.refresh()
    })
  }

  function submitExercise(exercise: SessionExercise, completed: boolean) {
    const draft = exerciseDrafts[exercise.id]
    const data = new FormData()
    data.set('id', exercise.id)
    data.set('tracking_type', exercise.tracking_type)
    data.set('is_completed', String(completed))
    if (exercise.tracking_type === 'duration' && draft?.actual_duration_seconds) {
      data.set('actual_duration_seconds', draft.actual_duration_seconds)
    }

    updateExerciseDraft(exercise.id, { is_completed: completed })

    startTransition(async () => {
      await saveSessionExercise(data)
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

  function moveExercise(
    exerciseId: string,
    direction: 'up' | 'down',
    targetPosition?: number
  ) {
    const data = new FormData()
    data.set('id', exerciseId)
    data.set('session_id', session.id)
    data.set('direction', direction)
    if (targetPosition !== undefined) {
      data.set('target_position', String(targetPosition))
    }

    startTransition(async () => {
      await moveSessionExercise(data)
      router.refresh()
    })
  }

  function startTimer() {
    if (timerRunning) return
    const start = Date.now()
    setNow(start)
    setTimerStartedAt(start)
  }

  function pauseTimer() {
    if (!timerStartedAt) return
    setTimerBaseSeconds(sessionElapsed)
    setTimerStartedAt(null)
  }

  function resetTimer() {
    setTimerBaseSeconds(0)
    setTimerStartedAt(null)
  }

  function toggleCompletedExercise(exerciseId: string) {
    setExpandedCompleted((current) => ({
      ...current,
      [exerciseId]: !current[exerciseId],
    }))
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
            {progressUnits.done}/{progressUnits.total} completados
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

      {hasStarted && (
        <div className="sticky top-[72px] z-20 mt-4 rounded-2xl border border-highlight/30 bg-surface-2/95 p-3 shadow-[0_0_30px_rgba(49,93,168,0.14)] backdrop-blur-xl">
          <div className="flex flex-col gap-3">
            <div>
              <p className="flex items-center gap-1 text-xs uppercase text-text-muted">
                <Clock3 size={14} strokeWidth={1.75} /> Tiempo total
              </p>
              <p className="mt-1 font-mono text-3xl font-semibold text-text-primary">
                {formatClock(sessionElapsed)}
              </p>
            </div>
            <div
              className={`grid gap-2 ${
                session.status === 'completed' ? 'grid-cols-3' : 'grid-cols-4'
              }`}
            >
                <button
                  type="button"
                  disabled={timerRunning}
                  onClick={startTimer}
                  className="flex items-center justify-center gap-1 rounded-lg border border-highlight/30 bg-primary px-2 py-2 text-xs font-semibold text-text-primary transition-colors hover:bg-primary-hover disabled:opacity-40"
                >
                  <Play size={15} strokeWidth={1.75} />
                  Iniciar
                </button>
                <button
                  type="button"
                  disabled={!timerRunning}
                  onClick={pauseTimer}
                  className="flex items-center justify-center gap-1 rounded-lg border border-white/10 px-2 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary disabled:opacity-40"
                >
                  <Pause size={15} strokeWidth={1.75} />
                  Pausar
                </button>
                <button
                  type="button"
                  onClick={resetTimer}
                  className="flex items-center justify-center gap-1 rounded-lg border border-white/10 px-2 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary"
                >
                  <RotateCcw size={15} strokeWidth={1.75} />
                  Reiniciar
                </button>
              {session.status !== 'completed' && (
                <button
                  type="button"
                  disabled={isPending}
                onClick={finishSession}
                  className="flex items-center justify-center gap-1 rounded-lg border border-white/10 px-2 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-primary hover:text-text-primary disabled:opacity-60"
              >
                  <CheckCircle2 size={15} strokeWidth={1.75} />
                  Finalizar
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ol className="mt-4 space-y-2">
        {session.exercises.map((exercise, index) => {
          const exerciseSets = setsByExercise[exercise.id] ?? []
          const done = tracksSets(exercise.tracking_type)
            ? exerciseSets.filter((set) => set.is_completed).length
            : exercise.is_completed
              ? 1
              : 0
          const total = tracksSets(exercise.tracking_type) ? exerciseSets.length : 1
          const includeWeight = tracksWeight(exercise.tracking_type)
          const exerciseDraft = exerciseDrafts[exercise.id]
          const isExerciseDone = total > 0 && done === total
          const isCompletedExpanded = expandedCompleted[exercise.id] ?? false
          const showTrackingControls =
            hasStarted && (!isExerciseDone || isCompletedExpanded)

          return (
            <li
              key={exercise.id}
              id={`session-exercise-${exercise.id}`}
              className="overflow-hidden rounded-xl border border-white/5 bg-surface/70"
              style={{ scrollMarginTop: '120px', scrollMarginBottom: '96px' }}
            >
              <div className="grid grid-cols-[1fr_auto] items-stretch">
                <Link
                  href={
                    detailId === exercise.id
                      ? dayHref(selectedDate)
                      : dayHref(selectedDate, exercise.id)
                  }
                  scroll={detailId !== exercise.id}
                  className="flex min-w-0 items-start justify-between gap-3 p-3 transition-colors hover:bg-white/[0.02]"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-text-muted">
                      {index + 1} · {exercise.muscle_group ?? '-'} ·{' '}
                      {trackingTypeLabel(exercise.tracking_type)}
                    </p>
                    <p className="line-clamp-1 font-medium capitalize">
                      {exercise.exercise_name}
                    </p>
                    <p className="mt-1 font-mono text-xs text-text-muted">
                      {exerciseSummary(exercise, done, total)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-text-secondary">
                    {detailId === exercise.id ? (
                      <X size={15} strokeWidth={1.75} />
                    ) : (
                      <ChevronDown size={15} strokeWidth={1.75} />
                    )}
                    {detailId === exercise.id ? 'Cerrar' : 'Detalle'}
                  </div>
                </Link>
                <div className="flex border-l border-white/5">
                  <button
                    type="button"
                    disabled={index === 0 || isPending}
                    onClick={() => moveExercise(exercise.id, 'up')}
                    aria-label="Subir ejercicio"
                    className="flex w-10 items-center justify-center text-text-muted transition-colors hover:bg-surface-2 hover:text-text-primary disabled:opacity-30"
                  >
                    <ArrowUp size={16} strokeWidth={1.75} />
                  </button>
                  <button
                    type="button"
                    disabled={index === session.exercises.length - 1 || isPending}
                    onClick={() => moveExercise(exercise.id, 'down')}
                    aria-label="Bajar ejercicio"
                    className="flex w-10 items-center justify-center text-text-muted transition-colors hover:bg-surface-2 hover:text-text-primary disabled:opacity-30"
                  >
                    <ArrowDown size={16} strokeWidth={1.75} />
                  </button>
                </div>
              </div>

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

              <div className="border-t border-white/5 p-3">
                <label className="flex items-center gap-2 text-xs text-text-muted">
                  <span>Mover a</span>
                  <select
                    value={index}
                    disabled={isPending}
                    onChange={(event) =>
                      moveExercise(exercise.id, 'down', Number(event.target.value))
                    }
                    className="rounded-lg border border-white/10 bg-surface-2 px-2 py-1.5 font-mono text-text-primary outline-none focus:border-highlight"
                    aria-label="Mover ejercicio a posición"
                  >
                    {session.exercises.map((_, position) => (
                      <option key={position} value={position} className="bg-surface-2">
                        {position + 1}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {hasStarted && isExerciseDone && !isCompletedExpanded && (
                <button
                  type="button"
                  onClick={() => toggleCompletedExercise(exercise.id)}
                  className="flex w-full items-center justify-between gap-3 border-t border-success/15 bg-success/5 px-3 py-3 text-left transition-colors hover:bg-success/10"
                >
                  <span>
                    <span className="block text-sm font-semibold text-success">
                      Completado
                    </span>
                    <span className="block text-xs text-text-muted">
                      Toca para ver o editar el registro
                    </span>
                  </span>
                  <ChevronDown size={17} strokeWidth={1.75} />
                </button>
              )}

              {hasStarted && isExerciseDone && isCompletedExpanded && (
                <button
                  type="button"
                  onClick={() => toggleCompletedExercise(exercise.id)}
                  className="flex w-full items-center justify-between gap-3 border-t border-success/15 bg-success/5 px-3 py-3 text-left transition-colors hover:bg-success/10"
                >
                  <span className="text-sm font-semibold text-success">
                    Ocultar registro completado
                  </span>
                  <ChevronDown
                    size={17}
                    strokeWidth={1.75}
                    className="rotate-180"
                  />
                </button>
              )}

              {showTrackingControls && tracksSets(exercise.tracking_type) && (
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
                              submitSet(
                                set,
                                !(draft?.is_completed ?? set.is_completed),
                                includeWeight
                              )
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

                          <div
                            className={`grid min-w-0 flex-1 gap-2 ${
                              includeWeight ? 'grid-cols-3' : 'grid-cols-2'
                            }`}
                          >
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
                            {includeWeight && (
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
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {showTrackingControls && !tracksSets(exercise.tracking_type) && (
                <div className="border-t border-white/5 p-3">
                  <div
                    className={`rounded-xl border p-3 ${
                      exerciseDraft?.is_completed || exercise.is_completed
                        ? 'border-success/25 bg-success/5'
                        : 'border-white/5 bg-background/35'
                    }`}
                  >
                    <div className="flex items-end gap-3">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          submitExercise(
                            exercise,
                            !(exerciseDraft?.is_completed ?? exercise.is_completed)
                          )
                        }
                        className={`flex size-10 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                          exerciseDraft?.is_completed || exercise.is_completed
                            ? 'border-success/40 bg-success/10 text-success'
                            : 'border-white/10 text-text-muted hover:text-text-primary'
                        }`}
                        aria-label="Marcar ejercicio"
                      >
                        <Check size={18} strokeWidth={2} />
                      </button>

                      {exercise.tracking_type === 'duration' ? (
                        <label className="flex-1 space-y-1">
                          <span className="text-[11px] text-text-muted">
                            Tiempo real en segundos
                          </span>
                          <input
                            inputMode="numeric"
                            value={exerciseDraft?.actual_duration_seconds ?? ''}
                            onChange={(event) =>
                              updateExerciseDraft(exercise.id, {
                                actual_duration_seconds: event.target.value,
                              })
                            }
                            className="w-full rounded-lg border border-white/10 bg-surface-2 px-2 py-2 font-mono text-sm outline-none focus:border-highlight"
                            placeholder={
                              exercise.target_duration_seconds?.toString() ?? ''
                            }
                          />
                        </label>
                      ) : (
                        <div className="flex-1 pb-2">
                          <p className="text-sm font-medium text-text-primary">
                            Marcar una vez
                          </p>
                          <p className="text-xs text-text-muted">
                            Sin series, peso ni descanso real.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {!hasStarted && (
                <div className="border-t border-white/5 px-3 py-2 text-xs text-text-muted">
                  Inicia la rutina para registrar el avance.
                </div>
              )}

            </li>
          )
        })}
      </ol>
    </section>
  )
}
