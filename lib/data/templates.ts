import 'server-only'

import { createClient } from '@/lib/supabase/server'

export type TemplateListItem = {
  id: string
  name: string
  description: string | null
  exerciseCount: number
}

export type TemplateExercise = {
  id: string
  position: number
  target_sets: number | null
  target_reps_min: number | null
  target_reps_max: number | null
  target_weight: number | null
  rest_seconds: number | null
  notes: string | null
  exercise: {
    id: string
    name: string
    body_part: string | null
    muscle_group: string | null
    equipment?: string | null
    target?: string | null
    image_url?: string | null
    gif_url?: string | null
    instructions?: string | null
    public_media_url?: string | null
  } | null
}

export type TemplateDetail = {
  id: string
  name: string
  description: string | null
  is_public: boolean
  public_share_id: string | null
  exercises: TemplateExercise[]
}

export async function listTemplates(): Promise<TemplateListItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workout_templates')
    .select('id,name,description,template_exercises(count)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((t) => {
    const rel = t.template_exercises as unknown as { count: number }[] | null
    return {
      id: t.id as string,
      name: t.name as string,
      description: (t.description as string | null) ?? null,
      exerciseCount: rel?.[0]?.count ?? 0,
    }
  })
}

export async function getTemplate(id: string): Promise<TemplateDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workout_templates')
    .select(
      'id,name,description,is_public,public_share_id,' +
        'template_exercises(id,position,target_sets,target_reps_min,target_reps_max,target_weight,rest_seconds,notes,exercise:exercises(id,name,body_part,muscle_group,equipment,target,image_url,gif_url,instructions))'
    )
    .eq('id', id)
    .order('position', { referencedTable: 'template_exercises', ascending: true })
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  const row = data as unknown as {
    id: string
    name: string
    description: string | null
    is_public: boolean
    public_share_id: string | null
    template_exercises: TemplateExercise[] | null
  }

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    is_public: row.is_public,
    public_share_id: row.public_share_id,
    exercises: row.template_exercises ?? [],
  }
}
