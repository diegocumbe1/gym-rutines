'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { addDays, todayDateString } from '@/lib/dates'

function num(formData: FormData, key: string): number | null {
  const value = formData.get(key)
  if (value === null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

async function scheduleTemplateSessionForDate(
  formData: FormData,
  offsetDays: number
) {
  const { userId } = await verifySession()
  const templateId = String(formData.get('template_id'))
  const scheduledDate = addDays(todayDateString(), offsetDays)
  const selectedIds = new Set(
    formData.getAll('selected_template_exercise_id').map(String)
  )

  const supabase = await createClient()
  const { data: template, error } = await supabase
    .from('workout_templates')
    .select(
      'id,name,template_exercises(id,position,target_sets,target_reps_min,target_reps_max,target_weight,rest_seconds,notes,exercise:exercises(id,name,muscle_group))'
    )
    .eq('id', templateId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!template) redirect('/templates')

  const exercises = (
    template.template_exercises as unknown as
      | Array<{
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
            muscle_group: string | null
          } | null
        }>
      | null
  )
    ?.filter((item) => selectedIds.has(item.id))
    .sort((a, b) => a.position - b.position)

  if (!exercises || exercises.length === 0) {
    redirect(`/templates/${templateId}`)
  }

  const { data: session, error: sessionError } = await supabase
    .from('workout_sessions')
    .insert({
      user_id: userId,
      template_id: templateId,
      title: template.name,
      scheduled_date: scheduledDate,
      status: 'planned',
    })
    .select('id')
    .single()

  if (sessionError || !session) {
    throw new Error(sessionError?.message ?? 'No se pudo programar la rutina.')
  }

  const rows = exercises.map((item, index) => ({
    user_id: userId,
    session_id: session.id,
    exercise_id: item.exercise?.id ?? null,
    position: index,
    exercise_name: item.notes?.trim() || item.exercise?.name || 'Ejercicio',
    muscle_group: item.exercise?.muscle_group ?? null,
    target_sets: num(formData, `target_sets_${item.id}`),
    target_reps_min: num(formData, `target_reps_min_${item.id}`),
    target_reps_max: num(formData, `target_reps_max_${item.id}`),
    target_weight: num(formData, `target_weight_${item.id}`),
    rest_seconds: num(formData, `rest_seconds_${item.id}`),
    notes: item.notes,
  }))

  const { error: exercisesError } = await supabase
    .from('session_exercises')
    .insert(rows)

  if (exercisesError) throw new Error(exercisesError.message)

  revalidatePath('/')
  redirect(offsetDays === 0 ? '/' : `/?date=${scheduledDate}`)
}

export async function scheduleTemplateSessionToday(formData: FormData) {
  await scheduleTemplateSessionForDate(formData, 0)
}

export async function scheduleTemplateSessionTomorrow(formData: FormData) {
  await scheduleTemplateSessionForDate(formData, 1)
}

export async function enableSessionPublicShare(formData: FormData) {
  const { userId } = await verifySession()
  const id = String(formData.get('id'))
  const date = String(formData.get('date') ?? '')

  const supabase = await createClient()
  const { data: session, error } = await supabase
    .from('workout_sessions')
    .select('public_share_id')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!session) redirect('/')

  const publicShareId = session.public_share_id ?? crypto.randomUUID()
  const { error: updateError } = await supabase
    .from('workout_sessions')
    .update({ is_public: true, public_share_id: publicShareId })
    .eq('id', id)
    .eq('user_id', userId)

  if (updateError) throw new Error(updateError.message)

  revalidatePath('/')
  redirect(date ? `/?date=${date}` : '/')
}

export async function deleteWorkoutSession(formData: FormData) {
  const { userId } = await verifySession()
  const id = String(formData.get('id'))
  const date = String(formData.get('date') ?? '')

  const supabase = await createClient()
  const { error } = await supabase
    .from('workout_sessions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)

  revalidatePath('/')
  redirect(date ? `/?date=${date}` : '/')
}

export async function refreshSessionFromTemplate(formData: FormData) {
  const { userId } = await verifySession()
  const id = String(formData.get('id'))
  const date = String(formData.get('date') ?? '')

  const supabase = await createClient()
  const { data: session, error: sessionError } = await supabase
    .from('workout_sessions')
    .select('id,template_id')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (sessionError) throw new Error(sessionError.message)
  if (!session?.template_id) redirect(date ? `/?date=${date}` : '/')

  const { data: template, error: templateError } = await supabase
    .from('workout_templates')
    .select(
      'id,template_exercises(position,target_sets,target_reps_min,target_reps_max,target_weight,rest_seconds,notes,exercise:exercises(id,name,muscle_group))'
    )
    .eq('id', session.template_id)
    .eq('user_id', userId)
    .maybeSingle()

  if (templateError) throw new Error(templateError.message)
  if (!template) redirect(date ? `/?date=${date}` : '/')

  const exercises = (
    template.template_exercises as unknown as
      | Array<{
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
            muscle_group: string | null
          } | null
        }>
      | null
  )?.sort((a, b) => a.position - b.position)

  await supabase
    .from('session_exercises')
    .delete()
    .eq('session_id', id)
    .eq('user_id', userId)

  if (exercises && exercises.length > 0) {
    const rows = exercises.map((item, index) => ({
      user_id: userId,
      session_id: id,
      exercise_id: item.exercise?.id ?? null,
      position: index,
      exercise_name: item.notes?.trim() || item.exercise?.name || 'Ejercicio',
      muscle_group: item.exercise?.muscle_group ?? null,
      target_sets: item.target_sets,
      target_reps_min: item.target_reps_min,
      target_reps_max: item.target_reps_max,
      target_weight: item.target_weight,
      rest_seconds: item.rest_seconds,
      notes: item.notes,
    }))

    const { error: insertError } = await supabase
      .from('session_exercises')
      .insert(rows)
    if (insertError) throw new Error(insertError.message)
  }

  revalidatePath('/')
  redirect(date ? `/?date=${date}` : '/')
}
