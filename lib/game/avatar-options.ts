// Opciones del avatar y del perfil de juego. Las comparten el editor (cliente),
// la validación Zod y el SVG del avatar.

export const GOALS = ['fuerza', 'grasa', 'bienestar'] as const
export type Goal = (typeof GOALS)[number]

export const GOAL_LABELS: Record<Goal, string> = {
  fuerza: 'Fuerza',
  grasa: 'Bajar grasa',
  bienestar: 'Bienestar',
}

export const WEEKLY_TARGET_MIN = 2
export const WEEKLY_TARGET_MAX = 5

export const AVATAR_BODIES = ['male', 'female', 'neutral'] as const
export type AvatarBody = (typeof AVATAR_BODIES)[number]

export const AVATAR_BODY_LABELS: Record<AvatarBody, string> = {
  male: 'Masculino',
  female: 'Femenino',
  neutral: 'Neutro',
}

export const SKIN_TONES = ['#f5d0b5', '#e8b48f', '#c68b59', '#9c6b43', '#6b4226', '#4a2c1a'] as const
export const HAIR_COLORS = ['#1f1410', '#4a2c1a', '#8b5a2b', '#d4a55c', '#b03a2e', '#9ca3af'] as const

export const ACCESSORIES = ['none', 'headband', 'cap', 'glasses'] as const
export type Accessory = (typeof ACCESSORIES)[number]

export const ACCESSORY_LABELS: Record<Accessory, string> = {
  none: 'Ninguno',
  headband: 'Banda',
  cap: 'Gorra',
  glasses: 'Gafas',
}

export type AvatarConfig = {
  body: AvatarBody
  skin: (typeof SKIN_TONES)[number]
  hair: (typeof HAIR_COLORS)[number]
  accessory: Accessory
}

export const DEFAULT_AVATAR: AvatarConfig = {
  body: 'neutral',
  skin: SKIN_TONES[2],
  hair: HAIR_COLORS[0],
  accessory: 'none',
}
