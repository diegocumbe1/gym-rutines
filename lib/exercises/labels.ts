// Etiquetas en español para los valores (en inglés) del dataset.

export const BODY_PART_LABELS: Record<string, string> = {
  back: 'Espalda',
  cardio: 'Cardio',
  chest: 'Pecho',
  'lower arms': 'Antebrazos',
  'lower legs': 'Pantorrillas',
  neck: 'Cuello',
  shoulders: 'Hombros',
  'upper arms': 'Brazos',
  'upper legs': 'Piernas',
  waist: 'Core',
}

// Orden estable para los filtros de la biblioteca.
export const BODY_PARTS = Object.keys(BODY_PART_LABELS)

export function bodyPartLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return BODY_PART_LABELS[value] ?? value
}
