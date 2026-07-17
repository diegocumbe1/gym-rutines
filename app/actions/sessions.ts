'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { addDays, todayDateString } from '@/lib/dates'
import {
  isTrackingType,
  tracksSets,
  tracksWeight,
  type TrackingType,
} from '@/lib/workouts/tracking'

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
      'id,name,template_exercises(id,position,target_sets,target_reps_min,target_reps_max,target_weight,rest_seconds,tracking_type,target_duration_seconds,notes,exercise:exercises(id,name,muscle_group))'
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
          tracking_type: TrackingType
          target_duration_seconds: number | null
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

  const rows = exercises.map((item, index) => {
    const formTrackingType = String(
      formData.get(`tracking_type_${item.id}`) ?? ''
    )
    const type = isTrackingType(formTrackingType)
      ? formTrackingType
      : item.tracking_type

    return {
      user_id: userId,
      session_id: session.id,
      exercise_id: item.exercise?.id ?? null,
      position: index,
      exercise_name: item.notes?.trim() || item.exercise?.name || 'Ejercicio',
      muscle_group: item.exercise?.muscle_group ?? null,
      tracking_type: type,
      target_sets: tracksSets(type) ? num(formData, `target_sets_${item.id}`) : null,
      target_reps_min: tracksSets(type)
        ? num(formData, `target_reps_min_${item.id}`)
        : null,
      target_reps_max: tracksSets(type)
        ? num(formData, `target_reps_max_${item.id}`)
        : null,
      target_weight: tracksWeight(type)
        ? num(formData, `target_weight_${item.id}`)
        : null,
      target_duration_seconds:
        type === 'duration'
          ? num(formData, `target_duration_seconds_${item.id}`)
          : null,
      rest_seconds: num(formData, `rest_seconds_${item.id}`),
      notes: item.notes,
    }
  })

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

export async function moveWorkoutSessionDate(formData: FormData) {
  const { userId } = await verifySession()
  const id = String(formData.get('id'))
  const currentDate = String(formData.get('current_date') ?? '')
  const scheduledDate = String(formData.get('scheduled_date') ?? '').trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) {
    redirect(currentDate ? `/?date=${currentDate}` : '/')
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('workout_sessions')
    .update({ scheduled_date: scheduledDate })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)

  revalidatePath('/')
  redirect(`/?date=${scheduledDate}`)
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

export async function moveSessionExercise(formData: FormData) {
  const { userId } = await verifySession()
  const id = String(formData.get('id'))
  const sessionId = String(formData.get('session_id'))
  const direction = String(formData.get('direction'))
  const targetPosition = num(formData, 'target_position')

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('session_exercises')
    .select('id,position')
    .eq('session_id', sessionId)
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
    revalidatePath('/')
    return { ok: true }
  }

  const reordered = [...rows]
  reordered.splice(index, 1)
  reordered.splice(targetIndex, 0, current)

  for (const [position, row] of reordered.entries()) {
    const { error: positionError } = await supabase
      .from('session_exercises')
      .update({ position })
      .eq('id', row.id)
      .eq('user_id', userId)

    if (positionError) throw new Error(positionError.message)
  }

  revalidatePath('/')
  return { ok: true }
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
      'id,template_exercises(position,target_sets,target_reps_min,target_reps_max,target_weight,rest_seconds,tracking_type,target_duration_seconds,notes,exercise:exercises(id,name,muscle_group))'
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
          tracking_type: TrackingType
          target_duration_seconds: number | null
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
      tracking_type: item.tracking_type,
      target_sets: item.target_sets,
      target_reps_min: item.target_reps_min,
      target_reps_max: item.target_reps_max,
      target_weight: item.target_weight,
      target_duration_seconds: item.target_duration_seconds,
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

export async function startWorkoutSession(formData: FormData) {
  const { userId } = await verifySession()
  const id = String(formData.get('id'))

  const supabase = await createClient()
  const { data: session, error: sessionError } = await supabase
    .from('workout_sessions')
    .select(
      'id,status,started_at,session_exercises(id,tracking_type,target_sets,target_reps_min,target_reps_max,target_weight)'
    )
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (sessionError) throw new Error(sessionError.message)
  if (!session) return { ok: false }

  const exercises = (session.session_exercises ?? []) as Array<{
    id: string
    target_sets: number | null
    target_reps_min: number | null
    target_reps_max: number | null
    target_weight: number | null
    tracking_type: TrackingType
  }>
  const setTrackedExercises = exercises.filter((exercise) =>
    tracksSets(exercise.tracking_type)
  )
  const exerciseIds = setTrackedExercises.map((exercise) => exercise.id)

  const { data: existingSets, error: setsError } = await supabase
    .from('workout_sets')
    .select('session_exercise_id,set_number')
    .in('session_exercise_id', exerciseIds.length > 0 ? exerciseIds : [''])
    .eq('user_id', userId)

  if (setsError) throw new Error(setsError.message)

  const existing = new Set(
    (existingSets ?? []).map(
      (set) => `${set.session_exercise_id}:${set.set_number}`
    )
  )
  const rows = setTrackedExercises.flatMap((exercise) => {
    const targetSets = Math.max(1, exercise.target_sets ?? 1)
    return Array.from({ length: targetSets }, (_, index) => {
      const setNumber = index + 1
      if (existing.has(`${exercise.id}:${setNumber}`)) return null
      return {
        user_id: userId,
        session_exercise_id: exercise.id,
        set_number: setNumber,
        target_reps: exercise.target_reps_max ?? exercise.target_reps_min,
        target_weight: tracksWeight(exercise.tracking_type)
          ? exercise.target_weight
          : null,
      }
    }).filter(
      (
        row
      ): row is {
        user_id: string
        session_exercise_id: string
        set_number: number
        target_reps: number | null
        target_weight: number | null
      } => Boolean(row)
    )
  })

  if (rows.length > 0) {
    const { error: insertError } = await supabase.from('workout_sets').insert(rows)
    if (insertError) throw new Error(insertError.message)
  }

  const { error: updateError } = await supabase
    .from('workout_sessions')
    .update({
      status: 'in_progress',
      started_at: session.started_at ?? new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)

  if (updateError) throw new Error(updateError.message)

  revalidatePath('/')
  return { ok: true }
}

export async function saveWorkoutSet(formData: FormData) {
  const { userId } = await verifySession()
  const id = String(formData.get('id'))
  const completed = String(formData.get('is_completed')) === 'true'

  const supabase = await createClient()
  const { error } = await supabase
    .from('workout_sets')
    .update({
      actual_reps: num(formData, 'actual_reps'),
      actual_weight: num(formData, 'actual_weight'),
      rest_seconds: num(formData, 'rest_seconds'),
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)

  revalidatePath('/')
  return { ok: true }
}

export async function saveSessionExercise(formData: FormData) {
  const { userId } = await verifySession()
  const id = String(formData.get('id'))
  const completed = String(formData.get('is_completed')) === 'true'
  const rawTrackingType = String(formData.get('tracking_type') ?? '')
  const type = isTrackingType(rawTrackingType) ? rawTrackingType : 'single'

  const supabase = await createClient()
  const { error } = await supabase
    .from('session_exercises')
    .update({
      actual_duration_seconds:
        type === 'duration' ? num(formData, 'actual_duration_seconds') : null,
      is_completed: completed,
      completed_at: completed ? new Date().toISOString() : null,
    })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)

  revalidatePath('/')
  return { ok: true }
}

export async function completeWorkoutSession(formData: FormData) {
  const { userId } = await verifySession()
  const id = String(formData.get('id'))

  const supabase = await createClient()
  const { error } = await supabase
    .from('workout_sessions')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)

  if (error) throw new Error(error.message)

  revalidatePath('/')
  return { ok: true }
}
