import type { SessionHistoryItem } from '@/lib/data/sessions'
import { startOfWeek } from '@/lib/dates'
import { bodyPartLabel } from '@/lib/exercises/labels'
import { musclesFor, type MapMuscle } from '@/lib/workouts/muscle-map'
import { tracksSets } from '@/lib/workouts/tracking'

/** Ejercicios cuyo catálogo no indica zona (o ya no existe). */
const OTHER_BODY_PART = 'other'

export type BodyPartStats = {
  bodyPart: string
  label: string
  /** Series efectivas completadas (con o sin peso). */
  sets: number
  /** Peso medio por serie, solo de las series con peso. */
  avgWeight: number | null
  /** Ejercicio con el mayor peso levantado en la zona. */
  top: { name: string; weight: number } | null
}

export type ExerciseStats = {
  key: string
  name: string
  bodyPartLabel: string
  sets: number
  sessions: number
  avgWeight: number | null
  /** Serie más pesada (y, a igual peso, con más repeticiones). */
  best: { weight: number; reps: number | null } | null
  /** Peso máximo de la última sesión menos el de la primera del periodo. */
  progressKg: number | null
}

export type WeeklyFrequencyRow = {
  bodyPart: string
  label: string
  /** Sesiones por semana en las que se trabajó la zona, en el orden de `weekStarts`. */
  counts: number[]
  /** Promedio de veces por semana en las semanas mostradas. */
  avg: number
}

/** Cuántas sesiones por semana trabajaron cada zona (y cuántas hubo en total). */
export function weeklyFrequency(sessions: SessionHistoryItem[], weekStarts: string[]) {
  const weekIndex = new Map(weekStarts.map((week, index) => [week, index]))
  const totals = weekStarts.map(() => 0)
  const zones = new Map<string, number[]>()

  for (const session of sessions) {
    const index = weekIndex.get(startOfWeek(session.scheduled_date))
    if (index === undefined) continue
    totals[index] += 1

    // Una sesión cuenta una sola vez por zona, aunque tenga varios ejercicios.
    const trained = new Set(
      session.exercises
        .filter((exercise) => tracksSets(exercise.tracking_type) && exercise.sets.length > 0)
        .map((exercise) => exercise.body_part ?? OTHER_BODY_PART)
    )
    for (const zone of trained) {
      const counts = zones.get(zone) ?? weekStarts.map(() => 0)
      counts[index] += 1
      zones.set(zone, counts)
    }
  }

  const average = (counts: number[]) =>
    Math.round((counts.reduce((a, b) => a + b, 0) / Math.max(counts.length, 1)) * 10) / 10

  const rows: WeeklyFrequencyRow[] = [...zones.entries()]
    .map(([bodyPart, counts]) => ({
      bodyPart,
      label: bodyPart === OTHER_BODY_PART ? 'Otros' : bodyPartLabel(bodyPart),
      counts,
      avg: average(counts),
    }))
    .sort((a, b) => b.avg - a.avg || a.label.localeCompare(b.label))

  return { totals, totalsAvg: average(totals), rows }
}

/** Series efectivas por músculo del mapa anatómico. */
export function setsByMuscle(sessions: SessionHistoryItem[]) {
  const sets: Partial<Record<MapMuscle, number>> = {}
  for (const session of sessions) {
    for (const exercise of session.exercises) {
      if (!tracksSets(exercise.tracking_type) || exercise.sets.length === 0) continue
      for (const muscle of musclesFor(exercise.target, exercise.body_part)) {
        sets[muscle] = (sets[muscle] ?? 0) + exercise.sets.length
      }
    }
  }
  return sets
}

function average(values: number[]) {
  if (values.length === 0) return null
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
}

function workingWeights(sets: Array<{ weight: number | null }>) {
  return sets.flatMap((set) => (set.weight && set.weight > 0 ? [set.weight] : []))
}

export function statsByBodyPart(sessions: SessionHistoryItem[]): BodyPartStats[] {
  const groups = new Map<
    string,
    { sets: number; weights: number[]; top: { name: string; weight: number } | null }
  >()

  for (const session of sessions) {
    for (const exercise of session.exercises) {
      if (!tracksSets(exercise.tracking_type) || exercise.sets.length === 0) continue

      const key = exercise.body_part ?? OTHER_BODY_PART
      const group = groups.get(key) ?? { sets: 0, weights: [], top: null }
      const weights = workingWeights(exercise.sets)

      group.sets += exercise.sets.length
      group.weights.push(...weights)
      const max = weights.length > 0 ? Math.max(...weights) : 0
      if (max > 0 && (!group.top || max > group.top.weight)) {
        group.top = { name: exercise.name, weight: max }
      }
      groups.set(key, group)
    }
  }

  return [...groups.entries()]
    .map(([bodyPart, group]) => ({
      bodyPart,
      label: bodyPart === OTHER_BODY_PART ? 'Otros' : bodyPartLabel(bodyPart),
      sets: group.sets,
      avgWeight: average(group.weights),
      top: group.top,
    }))
    .sort((a, b) => b.sets - a.sets)
}

export function statsByExercise(sessions: SessionHistoryItem[]): ExerciseStats[] {
  const groups = new Map<
    string,
    {
      name: string
      bodyPart: string | null
      sets: number
      weights: number[]
      best: { weight: number; reps: number | null } | null
      /** Peso máximo por sesión, en orden cronológico. */
      sessionMaxes: number[]
      sessions: number
    }
  >()

  // El historial llega del más reciente al más antiguo.
  for (const session of [...sessions].reverse()) {
    for (const exercise of session.exercises) {
      if (!tracksSets(exercise.tracking_type) || exercise.sets.length === 0) continue

      const group = groups.get(exercise.key) ?? {
        name: exercise.name,
        bodyPart: exercise.body_part,
        sets: 0,
        weights: [],
        best: null,
        sessionMaxes: [],
        sessions: 0,
      }

      group.sets += exercise.sets.length
      group.sessions += 1

      let sessionMax = 0
      for (const set of exercise.sets) {
        if (!set.weight || set.weight <= 0) continue
        group.weights.push(set.weight)
        sessionMax = Math.max(sessionMax, set.weight)
        if (
          !group.best ||
          set.weight > group.best.weight ||
          (set.weight === group.best.weight && (set.reps ?? 0) > (group.best.reps ?? 0))
        ) {
          group.best = { weight: set.weight, reps: set.reps }
        }
      }
      if (sessionMax > 0) group.sessionMaxes.push(sessionMax)

      groups.set(exercise.key, group)
    }
  }

  return [...groups.entries()]
    .map(([key, group]) => {
      const maxes = group.sessionMaxes
      return {
        key,
        name: group.name,
        bodyPartLabel: group.bodyPart ? bodyPartLabel(group.bodyPart) : 'Otros',
        sets: group.sets,
        sessions: group.sessions,
        avgWeight: average(group.weights),
        best: group.best,
        progressKg:
          maxes.length >= 2
            ? Math.round((maxes[maxes.length - 1] - maxes[0]) * 10) / 10
            : null,
      }
    })
    .sort((a, b) => b.sets - a.sets)
}
