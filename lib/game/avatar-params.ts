import type { AvatarBody, Goal } from '@/lib/game/avatar-options'

/** Cuánto músculo suma la constancia según el objetivo. */
export const GOAL_MUSCLE_FACTOR: Record<Goal, number> = {
  fuerza: 1,
  grasa: 0.55,
  bienestar: 0.4,
}

/** Semanas con la meta cumplida para llegar a la constancia máxima. */
const FULL_CONSISTENCY_WEEKS = 40
/** Silueta media cuando no hay talla y peso (sin medidas o sin consentimiento). */
const NEUTRAL_FAT = 0.35
const NEUTRAL_TALL = 0.5

const clamp = (value: number) => Math.max(0, Math.min(1, value))

export type BodyParams = {
  /** 0–1: volumen de la silueta. Solo orienta el dibujo, no juzga el cuerpo. */
  fat: number
  /** 0–1: definición que gana el avatar con la constancia. */
  muscle: number
  /** 0–1: altura relativa por la talla. */
  tall: number
  body: AvatarBody
}

export function bodyParams(input: {
  body: AvatarBody
  goal: Goal
  heightCm: number | null
  weightKg: number | null
  weeksMet: number
}): BodyParams {
  const muscle =
    clamp(input.weeksMet / FULL_CONSISTENCY_WEEKS) * GOAL_MUSCLE_FACTOR[input.goal]

  let fat = NEUTRAL_FAT
  if (input.heightCm && input.weightKg) {
    const bmi = input.weightKg / Math.pow(input.heightCm / 100, 2)
    fat = clamp((bmi - 19) / 15)
  }
  // Con fuerza, el peso que sube se interpreta como músculo.
  if (input.goal === 'fuerza') fat = clamp(fat - muscle * 0.25)

  const tall = input.heightCm ? clamp((input.heightCm - 145) / 55) : NEUTRAL_TALL

  return { fat, muscle, tall, body: input.body }
}

/** Mensaje de evolución: siempre positivo y relativo al objetivo, nunca al cuerpo. */
export function evolutionMessage(goal: Goal, weeksMet: number) {
  if (weeksMet === 0) {
    return 'Cumple tu primera meta semanal y tu avatar empezará a evolucionar.'
  }
  switch (goal) {
    case 'fuerza':
      return 'Tu avatar gana hombros, brazos y piernas con cada semana que cumples tu meta.'
    case 'grasa':
      return 'Tu constancia se nota: cada semana cumplida acerca a tu avatar a tu objetivo.'
    case 'bienestar':
      return 'Tu avatar gana energía con cada semana que entrenas.'
  }
}
