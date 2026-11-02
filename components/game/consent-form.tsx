'use client'

import { useActionState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { grantMeasurementsConsent, type GameFormState } from '@/app/actions/game'

/** Autorización explícita (Ley 1581 de 2012) antes de guardar talla y medidas. */
export function ConsentForm() {
  const [state, action, pending] = useActionState<GameFormState, FormData>(
    grantMeasurementsConsent,
    undefined
  )

  return (
    <form action={action} className="crystal-surface space-y-4 rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck size={20} strokeWidth={1.75} className="text-highlight" aria-hidden="true" />
        <h2 className="font-semibold text-text-primary">Antes de guardar tus medidas</h2>
      </div>

      <div className="space-y-2 text-sm text-text-secondary">
        <p>
          Tu peso, talla, cintura y % de grasa son <strong>datos sensibles</strong>. Te pedimos
          autorización para guardarlos.
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Solo se usan para dibujar la silueta de tu avatar y mostrarte tu evolución.</li>
          <li>Son privados: nunca aparecen en rankings, ligas ni enlaces compartidos.</li>
          <li>Puedes borrarlos todos cuando quieras desde esta misma pantalla.</li>
          <li>No son una valoración médica ni una recomendación de salud.</li>
        </ul>
      </div>

      <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-text-primary">
        <input
          type="checkbox"
          name="consent"
          required
          className="mt-0.5 size-5 shrink-0 accent-highlight"
        />
        Autorizo el tratamiento de mis medidas corporales para estos fines.
      </label>

      {state?.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-xl bg-primary px-4 font-semibold text-text-primary transition-colors duration-200 hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? 'Guardando…' : 'Autorizar y continuar'}
      </button>
    </form>
  )
}
