import type { AvatarConfig } from '@/lib/game/avatar-options'
import type { BodyParams } from '@/lib/game/avatar-params'

// Paleta Midnight Crystal para la ropa; piel y pelo vienen del usuario.
const SHIRT = '#274690'
const SHIRT_DETAIL = '#1b2f56'
const SHORTS = '#101827'
const ACCENT = '#315da8'
const SHOES = '#d1d5db'
const INK = '#0a0f18'

/** Mezcla `[masculino, femenino]` que da forma a hombros, cintura y cadera. */
const BODY_MIX = { male: [1, 0], female: [0, 1], neutral: [0.5, 0.5] } as const

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Oscurece un color hex (k < 1). */
function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16)
  const channels = [n >> 16, (n >> 8) & 255, n & 255].map((v) =>
    Math.round(Math.max(0, Math.min(255, v * k)))
  )
  return `rgb(${channels.join(',')})`
}

const VIEWBOX = { full: '22 18 156 268', bust: '50 16 100 100' } as const

/**
 * Avatar de frente, dibujado a partir de parámetros (no de una foto).
 * `full` muestra el cuerpo entero; `bust`, cabeza y hombros.
 */
export function Avatar({
  config,
  params,
  variant = 'full',
  label,
  className,
  placement,
}: {
  config: AvatarConfig
  params: BodyParams
  variant?: keyof typeof VIEWBOX
  label: string
  className?: string
  /** Para dibujarlo dentro de otro SVG (p. ej. el mapa). */
  placement?: { x: number; y: number; size: number }
}) {
  const { fat, muscle, tall } = params
  const [masc, fem] = BODY_MIX[params.body]

  const shoulder = lerp(30, 36, masc) + muscle * 9 + fat * 6
  const waist = lerp(20, 16, fem) + fat * 30 - muscle * 3
  const hip = lerp(22, 27, fem) + fat * 16
  const arm = 6 + fat * 7 + muscle * 5
  const leg = 9 + fat * 8 + muscle * 4
  const belly = fat * 22
  const h = lerp(0.9, 1.08, tall)

  const cx = 100
  const neckY = 70
  const shoulderY = 82
  const waistY = shoulderY + 62 * h
  const hipY = waistY + 22 * h
  const footY = hipY + 100 * h

  const skin = config.skin
  const longHair = fem > 0.6

  return (
    <svg
      viewBox={VIEWBOX[variant]}
      role="img"
      aria-label={label}
      className={className}
      x={placement?.x}
      y={placement?.y}
      width={placement?.size}
      height={placement?.size}
    >
      <ellipse cx={cx} cy={footY + 6} rx={hip + 18} ry={6} fill="rgba(0,0,0,.4)" />

      {/* Piernas y zapatillas */}
      <rect x={cx - hip + 4} y={hipY - 4} width={leg * 2} height={footY - hipY} rx={leg} fill={skin} />
      <rect x={cx + hip - 4 - leg * 2} y={hipY - 4} width={leg * 2} height={footY - hipY} rx={leg} fill={skin} />
      <rect x={cx - hip + 2} y={footY - 8} width={leg * 2 + 6} height={10} rx={5} fill={SHOES} />
      <rect x={cx + hip - 8 - leg * 2} y={footY - 8} width={leg * 2 + 6} height={10} rx={5} fill={SHOES} />

      {/* Short */}
      <path
        d={`M${cx - waist - 2} ${waistY} L${cx + waist + 2} ${waistY} L${cx + hip + 2} ${hipY + 26 * h} L${cx + 4} ${hipY + 26 * h} L${cx} ${hipY + 4} L${cx - 4} ${hipY + 26 * h} L${cx - hip - 2} ${hipY + 26 * h} Z`}
        fill={SHORTS}
      />

      {/* Brazos */}
      <path
        d={`M${cx - shoulder + 2} ${shoulderY + 4} q${-arm - 6} ${40 * h} ${-arm - 2} ${76 * h}`}
        stroke={skin}
        strokeWidth={arm * 2}
        strokeLinecap="round"
        fill="none"
      />
      <path
        d={`M${cx + shoulder - 2} ${shoulderY + 4} q${arm + 6} ${40 * h} ${arm + 2} ${76 * h}`}
        stroke={skin}
        strokeWidth={arm * 2}
        strokeLinecap="round"
        fill="none"
      />

      {/* Torso */}
      <path
        d={`M${cx - shoulder} ${shoulderY} Q${cx} ${shoulderY - 8} ${cx + shoulder} ${shoulderY}
            Q${cx + shoulder + 2} ${shoulderY + 24} ${cx + waist + belly * 0.6} ${waistY - 20 * h}
            Q${cx + waist + belly} ${waistY - 6} ${cx + waist + 2} ${waistY + 2}
            L${cx - waist - 2} ${waistY + 2}
            Q${cx - waist - belly} ${waistY - 6} ${cx - waist - belly * 0.6} ${waistY - 20 * h}
            Q${cx - shoulder - 2} ${shoulderY + 24} ${cx - shoulder} ${shoulderY} Z`}
        fill={SHIRT}
      />
      <path d={`M${cx - waist + 4} ${waistY - 4} h${(waist - 4) * 2}`} stroke={ACCENT} strokeWidth={3} />
      {muscle > 0.45 ? (
        <>
          <path d={`M${cx - 12} ${shoulderY + 20} q12 8 24 0`} stroke={SHIRT_DETAIL} strokeWidth={2.5} fill="none" />
          <path d={`M${cx} ${shoulderY + 12} v${30 * h}`} stroke={SHIRT_DETAIL} strokeWidth={2} />
        </>
      ) : null}

      {/* Cuello y cabeza */}
      <rect x={cx - 7} y={neckY - 6} width={14} height={shoulderY - neckY + 8} rx={6} fill={shade(skin, 0.85)} />
      {longHair ? (
        <path d={`M${cx - 24} ${neckY - 26} q-4 34 6 44 h36 q10 -10 6 -44 z`} fill={config.hair} />
      ) : null}
      <ellipse cx={cx} cy={neckY - 22} rx={19 + fat * 7} ry={23} fill={skin} />
      <path
        d={`M${cx - 21} ${neckY - 26} q2 -24 21 -24 q20 0 21 22 q-10 -10 -22 -10 q-12 0 -20 12z`}
        fill={config.hair}
      />
      <circle cx={cx - 7} cy={neckY - 22} r={2.4} fill={INK} />
      <circle cx={cx + 7} cy={neckY - 22} r={2.4} fill={INK} />
      <path
        d={`M${cx - 7} ${neckY - 12} q7 ${4 + muscle * 3} 14 0`}
        stroke={INK}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
      />

      {/* Accesorio */}
      {config.accessory === 'headband' ? (
        <rect x={cx - 21} y={neckY - 42} width={42} height={6} rx={3} fill={ACCENT} />
      ) : null}
      {config.accessory === 'cap' ? (
        <>
          <path d={`M${cx - 22} ${neckY - 30} q0 -22 22 -22 q22 0 22 22 z`} fill="#14213d" />
          <rect x={cx - 4} y={neckY - 33} width={32} height={5} rx={2.5} fill="#14213d" />
          <circle cx={cx} cy={neckY - 51} r={2} fill={ACCENT} />
        </>
      ) : null}
      {config.accessory === 'glasses' ? (
        <g stroke={SHOES} strokeWidth={1.6} fill="none">
          <circle cx={cx - 7} cy={neckY - 22} r={5.5} />
          <circle cx={cx + 7} cy={neckY - 22} r={5.5} />
          <path d={`M${cx - 1.5} ${neckY - 22} h3`} />
        </g>
      ) : null}
    </svg>
  )
}
