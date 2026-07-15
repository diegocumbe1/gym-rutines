'use client'

import { useActionState } from 'react'
import { Plus } from 'lucide-react'
import { createTemplate, type TemplateFormState } from '@/app/actions/templates'

export function CreateTemplateForm() {
  const [state, action, pending] = useActionState<TemplateFormState, FormData>(
    createTemplate,
    undefined
  )

  return (
    <form action={action} className="space-y-2">
      <div className="flex gap-2">
        <input
          name="name"
          required
          placeholder="Nueva plantilla (ej. Push A)"
          aria-label="Nombre de la plantilla"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-surface-2 px-3.5 py-2.5 text-base text-text-primary outline-none transition-colors placeholder:text-text-disabled focus:border-highlight"
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Crear plantilla"
          className="flex items-center gap-1 rounded-xl bg-primary px-3.5 py-2.5 text-sm font-semibold text-text-primary transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          <Plus size={18} strokeWidth={2} />
          Crear
        </button>
      </div>
      {state?.error && (
        <p className="text-sm text-danger" role="alert">
          {state.error}
        </p>
      )}
    </form>
  )
}
