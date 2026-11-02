import { startOfWeek, weekDays } from '@/lib/dates'
import { balancedWeek, valleySessions } from '@/lib/game/challenges'
import { levelForXp } from '@/lib/game/levels'
import { currentStreak } from '@/lib/game/streak'
import { totalXp } from '@/lib/game/xp'
import { weeksMetTarget, type GameSession } from '@/lib/game/weeks'
import { zoneActivity } from '@/lib/game/zones'

/**
 * Todo lo que muestra "Mi gym", calculado desde las sesiones completadas.
 * Nada de esto se guarda: si cambia la meta semanal, se recalcula.
 */
export function ligaSummary(
  sessions: GameSession[],
  opts: { weeklyTarget: number; today: string }
) {
  const metWeeks = weeksMetTarget(sessions, opts.weeklyTarget)
  const xp = totalXp(sessions, opts.weeklyTarget)

  const weekStart = startOfWeek(opts.today)
  const thisWeek = sessions.filter(
    (session) => startOfWeek(session.scheduled_date) === weekStart
  )
  const trainedDates = new Set(thisWeek.map((session) => session.scheduled_date))

  return {
    xp,
    level: levelForXp(xp),
    streak: currentStreak(metWeeks, opts.today),
    /** Semanas con la meta cumplida en total: alimentan la evolución del avatar. */
    weeksMet: metWeeks.size,
    week: {
      start: weekStart,
      sessions: thisWeek.length,
      target: opts.weeklyTarget,
      days: weekDays(opts.today).map((date) => ({ date, trained: trainedDates.has(date) })),
    },
    zones: zoneActivity(thisWeek),
    challenges: {
      balancedWeek: balancedWeek(thisWeek),
      valleySessions: valleySessions(thisWeek),
    },
  }
}

export type LigaSummary = ReturnType<typeof ligaSummary>
