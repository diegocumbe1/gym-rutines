import { notFound } from 'next/navigation'
import { getPublicSession } from '@/lib/data/public-share'
import { dateLabel } from '@/lib/dates'
import { BrandMark } from '@/components/brand/brand-mark'
import { PublicExerciseCard } from '@/components/share/public-exercise-card'

export default async function PublicSessionPage({
  params,
}: {
  params: Promise<{ shareId: string }>
}) {
  const { shareId } = await params
  const session = await getPublicSession(shareId)
  if (!session) notFound()

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
          <p className="text-xs uppercase text-text-muted">
            Rutina pública · {dateLabel(session.scheduled_date)}
          </p>
          <h1 className="mt-1 text-2xl font-bold capitalize">{session.title}</h1>
          <p className="mt-1 text-sm text-text-muted">
            {session.exercises.length}{' '}
            {session.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}
          </p>
        </div>

        <ol className="space-y-3">
          {session.exercises.map((item, index) => (
            <PublicExerciseCard
              key={item.id}
              index={index}
              name={item.exercise_name}
              muscleLabel={item.muscle_group ?? '—'}
              targetSets={item.target_sets}
              targetRepsMin={item.target_reps_min}
              targetRepsMax={item.target_reps_max}
              targetWeight={item.target_weight}
              restSeconds={item.rest_seconds}
              exercise={item.exercise}
            />
          ))}
        </ol>
      </div>
    </main>
  )
}
