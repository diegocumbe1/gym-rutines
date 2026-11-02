import type { SessionHistoryItem } from '@/lib/data/sessions'
import { startOfWeek } from '@/lib/dates'

/** Sesión completada, tal como la usa Liga Fit. */
export type GameSession = Pick<
  SessionHistoryItem,
  'id' | 'title' | 'scheduled_date' | 'completed_at' | 'exercises'
>

/** Orden en que se terminaron: decide qué sesión alcanza la meta semanal. */
function completionKey(session: GameSession) {
  return session.completed_at ?? session.scheduled_date
}

/**
 * Sesiones agrupadas por semana (lunes, `YYYY-MM-DD`), en el orden en que se
 * terminaron. Una sesión repetida cuenta una sola vez.
 */
export function sessionsByWeek(sessions: GameSession[]) {
  const unique = [...new Map(sessions.map((session) => [session.id, session])).values()]
  unique.sort(
    (a, b) => completionKey(a).localeCompare(completionKey(b)) || a.id.localeCompare(b.id)
  )

  const weeks = new Map<string, GameSession[]>()
  for (const session of unique) {
    const week = startOfWeek(session.scheduled_date)
    weeks.set(week, [...(weeks.get(week) ?? []), session])
  }
  return weeks
}

/** Semanas (lunes) en las que se cumplió la meta de sesiones. */
export function weeksMetTarget(sessions: GameSession[], weeklyTarget: number) {
  const met = new Set<string>()
  for (const [week, list] of sessionsByWeek(sessions)) {
    if (list.length >= weeklyTarget) met.add(week)
  }
  return met
}
