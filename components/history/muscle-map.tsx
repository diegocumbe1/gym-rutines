'use client'

import { ZONE_MUSCLES, type MapMuscle } from '@/lib/workouts/muscle-map'
import {
  BACK_POLYGONS,
  FRONT_POLYGONS,
  type MusclePolygons,
} from './muscle-map-polygons'

const BODY = '#2e3a52'
const BODY_DETAIL = '#232c40'
const HEAT = '#5b8def'
const SELECTED = '#f0643c'

const MUSCLE_LABELS: Record<MapMuscle, string> = {
  chest: 'Pecho',
  abs: 'Abdomen',
  obliques: 'Oblicuos',
  neck: 'Cuello',
  trapezius: 'Trapecio',
  'upper-back': 'Espalda alta',
  'lower-back': 'Lumbar',
  'front-deltoids': 'Deltoides frontal',
  'back-deltoids': 'Deltoides posterior',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  forearm: 'Antebrazo',
  quadriceps: 'Cuádriceps',
  hamstring: 'Isquiotibiales',
  gluteal: 'Glúteos',
  adductor: 'Aductores',
  abductors: 'Abductores',
  calves: 'Gemelos',
  'left-soleus': 'Sóleo',
  'right-soleus': 'Sóleo',
}

const ZONE_OF_MUSCLE = new Map<MapMuscle, string>(
  Object.entries(ZONE_MUSCLES).flatMap(([zone, muscles]) =>
    muscles.map((muscle) => [muscle, zone] as const)
  )
)

function fillFor(
  muscle: MusclePolygons['muscle'],
  muscleSets: Partial<Record<MapMuscle, number>>,
  maxSets: number,
  selectedZone: string | null
) {
  if (muscle === 'head' || muscle === 'knees') {
    return { fill: BODY_DETAIL, opacity: 1 }
  }
  const sets = muscleSets[muscle] ?? 0
  const intensity = sets / maxSets
  if (selectedZone && ZONE_OF_MUSCLE.get(muscle) === selectedZone) {
    return { fill: SELECTED, opacity: sets > 0 ? 0.6 + 0.4 * intensity : 0.3 }
  }
  if (sets > 0) return { fill: HEAT, opacity: 0.35 + 0.65 * intensity }
  return { fill: BODY, opacity: 1 }
}

export function MuscleMap({
  side,
  muscleSets,
  selectedZone,
  onSelectZone,
}: {
  side: 'front' | 'back'
  muscleSets: Partial<Record<MapMuscle, number>>
  selectedZone: string | null
  onSelectZone: (zone: string) => void
}) {
  const polygons = side === 'front' ? FRONT_POLYGONS : BACK_POLYGONS
  const maxSets = Math.max(...Object.values(muscleSets), 1)

  return (
    <svg
      viewBox="0 0 100 200"
      className="h-full w-full"
      role="img"
      aria-label={side === 'front' ? 'Cuerpo de frente' : 'Cuerpo de espaldas'}
    >
      {polygons.map(({ muscle, points }) => {
        const { fill, opacity } = fillFor(muscle, muscleSets, maxSets, selectedZone)
        const mapMuscle = muscle === 'head' || muscle === 'knees' ? null : muscle
        const zone = mapMuscle ? ZONE_OF_MUSCLE.get(mapMuscle) : undefined
        return (
          <g
            key={`${side}-${muscle}`}
            onClick={zone ? () => onSelectZone(zone) : undefined}
            className={zone ? 'cursor-pointer' : undefined}
          >
            {mapMuscle ? <title>{MUSCLE_LABELS[mapMuscle]}</title> : null}
            {points.map((polygon) => (
              <polygon
                key={polygon}
                points={polygon}
                fill={fill}
                fillOpacity={opacity}
                stroke="#0a0f18"
                strokeWidth={0.4}
                strokeLinejoin="round"
                className="transition-[fill,fill-opacity] duration-300"
              />
            ))}
          </g>
        )
      })}
    </svg>
  )
}
