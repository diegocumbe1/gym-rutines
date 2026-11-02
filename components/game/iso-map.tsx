'use client'

import { useState } from 'react'
import {
  BicepsFlexed,
  Dumbbell,
  Footprints,
  HeartPulse,
  Layers,
  Target,
  type LucideIcon,
} from 'lucide-react'
import { Avatar } from '@/components/game/avatar'
import { dateLabel } from '@/lib/dates'
import type { AvatarConfig } from '@/lib/game/avatar-options'
import type { BodyParams } from '@/lib/game/avatar-params'
import type { GameZoneId, ZoneActivity } from '@/lib/game/zones'

const ZONE_ICONS: Record<GameZoneId, LucideIcon> = {
  'chest-shoulders': Dumbbell,
  back: Layers,
  arms: BicepsFlexed,
  legs: Footprints,
  core: Target,
  cardio: HeartPulse,
}

// Posición de cada zona en el plano del gimnasio (unidades de baldosa).
const LAYOUT: Record<GameZoneId, [number, number]> = {
  'chest-shoulders': [0.3, 0.3],
  back: [3.5, 0.3],
  arms: [6.7, 0.3],
  legs: [0.3, 3.5],
  core: [3.5, 3.5],
  cardio: [6.7, 3.5],
}
const ZONE_SIZE = 2.6

// Proyección isométrica: (x, y, altura) del plano → punto en pantalla.
const TILE_W = 40
const TILE_H = 20
const ORIGIN_X = 150
const ORIGIN_Y = 92

function iso(x: number, y: number, z = 0): [number, number] {
  return [((x - y) * TILE_W) / 2 + ORIGIN_X, ((x + y) * TILE_H) / 2 - z + ORIGIN_Y]
}

function points(list: Array<[number, number]>) {
  return list.map((point) => point.join(',')).join(' ')
}

const COLORS = {
  floorA: '#0a0f18',
  floorB: '#0d1320',
  wallLeft: '#101827',
  wallBack: '#162033',
  active: '#315da8',
  activeLeft: '#274690',
  activeRight: '#1b2f56',
  idle: '#162033',
  idleLeft: '#101827',
  idleRight: '#0a0f18',
}

/** Caja isométrica: cara superior y las dos laterales visibles. */
function IsoBox({
  x,
  y,
  w,
  d,
  h,
  top,
  left,
  right,
}: {
  x: number
  y: number
  w: number
  d: number
  h: number
  top: string
  left: string
  right: string
}) {
  return (
    <g>
      <polygon
        points={points([iso(x, y + d, 0), iso(x + w, y + d, 0), iso(x + w, y + d, h), iso(x, y + d, h)])}
        fill={left}
      />
      <polygon
        points={points([iso(x + w, y, 0), iso(x + w, y + d, 0), iso(x + w, y + d, h), iso(x + w, y, h)])}
        fill={right}
      />
      <polygon
        points={points([iso(x, y, h), iso(x + w, y, h), iso(x + w, y + d, h), iso(x, y + d, h)])}
        fill={top}
      />
    </g>
  )
}

function timesLabel(count: number) {
  if (count === 0) return 'Sin entrenar'
  return count === 1 ? '1 vez' : `${count} veces`
}

/**
 * "Mi gym": plano isométrico con las zonas entrenadas esta semana iluminadas
 * y, debajo, la misma información como lista accesible. Tocar una zona (en el
 * plano o en la lista) muestra las sesiones de la semana en esa zona.
 */
export function IsoMap({
  zones,
  avatar,
  params,
}: {
  zones: ZoneActivity[]
  avatar: AvatarConfig
  params: BodyParams
}) {
  const [selected, setSelected] = useState<GameZoneId | null>(
    zones.find((zone) => zone.sessions.length > 0)?.id ?? null
  )
  const selectedZone = zones.find((zone) => zone.id === selected) ?? null

  // De atrás hacia adelante, para que las cajas se tapen bien.
  const drawOrder = [...zones].sort(
    (a, b) => LAYOUT[a.id][0] + LAYOUT[a.id][1] - (LAYOUT[b.id][0] + LAYOUT[b.id][1])
  )

  const tiles: Array<[number, number]> = []
  for (let x = 0; x < 9.6; x += 1) for (let y = 0; y < 6.4; y += 1) tiles.push([x, y])

  // El avatar se para en la zona elegida; si no hay, en la entrada.
  const [ax, ay] = selected
    ? iso(LAYOUT[selected][0] + ZONE_SIZE, LAYOUT[selected][1] + ZONE_SIZE, 0)
    : iso(9.2, 6.2, 0)

  return (
    <div className="space-y-3">
      <div className="crystal-surface overflow-hidden rounded-2xl">
        {/* El plano es una vista visual; la lista de abajo es su equivalente accesible. */}
        <svg viewBox="0 10 352 270" className="block w-full" aria-hidden="true">
          {tiles.map(([x, y]) => (
            <polygon
              key={`${x}-${y}`}
              points={points([iso(x, y), iso(x + 1, y), iso(x + 1, y + 1), iso(x, y + 1)])}
              fill={(x + y) % 2 ? COLORS.floorA : COLORS.floorB}
            />
          ))}
          <IsoBox x={0} y={-0.4} w={9.6} d={0.4} h={56} top={COLORS.wallBack} left={COLORS.wallBack} right={COLORS.wallLeft} />
          <IsoBox x={-0.4} y={-0.4} w={0.4} d={6.8} h={56} top={COLORS.wallLeft} left={COLORS.wallLeft} right={COLORS.wallBack} />

          {drawOrder.map((zone) => {
            const [x, y] = LAYOUT[zone.id]
            const on = zone.sessions.length > 0
            const isSelected = zone.id === selected
            const height = on ? 10 : 6
            const [cx, cy] = iso(x + ZONE_SIZE / 2, y + ZONE_SIZE / 2, height)
            const Icon = ZONE_ICONS[zone.id]
            return (
              <g key={zone.id} className="cursor-pointer" onClick={() => setSelected(zone.id)}>
                {on ? (
                  <polygon
                    points={points([
                      iso(x - 0.15, y - 0.15),
                      iso(x + ZONE_SIZE + 0.15, y - 0.15),
                      iso(x + ZONE_SIZE + 0.15, y + ZONE_SIZE + 0.15),
                      iso(x - 0.15, y + ZONE_SIZE + 0.15),
                    ])}
                    fill={COLORS.active}
                    opacity={0.25}
                  />
                ) : null}
                <IsoBox
                  x={x}
                  y={y}
                  w={ZONE_SIZE}
                  d={ZONE_SIZE}
                  h={height}
                  top={on ? COLORS.active : COLORS.idle}
                  left={on ? COLORS.activeLeft : COLORS.idleLeft}
                  right={on ? COLORS.activeRight : COLORS.idleRight}
                />
                {isSelected ? (
                  <polygon
                    points={points([
                      iso(x, y, height),
                      iso(x + ZONE_SIZE, y, height),
                      iso(x + ZONE_SIZE, y + ZONE_SIZE, height),
                      iso(x, y + ZONE_SIZE, height),
                    ])}
                    fill="none"
                    stroke="#fafafa"
                    strokeWidth={1.5}
                  />
                ) : null}
                <Icon
                  x={cx - 11}
                  y={cy - 11}
                  size={22}
                  strokeWidth={1.75}
                  color={on ? '#fafafa' : '#6b7280'}
                />
              </g>
            )
          })}

          {/* Etiquetas encima de todas las cajas para que no queden tapadas. */}
          {zones.map((zone) => {
            const [x, y] = LAYOUT[zone.id]
            const [cx, cy] = iso(x + ZONE_SIZE / 2, y + ZONE_SIZE / 2, zone.sessions.length > 0 ? 10 : 6)
            const text = zone.sessions.length > 0 ? `${zone.label} · ${zone.sessions.length}` : zone.label
            const width = text.length * 5.6 + 16
            return (
              <g key={zone.id} pointerEvents="none">
                <rect
                  x={cx - width / 2}
                  y={cy + 14}
                  width={width}
                  height={17}
                  rx={6}
                  fill="rgba(10,15,24,.92)"
                  stroke="rgba(255,255,255,.08)"
                />
                <text
                  x={cx}
                  y={cy + 26}
                  textAnchor="middle"
                  fontSize={10.5}
                  fill={zone.sessions.length > 0 ? '#fafafa' : '#9ca3af'}
                >
                  {text}
                </text>
              </g>
            )
          })}

          <g
            style={{ transform: `translate(${ax}px, ${ay}px)` }}
            className="transition-transform duration-250 ease-out motion-reduce:transition-none"
            pointerEvents="none"
          >
            <ellipse cx={0} cy={0} rx={11} ry={4} fill="rgba(0,0,0,.45)" />
            <Avatar
              config={avatar}
              params={params}
              variant="bust"
              label="Tu avatar"
              placement={{ x: -16, y: -30, size: 32 }}
            />
          </g>
        </svg>
      </div>

      <ul className="grid grid-cols-2 gap-2" aria-label="Zonas de esta semana">
        {zones.map((zone) => {
          const Icon = ZONE_ICONS[zone.id]
          const on = zone.sessions.length > 0
          const isSelected = zone.id === selected
          return (
            <li key={zone.id}>
              <button
                type="button"
                onClick={() => setSelected(zone.id)}
                aria-pressed={isSelected}
                className={`flex min-h-14 w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors duration-200 focus-visible:outline focus-visible:outline-1 focus-visible:outline-highlight/50 ${
                  isSelected
                    ? 'border-highlight/50 bg-primary'
                    : 'border-white/5 bg-surface-2 hover:border-white/10'
                }`}
              >
                <Icon
                  size={20}
                  strokeWidth={1.75}
                  className={on ? 'text-highlight' : 'text-text-disabled'}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-text-primary">
                    {zone.label}
                  </span>
                  <span className={`block text-xs ${on ? 'text-text-secondary' : 'text-text-muted'}`}>
                    {timesLabel(zone.sessions.length)}
                  </span>
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {selectedZone ? (
        <section
          aria-live="polite"
          className="rounded-xl border border-white/5 bg-surface px-4 py-3"
        >
          <h3 className="text-sm font-semibold text-text-secondary">
            {selectedZone.label} esta semana
          </h3>
          {selectedZone.sessions.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {selectedZone.sessions.map((session) => (
                <li key={session.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate text-text-primary">{session.title}</span>
                  <span className="shrink-0 font-mono text-xs text-text-muted">
                    {dateLabel(session.scheduled_date)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-text-muted">
              Aún no has entrenado esta zona esta semana.
            </p>
          )}
        </section>
      ) : null}
    </div>
  )
}
