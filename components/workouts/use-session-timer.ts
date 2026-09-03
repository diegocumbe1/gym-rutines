'use client'

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'

/**
 * Cronómetro de la sesión.
 *
 * El tiempo vive en el navegador (`localStorage`) guardando el instante de
 * arranque en milisegundos, así que sigue corriendo aunque se cambie de
 * pestaña, se navegue a otra sección o se cierre la app: al volver se recalcula
 * desde ese instante en lugar de reiniciarse.
 *
 * Se lee con `useSyncExternalStore` porque el servidor no puede acceder a
 * `localStorage`: renderiza sin tiempo guardado y el cliente se sincroniza
 * después, sin romper la hidratación.
 */

type StoredTimer = {
  /** Segundos acumulados en tramos ya cerrados. */
  base: number
  /** Instante (ms) en que arrancó el tramo en curso; null si está en pausa. */
  startedAt: number | null
  /** Última vez que se tocó el cronómetro; null en registros antiguos. */
  updatedAt: number | null
}

/**
 * Un entrenamiento no dura tanto: pasado este tiempo se entiende que el
 * cronómetro quedó olvidado de una sesión anterior y se descarta en vez de
 * arrastrar un tiempo que ya no significa nada.
 */
const MAX_TIMER_SECONDS = 3 * 60 * 60

function elapsedSeconds(timer: StoredTimer, at: number) {
  return timer.startedAt !== null
    ? timer.base + Math.floor((at - timer.startedAt) / 1000)
    : timer.base
}

function isExpired(timer: StoredTimer, at: number) {
  if (elapsedSeconds(timer, at) >= MAX_TIMER_SECONDS) return true

  // En pausa el tiempo no crece, así que se mira cuándo se tocó por última vez.
  return (
    timer.updatedAt !== null && at - timer.updatedAt >= MAX_TIMER_SECONDS * 1000
  )
}

// null = esta sesión no tiene tiempo guardado todavía.
const snapshots = new Map<string, StoredTimer | null>()
const listeners = new Map<string, Set<() => void>>()

function storageKey(sessionId: string) {
  return `gym-routines:session-timer:${sessionId}`
}

function readStoredTimer(sessionId: string): StoredTimer | null {
  try {
    const raw = window.localStorage.getItem(storageKey(sessionId))
    if (!raw) return null

    const parsed: unknown = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null) return null

    const { base, startedAt, updatedAt } = parsed as Partial<StoredTimer>
    const timer: StoredTimer = {
      base: typeof base === 'number' && base >= 0 ? Math.floor(base) : 0,
      startedAt:
        typeof startedAt === 'number' && startedAt > 0 ? startedAt : null,
      updatedAt:
        typeof updatedAt === 'number' && updatedAt > 0 ? updatedAt : null,
    }

    if (isExpired(timer, Date.now())) {
      removeStoredTimer(sessionId)
      return null
    }

    return timer
  } catch {
    // Almacenamiento bloqueado (modo privado): el cronómetro funciona igual,
    // solo que sin recordar el tiempo entre visitas.
    return null
  }
}

function notify(sessionId: string) {
  listeners.get(sessionId)?.forEach((listener) => listener())
}

function subscribe(sessionId: string, listener: () => void) {
  const current = listeners.get(sessionId) ?? new Set<() => void>()
  current.add(listener)
  listeners.set(sessionId, current)

  return () => {
    current.delete(listener)
  }
}

function getSnapshot(sessionId: string): StoredTimer | null {
  if (!snapshots.has(sessionId)) {
    snapshots.set(sessionId, readStoredTimer(sessionId))
  }
  return snapshots.get(sessionId) ?? null
}

function getServerSnapshot(): StoredTimer | null {
  return null
}

function removeStoredTimer(sessionId: string) {
  try {
    window.localStorage.removeItem(storageKey(sessionId))
  } catch {
    // Ignorado a propósito.
  }
}

function saveTimer(
  sessionId: string,
  value: Omit<StoredTimer, 'updatedAt'>
) {
  const timer: StoredTimer = { ...value, updatedAt: Date.now() }
  snapshots.set(sessionId, timer)
  try {
    window.localStorage.setItem(storageKey(sessionId), JSON.stringify(timer))
  } catch {
    // Persistir es una mejora, no un requisito: se sigue con el valor en memoria.
  }
  notify(sessionId)
}

function forgetTimer(sessionId: string) {
  snapshots.set(sessionId, null)
  removeStoredTimer(sessionId)
  notify(sessionId)
}

export function useSessionTimer({
  sessionId,
  initialSeconds,
}: {
  sessionId: string
  /** Tiempo a mostrar mientras no haya un cronómetro guardado en el navegador. */
  initialSeconds: number
}) {
  const stored = useSyncExternalStore(
    useCallback((listener: () => void) => subscribe(sessionId, listener), [
      sessionId,
    ]),
    useCallback(() => getSnapshot(sessionId), [sessionId]),
    getServerSnapshot
  )
  const [now, setNow] = useState(() => Date.now())

  const base = stored ? stored.base : initialSeconds
  const startedAt = stored?.startedAt ?? null
  const running = startedAt !== null
  const elapsed = running ? base + Math.floor((now - startedAt) / 1000) : base

  useEffect(() => {
    if (startedAt === null) return

    // El corte por tiempo también se aplica en marcha: si el cronómetro se
    // quedó corriendo, se descarta al llegar al límite en vez de seguir sumando.
    const tick = (at: number) => {
      if (base + Math.floor((at - startedAt) / 1000) >= MAX_TIMER_SECONDS) {
        forgetTimer(sessionId)
        return
      }
      setNow(at)
    }

    const id = window.setInterval(() => tick(Date.now()), 1000)
    // Al volver a la pestaña el intervalo puede llevar rato ralentizado: se
    // refresca al momento para no mostrar un tiempo atrasado.
    const syncOnVisible = () => {
      if (!document.hidden) tick(Date.now())
    }
    document.addEventListener('visibilitychange', syncOnVisible)

    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', syncOnVisible)
    }
  }, [base, sessionId, startedAt])

  const start = useCallback(() => {
    if (startedAt !== null) return
    setNow(Date.now())
    saveTimer(sessionId, { base, startedAt: Date.now() })
  }, [base, sessionId, startedAt])

  const pause = useCallback(() => {
    if (startedAt === null) return
    saveTimer(sessionId, {
      base: base + Math.floor((Date.now() - startedAt) / 1000),
      startedAt: null,
    })
  }, [base, sessionId, startedAt])

  const reset = useCallback(() => {
    setNow(Date.now())
    saveTimer(sessionId, { base: 0, startedAt: null })
  }, [sessionId])

  /** Olvida el tiempo guardado y vuelve al que venga del servidor. */
  const clear = useCallback(() => {
    forgetTimer(sessionId)
  }, [sessionId])

  return { elapsed, running, start, pause, reset, clear }
}
