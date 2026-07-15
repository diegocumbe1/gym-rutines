import 'server-only'

import { createClient } from '@/lib/supabase/server'

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
  } | null
}

export type WorkoutSession = {
  id: string
  template_id: string | null
  title: string
  scheduled_date: string
  status: string
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
    .select(
      'id,template_id,title,scheduled_date,status,is_public,public_share_id,' +
        'session_exercises(id,exercise_id,position,exercise_name,muscle_group,target_sets,target_reps_min,target_reps_max,target_weight,rest_seconds,exercise:exercises(id,name,body_part,muscle_group,equipment,target,image_url,gif_url,instructions))'
    )
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
    is_public: session.is_public,
    public_share_id: session.public_share_id,
    exercises:
      session.session_exercises?.sort((a, b) => a.position - b.position) ?? [],
  }))
}
