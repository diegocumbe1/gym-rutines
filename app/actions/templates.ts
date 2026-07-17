'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import {
  defaultRestSeconds,
  defaultTrackingForEquipment,
  isTrackingType,
  tracksSets,
  tracksWeight,
  type TrackingType,
} from '@/lib/workouts/tracking'

export type TemplateFormState = { error?: string } | undefined

function num(formData: FormData, key: string): number | null {
  const v = formData.get(key)
  if (v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function trackingType(formData: FormData, key: string): TrackingType {
  const value = String(formData.get(key) ?? '')
  return isTrackingType(value) ? value : 'sets_reps_weight'
}

export async function createTemplate(
  _prev: TemplateFormState,
  formData: FormData
): Promise<TemplateFormState> {
  const { userId } = await verifySession()
  const name = String(formData.get('name') ?? '').trim()
  if (name.length < 2) return { error: 'El nombre es muy corto.' }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('workout_templates')
    .insert({ user_id: userId, name })
    .select('id')
    .single()

  if (error || !data) return { error: 'No se pudo crear la plantilla.' }

  redirect(`/templates/${data.id}`)
}

export async function deleteTemplate(formData: FormData) {
  const { userId } = await verifySession()
  const id = String(formData.get('id'))

  const supabase = await createClient()
  await supabase
    .from('workout_templates')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  revalidatePath('/templates')
  redirect('/templates')
}

export async function duplicateTemplate(formData: FormData) {
  const { userId } = await verifySession()
  const id = String(formData.get('id'))

  const supabase = await createClient()
  const { data: template, error } = await supabase
    .from('workout_templates')
    .select(
      'id,name,description,template_exercises(position,target_sets,target_reps_min,target_reps_max,target_weight,rest_seconds,tracking_type,target_duration_seconds,notes,exercise_id)'
    )
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!template) redirect('/templates')

  const { data: copy, error: copyError } = await supabase
    .from('workout_templates')
    .insert({
      user_id: userId,
      name: `${template.name} copia`,
      description: template.description,
    })
    .select('id')
    .single()

  if (copyError || !copy) {
    throw new Error(copyError?.message ?? 'No se pudo duplicar la plantilla.')
  }

  const exercises = template.template_exercises as
    | Array<{
        position: number
        target_sets: number | null
        target_reps_min: number | null
        target_reps_max: number | null
        target_weight: number | null
        rest_seconds: number | null
        tracking_type: TrackingType
        target_duration_seconds: number | null
        notes: string | null
        exercise_id: string
      }>
    | null

  if (exercises && exercises.length > 0) {
    const rows = exercises.map((exercise) => ({
      ...exercise,
      user_id: userId,
      template_id: copy.id,
    }))
    const { error: exercisesError } = await supabase
      .from('template_exercises')
      .insert(rows)
    if (exercisesError) throw new Error(exercisesError.message)
  }

  revalidatePath('/templates')
  redirect(`/templates/${copy.id}`)
}

export async function enableTemplatePublicShare(formData: FormData) {
  const { userId } = await verifySession()
  const id = String(formData.get('id'))

  const supabase = await createClient()
  const { data: template, error } = await supabase
    .from('workout_templates')
    .select('public_share_id')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!template) redirect('/templates')

  const publicShareId = template.public_share_id ?? crypto.randomUUID()
  const { error: updateError } = await supabase
    .from('workout_templates')
    .update({ is_public: true, public_share_id: publicShareId })
    .eq('id', id)
    .eq('user_id', userId)

  if (updateError) throw new Error(updateError.message)

  revalidatePath(`/templates/${id}`)
}

export async function addExerciseToTemplate(formData: FormData) {
  const { userId } = await verifySession()
  const templateId = String(formData.get('template_id'))
  const exerciseId = String(formData.get('exercise_id'))

  const supabase = await createClient()
  const { data: exercise } = await supabase
    .from('exercises')
    .select('equipment')
    .eq('id', exerciseId)
    .maybeSingle()

  const defaultTracking = defaultTrackingForEquipment(
    (exercise?.equipment as string | null) ?? null
  )
  const { count } = await supabase
    .from('template_exercises')
    .select('*', { count: 'exact', head: true })
    .eq('template_id', templateId)

  await supabase.from('template_exercises').insert({
    user_id: userId,
    template_id: templateId,
    exercise_id: exerciseId,
    position: count ?? 0,
    tracking_type: defaultTracking,
    target_sets: tracksSets(defaultTracking) ? 4 : null,
    target_reps_min: tracksSets(defaultTracking) ? 8 : null,
    target_reps_max: tracksSets(defaultTracking) ? 12 : null,
    target_weight: null,
    target_duration_seconds: defaultTracking === 'duration' ? 600 : null,
    rest_seconds: defaultRestSeconds(defaultTracking),
  })

  revalidatePath(`/templates/${templateId}/add`)
  revalidatePath(`/templates/${templateId}`)
}

export async function updateTemplateExercise(formData: FormData) {
  const { userId } = await verifySession()
  const id = String(formData.get('id'))
  const templateId = String(formData.get('template_id'))

  const supabase = await createClient()
  const type = trackingType(formData, 'tracking_type')
  await supabase
    .from('template_exercises')
    .update({
      tracking_type: type,
      target_sets: tracksSets(type) ? num(formData, 'target_sets') : null,
      target_reps_min: tracksSets(type) ? num(formData, 'target_reps_min') : null,
      target_reps_max: tracksSets(type) ? num(formData, 'target_reps_max') : null,
      target_weight: tracksWeight(type) ? num(formData, 'target_weight') : null,
      target_duration_seconds:
        type === 'duration' ? num(formData, 'target_duration_seconds') : null,
      rest_seconds: num(formData, 'rest_seconds'),
    })
    .eq('id', id)
    .eq('user_id', userId)

  revalidatePath(`/templates/${templateId}`)
}

export async function updateTemplateExercises(formData: FormData) {
  const { userId } = await verifySession()
  const templateId = String(formData.get('template_id'))
  const ids = formData.getAll('template_exercise_id').map(String)

  const supabase = await createClient()
  for (const id of ids) {
    const type = trackingType(formData, `tracking_type_${id}`)
    await supabase
      .from('template_exercises')
      .update({
        tracking_type: type,
        target_sets: tracksSets(type) ? num(formData, `target_sets_${id}`) : null,
        target_reps_min: tracksSets(type)
          ? num(formData, `target_reps_min_${id}`)
          : null,
        target_reps_max: tracksSets(type)
          ? num(formData, `target_reps_max_${id}`)
          : null,
        target_weight: tracksWeight(type)
          ? num(formData, `target_weight_${id}`)
          : null,
        target_duration_seconds:
          type === 'duration'
            ? num(formData, `target_duration_seconds_${id}`)
            : null,
        rest_seconds: num(formData, `rest_seconds_${id}`),
        notes: String(formData.get(`notes_${id}`) ?? '').trim() || null,
      })
      .eq('id', id)
      .eq('user_id', userId)
  }

  revalidatePath(`/templates/${templateId}`)
}

export async function moveTemplateExercise(formData: FormData) {
  const { userId } = await verifySession()
  const id = String(formData.get('id'))
  const templateId = String(formData.get('template_id'))
  const direction = String(formData.get('direction'))
  const targetPosition = num(formData, 'target_position')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('template_exercises')
    .select('id,position')
    .eq('template_id', templateId)
    .eq('user_id', userId)
    .order('position', { ascending: true })

  if (error) throw new Error(error.message)

  const rows = data ?? []
  const index = rows.findIndex((row) => row.id === id)
  const targetIndex =
    targetPosition === null ? (direction === 'up' ? index - 1 : index + 1) : targetPosition
  const current = rows[index]
  const target = rows[targetIndex]

  if (!current || !target) {
    revalidatePath(`/templates/${templateId}`)
    return
  }

  const reordered = [...rows]
  reordered.splice(index, 1)
  reordered.splice(targetIndex, 0, current)

  for (const [position, row] of reordered.entries()) {
    const { error: positionError } = await supabase
      .from('template_exercises')
      .update({ position })
      .eq('id', row.id)
      .eq('user_id', userId)

    if (positionError) throw new Error(positionError.message)
  }

  revalidatePath(`/templates/${templateId}`)
}

export async function removeTemplateExercise(formData: FormData) {
  const { userId } = await verifySession()
  const id = String(formData.get('id'))
  const templateId = String(formData.get('template_id'))

  const supabase = await createClient()
  await supabase
    .from('template_exercises')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  revalidatePath(`/templates/${templateId}`)
}
