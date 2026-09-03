'use client'

import { Clock3, Pause, Play, RotateCcw } from 'lucide-react'
import { formatClock } from '@/lib/workouts/tracking'

/**
 * Panel del cronómetro (solo presentación). El estado lo aporta quien lo usa
 * con `useSessionTimer`, para que la tarjeta de la sesión pueda además cerrar
 * el entrenamiento y la vista pública no.
 */
export function SessionTimerPanel({
  elapsed,
  running,
  onStart,
  onPause,
  onReset,
  className = '',
  hint,
  children,
}: {
  elapsed: number
  running: boolean
  onStart: () => void
  onPause: () => void
  onReset: () => void
  className?: string
  hint?: string
  /** Acción extra dentro de la misma fila de botones (p. ej. Finalizar). */
  children?: React.ReactNode
}) {
  return (
    <div
      className={`rounded-2xl border border-highlight/30 bg-surface-2/95 p-3 shadow-[0_0_30px_rgba(49,93,168,0.14)] backdrop-blur-xl ${className}`}
    >
      <div className="flex flex-col gap-3">
        <div>
          <p className="flex items-center gap-1 text-xs uppercase text-text-muted">
            <Clock3 size={14} strokeWidth={1.75} /> Tiempo total
          </p>
          <p
            className="mt-1 font-mono text-3xl font-semibold text-text-primary"
            aria-live="off"
          >
            {formatClock(elapsed)}
          </p>
          {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
        </div>

        <div className={`grid gap-2 ${children ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <button
            type="button"
            disabled={running}
            onClick={onStart}
            className="flex items-center justify-center gap-1 rounded-lg border border-highlight/30 bg-primary px-2 py-2 text-xs font-semibold text-text-primary transition-colors hover:bg-primary-hover disabled:opacity-40"
          >
            <Play size={15} strokeWidth={1.75} />
            Iniciar
          </button>
          <button
            type="button"
            disabled={!running}
            onClick={onPause}
            className="flex items-center justify-center gap-1 rounded-lg border border-white/10 px-2 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary disabled:opacity-40"
          >
            <Pause size={15} strokeWidth={1.75} />
            Pausar
          </button>
          <button
            type="button"
            onClick={onReset}
            className="flex items-center justify-center gap-1 rounded-lg border border-white/10 px-2 py-2 text-xs font-semibold text-text-secondary transition-colors hover:bg-surface-3 hover:text-text-primary"
          >
            <RotateCcw size={15} strokeWidth={1.75} />
            Reiniciar
          </button>
          {children}
        </div>
      </div>
    </div>
  )
}
