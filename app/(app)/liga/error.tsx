'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function LigaError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="crystal-surface space-y-4 rounded-2xl p-6 text-center">
      <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-surface-2">
        <AlertTriangle size={22} strokeWidth={1.75} className="text-warning" aria-hidden="true" />
      </div>
      <p role="alert" className="text-text-secondary">
        No pudimos cargar Liga Fit. Revisa tu conexión e inténtalo de nuevo.
      </p>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="min-h-12 w-full rounded-xl bg-primary px-4 font-semibold text-text-primary transition-colors duration-200 hover:bg-primary-hover"
      >
        Reintentar
      </button>
    </div>
  )
}
