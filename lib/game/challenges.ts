import { TIME_ZONE } from '@/lib/dates'
import { sessionZones, type GameZoneId } from '@/lib/game/zones'
import type { GameSession } from '@/lib/game/weeks'

export const BALANCED_WEEK_ZONES = 4
export const VALLEY_START_HOUR = 10
export const VALLEY_END_HOUR = 16

/** Hora del día (0–23) en Bogotá de un instante ISO. */
function localHour(iso: string) {
  return Number(
    new Intl.DateTimeFormat('en', {
      timeZone: TIME_ZONE,
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(new Date(iso))
  )
}

/** "Hora valle": terminada entre las 10:00 y las 16:00 (hora de Bogotá). */
export function isValleyHour(completedAt: string | null) {
  if (!completedAt) return false
  const hour = localHour(completedAt)
  return hour >= VALLEY_START_HOUR && hour < VALLEY_END_HOUR
}

/** Reto "Semana balanceada": entrenar 4 zonas distintas en la semana. */
export function balancedWeek(weekSessions: GameSession[]) {
  const zones = new Set<GameZoneId>()
  for (const session of weekSessions) {
    for (const zone of sessionZones(session)) zones.add(zone)
  }
  const done = Math.min(zones.size, BALANCED_WEEK_ZONES)
  return { done, target: BALANCED_WEEK_ZONES, completed: done >= BALANCED_WEEK_ZONES }
}

/** Reto "Hora valle": cuántas sesiones de la semana se terminaron en hora valle. */
export function valleySessions(weekSessions: GameSession[]) {
  return weekSessions.filter((session) => isValleyHour(session.completed_at)).length
}
