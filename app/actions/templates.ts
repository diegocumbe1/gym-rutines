'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'

export type TemplateFormState = { error?: string } | undefined

function num(formData: FormData, key: string): number | null {
  const v = formData.get(key)
  if (v === null || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
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
      'id,name,description,template_exercises(position,target_sets,target_reps_min,target_reps_max,target_weight,rest_seconds,notes,exercise_id)'
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
  const { count } = await supabase
    .from('template_exercises')
    .select('*', { count: 'exact', head: true })
    .eq('template_id', templateId)

  await supabase.from('template_exercises').insert({
    user_id: userId,
    template_id: templateId,
    exercise_id: exerciseId,
    position: count ?? 0,
    target_sets: 4,
    target_reps_min: 8,
    target_reps_max: 12,
    rest_seconds: 90,
  })

  revalidatePath(`/templates/${templateId}/add`)
  revalidatePath(`/templates/${templateId}`)
}

export async function updateTemplateExercise(formData: FormData) {
  const { userId } = await verifySession()
  const id = String(formData.get('id'))
  const templateId = String(formData.get('template_id'))

  const supabase = await createClient()
  await supabase
    .from('template_exercises')
    .update({
      target_sets: num(formData, 'target_sets'),
      target_reps_min: num(formData, 'target_reps_min'),
      target_reps_max: num(formData, 'target_reps_max'),
      target_weight: num(formData, 'target_weight'),
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
    await supabase
      .from('template_exercises')
      .update({
        target_sets: num(formData, `target_sets_${id}`),
        target_reps_min: num(formData, `target_reps_min_${id}`),
        target_reps_max: num(formData, `target_reps_max_${id}`),
        target_weight: num(formData, `target_weight_${id}`),
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
  const targetIndex = direction === 'up' ? index - 1 : index + 1
  const current = rows[index]
  const target = rows[targetIndex]

  if (!current || !target) {
    revalidatePath(`/templates/${templateId}`)
    return
  }

  const { error: currentError } = await supabase
    .from('template_exercises')
    .update({ position: target.position })
    .eq('id', current.id)
    .eq('user_id', userId)

  if (currentError) throw new Error(currentError.message)

  const { error: targetError } = await supabase
    .from('template_exercises')
    .update({ position: current.position })
    .eq('id', target.id)
    .eq('user_id', userId)

  if (targetError) throw new Error(targetError.message)

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
