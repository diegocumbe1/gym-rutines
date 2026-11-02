import { z } from 'zod'
import {
  ACCESSORIES,
  AVATAR_BODIES,
  GOALS,
  HAIR_COLORS,
  SKIN_TONES,
  WEEKLY_TARGET_MAX,
  WEEKLY_TARGET_MIN,
} from '@/lib/game/avatar-options'

export const avatarSchema = z.object({
  body: z.enum(AVATAR_BODIES, 'Elige un cuerpo para el avatar'),
  skin: z.enum(SKIN_TONES, 'Elige un tono de piel'),
  hair: z.enum(HAIR_COLORS, 'Elige un color de pelo'),
  accessory: z.enum(ACCESSORIES, 'Elige un accesorio'),
})

export const gameProfileSchema = z.object({
  avatar: avatarSchema,
  goal: z.enum(GOALS, 'Elige un objetivo'),
  weekly_target: z.coerce
    .number('Elige tu meta semanal')
    .int()
    .min(WEEKLY_TARGET_MIN, `La meta mínima es ${WEEKLY_TARGET_MIN} días`)
    .max(WEEKLY_TARGET_MAX, `La meta máxima es ${WEEKLY_TARGET_MAX} días`),
})

/** Campo numérico opcional de formulario: vacío = sin dato. */
function optionalNumber(schema: z.ZodNumber) {
  return z.preprocess(
    (value) => (value === '' || value === null ? undefined : value),
    z.coerce.number().pipe(schema).optional()
  )
}

export const measurementSchema = z.object({
  measured_at: z.iso.date('Fecha no válida'),
  weight_kg: z.coerce
    .number('Escribe tu peso')
    .min(25, 'Revisa el peso: mínimo 25 kg')
    .max(300, 'Revisa el peso: máximo 300 kg'),
  waist_cm: optionalNumber(
    z.number().min(40, 'Revisa la cintura: mínimo 40 cm').max(250, 'Revisa la cintura: máximo 250 cm')
  ),
  body_fat_pct: optionalNumber(
    z.number().min(2, 'Revisa el % de grasa: mínimo 2').max(70, 'Revisa el % de grasa: máximo 70')
  ),
  height_cm: optionalNumber(
    z.number().int('La talla va en centímetros enteros').min(120, 'Revisa la talla: mínimo 120 cm').max(230, 'Revisa la talla: máximo 230 cm')
  ),
})

export type MeasurementInput = z.infer<typeof measurementSchema>
