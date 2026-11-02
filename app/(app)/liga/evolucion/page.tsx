import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft, Lock } from 'lucide-react'
import { Avatar } from '@/components/game/avatar'
import { ConsentForm } from '@/components/game/consent-form'
import { DeleteMeasurements } from '@/components/game/delete-measurements'
import { MeasurementForm } from '@/components/game/measurement-form'
import { getGameProfile, listGameSessions, listMeasurements } from '@/lib/data/game'
import { dateLabel, todayDateString } from '@/lib/dates'
import { GOAL_LABELS } from '@/lib/game/avatar-options'
import { bodyParams, evolutionMessage } from '@/lib/game/avatar-params'
import { weeksMetTarget } from '@/lib/game/weeks'

function number(value: number) {
  return value.toLocaleString('es', { maximumFractionDigits: 1 })
}

export default async function EvolutionPage({
  searchParams,
}: {
  searchParams: Promise<{ borrado?: string }>
}) {
  const profile = await getGameProfile()
  if (!profile) redirect('/liga/avatar')

  const { borrado } = await searchParams
  const hasConsent = Boolean(profile.measurements_consent_at)
  const [sessions, measurements] = await Promise.all([
    listGameSessions(),
    hasConsent ? listMeasurements() : Promise.resolve([]),
  ])

  const weeksMet = weeksMetTarget(sessions, profile.weekly_target).size
  const first = measurements.at(0)
  const latest = measurements.at(-1)
  const base = { body: profile.avatar.body, goal: profile.goal, heightCm: profile.height_cm }
  const startParams = bodyParams({ ...base, weightKg: first?.weight_kg ?? null, weeksMet: 0 })
  const nowParams = bodyParams({ ...base, weightKg: latest?.weight_kg ?? null, weeksMet })
  const weightChange =
    first && latest && measurements.length > 1 ? latest.weight_kg - first.weight_kg : null

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Link
          href="/liga"
          className="-ml-1 inline-flex min-h-11 items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
        >
          <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" /> Liga Fit
        </Link>
        <h1 className="text-2xl font-bold">Mi evolución</h1>
        <p className="text-sm text-text-muted">Objetivo: {GOAL_LABELS[profile.goal]}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <figure className="rounded-2xl border border-white/5 bg-surface p-3 text-center">
          <figcaption className="text-xs text-text-muted">Al empezar</figcaption>
          <Avatar config={profile.avatar} params={startParams} label="Tu avatar al empezar" className="mx-auto h-56 w-auto" />
        </figure>
        <figure className="crystal-highlight rounded-2xl bg-surface p-3 text-center">
          <figcaption className="text-xs font-medium text-text-primary">Hoy</figcaption>
          <Avatar config={profile.avatar} params={nowParams} label="Tu avatar hoy" className="mx-auto h-56 w-auto" />
        </figure>
      </div>

      <p className="rounded-xl border border-white/5 bg-surface-2 px-4 py-3 text-sm text-text-secondary">
        {evolutionMessage(profile.goal, weeksMet)}
      </p>

      <dl className="grid grid-cols-3 gap-2">
        <div className="crystal-surface rounded-2xl px-2 py-3 text-center">
          <dd className="font-mono text-xl font-semibold text-text-primary">{weeksMet}</dd>
          <dt className="text-xs text-text-muted">Semanas con meta</dt>
        </div>
        <div className="crystal-surface rounded-2xl px-2 py-3 text-center">
          <dd className="font-mono text-xl font-semibold text-text-primary">{sessions.length}</dd>
          <dt className="text-xs text-text-muted">Entrenos</dt>
        </div>
        <div className="crystal-surface rounded-2xl px-2 py-3 text-center">
          <dd className="font-mono text-xl font-semibold text-text-primary">
            {weightChange === null ? '—' : `${weightChange > 0 ? '+' : ''}${number(weightChange)} kg`}
          </dd>
          <dt className="flex items-center justify-center gap-1 text-xs text-text-muted">
            <Lock size={12} strokeWidth={1.75} aria-hidden="true" /> Privado
          </dt>
        </div>
      </dl>

      <section aria-labelledby="medidas" className="space-y-3">
        <div className="border-b border-white/5 pb-1.5">
          <h2 id="medidas" className="flex items-center gap-1.5 text-sm font-semibold text-text-secondary">
            <Lock size={14} strokeWidth={1.75} aria-hidden="true" /> Mis medidas
          </h2>
          <p className="text-xs text-text-muted">
            Solo tú las ves. No aparecen en rankings ni en enlaces compartidos.
          </p>
        </div>

        {borrado === '1' && !hasConsent ? (
          <p role="status" className="rounded-xl border border-success/30 px-4 py-3 text-sm text-success">
            Borramos todas tus medidas y tu talla, y retiramos tu autorización.
          </p>
        ) : null}

        {!hasConsent ? (
          <ConsentForm />
        ) : (
          <>
            <MeasurementForm today={todayDateString()} heightCm={profile.height_cm} />

            {measurements.length > 0 ? (
              <ul className="divide-y divide-white/5 rounded-xl border border-white/5 bg-surface">
                {[...measurements].reverse().map((item) => (
                  <li key={item.id} className="flex items-baseline justify-between gap-3 px-4 py-3">
                    <span className="text-sm text-text-secondary">{dateLabel(item.measured_at)}</span>
                    <span className="text-right font-mono text-sm text-text-primary">
                      {number(item.weight_kg)} kg
                      {item.waist_cm !== null ? (
                        <span className="block text-xs text-text-muted">Cintura {number(item.waist_cm)} cm</span>
                      ) : null}
                      {item.body_fat_pct !== null ? (
                        <span className="block text-xs text-text-muted">Grasa {number(item.body_fat_pct)} %</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-text-muted">Aún no has registrado medidas.</p>
            )}

            <DeleteMeasurements returnTo="/liga/evolucion" />
          </>
        )}
      </section>
    </div>
  )
}
