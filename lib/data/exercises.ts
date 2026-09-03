import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { buildSearchPlan } from '@/lib/exercises/search'

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

// El texto se busca primero solo en el nombre (es lo que se espera al escribir
// en el buscador) y solo si no hay nada se amplía al resto de campos.
const NAME_COLUMNS = ['name'] as const
const SEARCH_COLUMNS = [
  'name',
  'equipment',
  'body_part',
  'muscle_group',
  'target',
] as const

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

/** OR de `término x columna` para un grupo de sinónimos. */
function orFilterFor(terms: string[], columns: readonly string[]) {
  return terms
    .flatMap((term) => columns.map((column) => `${column}.ilike.%${term}%`))
    .join(',')
}

/**
 * PostgREST responde 416 (`PGRST103`) cuando el rango pedido empieza más allá
 * del total de filas: pasa al cambiar de página con menos resultados de los
 * que había antes. No es un fallo, es una página vacía.
 */
function isRangeError(error: { code?: string; message?: string }) {
  return (
    error.code === 'PGRST103' ||
    /range not satisfiable/i.test(error.message ?? '')
  )
}

async function runExercisesQuery(opts: {
  groups: string[][]
  columns?: readonly string[]
  namePhrase?: string
  bodyPart?: string
  from: number
  to: number
}) {
  const supabase = await createClient()
  const columns = opts.columns ?? SEARCH_COLUMNS

  const build = (head: boolean) => {
    let query = supabase
      .from('exercises')
      .select(LIST_COLUMNS, { count: 'exact', head })
      .order('name', { ascending: true })

    if (opts.namePhrase) query = query.ilike('name', `%${opts.namePhrase}%`)

    // Cada `.or()` encadenado se combina con AND: todas las palabras buscadas
    // deben aparecer, cada una en alguna de las columnas.
    for (const group of opts.groups) {
      query = query.or(orFilterFor(group, columns))
    }
    if (opts.bodyPart) query = query.eq('body_part', opts.bodyPart)

    return query
  }

  const { data, error, count } = await build(false).range(opts.from, opts.to)

  if (error) {
    if (!isRangeError(error)) throw new Error(error.message)

    // Página fuera de rango: se devuelve vacía con el total real para que la
    // vista pueda redirigir a la última página existente.
    const { count: total, error: countError } = await build(true)
    if (countError) throw new Error(countError.message)
    return { exercises: [] as ExerciseListItem[], total: total ?? 0 }
  }

  return { exercises: (data ?? []) as ExerciseListItem[], total: count ?? 0 }
}

export type ExercisesPage = {
  exercises: ExerciseListItem[]
  total: number
  /** true si no hubo coincidencia exacta y se muestran resultados similares. */
  relaxed: boolean
}

export async function listExercisesPage(opts?: {
  search?: string
  bodyPart?: string
  page?: number
  pageSize?: number
}): Promise<ExercisesPage> {
  const page = Math.max(1, opts?.page ?? 1)
  const pageSize = opts?.pageSize ?? 60
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const bodyPart = opts?.bodyPart

  const plan = opts?.search ? buildSearchPlan(opts.search) : null

  if (!plan) {
    const result = await runExercisesQuery({ groups: [], bodyPart, from, to })
    return { ...result, relaxed: false }
  }

  // 1. El nombre contiene lo escrito tal cual, en el mismo orden. Es la
  //    coincidencia más fuerte: si existe, no se muestra nada más.
  if (plan.groups.length > 1) {
    const byPhrase = await runExercisesQuery({
      groups: [],
      namePhrase: plan.phrase,
      bodyPart,
      from,
      to,
    })
    if (byPhrase.total > 0) return { ...byPhrase, relaxed: false }
  }

  // 2. Todas las palabras en el nombre, en cualquier orden. Al ordenar
  //    alfabéticamente, el nombre que coincide justo con lo escrito queda
  //    antes que los que lo amplían ("Barbell Squat" antes que "Barbell Squat
  //    Jump").
  const byName = await runExercisesQuery({
    groups: plan.groups,
    columns: NAME_COLUMNS,
    bodyPart,
    from,
    to,
  })
  if (byName.total > 0) return { ...byName, relaxed: false }

  // 3. Todas las palabras, pero repartidas entre nombre, equipo, zona o músculo.
  const byFields = await runExercisesQuery({
    groups: plan.groups,
    bodyPart,
    from,
    to,
  })
  if (byFields.total > 0 || plan.groups.length === 1) {
    return { ...byFields, relaxed: false }
  }

  // 4. Sin coincidencia con todas las palabras: ejercicios similares
  //    (cualquiera de los términos).
  const relaxed = await runExercisesQuery({
    groups: [plan.terms],
    bodyPart,
    from,
    to,
  })
  return { ...relaxed, relaxed: relaxed.total > 0 }
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
