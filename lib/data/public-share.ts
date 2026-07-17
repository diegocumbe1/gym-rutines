import 'server-only'

import { createServiceClient } from '@/lib/supabase/service'
import type { TemplateExercise } from '@/lib/data/templates'
import type { SessionExercise } from '@/lib/data/sessions'

const MEDIA_BUCKET = 'exercise-media'
const MEDIA_URL_EXPIRES = 60 * 60

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

type PublicExerciseItem = TemplateExercise | SessionExercise

const LEGACY_PUBLIC_TEMPLATE_SELECT =
  'id,name,description,' +
  'template_exercises(id,position,target_sets,target_reps_min,target_reps_max,target_weight,rest_seconds,notes,exercise:exercises(id,name,body_part,muscle_group,equipment,target,image_url,gif_url,instructions))'

const LEGACY_PUBLIC_SESSION_SELECT =
  'id,title,scheduled_date,status,' +
  'session_exercises(id,exercise_id,position,exercise_name,muscle_group,target_sets,target_reps_min,target_reps_max,target_weight,rest_seconds,exercise:exercises(id,name,body_part,muscle_group,equipment,target,image_url,gif_url,instructions))'

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  )
}

async function attachPublicMediaUrls<T extends PublicExerciseItem>(
  items: T[]
): Promise<T[]> {
  const paths = [
    ...new Set(
      items
        .map((item) => item.exercise?.gif_url ?? item.exercise?.image_url)
        .filter((path): path is string => Boolean(path))
    ),
  ]

  if (paths.length === 0) return items

  const urls = new Map<string, string>()
  const external = paths.filter(
    (path) => path.startsWith('http://') || path.startsWith('https://')
  )
  external.forEach((path) => urls.set(path, path))

  const storagePaths = paths.filter(
    (path) => !path.startsWith('http://') && !path.startsWith('https://')
  )

  if (storagePaths.length > 0) {
    const supabase = createServiceClient()
    const { data } = await supabase.storage
      .from(MEDIA_BUCKET)
      .createSignedUrls(storagePaths, MEDIA_URL_EXPIRES)

    data?.forEach((item) => {
      if (item.path && item.signedUrl) urls.set(item.path, item.signedUrl)
    })
  }

  return items.map((item) => {
    const mediaPath = item.exercise?.gif_url ?? item.exercise?.image_url
    if (!item.exercise || !mediaPath) return item

    return {
      ...item,
      exercise: {
        ...item.exercise,
        public_media_url: urls.get(mediaPath) ?? null,
      },
    }
  })
}

export async function getPublicTemplate(
  shareId: string
): Promise<PublicTemplate | null> {
  if (!isUuid(shareId)) return null

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('workout_templates')
    .select(LEGACY_PUBLIC_TEMPLATE_SELECT)
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

  const exercises = (row.template_exercises ?? []).sort(
    (a, b) => a.position - b.position
  ).map((exercise) => ({
    ...exercise,
    tracking_type: exercise.tracking_type ?? 'sets_reps_weight',
    target_duration_seconds: exercise.target_duration_seconds ?? null,
  }))

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    exercises: await attachPublicMediaUrls(exercises),
  }
}

export async function getPublicSession(
  shareId: string
): Promise<PublicSession | null> {
  if (!isUuid(shareId)) return null

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(LEGACY_PUBLIC_SESSION_SELECT)
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

  const exercises = (row.session_exercises ?? []).sort(
    (a, b) => a.position - b.position
  ).map((exercise) => ({
    ...exercise,
    tracking_type: exercise.tracking_type ?? 'sets_reps_weight',
    target_duration_seconds: exercise.target_duration_seconds ?? null,
    actual_duration_seconds: exercise.actual_duration_seconds ?? null,
    is_completed: exercise.is_completed ?? false,
    completed_at: exercise.completed_at ?? null,
  }))

  return {
    id: row.id,
    title: row.title,
    scheduled_date: row.scheduled_date,
    status: row.status,
    exercises: await attachPublicMediaUrls(exercises),
  }
}
