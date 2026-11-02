/** XP acumulado desde el que empieza el nivel n: 100 × n^1,5. */
export function xpForLevel(level: number) {
  return Math.round(100 * Math.pow(level, 1.5))
}

export type LevelProgress = {
  level: number
  /** XP ganado dentro del nivel actual. */
  xpIntoLevel: number
  /** XP que falta para el siguiente nivel. */
  xpToNext: number
  /** 0–1, para la barra de progreso. */
  progress: number
}

export function levelForXp(xp: number): LevelProgress {
  const safeXp = Math.max(0, Math.floor(xp))
  // Estimación directa y ajuste por redondeo en los bordes.
  let level = Math.floor(Math.pow(safeXp / 100, 2 / 3))
  while (xpForLevel(level + 1) <= safeXp) level += 1
  while (level > 0 && xpForLevel(level) > safeXp) level -= 1

  const start = xpForLevel(level)
  const next = xpForLevel(level + 1)
  return {
    level,
    xpIntoLevel: safeXp - start,
    xpToNext: next - safeXp,
    progress: (safeXp - start) / (next - start),
  }
}
