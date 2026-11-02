import { HAIR_COLORS, SKIN_TONES, type AvatarConfig } from '@/lib/game/avatar-options'

/**
 * Sugiere tono de piel y color de pelo a partir de una selfie.
 *
 * Privacidad: la imagen se dibuja en un canvas en memoria del navegador, se
 * leen unos píxeles promedio y se descarta. No se sube ni se guarda.
 */
export async function suggestColorsFromPhoto(
  file: File
): Promise<Pick<AvatarConfig, 'skin' | 'hair'>> {
  const bitmap = await createImageBitmap(file)
  try {
    const size = 144
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('canvas no disponible')

    // Recorte cuadrado centrado.
    const side = Math.min(bitmap.width, bitmap.height)
    ctx.drawImage(
      bitmap,
      (bitmap.width - side) / 2,
      (bitmap.height - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size
    )

    // Supone una selfie centrada: mejillas al centro, pelo arriba.
    const skin = nearest(average(ctx, 52, 64, 40, 24), SKIN_TONES)
    const hair = nearest(average(ctx, 52, 6, 40, 14), HAIR_COLORS)
    ctx.clearRect(0, 0, size, size)
    return { skin, hair }
  } finally {
    bitmap.close()
  }
}

function average(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  const data = ctx.getImageData(x, y, w, h).data
  let r = 0
  let g = 0
  let b = 0
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]
    g += data[i + 1]
    b += data[i + 2]
  }
  const n = data.length / 4
  return [r / n, g / n, b / n] as const
}

function nearest<T extends string>(rgb: readonly [number, number, number], palette: readonly T[]): T {
  let best = palette[0]
  let bestDistance = Infinity
  for (const hex of palette) {
    const n = parseInt(hex.slice(1), 16)
    const candidate = [n >> 16, (n >> 8) & 255, n & 255]
    const distance = candidate.reduce((sum, value, i) => sum + (value - rgb[i]) ** 2, 0)
    if (distance < bestDistance) {
      best = hex
      bestDistance = distance
    }
  }
  return best
}
