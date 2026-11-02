import 'server-only'

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { tracksSets, type TrackingType } from '@/lib/workouts/tracking'

const LEGACY_SESSION_SELECT =
  'id,template_id,title,scheduled_date,status,is_public,public_share_id,' +
  'session_exercises(id,exercise_id,position,exercise_name,muscle_group,target_sets,target_reps_min,target_reps_max,target_weight,rest_seconds,workout_sets(id,set_number,target_reps,target_weight,actual_reps,actual_weight,rest_seconds,is_completed,completed_at),exercise:exercises(id,name,body_part,muscle_group,equipment,target,image_url,gif_url,instructions))'

export type SessionExercise = {
  id: string
  exercise_id: string | null
  position: number
  exercise_name: string
  muscle_group: string | null
  target_sets: number | null
  target_reps_min: number | null
  target_reps_max: number | null
  target_weight: number | null
  rest_seconds: number | null
  tracking_type: TrackingType
  target_duration_seconds: number | null
  actual_duration_seconds: number | null
  is_completed: boolean
  completed_at: string | null
  workout_sets: WorkoutSet[]
  exercise: {
    id: string
    name: string
    body_part: string | null
    muscle_group: string | null
    equipment: string | null
    target: string | null
    image_url: string | null
    gif_url: string | null
    instructions: string | null
    public_media_url?: string | null
  } | null
}

export type WorkoutSet = {
  id: string
  set_number: number
  target_reps: number | null
  target_weight: number | null
  actual_reps: number | null
  actual_weight: number | null
  rest_seconds: number | null
  is_completed: boolean
  completed_at: string | null
}

export type WorkoutSession = {
  id: string
  template_id: string | null
  title: string
  scheduled_date: string
  status: string
  started_at: string | null
  completed_at: string | null
  is_public: boolean
  public_share_id: string | null
  exercises: SessionExercise[]
}

// Una sesión empezada que lleva más de esto sin terminarse se cierra sola.
const STALE_SESSION_MS = 24 * 60 * 60 * 1000

type StaleSessionRow = {
  id: string
  session_exercises:
    | Array<{
        is_completed: boolean | null
        completed_at: string | null
        workout_sets: Array<{ is_completed: boolean; completed_at: string | null }> | null
      }>
    | null
}

/**
 * Cierra las sesiones `in_progress` iniciadas hace más de 24 h con lo que se
 * registró: si hay algo completado queda `completed` (terminada a la hora de
 * lo último marcado); si no hay nada, `cancelled`. Una vez por petición.
 */
export const closeStaleSessions = cache(async () => {
  const { userId } = await verifySession()
  const cutoff = new Date(Date.now() - STALE_SESSION_MS).toISOString()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(
      'id,session_exercises(is_completed,completed_at,workout_sets(is_completed,completed_at))'
    )
    .eq('user_id', userId)
    .eq('status', 'in_progress')
    .lt('started_at', cutoff)

  if (error) throw new Error(error.message)

  for (const session of (data ?? []) as unknown as StaleSessionRow[]) {
    const doneAt = (session.session_exercises ?? []).flatMap((exercise) => [
      ...(exercise.is_completed && exercise.completed_at ? [exercise.completed_at] : []),
      ...(exercise.workout_sets ?? []).flatMap((set) =>
        set.is_completed && set.completed_at ? [set.completed_at] : []
      ),
    ])
    const lastDone = doneAt.sort().at(-1)

    const { error: updateError } = await supabase
      .from('workout_sessions')
      .update(
        lastDone
          ? { status: 'completed', completed_at: lastDone }
          : { status: 'cancelled' }
      )
      .eq('id', session.id)
      .eq('user_id', userId)
      // Por si se terminó a mano entre la lectura y la escritura.
      .eq('status', 'in_progress')

    if (updateError) throw new Error(updateError.message)
  }
})

export async function getSessionsForDate(
  scheduledDate: string
): Promise<WorkoutSession[]> {
  await closeStaleSessions()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(LEGACY_SESSION_SELECT)
    .eq('scheduled_date', scheduledDate)
    .order('created_at', { ascending: true })
    .order('position', { referencedTable: 'session_exercises', ascending: true })

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as unknown as Array<{
    id: string
    template_id: string | null
    title: string
    scheduled_date: string
    status: string
    started_at: string | null
    completed_at: string | null
    is_public: boolean
    public_share_id: string | null
    session_exercises: SessionExercise[] | null
  }>

  return rows.map((session) => ({
    id: session.id,
    template_id: session.template_id,
    title: session.title,
    scheduled_date: session.scheduled_date,
    status: session.status,
    started_at: session.started_at,
    completed_at: session.completed_at,
    is_public: session.is_public,
    public_share_id: session.public_share_id,
    exercises:
      session.session_exercises
        ?.sort((a, b) => a.position - b.position)
        .map((exercise) => ({
          ...exercise,
          tracking_type: exercise.tracking_type ?? 'sets_reps_weight',
          target_duration_seconds: exercise.target_duration_seconds ?? null,
          actual_duration_seconds: exercise.actual_duration_seconds ?? null,
          is_completed: exercise.is_completed ?? false,
          completed_at: exercise.completed_at ?? null,
          workout_sets:
            exercise.workout_sets?.sort((a, b) => a.set_number - b.set_number) ??
            [],
        })) ?? [],
  }))
}

export type SessionHistoryItem = {
  id: string
  title: string
  scheduled_date: string
  status: string
  completed_at: string | null
  exercise_count: number
  /** Unidades hechas / totales: series en los ejercicios que las usan, y el
   *  propio ejercicio en los de tiempo o de una sola vez. */
  units_done: number
  units_total: number
  duration_seconds: number | null
  /** Ejercicios con sus series efectivas completadas, para las estadísticas
   *  por zona y por ejercicio. */
  exercises: HistoryExercise[]
}

export type HistoryExercise = {
  /** `exercise_id` si sigue en el catálogo; si no, el nombre del snapshot. */
  key: string
  name: string
  body_part: string | null
  /** Músculo principal según el catálogo. */
  target: string | null
  tracking_type: TrackingType
  /** Marcado como hecho; es lo que cuenta en los ejercicios de tiempo o de una vez. */
  is_completed: boolean
  /** Series completadas que no son de calentamiento. */
  sets: Array<{ weight: number | null; reps: number | null }>
}

const HISTORY_SELECT =
  'id,title,scheduled_date,status,started_at,completed_at,' +
  'session_exercises(id,exercise_id,exercise_name,tracking_type,is_completed,' +
  'workout_sets(is_completed,is_warmup,actual_reps,actual_weight),' +
  'exercise:exercises(body_part,target))'

type HistoryRow = {
  id: string
  title: string
  scheduled_date: string
  status: string
  started_at: string | null
  completed_at: string | null
  session_exercises:
    | Array<{
        id: string
        exercise_id: string | null
        exercise_name: string
        tracking_type: TrackingType | null
        is_completed: boolean | null
        workout_sets:
          | Array<{
              is_completed: boolean
              is_warmup: boolean | null
              actual_reps: number | null
              actual_weight: number | null
            }>
          | null
        exercise: { body_part: string | null; target: string | null } | null
      }>
    | null
}

/**
 * Entrenamientos ya empezados o terminados, del más reciente al más antiguo.
 * Las rutinas solo planificadas no son historial: aún no se han hecho.
 */
export async function listSessionHistory(opts?: {
  /** Primer día incluido (`YYYY-MM-DD`). */
  from?: string
  /** Primer día ya excluido, para acotar la semana o el mes. */
  toExclusive?: string
  limit?: number
  /** Solo terminadas: Liga Fit calcula puntos y racha con todo ese historial. */
  completedOnly?: boolean
}): Promise<SessionHistoryItem[]> {
  const { userId } = await verifySession()
  await closeStaleSessions()

  const supabase = await createClient()
  let query = supabase
    .from('workout_sessions')
    .select(HISTORY_SELECT)
    .eq('user_id', userId)
    .in('status', opts?.completedOnly ? ['completed'] : ['in_progress', 'completed'])
    .order('scheduled_date', { ascending: false })
    .limit(opts?.limit ?? 60)

  if (opts?.from) query = query.gte('scheduled_date', opts.from)
  if (opts?.toExclusive) query = query.lt('scheduled_date', opts.toExclusive)

  const { data, error } = await query

  if (error) throw new Error(error.message)

  return ((data ?? []) as unknown as HistoryRow[]).map((session) => {
    const exercises = session.session_exercises ?? []
    let unitsDone = 0
    let unitsTotal = 0

    for (const exercise of exercises) {
      const type = exercise.tracking_type ?? 'sets_reps_weight'
      const sets = exercise.workout_sets ?? []

      if (tracksSets(type) && sets.length > 0) {
        unitsTotal += sets.length
        unitsDone += sets.filter((set) => set.is_completed).length
      } else {
        unitsTotal += 1
        unitsDone += exercise.is_completed ? 1 : 0
      }
    }

    const duration =
      session.started_at && session.completed_at
        ? Math.max(
            0,
            Math.floor(
              (new Date(session.completed_at).getTime() -
                new Date(session.started_at).getTime()) /
                1000
            )
          )
        : null

    return {
      id: session.id,
      title: session.title,
      scheduled_date: session.scheduled_date,
      status: session.status,
      completed_at: session.completed_at,
      exercise_count: exercises.length,
      units_done: unitsDone,
      units_total: unitsTotal,
      duration_seconds: duration,
      exercises: exercises.map((exercise) => ({
        key: exercise.exercise_id ?? `name:${exercise.exercise_name}`,
        name: exercise.exercise_name,
        body_part: exercise.exercise?.body_part ?? null,
        target: exercise.exercise?.target ?? null,
        tracking_type: exercise.tracking_type ?? 'sets_reps_weight',
        is_completed: exercise.is_completed ?? false,
        sets: (exercise.workout_sets ?? [])
          .filter((set) => set.is_completed && !set.is_warmup)
          .map((set) => ({
            // numeric(6,2) puede llegar como string desde PostgREST.
            weight: set.actual_weight === null ? null : Number(set.actual_weight),
            reps: set.actual_reps,
          })),
      })),
    }
  })
}

export async function getSessionCountsForDates(
  scheduledDates: string[]
): Promise<Map<string, number>> {
  if (scheduledDates.length === 0) return new Map()

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('scheduled_date')
    .in('scheduled_date', scheduledDates)

  if (error) throw new Error(error.message)

  const counts = new Map(scheduledDates.map((date) => [date, 0]))
  for (const row of data ?? []) {
    const date = String(row.scheduled_date)
    counts.set(date, (counts.get(date) ?? 0) + 1)
  }

  return counts
}
