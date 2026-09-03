import 'server-only'

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

export async function getSessionsForDate(
  scheduledDate: string
): Promise<WorkoutSession[]> {
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
  exercise_count: number
  /** Unidades hechas / totales: series en los ejercicios que las usan, y el
   *  propio ejercicio en los de tiempo o de una sola vez. */
  units_done: number
  units_total: number
  /** Volumen movido (kg x reps) de las series completadas con peso. */
  volume_kg: number
  duration_seconds: number | null
}

const HISTORY_SELECT =
  'id,title,scheduled_date,status,started_at,completed_at,' +
  'session_exercises(id,tracking_type,is_completed,workout_sets(is_completed,actual_reps,actual_weight))'

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
        tracking_type: TrackingType | null
        is_completed: boolean | null
        workout_sets:
          | Array<{
              is_completed: boolean
              actual_reps: number | null
              actual_weight: number | null
            }>
          | null
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
}): Promise<SessionHistoryItem[]> {
  const { userId } = await verifySession()

  const supabase = await createClient()
  let query = supabase
    .from('workout_sessions')
    .select(HISTORY_SELECT)
    .eq('user_id', userId)
    .in('status', ['in_progress', 'completed'])
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
    let volume = 0

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

      for (const set of sets) {
        if (set.is_completed && set.actual_weight && set.actual_reps) {
          volume += set.actual_weight * set.actual_reps
        }
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
      exercise_count: exercises.length,
      units_done: unitsDone,
      units_total: unitsTotal,
      volume_kg: Math.round(volume),
      duration_seconds: duration,
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
