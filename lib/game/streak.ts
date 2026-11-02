import { addDays, startOfWeek } from '@/lib/dates'

/**
 * Semanas seguidas cumpliendo la meta, contando hacia atrás desde hoy.
 * La semana en curso suma si ya se cumplió, pero no rompe la racha mientras
 * no haya terminado.
 */
export function currentStreak(metWeeks: Set<string>, today: string) {
  const thisWeek = startOfWeek(today)
  let streak = metWeeks.has(thisWeek) ? 1 : 0
  let cursor = addDays(thisWeek, -7)

  while (metWeeks.has(cursor)) {
    streak += 1
    cursor = addDays(cursor, -7)
  }
  return streak
}
