'use client'

import { SessionTimerPanel } from '@/components/workouts/session-timer-panel'
import { useSessionTimer } from '@/components/workouts/use-session-timer'

/**
 * Cronómetro autónomo para las vistas públicas: no guarda nada en el servidor,
 * el tiempo vive solo en el navegador de quien abre el enlace.
 */
export function SessionTimer({
  timerId,
  className,
}: {
  timerId: string
  className?: string
}) {
  const { elapsed, running, start, pause, reset } = useSessionTimer({
    sessionId: timerId,
    initialSeconds: 0,
  })

  return (
    <SessionTimerPanel
      elapsed={elapsed}
      running={running}
      onStart={start}
      onPause={pause}
      onReset={reset}
      className={className}
      hint="Se guarda solo en este dispositivo."
    />
  )
}
