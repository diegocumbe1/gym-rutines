import { Trash2 } from 'lucide-react'
import { deleteAllMeasurements } from '@/app/actions/game'

/** Derecho de supresión: confirmación en dos pasos, sin JavaScript. */
export function DeleteMeasurements({ returnTo }: { returnTo: '/perfil' | '/liga/evolucion' }) {
  return (
    <details className="group rounded-xl border border-white/10">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-sm text-text-secondary transition-colors hover:text-text-primary">
        <Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />
        Borrar todas mis medidas
      </summary>
      <form action={deleteAllMeasurements} className="space-y-3 border-t border-white/5 px-4 py-3">
        <input type="hidden" name="return_to" value={returnTo} />
        <p className="text-sm text-text-muted">
          Se borran tu peso, cintura, % de grasa y talla, y se retira tu autorización. No se puede
          deshacer. Tus entrenos, nivel y racha no cambian.
        </p>
        <button
          type="submit"
          className="min-h-12 w-full rounded-xl bg-danger/90 px-4 font-semibold text-text-primary transition-colors duration-200 hover:bg-danger"
        >
          Sí, borrar todo
        </button>
      </form>
    </details>
  )
}
