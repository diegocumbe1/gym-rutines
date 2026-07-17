import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { TrackingType } from '@/lib/workouts/tracking'

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
