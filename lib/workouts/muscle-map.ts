// Músculos del mapa anatómico y cómo se relacionan con los campos del
// catálogo (`body_part` = zona, `target` = músculo principal).

export const MAP_MUSCLES = [
  'chest',
  'abs',
  'obliques',
  'neck',
  'trapezius',
  'upper-back',
  'lower-back',
  'front-deltoids',
  'back-deltoids',
  'biceps',
  'triceps',
  'forearm',
  'quadriceps',
  'hamstring',
  'gluteal',
  'adductor',
  'abductors',
  'calves',
  'left-soleus',
  'right-soleus',
] as const

export type MapMuscle = (typeof MAP_MUSCLES)[number]

export const ZONE_MUSCLES: Record<string, MapMuscle[]> = {
  chest: ['chest'],
  back: ['trapezius', 'upper-back', 'lower-back'],
  shoulders: ['front-deltoids', 'back-deltoids'],
  'upper arms': ['biceps', 'triceps'],
  'lower arms': ['forearm'],
  'upper legs': ['quadriceps', 'hamstring', 'gluteal', 'adductor', 'abductors'],
  'lower legs': ['calves', 'left-soleus', 'right-soleus'],
  waist: ['abs', 'obliques'],
  neck: ['neck'],
}

/** Zonas que solo se ven por detrás: al elegirlas, el mapa se gira. */
export const BACK_ZONES = new Set(['back'])

// Valores de `target` de los dos datasets importados.
const TARGET_MUSCLES: Record<string, MapMuscle[]> = {
  pectorals: ['chest'],
  chest: ['chest'],
  'serratus anterior': ['chest'],
  abs: ['abs', 'obliques'],
  abdominals: ['abs', 'obliques'],
  lats: ['upper-back'],
  'upper back': ['upper-back'],
  'middle back': ['upper-back'],
  'lower back': ['lower-back'],
  spine: ['lower-back'],
  traps: ['trapezius'],
  'levator scapulae': ['trapezius'],
  neck: ['neck'],
  delts: ['front-deltoids', 'back-deltoids'],
  shoulders: ['front-deltoids', 'back-deltoids'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  forearms: ['forearm'],
  quads: ['quadriceps'],
  quadriceps: ['quadriceps'],
  hamstrings: ['hamstring'],
  glutes: ['gluteal'],
  adductors: ['adductor'],
  abductors: ['abductors'],
  calves: ['calves', 'left-soleus', 'right-soleus'],
}

/** Músculos que trabaja un ejercicio: por su `target` y, si no, por su zona. */
export function musclesFor(target: string | null, bodyPart: string | null): MapMuscle[] {
  const byTarget = target ? TARGET_MUSCLES[target.toLowerCase()] : undefined
  if (byTarget) return byTarget
  return bodyPart ? (ZONE_MUSCLES[bodyPart] ?? []) : []
}
