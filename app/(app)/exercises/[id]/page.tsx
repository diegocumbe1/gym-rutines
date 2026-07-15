import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { getExercise } from '@/lib/data/exercises'
import { getSignedMediaUrl } from '@/lib/supabase/storage'
import { bodyPartLabel } from '@/lib/exercises/labels'

function Meta({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="crystal-surface rounded-xl p-3">
      <dt className="text-xs text-text-muted">{label}</dt>
      <dd className="mt-0.5 text-sm capitalize text-text-primary">
        {value && value.length > 0 ? value : '—'}
      </dd>
    </div>
  )
}

export default async function ExerciseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const exercise = await getExercise(id)
  if (!exercise) notFound()

  // El GIF si existe; si no, el thumbnail.
  const media = await getSignedMediaUrl(exercise.gif_url ?? exercise.image_url)

  return (
    <div className="space-y-5">
      <Link
        href="/exercises"
        className="inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
      >
        <ChevronLeft size={18} strokeWidth={1.75} /> Ejercicios
      </Link>

      <div>
        <h1 className="text-2xl font-bold capitalize">{exercise.name}</h1>
        <p className="text-sm text-text-muted">
          {bodyPartLabel(exercise.body_part)}
        </p>
      </div>

      <div className="crystal-surface overflow-hidden rounded-2xl">
        <div className="flex aspect-square items-center justify-center bg-surface-2">
          {media ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media}
              alt={exercise.name}
              className="h-full w-full object-contain"
            />
          ) : (
            <p className="text-sm text-text-muted">Sin imagen todavía</p>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3">
        <Meta label="Músculo objetivo" value={exercise.target} />
        <Meta label="Grupo muscular" value={exercise.muscle_group} />
        <Meta label="Equipamiento" value={exercise.equipment} />
        <Meta
          label="Músculos secundarios"
          value={exercise.secondary_muscles?.join(', ')}
        />
      </dl>

      {exercise.instructions && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-text-secondary">
            Instrucciones
          </h2>
          <p className="text-sm leading-relaxed text-text-secondary">
            {exercise.instructions}
          </p>
        </div>
      )}

      {exercise.source_attribution && (
        <p className="pt-2 text-xs text-text-disabled">
          {exercise.source_attribution}
        </p>
      )}
    </div>
  )
}
