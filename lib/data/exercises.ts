import 'server-only'

import { createClient } from '@/lib/supabase/server'

export type ExerciseListItem = {
  id: string
  name: string
  body_part: string | null
  muscle_group: string | null
  equipment: string | null
  target: string | null
  image_url: string | null
}

export type ExerciseDetail = ExerciseListItem & {
  secondary_muscles: string[] | null
  instructions: string | null
  gif_url: string | null
  source_attribution: string | null
}

export type SimilarExercise = ExerciseListItem & {
  reason: string
}

const LIST_COLUMNS =
  'id,name,body_part,muscle_group,equipment,target,image_url'

const SEARCH_ALIASES: Array<[string[], string[]]> = [
  [
    ['press plano', 'press de banca', 'press banca', 'banca plana'],
    ['bench press', 'chest press'],
  ],
  [
    ['press inclinado', 'banca inclinada', 'inclinado'],
    ['incline bench press', 'incline chest press'],
  ],
  [
    ['press declinado', 'press deplicano', 'banca declinada', 'declinado'],
    ['decline bench press', 'decline chest press'],
  ],
  [
    ['peck deck', 'pec deck', 'peck-deck', 'pec-deck', 'aperturas maquina'],
    ['lever seated fly', 'butterfly', 'seated fly'],
  ],
  [
    ['maquina', 'máquina', 'maquinas', 'máquinas'],
    ['leverage machine', 'smith machine', 'sled machine', 'cable'],
  ],
  [
    ['prensa', 'prensa de pierna', 'prensa piernas', 'prensa 45'],
    ['leg press', 'sled 45', 'sled machine', 'lever alternate leg press'],
  ],
  [
    ['extension pierna', 'extensión pierna', 'extension de pierna', 'extensión de pierna', 'cuadriceps maquina'],
    ['leg extension', 'lever leg extension'],
  ],
  [
    ['curl femoral', 'femoral sentado', 'femoral acostado', 'curl pierna', 'curl de pierna'],
    ['leg curl', 'lever seated leg curl', 'lever lying leg curl', 'kneeling leg curl'],
  ],
  [
    ['abductora', 'abduccion cadera', 'abducción cadera', 'abduccion de cadera'],
    ['hip abduction', 'lever seated hip abduction', 'abductors'],
  ],
  [
    ['aductora', 'aduccion cadera', 'aducción cadera', 'aduccion de cadera'],
    ['hip adduction', 'lever seated hip adduction', 'adductors'],
  ],
  [
    ['sentadilla hack', 'hack squat', 'hack'],
    ['hack squat', 'sled hack squat', 'smith hack squat'],
  ],
  [
    ['smith', 'multipower'],
    ['smith machine', 'smith squat', 'smith leg press'],
  ],
  [
    ['pantorrilla maquina', 'gemelo maquina', 'calf maquina', 'calf raise'],
    ['calf raise', 'calf press', 'calves'],
  ],
  [['pecho', 'pectorales'], ['chest', 'pectorals']],
  [['espalda'], ['back', 'lats', 'upper back']],
  [['pierna', 'piernas'], ['upper legs', 'quads', 'hamstrings', 'glutes']],
  [['hombro', 'hombros'], ['shoulders', 'delts']],
  [['brazo', 'brazos'], ['upper arms', 'biceps', 'triceps']],
]

const BODY_PART_SEARCH_ALIASES: Record<string, string> = {
  back: 'back',
  espalda: 'back',
  cardio: 'cardio',
  chest: 'chest',
  pecho: 'chest',
  pectoral: 'chest',
  pectorales: 'chest',
  shoulders: 'shoulders',
  hombro: 'shoulders',
  hombros: 'shoulders',
  arms: 'upper arms',
  brazo: 'upper arms',
  brazos: 'upper arms',
  biceps: 'upper arms',
  triceps: 'upper arms',
  legs: 'upper legs',
  pierna: 'upper legs',
  piernas: 'upper legs',
  quads: 'upper legs',
  cuadriceps: 'upper legs',
  hamstrings: 'upper legs',
  glutes: 'upper legs',
  gluteos: 'upper legs',
  calves: 'lower legs',
  pantorrilla: 'lower legs',
  pantorrillas: 'lower legs',
  forearms: 'lower arms',
  antebrazo: 'lower arms',
  antebrazos: 'lower arms',
  core: 'waist',
  abs: 'waist',
  abdomen: 'waist',
  waist: 'waist',
  cuello: 'neck',
  neck: 'neck',
}

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
}

export function bodyPartFromSearch(search: string | null | undefined) {
  if (!search) return undefined
  return BODY_PART_SEARCH_ALIASES[normalizeSearch(search)]
}

function escapeSearchTerm(term: string) {
  return term.replaceAll('%', '').replaceAll(',', ' ').trim()
}

function expandSearchTerms(search: string) {
  const normalized = normalizeSearch(search)
  const terms = new Set([search])

  for (const [aliases, expansions] of SEARCH_ALIASES) {
    const matches = aliases.some((alias) => {
      const normalizedAlias = alias
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
      return normalized.includes(normalizedAlias)
    })

    if (matches) {
      expansions.forEach((term) => terms.add(term))
    }
  }

  return Array.from(terms).map(escapeSearchTerm).filter(Boolean)
}

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

const WEAK_NAME_TOKENS = new Set([
  'a',
  'and',
  'assisted',
  'barbell',
  'body',
  'cable',
  'dumbbell',
  'exercise',
  'lever',
  'machine',
  'on',
  'one',
  'seated',
  'single',
  'smith',
  'standing',
  'the',
  'with',
])

function nameTokens(value: string) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2 && !WEAK_NAME_TOKENS.has(token))
}

function sharedTokenCount(a: string, b: string) {
  const aTokens = new Set(nameTokens(a))
  const bTokens = new Set(nameTokens(b))
  return Array.from(aTokens).filter((token) => bTokens.has(token)).length
}

function recommendationReason(
  source: ExerciseDetail,
  candidate: ExerciseListItem
) {
  if (source.target && candidate.target === source.target) {
    return `Mismo objetivo: ${candidate.target}`
  }
  if (source.muscle_group && candidate.muscle_group === source.muscle_group) {
    return `Mismo grupo: ${candidate.muscle_group}`
  }
  if (source.body_part && candidate.body_part === source.body_part) {
    return `Misma zona: ${candidate.body_part}`
  }
  return 'Alternativa cercana'
}

function similarityScore(source: ExerciseDetail, candidate: ExerciseListItem) {
  let score = 0

  if (source.target && candidate.target === source.target) score += 60
  if (source.muscle_group && candidate.muscle_group === source.muscle_group) {
    score += 30
  }
  if (source.body_part && candidate.body_part === source.body_part) score += 20
  if (source.equipment && candidate.equipment === source.equipment) score += 6
  if (source.equipment && candidate.equipment !== source.equipment) score += 8

  score += Math.min(sharedTokenCount(source.name, candidate.name), 4) * 8

  return score
}

export async function listExercises(opts?: {
  search?: string
  bodyPart?: string
  limit?: number
}): Promise<ExerciseListItem[]> {
  const supabase = await createClient()
  let query = supabase
    .from('exercises')
    .select(LIST_COLUMNS)
    .order('name', { ascending: true })
    .limit(opts?.limit ?? 60)

  if (opts?.search) {
    const terms = expandSearchTerms(opts.search)
    const filters = terms.flatMap((term) => [
      `name.ilike.%${term}%`,
      `equipment.ilike.%${term}%`,
      `body_part.ilike.%${term}%`,
      `muscle_group.ilike.%${term}%`,
      `target.ilike.%${term}%`,
    ])
    query = query.or(filters.join(','))
  }
  if (opts?.bodyPart) query = query.eq('body_part', opts.bodyPart)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}

export async function listExercisesPage(opts?: {
  search?: string
  bodyPart?: string
  page?: number
  pageSize?: number
}): Promise<{ exercises: ExerciseListItem[]; total: number }> {
  const page = Math.max(1, opts?.page ?? 1)
  const pageSize = opts?.pageSize ?? 60
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const supabase = await createClient()
  let query = supabase
    .from('exercises')
    .select(LIST_COLUMNS, { count: 'exact' })
    .order('name', { ascending: true })
    .range(from, to)

  if (opts?.search) {
    const terms = expandSearchTerms(opts.search)
    const filters = terms.flatMap((term) => [
      `name.ilike.%${term}%`,
      `equipment.ilike.%${term}%`,
      `body_part.ilike.%${term}%`,
      `muscle_group.ilike.%${term}%`,
      `target.ilike.%${term}%`,
    ])
    query = query.or(filters.join(','))
  }
  if (opts?.bodyPart) query = query.eq('body_part', opts.bodyPart)

  const { data, error, count } = await query
  if (error) throw new Error(error.message)

  return {
    exercises: data ?? [],
    total: count ?? 0,
  }
}

export async function getExercise(id: string): Promise<ExerciseDetail | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('exercises')
    .select(
      'id,name,body_part,muscle_group,equipment,target,image_url,gif_url,secondary_muscles,instructions,source_attribution'
    )
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data
}

export async function listSimilarExercises(
  exercise: ExerciseDetail,
  limit = 8
): Promise<SimilarExercise[]> {
  const filters = [
    exercise.body_part ? `body_part.eq.${exercise.body_part}` : null,
    exercise.muscle_group ? `muscle_group.eq.${exercise.muscle_group}` : null,
    exercise.target ? `target.eq.${exercise.target}` : null,
  ].filter((filter): filter is string => Boolean(filter))

  if (filters.length === 0) return []

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('exercises')
    .select(LIST_COLUMNS)
    .neq('id', exercise.id)
    .or(filters.join(','))
    .limit(80)

  if (error) throw new Error(error.message)

  return (data ?? [])
    .map((candidate) => ({
      ...candidate,
      reason: recommendationReason(exercise, candidate),
      score: similarityScore(exercise, candidate),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.name.localeCompare(b.name)
    })
    .slice(0, limit)
    .map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      body_part: candidate.body_part,
      muscle_group: candidate.muscle_group,
      equipment: candidate.equipment,
      target: candidate.target,
      image_url: candidate.image_url,
      reason: candidate.reason,
    }))
}
