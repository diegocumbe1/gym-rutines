/**
 * Crea plantillas base para un usuario a partir del catálogo existente.
 *
 * Uso:
 *   USER_ID=uuid pnpm seed:templates
 *   USER_EMAIL=correo@dominio.com pnpm seed:templates
 *   USER_ID=uuid REPLACE=1 pnpm seed:templates
 *   USER_ID=uuid DRY_RUN=1 pnpm seed:templates
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const USER_ID = process.env.USER_ID
const USER_EMAIL = process.env.USER_EMAIL
const REPLACE = process.env.REPLACE === '1'
const DRY_RUN = process.env.DRY_RUN === '1'

if (!url || !serviceKey) {
  console.error(
    'Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.'
  )
  process.exit(1)
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

type Exercise = {
  id: string
  name: string
  body_part: string | null
  muscle_group: string | null
  equipment: string | null
  target: string | null
}

type Slot = {
  label: string
  bodyParts?: string[]
  targets?: string[]
  equipment?: string[]
  names?: string[]
  avoid?: string[]
  sets?: number
  repsMin?: number
  repsMax?: number
  durationSeconds?: number
  restSeconds?: number
  trackingType?: 'sets_reps_weight' | 'bodyweight_reps' | 'duration' | 'single'
}

type TemplateSpec = {
  name: string
  description: string
  slots: Slot[]
}

function normalize(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

function includesAny(value: string | null | undefined, terms?: string[]) {
  if (!terms || terms.length === 0) return false
  const normalized = normalize(value)
  return terms.some((term) => normalized.includes(normalize(term)))
}

function wordIncludesAny(value: string | null | undefined, terms?: string[]) {
  if (!terms || terms.length === 0) return false
  const normalized = normalize(value).replace(/[^a-z0-9]+/g, ' ')
  return terms.some((term) => {
    const normalizedTerm = normalize(term).replace(/[^a-z0-9]+/g, ' ').trim()
    if (!normalizedTerm) return false
    return new RegExp(`(^| )${normalizedTerm}( |$)`).test(normalized)
  })
}

function overlaps(value: string | null | undefined, terms?: string[]) {
  if (!terms || terms.length === 0) return false
  const normalized = normalize(value)
  return terms.some((term) => normalized === normalize(term))
}

function defaultTracking(slot: Slot, exercise: Exercise) {
  if (slot.trackingType) return slot.trackingType
  if (slot.durationSeconds) return 'duration'

  const equipment = normalize(exercise.equipment)
  if (
    equipment.includes('body') ||
    equipment.includes('assisted') ||
    equipment.includes('resistance band')
  ) {
    return 'bodyweight_reps'
  }

  return 'sets_reps_weight'
}

function scoreExercise(slot: Slot, exercise: Exercise, used: Set<string>) {
  if (used.has(exercise.id)) return -1
  if (includesAny(exercise.name, slot.avoid)) return -1

  let score = 0
  if (overlaps(exercise.body_part, slot.bodyParts)) score += 40
  if (overlaps(exercise.target, slot.targets)) score += 45
  if (overlaps(exercise.muscle_group, slot.targets)) score += 22
  if (includesAny(exercise.equipment, slot.equipment)) score += 16
  if (includesAny(exercise.name, slot.names)) score += 35
  if (wordIncludesAny(exercise.name, slot.names)) score += 20
  if (slot.bodyParts && !overlaps(exercise.body_part, slot.bodyParts)) score -= 30

  return score
}

function pickExercise(slot: Slot, exercises: Exercise[], used: Set<string>) {
  const ranked = exercises
    .map((exercise) => ({ exercise, score: scoreExercise(slot, exercise, used) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.exercise.name.localeCompare(b.exercise.name)
    })

  const selected = ranked[0]?.exercise
  if (selected) used.add(selected.id)
  return selected ?? null
}

async function findUserId() {
  if (USER_ID) return USER_ID
  if (!USER_EMAIL) {
    throw new Error('Define USER_ID o USER_EMAIL para saber de quién crear plantillas.')
  }

  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw new Error(error.message)

  const user = data.users.find(
    (item) => normalize(item.email) === normalize(USER_EMAIL)
  )
  if (!user) throw new Error(`No encontré usuario con email ${USER_EMAIL}.`)

  return user.id
}

async function fetchExercises(userId: string) {
  const rows: Exercise[] = []
  const pageSize = 1000

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('exercises')
      .select('id,name,body_part,muscle_group,equipment,target')
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .range(from, from + pageSize - 1)

    if (error) throw new Error(error.message)
    rows.push(...((data ?? []) as Exercise[]))
    if (!data || data.length < pageSize) break
  }

  return rows
}

const chestPress = (label = 'Press pecho'): Slot => ({
  label,
  bodyParts: ['chest'],
  targets: ['pectorals', 'chest'],
  names: ['bench press', 'chest press', 'dumbbell press', 'barbell bench'],
  avoid: ['floor press', 'throw'],
  sets: 4,
  repsMin: 6,
  repsMax: 10,
})

const chestFly = (label = 'Apertura pecho'): Slot => ({
  label,
  bodyParts: ['chest'],
  targets: ['pectorals', 'chest'],
  names: ['fly', 'pec deck', 'butterfly'],
  sets: 3,
  repsMin: 10,
  repsMax: 15,
})

const shoulderPress = (label = 'Press hombro'): Slot => ({
  label,
  bodyParts: ['shoulders'],
  targets: ['delts', 'shoulders'],
  names: ['shoulder press', 'overhead press', 'military press'],
  sets: 4,
  repsMin: 6,
  repsMax: 10,
})

const lateralRaise = (label = 'Elevación lateral'): Slot => ({
  label,
  bodyParts: ['shoulders'],
  targets: ['delts', 'shoulders'],
  names: ['lateral raise', 'side raise'],
  sets: 3,
  repsMin: 12,
  repsMax: 18,
})

const triceps = (label = 'Tríceps'): Slot => ({
  label,
  bodyParts: ['upper arms'],
  targets: ['triceps'],
  names: ['triceps', 'pushdown', 'extension'],
  sets: 3,
  repsMin: 10,
  repsMax: 15,
})

const biceps = (label = 'Bíceps'): Slot => ({
  label,
  bodyParts: ['upper arms'],
  targets: ['biceps'],
  names: ['curl', 'biceps'],
  avoid: ['wrist'],
  sets: 3,
  repsMin: 8,
  repsMax: 12,
})

const row = (label = 'Remo'): Slot => ({
  label,
  bodyParts: ['back'],
  targets: ['lats', 'upper back', 'back'],
  names: ['row', 'cable row', 'seated row', 'machine row', 'barbell row', 'dumbbell row'],
  equipment: ['cable', 'machine', 'barbell', 'dumbbell', 'leverage machine'],
  avoid: ['throw', 'catch', 'medicine ball'],
  sets: 4,
  repsMin: 8,
  repsMax: 12,
})

const pulldown = (label = 'Jalón'): Slot => ({
  label,
  bodyParts: ['back'],
  targets: ['lats', 'back'],
  names: ['pulldown', 'pull-up', 'chin-up'],
  sets: 4,
  repsMin: 8,
  repsMax: 12,
})

const rearDelt = (label = 'Deltoide posterior'): Slot => ({
  label,
  bodyParts: ['shoulders', 'back'],
  targets: ['delts', 'traps', 'upper back'],
  names: ['rear delt', 'face pull', 'reverse fly'],
  sets: 3,
  repsMin: 12,
  repsMax: 18,
})

const squat = (label = 'Sentadilla'): Slot => ({
  label,
  bodyParts: ['upper legs'],
  targets: ['quads', 'glutes'],
  names: ['squat', 'sentadilla'],
  sets: 4,
  repsMin: 6,
  repsMax: 10,
})

const legPress = (label = 'Prensa'): Slot => ({
  label,
  bodyParts: ['upper legs'],
  targets: ['quads', 'glutes'],
  names: ['leg press', 'press'],
  equipment: ['sled machine', 'leverage machine'],
  sets: 4,
  repsMin: 10,
  repsMax: 15,
})

const hamCurl = (label = 'Femoral'): Slot => ({
  label,
  bodyParts: ['upper legs'],
  targets: ['hamstrings'],
  names: ['leg curl', 'hamstring curl', 'lying leg curl', 'seated leg curl'],
  equipment: ['machine', 'leverage machine', 'cable'],
  avoid: ['90/90', 'stretch'],
  sets: 3,
  repsMin: 10,
  repsMax: 15,
})

const calf = (label = 'Pantorrilla'): Slot => ({
  label,
  bodyParts: ['lower legs'],
  targets: ['calves'],
  names: ['calf raise', 'calf'],
  sets: 4,
  repsMin: 12,
  repsMax: 20,
})

const abs = (label = 'Abdomen'): Slot => ({
  label,
  bodyParts: ['waist'],
  targets: ['abs', 'abdominals', 'waist'],
  names: ['crunch', 'sit-up', 'leg raise', 'plank'],
  sets: 3,
  repsMin: 12,
  repsMax: 20,
  trackingType: 'bodyweight_reps',
})

const coreDuration = (label = 'Core tiempo'): Slot => ({
  label,
  bodyParts: ['waist'],
  targets: ['abs', 'abdominals', 'waist'],
  names: ['plank', 'bridge', 'hold'],
  durationSeconds: 45,
  restSeconds: 45,
  trackingType: 'duration',
})

const cardio = (label = 'Cardio'): Slot => ({
  label,
  bodyParts: ['cardio'],
  targets: ['cardio'],
  names: ['run', 'bike', 'walk', 'jump', 'elliptical', 'cardio'],
  durationSeconds: 900,
  restSeconds: 60,
  trackingType: 'duration',
})

const templates: TemplateSpec[] = [
  {
    name: 'PUSH DAY',
    description: 'Pecho, hombro y tríceps con base de empuje.',
    slots: [chestPress(), chestPress('Press inclinado'), chestFly(), shoulderPress(), lateralRaise(), triceps(), triceps('Tríceps extensión')],
  },
  {
    name: 'PULL DAY',
    description: 'Espalda y bíceps con jalones, remos y brazo.',
    slots: [pulldown(), row(), row('Remo horizontal'), rearDelt(), biceps(), biceps('Curl alterno')],
  },
  {
    name: 'LEGS',
    description: 'Pierna completa: cuádriceps, femoral, glúteo y pantorrilla.',
    slots: [squat(), legPress(), hamCurl(), hamCurl('Femoral variante'), calf(), calf('Pantorrilla variante')],
  },
  {
    name: 'CORE',
    description: 'Abdomen y estabilidad.',
    slots: [abs('Crunch'), abs('Elevación piernas'), coreDuration('Plancha'), coreDuration('Core anti-rotación'), abs('Oblicuos')],
  },
  {
    name: 'CARDIO',
    description: 'Sesión de cardio por tiempo.',
    slots: [cardio('Cardio principal'), cardio('Cardio suave'), coreDuration('Core final')],
  },
  {
    name: 'Pecho + Bíceps',
    description: 'Combinación antagonista suave para torso.',
    slots: [chestPress(), chestPress('Press inclinado'), chestFly(), biceps(), biceps('Curl martillo'), abs('Abdomen final')],
  },
  {
    name: 'Espalda + Hombro',
    description: 'Espalda con énfasis en deltoide posterior y hombro.',
    slots: [pulldown(), row(), rearDelt(), shoulderPress(), lateralRaise(), coreDuration('Plancha final')],
  },
  {
    name: 'Pecho + Hombro',
    description: 'Empuje sin mucho tríceps directo.',
    slots: [chestPress(), chestPress('Press inclinado'), chestFly(), shoulderPress(), lateralRaise(), rearDelt()],
  },
  {
    name: 'Espalda + Tríceps',
    description: 'Torso mixto para variar sin repetir bíceps.',
    slots: [pulldown(), row(), row('Remo máquina'), rearDelt(), triceps(), triceps('Tríceps cuerda')],
  },
  {
    name: 'Bíceps + Abdomen',
    description: 'Brazo y core para sesión corta.',
    slots: [biceps(), biceps('Curl inclinado'), biceps('Curl concentrado'), abs(), coreDuration('Plancha'), abs('Oblicuos')],
  },
  {
    name: 'Push Hipertrofia',
    description: 'Empuje con repeticiones medias y altas.',
    slots: [chestPress(), chestFly(), shoulderPress(), lateralRaise(), triceps(), triceps('Tríceps final')],
  },
  {
    name: 'Pull Espalda Ancha',
    description: 'Jalones y remos enfocados en dorsales.',
    slots: [pulldown('Jalón ancho'), pulldown('Dominada o asistida'), row(), row('Remo unilateral'), biceps()],
  },
  {
    name: 'Legs Cuádriceps',
    description: 'Pierna con prioridad en cuádriceps.',
    slots: [squat(), legPress(), legPress('Extensión o prensa'), hamCurl(), calf()],
  },
  {
    name: 'Legs Glúteo/Femoral',
    description: 'Pierna posterior: femoral, glúteo y pantorrilla.',
    slots: [hamCurl(), hamCurl('Femoral sentado/acostado'), squat('Sentadilla o hip hinge'), legPress('Prensa pies altos'), calf()],
  },
  {
    name: 'Upper Mixto',
    description: 'Torso completo cuando quieres una sesión general.',
    slots: [chestPress(), pulldown(), row(), shoulderPress(), biceps(), triceps()],
  },
  {
    name: 'Cardio + Core',
    description: 'Cardio por tiempo con abdomen al final.',
    slots: [cardio('Cardio intervalo'), cardio('Cardio base'), abs(), coreDuration('Plancha'), abs('Core final')],
  },
]

async function deleteExistingTemplates(userId: string, names: string[]) {
  const { error } = await supabase
    .from('workout_templates')
    .delete()
    .eq('user_id', userId)
    .in('name', names)

  if (error) throw new Error(error.message)
}

async function existingTemplateNames(userId: string) {
  const { data, error } = await supabase
    .from('workout_templates')
    .select('name')
    .eq('user_id', userId)
    .in(
      'name',
      templates.map((template) => template.name)
    )

  if (error) throw new Error(error.message)
  return new Set((data ?? []).map((row) => row.name as string))
}

async function createTemplate(userId: string, spec: TemplateSpec, exercises: Exercise[]) {
  const used = new Set<string>()
  const selected = spec.slots
    .map((slot) => ({ slot, exercise: pickExercise(slot, exercises, used) }))
    .filter(
      (item): item is { slot: Slot; exercise: Exercise } => Boolean(item.exercise)
    )

  console.log(`\n${spec.name}`)
  console.table(
    selected.map(({ slot, exercise }) => ({
      slot: slot.label,
      exercise: exercise.name,
      zone: exercise.body_part,
      target: exercise.target,
      equipment: exercise.equipment,
    }))
  )

  if (DRY_RUN) return

  const { data: template, error: templateError } = await supabase
    .from('workout_templates')
    .insert({
      user_id: userId,
      name: spec.name,
      description: spec.description,
    })
    .select('id')
    .single()

  if (templateError || !template) {
    throw new Error(templateError?.message ?? `No se pudo crear ${spec.name}.`)
  }

  const rows = selected.map(({ slot, exercise }, position) => {
    const trackingType = defaultTracking(slot, exercise)
    const tracksSets = trackingType === 'sets_reps_weight' || trackingType === 'bodyweight_reps'

    return {
      user_id: userId,
      template_id: template.id,
      exercise_id: exercise.id,
      position,
      tracking_type: trackingType,
      target_sets: tracksSets ? slot.sets ?? 3 : null,
      target_reps_min: tracksSets ? slot.repsMin ?? 8 : null,
      target_reps_max: tracksSets ? slot.repsMax ?? 12 : null,
      target_weight: null,
      target_duration_seconds:
        trackingType === 'duration' ? slot.durationSeconds ?? 600 : null,
      rest_seconds: slot.restSeconds ?? (trackingType === 'duration' ? 45 : 90),
      notes: slot.label,
    }
  })

  if (rows.length === 0) return

  const { error: exercisesError } = await supabase
    .from('template_exercises')
    .insert(rows)

  if (exercisesError) throw new Error(exercisesError.message)
}

async function main() {
  const userId = await findUserId()
  const exercises = await fetchExercises(userId)
  if (exercises.length === 0) {
    throw new Error('No hay ejercicios en el catálogo. Importa ejercicios primero.')
  }

  console.log(`Usuario: ${userId}`)
  console.log(`Ejercicios disponibles: ${exercises.length}`)

  const names = templates.map((template) => template.name)
  if (REPLACE && !DRY_RUN) {
    await deleteExistingTemplates(userId, names)
  }

  const existing = REPLACE || DRY_RUN ? new Set<string>() : await existingTemplateNames(userId)
  for (const template of templates) {
    if (existing.has(template.name)) {
      console.log(`\n${template.name}: ya existe, omitida. Usa REPLACE=1 para recrearla.`)
      continue
    }
    await createTemplate(userId, template, exercises)
  }

  console.log(DRY_RUN ? '\nDRY_RUN completo.' : '\nPlantillas creadas.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
