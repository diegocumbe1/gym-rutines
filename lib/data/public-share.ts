import 'server-only'

import { createServiceClient } from '@/lib/supabase/service'
import type { TemplateExercise } from '@/lib/data/templates'
import type { SessionExercise } from '@/lib/data/sessions'

export type PublicTemplate = {
  id: string
  name: string
  description: string | null
  exercises: TemplateExercise[]
}

export type PublicSession = {
  id: string
  title: string
  scheduled_date: string
  status: string
  exercises: SessionExercise[]
}

export async function getPublicTemplate(
  shareId: string
): Promise<PublicTemplate | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('workout_templates')
    .select(
      'id,name,description,' +
        'template_exercises(id,position,target_sets,target_reps_min,target_reps_max,target_weight,rest_seconds,notes,exercise:exercises(id,name,body_part,muscle_group))'
    )
    .eq('is_public', true)
    .eq('public_share_id', shareId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const row = data as unknown as {
    id: string
    name: string
    description: string | null
    template_exercises: TemplateExercise[] | null
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    exercises: (row.template_exercises ?? []).sort(
      (a, b) => a.position - b.position
    ),
  }
}

export async function getPublicSession(
  shareId: string
): Promise<PublicSession | null> {
  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(
      'id,title,scheduled_date,status,' +
        'session_exercises(id,exercise_id,position,exercise_name,muscle_group,target_sets,target_reps_min,target_reps_max,target_weight,rest_seconds,exercise:exercises(id,name,body_part,muscle_group,equipment,target,image_url,gif_url,instructions))'
    )
    .eq('is_public', true)
    .eq('public_share_id', shareId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const row = data as unknown as {
    id: string
    title: string
    scheduled_date: string
    status: string
    session_exercises: SessionExercise[] | null
  }

  return {
    id: row.id,
    title: row.title,
    scheduled_date: row.scheduled_date,
    status: row.status,
    exercises: (row.session_exercises ?? []).sort(
      (a, b) => a.position - b.position
    ),
  }
}
