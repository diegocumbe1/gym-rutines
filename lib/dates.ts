export const TIME_ZONE = 'America/Bogota'

export function todayDateString() {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())

  const year = parts.find((part) => part.type === 'year')?.value
  const month = parts.find((part) => part.type === 'month')?.value
  const day = parts.find((part) => part.type === 'day')?.value

  return `${year}-${month}-${day}`
}

export function addDays(dateString: string, days: number) {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days, 12))
  return date.toISOString().slice(0, 10)
}

export function startOfWeek(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12))
  const dayOfWeek = date.getUTCDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  return addDays(dateString, mondayOffset)
}

export function weekDays(dateString: string) {
  const weekStart = startOfWeek(dateString)
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index))
}

/** Mes al que pertenece una fecha, como `YYYY-MM`. */
export function monthOf(dateString: string) {
  return dateString.slice(0, 7)
}

export function isMonthKey(value: string) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

export function addMonths(monthKey: string, months: number) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1 + months, 1, 12))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function monthLabel(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, 1, 12))
  const formatted = new Intl.DateTimeFormat('es', {
    timeZone: TIME_ZONE,
    month: 'long',
    year: 'numeric',
  }).format(date)

  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

/**
 * Días del mes en semanas completas (de lunes a domingo), incluyendo los días
 * del mes vecino que rellenan la primera y la última semana.
 */
export function monthGridDays(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number)
  const daysInMonth = new Date(Date.UTC(year, month, 0, 12)).getUTCDate()
  const lastDay = `${monthKey}-${String(daysInMonth).padStart(2, '0')}`

  const days: string[] = []
  let cursor = startOfWeek(`${monthKey}-01`)
  while (cursor <= lastDay || days.length % 7 !== 0) {
    days.push(cursor)
    cursor = addDays(cursor, 1)
  }

  return days
}

export function shortDayLabel(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12))
  return new Intl.DateTimeFormat('es', {
    timeZone: TIME_ZONE,
    weekday: 'short',
  })
    .format(date)
    .replace('.', '')
}

export function dayNumberLabel(dateString: string) {
  const [, , day] = dateString.split('-')
  return String(Number(day))
}

/** Rango de una semana: "1 – 7 de septiembre" o "29 de agosto – 4 de septiembre". */
export function weekRangeLabel(weekStart: string) {
  const weekEnd = addDays(weekStart, 6)
  const startDay = dayNumberLabel(weekStart)
  const endDay = dayNumberLabel(weekEnd)
  const startMonth = monthNameLabel(weekStart)
  const endMonth = monthNameLabel(weekEnd)

  return startMonth === endMonth
    ? `${startDay} – ${endDay} de ${endMonth}`
    : `${startDay} de ${startMonth} – ${endDay} de ${endMonth}`
}

function monthNameLabel(dateString: string) {
  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12))
  return new Intl.DateTimeFormat('es', {
    timeZone: TIME_ZONE,
    month: 'long',
  }).format(date)
}

export function dateLabel(dateString: string) {
  const today = todayDateString()
  if (dateString === today) return 'Hoy'
  if (dateString === addDays(today, 1)) return 'Mañana'

  const [year, month, day] = dateString.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day, 12))
  const formatted = new Intl.DateTimeFormat('es', {
    timeZone: TIME_ZONE,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date)

  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}
