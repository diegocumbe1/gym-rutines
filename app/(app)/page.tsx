import Link from 'next/link'
import {
  CalendarPlus,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Share2,
  Trash2,
} from 'lucide-react'
import {
  deleteWorkoutSession,
  enableSessionPublicShare,
  refreshSessionFromTemplate,
} from '@/app/actions/sessions'
import { getSessionsForDate } from '@/lib/data/sessions'
import { getSignedMediaUrl } from '@/lib/supabase/storage'
import { addDays, dateLabel, todayDateString } from '@/lib/dates'
import { WorkoutSessionCard } from '@/components/workouts/workout-session-card'

function dayHref(date: string, detailId?: string) {
  const today = todayDateString()
  const params = new URLSearchParams()
  if (date !== today) params.set('date', date)
  if (detailId) params.set('detail', detailId)

  const qs = params.toString()
  const path = qs ? `/?${qs}` : '/'
  return detailId ? `${path}#session-exercise-${detailId}` : path
}

function Chip({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
        active
          ? 'border-highlight/40 bg-primary text-text-primary'
          : 'border-white/10 text-text-muted hover:text-text-secondary'
      }`}
    >
      {children}
    </Link>
  )
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; detail?: string }>
}) {
  const today = todayDateString()
  const tomorrow = addDays(today, 1)
  const { date, detail } = await searchParams
  const selectedDate = date ?? today
  const sessions = await getSessionsForDate(selectedDate)
  const selectedExercise = sessions
    .flatMap((session) => session.exercises)
    .find((exercise) => exercise.id === detail)
  const selectedMedia = selectedExercise?.exercise
    ? await getSignedMediaUrl(
        selectedExercise.exercise.gif_url ?? selectedExercise.exercise.image_url
      )
    : null

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="font-mono text-sm text-text-muted">
          {selectedDate}
        </p>
        <h1 className="text-2xl font-bold">{dateLabel(selectedDate)}</h1>
      </div>

      <div className="flex gap-2">
        <Chip href={dayHref(today)} active={selectedDate === today}>
          Hoy
        </Chip>
        <Chip href={dayHref(tomorrow)} active={selectedDate === tomorrow}>
          Mañana
        </Chip>
      </div>

      {sessions.length === 0 ? (
        <div className="crystal-surface space-y-4 rounded-2xl p-6 text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-surface-2">
            <CalendarPlus size={22} strokeWidth={1.75} className="text-text-muted" />
          </div>
          <div className="space-y-1">
            <p className="text-text-secondary">
              No tienes una rutina para {selectedDate === today ? 'hoy' : 'este día'}.
            </p>
            <p className="text-sm text-text-muted">
              Elige una plantilla y prográmala para hoy o mañana.
            </p>
          </div>
          <Link
            href="/templates"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-primary-hover"
          >
            Ver plantillas <ChevronRight size={16} strokeWidth={1.75} />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="space-y-2">
              <WorkoutSessionCard
                session={session}
                selectedDate={selectedDate}
                detailId={detail}
                selectedMedia={selectedMedia}
              />

              <div className="grid gap-2 rounded-2xl border border-white/5 bg-surface/50 p-3">
                {session.template_id && (
                  <form action={refreshSessionFromTemplate}>
                    <input type="hidden" name="id" value={session.id} />
                    <input type="hidden" name="date" value={selectedDate} />
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:border-highlight/30 hover:text-text-primary"
                    >
                      <RefreshCw size={16} strokeWidth={1.75} /> Actualizar desde plantilla
                    </button>
                  </form>
                )}
                {session.is_public && session.public_share_id ? (
                  <Link
                    href={`/share/sessions/${session.public_share_id}`}
                    className="flex items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:border-highlight/30 hover:text-text-primary"
                  >
                    <ExternalLink size={16} strokeWidth={1.75} /> Abrir link público
                  </Link>
                ) : (
                  <form action={enableSessionPublicShare}>
                    <input type="hidden" name="id" value={session.id} />
                    <input type="hidden" name="date" value={selectedDate} />
                    <button
                      type="submit"
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:border-highlight/30 hover:text-text-primary"
                    >
                      <Share2 size={16} strokeWidth={1.75} /> Compartir público
                    </button>
                  </form>
                )}
                <form action={deleteWorkoutSession}>
                  <input type="hidden" name="id" value={session.id} />
                  <input type="hidden" name="date" value={selectedDate} />
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-text-muted transition-colors hover:border-danger/40 hover:text-danger"
                  >
                    <Trash2 size={16} strokeWidth={1.75} /> Eliminar rutina
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
