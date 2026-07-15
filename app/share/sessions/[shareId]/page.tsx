import { notFound } from 'next/navigation'
import { Dumbbell } from 'lucide-react'
import { getPublicSession } from '@/lib/data/public-share'
import { dateLabel } from '@/lib/dates'

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
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary">
              <Dumbbell size={18} strokeWidth={1.75} />
            </div>
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
            <li key={item.id} className="crystal-surface rounded-2xl p-4">
              <p className="text-xs text-text-muted">
                {index + 1} · {item.muscle_group ?? '—'}
              </p>
              <p className="mt-1 font-medium capitalize">
                {item.exercise_name}
              </p>
              <p className="mt-2 font-mono text-xs text-text-muted">
                {item.target_sets ?? '—'} x {item.target_reps_min ?? '—'}-
                {item.target_reps_max ?? '—'}
                {item.target_weight ? ` · sug. ${item.target_weight} kg` : ''}
                {item.rest_seconds ? ` · ${item.rest_seconds}s` : ''}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </main>
  )
}
