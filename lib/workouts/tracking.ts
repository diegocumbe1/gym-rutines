export const TRACKING_TYPES = [
  'sets_reps_weight',
  'bodyweight_reps',
  'duration',
  'single',
] as const

export type TrackingType = (typeof TRACKING_TYPES)[number]

export function isTrackingType(value: string): value is TrackingType {
  return TRACKING_TYPES.includes(value as TrackingType)
}

export function trackingTypeLabel(type: TrackingType) {
  switch (type) {
    case 'bodyweight_reps':
      return 'Peso corporal'
    case 'duration':
      return 'Por tiempo'
    case 'single':
      return 'Una vez'
    case 'sets_reps_weight':
    default:
      return 'Peso + series'
  }
}

export function tracksSets(type: TrackingType) {
  return type === 'sets_reps_weight' || type === 'bodyweight_reps'
}

export function tracksWeight(type: TrackingType) {
  return type === 'sets_reps_weight'
}

export function defaultTrackingForEquipment(equipment?: string | null): TrackingType {
  const normalized = equipment?.toLowerCase().trim() ?? ''
  if (
    normalized.includes('body weight') ||
    normalized.includes('bodyweight') ||
    normalized.includes('body only') ||
    normalized.includes('peso corporal')
  ) {
    return 'bodyweight_reps'
  }
  if (
    normalized.includes('cardio') ||
    normalized.includes('treadmill') ||
    normalized.includes('bike') ||
    normalized.includes('bicycle') ||
    normalized.includes('elliptical') ||
    normalized.includes('machine cardio')
  ) {
    return 'duration'
  }
  return 'sets_reps_weight'
}

export function defaultRestSeconds(type: TrackingType) {
  if (type === 'duration') return 60
  if (type === 'single') return null
  return 90
}

export function formatDuration(seconds: number | null | undefined) {
  if (!seconds) return ''
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 0 && secs > 0) return `${mins}m ${secs}s`
  if (mins > 0) return `${mins}m`
  return `${secs}s`
}
