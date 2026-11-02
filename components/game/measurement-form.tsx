'use client'

import { useActionState } from 'react'
import { logMeasurement, type GameFormState } from '@/app/actions/game'

const inputClass =
  'w-full rounded-xl border border-white/10 bg-surface-2 px-3.5 py-3 font-mono text-base text-text-primary outline-none transition-colors placeholder:text-text-disabled focus:border-highlight'

function Field({
  id,
  label,
  unit,
  ...props
}: { id: string; label: string; unit?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm text-text-secondary">
        {label}
        {unit ? <span className="text-text-muted"> ({unit})</span> : null}
      </label>
      <input id={id} name={id} className={inputClass} {...props} />
    </div>
  )
}

export function MeasurementForm({ today, heightCm }: { today: string; heightCm: number | null }) {
  const [state, action, pending] = useActionState<GameFormState, FormData>(
    logMeasurement,
    undefined
  )

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field id="measured_at" label="Fecha" type="date" defaultValue={today} max={today} required />
        <Field
          id="weight_kg"
          label="Peso"
          unit="kg"
          type="number"
          inputMode="decimal"
          step="0.1"
          min={25}
          max={300}
          required
        />
        <Field
          id="height_cm"
          label="Talla"
          unit="cm"
          type="number"
          inputMode="numeric"
          step="1"
          min={120}
          max={230}
          defaultValue={heightCm ?? undefined}
          placeholder="Opcional"
        />
        <Field
          id="waist_cm"
          label="Cintura"
          unit="cm"
          type="number"
          inputMode="decimal"
          step="0.1"
          min={40}
          max={250}
          placeholder="Opcional"
        />
        <Field
          id="body_fat_pct"
          label="Grasa"
          unit="%"
          type="number"
          inputMode="decimal"
          step="0.1"
          min={2}
          max={70}
          placeholder="Opcional"
        />
      </div>

      <p aria-live="polite" className="text-sm">
        {state?.error ? (
          <span role="alert" className="text-danger">
            {state.error}
          </span>
        ) : state?.ok ? (
          <span className="text-success">Medida guardada.</span>
        ) : null}
      </p>

      <button
        type="submit"
        disabled={pending}
        className="min-h-12 w-full rounded-xl bg-primary px-4 font-semibold text-text-primary transition-colors duration-200 hover:bg-primary-hover disabled:opacity-60"
      >
        {pending ? 'Guardando…' : 'Guardar medida'}
      </button>
    </form>
  )
}
