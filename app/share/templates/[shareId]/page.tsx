import { notFound } from 'next/navigation'
import { getPublicTemplate } from '@/lib/data/public-share'
import { bodyPartLabel } from '@/lib/exercises/labels'
import { BrandMark } from '@/components/brand/brand-mark'
import { PublicExerciseCard } from '@/components/share/public-exercise-card'

export default async function PublicTemplatePage({
  params,
}: {
  params: Promise<{ shareId: string }>
}) {
  const { shareId } = await params
  const template = await getPublicTemplate(shareId)
  if (!template) notFound()

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-5 py-8">
      <div className="space-y-5">
        <div className="border-b border-white/10 pb-5">
          <div className="flex items-center gap-2">
            <BrandMark size="md" />
            <p className="font-semibold">Gym Routines</p>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase text-text-muted">Rutina pública</p>
          <h1 className="mt-1 text-2xl font-bold capitalize">{template.name}</h1>
          <p className="mt-1 text-sm text-text-muted">
            {template.exercises.length}{' '}
            {template.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}
          </p>
        </div>

        <ol className="space-y-3">
          {template.exercises.map((item, index) => (
            <PublicExerciseCard
              key={item.id}
              index={index}
              name={item.exercise?.name ?? 'Ejercicio'}
              muscleLabel={bodyPartLabel(item.exercise?.body_part)}
              targetSets={item.target_sets}
              targetRepsMin={item.target_reps_min}
              targetRepsMax={item.target_reps_max}
              targetWeight={item.target_weight}
              restSeconds={item.rest_seconds}
              trackingType={item.tracking_type}
              targetDurationSeconds={item.target_duration_seconds}
              exercise={item.exercise}
            />
          ))}
        </ol>
      </div>
    </main>
  )
}
