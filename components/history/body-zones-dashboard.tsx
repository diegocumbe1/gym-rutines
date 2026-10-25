'use client'

import { useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { RefreshCw } from 'lucide-react'
import { bodyPartLabel } from '@/lib/exercises/labels'
import type { BodyPartStats } from '@/lib/workouts/history-stats'
import { BACK_ZONES, type MapMuscle } from '@/lib/workouts/muscle-map'
import { MuscleMap } from './muscle-map'

type Side = 'front' | 'back'

const SIDE_LABELS: Record<Side, string> = { front: 'Frente', back: 'Espalda' }

/** Zonas que solo se ven de frente. */
const FRONT_ZONES = new Set(['chest', 'waist', 'neck'])

function kg(value: number) {
  return `${value.toLocaleString('es', { maximumFractionDigits: 1 })} kg`
}

export function BodyZonesDashboard({
  stats,
  muscleSets,
}: {
  stats: BodyPartStats[]
  muscleSets: Partial<Record<MapMuscle, number>>
}) {
  // `stats` llega ordenado por series: la primera es la zona más trabajada.
  const [selected, setSelected] = useState<string | null>(stats[0]?.bodyPart ?? null)
  // Giro en grados, acumulado: 0 = frente, 180 = espalda, 360 = frente…
  const [angle, setAngle] = useState(selected && BACK_ZONES.has(selected) ? 180 : 0)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ startX: number; startAngle: number; moved: boolean } | null>(null)
  const side: Side = Math.abs(Math.round(angle / 180)) % 2 === 1 ? 'back' : 'front'
  const current = stats.find((zone) => zone.bodyPart === selected) ?? null

  function setSide(next: Side) {
    // Gira por el camino más corto desde el ángulo actual.
    setAngle((prev) => {
      const front = Math.round(prev / 360) * 360
      if (next === 'front') return front
      return Math.abs(front + 180 - prev) <= Math.abs(front - 180 - prev)
        ? front + 180
        : front - 180
    })
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    drag.current = { startX: event.clientX, startAngle: angle, moved: false }
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const state = drag.current
    if (!state) return
    const dx = event.clientX - state.startX
    if (!state.moved && Math.abs(dx) < 6) return
    if (!state.moved) {
      state.moved = true
      setDragging(true)
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    setAngle(state.startAngle + dx * 0.9)
  }

  function onPointerUp() {
    if (!drag.current) return
    // Al soltar queda de frente o de espaldas, lo que esté más cerca.
    if (drag.current.moved) setAngle((prev) => Math.round(prev / 180) * 180)
    setDragging(false)
    // Se limpia después del click para poder ignorarlo si hubo arrastre.
    setTimeout(() => (drag.current = null), 0)
  }

  function onClickCapture(event: MouseEvent) {
    // Un arrastre para girar no cuenta como tocar un músculo.
    if (drag.current?.moved) event.stopPropagation()
  }

  function selectZone(zone: string) {
    setSelected(zone)
    // Gira el cuerpo hacia el lado donde se ve la zona elegida.
    if (BACK_ZONES.has(zone)) setSide('back')
    else if (FRONT_ZONES.has(zone)) setSide('front')
  }

  return (
    <div className="space-y-3">
      <div className="crystal-surface space-y-2 rounded-2xl p-3">
        <div className="flex items-center justify-between gap-2">
          <div role="group" aria-label="Vista del cuerpo" className="flex gap-1">
            {(['front', 'back'] as const).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={side === option}
                onClick={() => setSide(option)}
                className={`min-h-11 rounded-lg border px-3 text-sm transition-colors ${
                  side === option
                    ? 'border-highlight/40 bg-primary text-text-primary'
                    : 'border-white/10 text-text-muted hover:text-text-secondary'
                }`}
              >
                {SIDE_LABELS[option]}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setAngle((prev) => Math.round(prev / 180) * 180 + 180)}
            aria-label="Girar el cuerpo"
            className="flex size-11 items-center justify-center rounded-lg border border-white/10 text-text-muted transition-colors hover:text-text-secondary"
          >
            <RefreshCw size={18} strokeWidth={1.75} aria-hidden />
          </button>
        </div>

        <div
          className={`touch-pan-y select-none perspective-[1200px] ${
            dragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onClickCapture={onClickCapture}
        >
          <div
            className={`relative mx-auto h-96 max-w-48 transform-3d ${
              dragging ? '' : 'transition-transform duration-700 motion-reduce:transition-none'
            }`}
            style={{ transform: `rotateY(${angle}deg)` }}
          >
            <div className="absolute inset-0 backface-hidden" aria-hidden={side !== 'front'}>
              <MuscleMap
                side="front"
                muscleSets={muscleSets}
                selectedZone={selected}
                onSelectZone={selectZone}
              />
            </div>
            <div
              className="absolute inset-0 rotate-y-180 backface-hidden"
              aria-hidden={side !== 'back'}
            >
              <MuscleMap
                side="back"
                muscleSets={muscleSets}
                selectedZone={selected}
                onSelectZone={selectZone}
              />
            </div>
          </div>
        </div>

        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-text-muted">
          <span className="w-full text-center">Arrastra el cuerpo para girarlo</span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-sm bg-[#5b8def]" />
            Más series = más intenso
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-sm bg-[#f0643c]" />
            Zona elegida
          </span>
        </p>
      </div>

      <div role="group" aria-label="Zonas entrenadas" className="flex flex-wrap gap-2">
        {stats.map((zone) => {
          const active = zone.bodyPart === selected
          return (
            <button
              key={zone.bodyPart}
              type="button"
              aria-pressed={active}
              onClick={() => selectZone(zone.bodyPart)}
              className={`min-h-11 rounded-xl border px-3 py-2 text-sm transition-colors ${
                active
                  ? 'border-highlight/40 bg-primary text-text-primary'
                  : 'border-white/10 text-text-muted hover:text-text-secondary'
              }`}
            >
              {zone.label}{' '}
              <span className="font-mono text-xs opacity-80">{zone.sets}</span>
            </button>
          )
        })}
      </div>

      {selected ? (
        <div aria-live="polite" className="crystal-surface rounded-2xl p-4">
          <p className="text-sm font-semibold text-text-secondary">
            {current?.label ?? bodyPartLabel(selected)}
          </p>
          {current ? (
            <>
              <dl className="mt-2 grid grid-cols-3 gap-2">
                <div>
                  <dt className="text-xs text-text-muted">Series</dt>
                  <dd className="font-mono text-lg font-semibold text-text-primary">
                    {current.sets}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-text-muted">Prom./serie</dt>
                  <dd className="font-mono text-lg font-semibold text-text-primary">
                    {current.avgWeight !== null ? kg(current.avgWeight) : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-text-muted">Máximo</dt>
                  <dd className="font-mono text-lg font-semibold text-text-primary">
                    {current.top ? kg(current.top.weight) : '—'}
                  </dd>
                </div>
              </dl>
              {current.top ? (
                <p className="mt-2 line-clamp-1 text-xs capitalize text-text-muted">
                  Máximo en {current.top.name}
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-1 text-sm text-text-muted">Sin series en este periodo.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}
