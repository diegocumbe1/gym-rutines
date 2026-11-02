import { trainedBodyParts } from '@/lib/workouts/history-stats'
import type { GameSession } from '@/lib/game/weeks'

/** Zonas del mapa de Liga Fit, agrupando los `body_part` del catálogo. */
export const GAME_ZONES = [
  { id: 'chest-shoulders', label: 'Pecho y hombros', bodyParts: ['chest', 'shoulders'] },
  { id: 'back', label: 'Espalda', bodyParts: ['back', 'neck'] },
  { id: 'arms', label: 'Brazos', bodyParts: ['upper arms', 'lower arms'] },
  { id: 'legs', label: 'Piernas', bodyParts: ['upper legs', 'lower legs'] },
  { id: 'core', label: 'Core', bodyParts: ['waist'] },
  { id: 'cardio', label: 'Cardio', bodyParts: ['cardio'] },
] as const

export type GameZoneId = (typeof GAME_ZONES)[number]['id']

export function zoneForBodyPart(bodyPart: string): GameZoneId | null {
  const zone = GAME_ZONES.find((candidate) =>
    (candidate.bodyParts as readonly string[]).includes(bodyPart)
  )
  return zone?.id ?? null
}

/** Zonas que trabajó una sesión; aquí el cardio por tiempo sí cuenta. */
export function sessionZones(session: Pick<GameSession, 'exercises'>) {
  const zones = new Set<GameZoneId>()
  for (const bodyPart of trainedBodyParts(session.exercises, { includeTimed: true })) {
    const zone = zoneForBodyPart(bodyPart)
    if (zone) zones.add(zone)
  }
  return zones
}

export type ZoneActivity = {
  id: GameZoneId
  label: string
  /** Sesiones que trabajaron la zona, en el orden recibido. */
  sessions: Array<Pick<GameSession, 'id' | 'title' | 'scheduled_date'>>
}

/** Las 6 zonas, cada una con las sesiones que la trabajaron. */
export function zoneActivity(sessions: GameSession[]): ZoneActivity[] {
  const zonesBySession = sessions.map((session) => ({ session, zones: sessionZones(session) }))
  return GAME_ZONES.map((zone) => ({
    id: zone.id,
    label: zone.label,
    sessions: zonesBySession
      .filter(({ zones }) => zones.has(zone.id))
      .map(({ session }) => ({
        id: session.id,
        title: session.title,
        scheduled_date: session.scheduled_date,
      })),
  }))
}
