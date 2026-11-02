import { isValleyHour } from '@/lib/game/challenges'
import { sessionsByWeek, type GameSession } from '@/lib/game/weeks'

export const XP_RULES = {
  base: 100,
  perSet: 5,
  maxCountedSets: 40,
  weeklyGoalBonus: 50,
  valleyMultiplier: 1.5,
} as const

export type SessionXp = {
  sessionId: string
  base: number
  sets: number
  weeklyGoalBonus: number
  valley: boolean
  total: number
}

/** Series efectivas completadas (sin calentamiento), con el tope de XP_RULES. */
function countedSets(session: GameSession) {
  const sets = session.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)
  return Math.min(sets, XP_RULES.maxCountedSets)
}

/**
 * XP de cada sesión completada. El bono semanal se lo lleva la sesión que
 * alcanza la meta en su semana (la n-ésima terminada), no las siguientes.
 */
export function sessionsXp(sessions: GameSession[], weeklyTarget: number): SessionXp[] {
  const result: SessionXp[] = []

  for (const weekSessions of sessionsByWeek(sessions).values()) {
    weekSessions.forEach((session, index) => {
      const base = XP_RULES.base
      const sets = countedSets(session) * XP_RULES.perSet
      const weeklyGoalBonus = index + 1 === weeklyTarget ? XP_RULES.weeklyGoalBonus : 0
      const valley = isValleyHour(session.completed_at)
      const subtotal = base + sets + weeklyGoalBonus

      result.push({
        sessionId: session.id,
        base,
        sets,
        weeklyGoalBonus,
        valley,
        total: Math.round(valley ? subtotal * XP_RULES.valleyMultiplier : subtotal),
      })
    })
  }
  return result
}

export function totalXp(sessions: GameSession[], weeklyTarget: number) {
  return sessionsXp(sessions, weeklyTarget).reduce((sum, item) => sum + item.total, 0)
}
