import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft, ChevronRight, Dumbbell } from 'lucide-react'
import { getExercise, listSimilarExercises } from '@/lib/data/exercises'
import { getSignedMediaUrl, getSignedMediaUrls } from '@/lib/supabase/storage'
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

  const [media, similar] = await Promise.all([
    getSignedMediaUrl(exercise.gif_url ?? exercise.image_url),
    listSimilarExercises(exercise, 8),
  ])
  const similarMedia = await getSignedMediaUrls(
    similar.map((item) => item.image_url).filter((path): path is string => Boolean(path))
  )

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

      {similar.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary">
            Alternativas similares
          </h2>
          <ul className="grid grid-cols-2 gap-3">
            {similar.map((item) => {
              const thumb = item.image_url ? similarMedia.get(item.image_url) : null
              return (
                <li key={item.id}>
                  <Link
                    href={`/exercises/${item.id}`}
                    className="crystal-surface block h-full overflow-hidden rounded-2xl transition-colors hover:border-highlight/30"
                  >
                    <div className="flex aspect-square items-center justify-center bg-surface-2">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt={item.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Dumbbell
                          size={26}
                          strokeWidth={1.5}
                          className="text-text-disabled"
                        />
                      )}
                    </div>
                    <div className="space-y-1 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm font-medium capitalize">
                          {item.name}
                        </p>
                        <ChevronRight
                          size={16}
                          strokeWidth={1.75}
                          className="mt-0.5 shrink-0 text-text-muted"
                        />
                      </div>
                      <p className="text-xs text-text-muted">
                        {bodyPartLabel(item.body_part)}
                        {item.target ? ` · ${item.target}` : ''}
                      </p>
                      <p className="line-clamp-1 text-[11px] text-text-disabled">
                        {item.reason}
                        {item.equipment ? ` · ${item.equipment}` : ''}
                      </p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {exercise.source_attribution && (
        <p className="pt-2 text-xs text-text-disabled">
          {exercise.source_attribution}
        </p>
      )}
    </div>
  )
}
