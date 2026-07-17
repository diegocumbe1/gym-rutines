import { ChevronDown } from 'lucide-react'
import { bodyPartLabel } from '@/lib/exercises/labels'
import {
  formatDuration,
  trackingTypeLabel,
  tracksSets,
  tracksWeight,
  type TrackingType,
} from '@/lib/workouts/tracking'

type PublicExercise = {
  name: string
  body_part?: string | null
  muscle_group?: string | null
  equipment?: string | null
  target?: string | null
  instructions?: string | null
  public_media_url?: string | null
}

type PublicExerciseCardProps = {
  index: number
  name: string
  muscleLabel: string
  targetSets: number | null
  targetRepsMin: number | null
  targetRepsMax: number | null
  targetWeight: number | null
  restSeconds: number | null
  trackingType: TrackingType
  targetDurationSeconds: number | null
  exercise: PublicExercise | null
}

function DetailMeta({
  label,
  value,
}: {
  label: string
  value?: string | null
}) {
  return (
    <div className="rounded-xl bg-surface-2/70 p-3">
      <dt className="text-[11px] uppercase text-text-disabled">{label}</dt>
      <dd className="mt-1 text-sm capitalize text-text-secondary">
        {value && value.length > 0 ? value : '—'}
      </dd>
    </div>
  )
}

export function PublicExerciseCard({
  index,
  name,
  muscleLabel,
  targetSets,
  targetRepsMin,
  targetRepsMax,
  targetWeight,
  restSeconds,
  trackingType,
  targetDurationSeconds,
  exercise,
}: PublicExerciseCardProps) {
  const usesSets = tracksSets(trackingType)
  return (
    <li className="crystal-surface overflow-hidden rounded-2xl">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-4 transition-colors hover:bg-white/[0.02]">
          <div className="min-w-0">
            <p className="text-xs text-text-muted">
              {index + 1} · {muscleLabel}
            </p>
            <p className="mt-1 font-medium capitalize">{name}</p>
            <p className="mt-2 font-mono text-xs text-text-muted">
              {trackingTypeLabel(trackingType)}
              {usesSets
                ? ` · ${targetSets ?? '—'} x ${targetRepsMin ?? '—'}-${targetRepsMax ?? '—'}`
                : ''}
              {tracksWeight(trackingType) && targetWeight
                ? ` · sug. ${targetWeight} kg`
                : ''}
              {trackingType === 'duration'
                ? ` · ${formatDuration(targetDurationSeconds) || 'sin tiempo'}`
                : ''}
              {restSeconds ? ` · ${restSeconds}s` : ''}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-text-secondary">
            <span className="group-open:hidden">Detalle</span>
            <span className="hidden group-open:inline">Cerrar</span>
            <ChevronDown
              size={16}
              strokeWidth={1.75}
              className="transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </div>
        </summary>

        <div className="space-y-3 border-t border-white/10 p-4 pt-3">
          <div className="overflow-hidden rounded-xl bg-surface-2">
            <div className="flex aspect-square items-center justify-center">
              {exercise?.public_media_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={exercise.public_media_url}
                  alt={name}
                  className="h-full w-full object-contain"
                />
              ) : (
                <p className="px-4 text-center text-sm text-text-muted">
                  Sin imagen todavía
                </p>
              )}
            </div>
          </div>

          <dl className="grid grid-cols-2 gap-2">
            <DetailMeta label="Zona" value={bodyPartLabel(exercise?.body_part)} />
            <DetailMeta label="Músculo" value={exercise?.target} />
            <DetailMeta label="Grupo" value={exercise?.muscle_group} />
            <DetailMeta label="Equipo" value={exercise?.equipment} />
          </dl>

          {exercise?.instructions && (
            <div>
              <h2 className="text-sm font-semibold text-text-secondary">
                Instrucciones
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-text-muted">
                {exercise.instructions}
              </p>
            </div>
          )}
        </div>
      </details>
    </li>
  )
}
