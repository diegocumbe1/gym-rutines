import Link from 'next/link'
import { Check, ChevronRight, Flame, Sun, Target, Trophy, TrendingUp, UserRound } from 'lucide-react'
import { Avatar } from '@/components/game/avatar'
import { IsoMap } from '@/components/game/iso-map'
import { getGameProfile, listGameSessions, listMeasurements } from '@/lib/data/game'
import { shortDayLabel, todayDateString } from '@/lib/dates'
import { GOAL_LABELS } from '@/lib/game/avatar-options'
import { bodyParams } from '@/lib/game/avatar-params'
import { ligaSummary } from '@/lib/game/summary'

function Onboarding() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Liga Fit</h1>
      <div className="crystal-surface space-y-4 rounded-2xl p-6 text-center">
        <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-surface-2">
          <Trophy size={22} strokeWidth={1.75} className="text-highlight" aria-hidden="true" />
        </div>
        <div className="space-y-1">
          <p className="text-text-secondary">Convierte tus entrenos en nivel, racha y un gimnasio que se ilumina.</p>
          <p className="text-sm text-text-muted">
            Crea tu avatar y elige tu objetivo. Tus entrenos anteriores ya cuentan.
          </p>
        </div>
        <Link
          href="/liga/avatar"
          className="flex min-h-12 items-center justify-center rounded-xl bg-primary px-4 font-semibold text-text-primary transition-colors duration-200 hover:bg-primary-hover"
        >
          Crear mi avatar
        </Link>
      </div>
    </div>
  )
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`
}

export default async function LigaPage() {
  const profile = await getGameProfile()
  if (!profile) return <Onboarding />

  const [sessions, measurements] = await Promise.all([
    listGameSessions(),
    profile.measurements_consent_at ? listMeasurements() : Promise.resolve([]),
  ])

  const today = todayDateString()
  const summary = ligaSummary(sessions, { weeklyTarget: profile.weekly_target, today })
  const params = bodyParams({
    body: profile.avatar.body,
    goal: profile.goal,
    heightCm: profile.height_cm,
    weightKg: measurements.at(-1)?.weight_kg ?? null,
    weeksMet: summary.weeksMet,
  })
  const { level, week, challenges } = summary
  const weekDone = week.sessions >= week.target

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Liga Fit</h1>

      <section aria-label="Tu progreso" className="crystal-surface space-y-4 rounded-2xl p-4">
        <div className="flex items-center gap-4">
          <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-surface-2">
            <Avatar config={profile.avatar} params={params} variant="bust" label="Tu avatar" className="size-full" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-2xl font-semibold text-text-primary">Nivel {level.level}</p>
            <p className="text-sm text-text-muted">
              {GOAL_LABELS[profile.goal]} · meta {profile.weekly_target} días por semana
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div
            role="progressbar"
            aria-label="Progreso al siguiente nivel"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(level.progress * 100)}
            className="h-2 overflow-hidden rounded-full bg-surface-3"
          >
            <div className="h-full rounded-full bg-highlight" style={{ width: `${level.progress * 100}%` }} />
          </div>
          <p className="flex justify-between gap-2 text-xs text-text-muted">
            <span>
              Te faltan <span className="font-mono text-text-secondary">{level.xpToNext} XP</span> para el nivel {level.level + 1}
            </span>
            <span className="font-mono">{summary.xp} XP</span>
          </p>
        </div>

        <dl className="grid grid-cols-2 gap-3 border-t border-white/5 pt-3">
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-text-muted">
              <Flame size={14} strokeWidth={1.75} aria-hidden="true" /> Racha
            </dt>
            <dd className="font-mono text-lg font-semibold text-text-primary">
              {plural(summary.streak, 'semana', 'semanas')}
            </dd>
          </div>
          <div>
            <dt className="flex items-center gap-1.5 text-xs text-text-muted">
              <Target size={14} strokeWidth={1.75} aria-hidden="true" /> Esta semana
            </dt>
            <dd className="font-mono text-lg font-semibold text-text-primary">
              {week.sessions}/{week.target}
              {weekDone ? <span className="ml-2 font-sans text-xs font-medium text-success">Meta cumplida</span> : null}
            </dd>
          </div>
        </dl>

        <ol className="grid grid-cols-7 gap-1.5" aria-label="Días entrenados esta semana">
          {week.days.map((day) => {
            const name = shortDayLabel(day.date)
            return (
              <li key={day.date} className="text-center">
                <span
                  className={`flex h-9 items-center justify-center rounded-lg ${
                    day.trained ? 'bg-highlight text-text-primary' : 'bg-surface-2 text-text-disabled'
                  } ${day.date === today ? 'ring-1 ring-white/30' : ''}`}
                >
                  {day.trained ? <Check size={16} strokeWidth={2} aria-hidden="true" /> : null}
                  <span className="sr-only">{`${name}: ${day.trained ? 'entrenaste' : 'sin entreno'}`}</span>
                </span>
                <span aria-hidden="true" className="mt-1 block text-[11px] capitalize text-text-muted">
                  {name.charAt(0)}
                </span>
              </li>
            )
          })}
        </ol>
      </section>

      <section aria-labelledby="mi-gym" className="space-y-2">
        <div className="border-b border-white/5 pb-1.5">
          <h2 id="mi-gym" className="text-sm font-semibold text-text-secondary">Mi gym</h2>
          <p className="text-xs text-text-muted">
            {week.sessions > 0
              ? 'Las zonas que entrenaste esta semana se iluminan. Toca una para ver tus sesiones.'
              : 'Completa un entreno esta semana para iluminar tu primera zona.'}
          </p>
        </div>
        <IsoMap zones={summary.zones} avatar={profile.avatar} params={params} />
      </section>

      <section aria-labelledby="retos" className="space-y-2">
        <h2 id="retos" className="border-b border-white/5 pb-1.5 text-sm font-semibold text-text-secondary">
          Retos de la semana
        </h2>
        <ul className="space-y-2">
          <li className="rounded-xl border border-white/5 bg-surface-2 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-medium text-text-primary">Semana balanceada</p>
              <p className="font-mono text-sm text-text-secondary">
                {challenges.balancedWeek.done}/{challenges.balancedWeek.target}
              </p>
            </div>
            <p className="text-sm text-text-muted">
              {challenges.balancedWeek.completed
                ? 'Reto cumplido: entrenaste 4 zonas distintas.'
                : 'Entrena 4 zonas distintas esta semana.'}
            </p>
          </li>
          <li className="rounded-xl border border-white/5 bg-surface-2 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-2 font-medium text-text-primary">
                <Sun size={18} strokeWidth={1.75} className="text-warning" aria-hidden="true" /> Hora valle
              </p>
              <p className="font-mono text-sm text-text-secondary">×1,5 XP</p>
            </div>
            <p className="text-sm text-text-muted">
              Termina un entreno entre las 10:00 y las 16:00.{' '}
              {challenges.valleySessions > 0
                ? `Esta semana: ${plural(challenges.valleySessions, 'vez', 'veces')}.`
                : 'Esta semana aún no.'}
            </p>
          </li>
        </ul>
      </section>

      <nav aria-label="Liga Fit" className="space-y-2">
        {[
          { href: '/liga/evolucion', label: 'Mi evolución', icon: TrendingUp },
          { href: '/liga/avatar', label: 'Editar avatar y objetivo', icon: UserRound },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex min-h-12 items-center gap-3 rounded-xl border border-white/10 px-4 text-text-secondary transition-colors duration-200 hover:text-text-primary"
          >
            <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
            <span className="flex-1">{label}</span>
            <ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" />
          </Link>
        ))}
      </nav>
    </div>
  )
}
