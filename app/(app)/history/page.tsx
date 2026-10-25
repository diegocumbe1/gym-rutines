import Link from 'next/link'
import { CalendarDays, ChevronRight, History, TrendingDown, TrendingUp } from 'lucide-react'
import { listSessionHistory, type SessionHistoryItem } from '@/lib/data/sessions'
import { BodyZonesDashboard } from '@/components/history/body-zones-dashboard'
import {
  statsByBodyPart,
  statsByExercise,
  setsByMuscle,
  weeklyFrequency,
  type ExerciseStats,
} from '@/lib/workouts/history-stats'
import {
  addDays,
  addMonths,
  dateLabel,
  monthLabel,
  monthOf,
  startOfWeek,
  todayDateString,
  weekRangeLabel,
  weekShortLabel,
} from '@/lib/dates'

const RANGES = ['week', 'month', 'all'] as const
type Range = (typeof RANGES)[number]

const RANGE_LABELS: Record<Range, string> = {
  week: 'Esta semana',
  month: 'Este mes',
  all: 'Todo',
}

function isRange(value: string | undefined): value is Range {
  return RANGES.includes(value as Range)
}

function durationLabel(seconds: number | null) {
  if (!seconds) return null
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins} min`
  const hours = Math.floor(mins / 60)
  const rest = mins % 60
  return rest > 0 ? `${hours} h ${rest} min` : `${hours} h`
}

// Ejercicios visibles antes de "Ver todos".
const VISIBLE_EXERCISES = 6

function kg(value: number) {
  return `${value.toLocaleString('es', { maximumFractionDigits: 1 })} kg`
}

// Semanas que se muestran en "Todo", contando hacia atrás desde la actual.
const MAX_FREQUENCY_WEEKS = 8

/** Lunes de cada semana del periodo, de la más antigua a la actual. */
function weeksInRange(
  range: Range,
  currentWeek: string,
  month: string,
  sessions: SessionHistoryItem[]
) {
  if (range === 'week') return [currentWeek]

  // El historial viene del más reciente al más antiguo.
  const oldest = sessions.at(-1)?.scheduled_date
  const first =
    range === 'month' ? startOfWeek(`${month}-01`) : startOfWeek(oldest ?? currentWeek)

  const weeks: string[] = []
  for (let week = first; week <= currentWeek; week = addDays(week, 7)) {
    weeks.push(week)
  }
  return weeks.slice(-MAX_FREQUENCY_WEEKS)
}

function frequencyCellClass(count: number) {
  if (count === 0) return 'text-text-disabled'
  if (count === 1) return 'bg-highlight/25 text-text-primary'
  if (count === 2) return 'bg-highlight/50 text-text-primary'
  return 'bg-highlight/80 text-text-primary'
}

function FrequencyTable({
  weekStarts,
  currentWeek,
  frequency,
}: {
  weekStarts: string[]
  currentWeek: string
  frequency: ReturnType<typeof weeklyFrequency>
}) {
  const showAverage = weekStarts.length > 1
  return (
    <div className="crystal-surface overflow-x-auto rounded-2xl p-2">
      <table className="w-full border-separate border-spacing-1 text-sm">
        <thead>
          <tr>
            <th scope="col" className="text-left text-xs font-normal text-text-muted">
              <span className="sr-only">Zona</span>
            </th>
            {weekStarts.map((week) => (
              <th
                key={week}
                scope="col"
                className={`min-w-11 whitespace-nowrap text-center text-[11px] font-normal ${
                  week === currentWeek ? 'text-text-primary' : 'text-text-muted'
                }`}
              >
                {week === currentWeek ? 'Esta sem.' : weekShortLabel(week)}
              </th>
            ))}
            {showAverage ? (
              <th scope="col" className="text-center text-[11px] font-normal text-text-muted">
                Prom.
              </th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          <tr>
            <th
              scope="row"
              className="whitespace-nowrap pr-2 text-left font-semibold text-text-secondary"
            >
              Entrenos
            </th>
            {frequency.totals.map((count, index) => (
              <td
                key={weekStarts[index]}
                className="rounded-lg py-1.5 text-center font-mono font-semibold text-text-primary"
              >
                {count}
              </td>
            ))}
            {showAverage ? (
              <td className="text-center font-mono text-text-secondary">
                {frequency.totalsAvg.toLocaleString('es')}
              </td>
            ) : null}
          </tr>
          {frequency.rows.map((row) => (
            <tr key={row.bodyPart}>
              <th
                scope="row"
                className="whitespace-nowrap pr-2 text-left font-normal text-text-secondary"
              >
                {row.label}
              </th>
              {row.counts.map((count, index) => (
                <td
                  key={weekStarts[index]}
                  className={`rounded-lg py-1.5 text-center font-mono ${frequencyCellClass(count)}`}
                >
                  {count > 0 ? `${count}×` : '—'}
                </td>
              ))}
              {showAverage ? (
                <td className="text-center font-mono text-text-secondary">
                  {row.avg.toLocaleString('es')}×
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ProgressBadge({ value }: { value: number }) {
  if (value === 0) {
    return <span className="text-xs text-text-muted">= mismo peso</span>
  }
  const up = value > 0
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-xs ${
        up ? 'text-success' : 'text-text-muted'
      }`}
    >
      <Icon size={13} strokeWidth={1.75} aria-hidden />
      {up ? '+' : '−'}
      {kg(Math.abs(value))}
    </span>
  )
}

function ExerciseRow({ stats }: { stats: ExerciseStats }) {
  return (
    <li className="crystal-surface rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-1 font-medium capitalize">{stats.name}</p>
          <p className="mt-0.5 text-xs text-text-muted">
            {stats.bodyPartLabel} · {stats.sessions}{' '}
            {stats.sessions === 1 ? 'sesión' : 'sesiones'} · {stats.sets}{' '}
            {stats.sets === 1 ? 'serie' : 'series'}
          </p>
        </div>
        {stats.progressKg !== null ? (
          <ProgressBadge value={stats.progressKg} />
        ) : null}
      </div>
      {stats.best ? (
        <dl className="mt-3 grid grid-cols-2 gap-2">
          <div>
            <dt className="text-xs text-text-muted">Mejor serie</dt>
            <dd className="font-mono text-sm font-semibold text-text-primary">
              {kg(stats.best.weight)}
              {stats.best.reps ? ` × ${stats.best.reps}` : ''}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-text-muted">Promedio</dt>
            <dd className="font-mono text-sm font-semibold text-text-primary">
              {stats.avgWeight !== null ? kg(stats.avgWeight) : '—'}
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-2 text-xs text-text-muted">Sin peso registrado</p>
      )}
    </li>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="crystal-surface rounded-2xl p-3 text-center">
      <p className="font-mono text-xl font-semibold text-text-primary">{value}</p>
      <p className="mt-0.5 text-xs text-text-muted">{label}</p>
    </div>
  )
}

function RangeChip({
  range,
  active,
}: {
  range: Range
  active: boolean
}) {
  return (
    <Link
      href={range === 'month' ? '/history' : `/history?range=${range}`}
      aria-current={active ? 'page' : undefined}
      className={`flex-1 rounded-lg border px-3 py-2 text-center text-sm transition-colors ${
        active
          ? 'border-highlight/40 bg-primary text-text-primary'
          : 'border-white/10 text-text-muted hover:text-text-secondary'
      }`}
    >
      {RANGE_LABELS[range]}
    </Link>
  )
}

/** Agrupa por semana (dentro de un mes o una semana) o por mes (en "Todo"). */
function groupSessions(sessions: SessionHistoryItem[], range: Range) {
  const groups = new Map<string, SessionHistoryItem[]>()

  for (const session of sessions) {
    const key =
      range === 'all'
        ? monthOf(session.scheduled_date)
        : startOfWeek(session.scheduled_date)
    groups.set(key, [...(groups.get(key) ?? []), session])
  }

  return [...groups.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, items]) => ({
      key,
      label: range === 'all' ? monthLabel(key) : weekRangeLabel(key),
      sessions: items,
    }))
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const { range: rangeParam } = await searchParams
  const range: Range = isRange(rangeParam) ? rangeParam : 'month'

  const today = todayDateString()
  const weekStart = startOfWeek(today)
  const month = monthOf(today)

  const sessions = await listSessionHistory(
    range === 'week'
      ? { from: weekStart, toExclusive: addDays(weekStart, 7) }
      : range === 'month'
        ? { from: `${month}-01`, toExclusive: `${addMonths(month, 1)}-01` }
        : {}
  )

  const unitsDone = sessions.reduce((acc, session) => acc + session.units_done, 0)
  const bodyPartStats = statsByBodyPart(sessions)
  const muscleSets = setsByMuscle(sessions)
  const exerciseStats = statsByExercise(sessions)
  const visibleExercises = exerciseStats.slice(0, VISIBLE_EXERCISES)
  const hiddenExercises = exerciseStats.slice(VISIBLE_EXERCISES)
  const groups = groupSessions(sessions, range)
  const weekStarts = weeksInRange(range, weekStart, month, sessions)
  const frequency = weeklyFrequency(sessions, weekStarts)

  return (
    // Móvil: una columna. Escritorio: mapa a la izquierda, tablas a la derecha.
    <div data-wide className="space-y-5 lg:space-y-6">
      <div className="space-y-5 lg:flex lg:items-center lg:justify-between lg:gap-6 lg:space-y-0">
        <h1 className="text-2xl font-bold">Historial</h1>

        <nav aria-label="Periodo" className="flex gap-2 lg:w-md">
          {RANGES.map((option) => (
            <RangeChip key={option} range={option} active={option === range} />
          ))}
        </nav>
      </div>

      <div className="grid grid-cols-3 gap-2 lg:gap-4">
        <Stat label="Entrenos" value={String(sessions.length)} />
        <Stat label="Series hechas" value={String(unitsDone)} />
        <Stat label="Ejercicios" value={String(exerciseStats.length)} />
      </div>

      <div className="space-y-5 lg:grid lg:grid-cols-12 lg:items-start lg:gap-6 lg:space-y-0">
        {bodyPartStats.length > 0 ? (
          <section aria-labelledby="by-body-part" className="space-y-2 lg:col-span-5">
            <h2
              id="by-body-part"
              className="border-b border-white/5 pb-1.5 text-sm font-semibold text-text-secondary"
            >
              Por zona muscular
            </h2>
            <BodyZonesDashboard stats={bodyPartStats} muscleSets={muscleSets} />
          </section>
        ) : null}

        <div className="space-y-5 lg:col-span-7 lg:space-y-6">
          {frequency.rows.length > 0 ? (
            <section aria-labelledby="weekly-frequency" className="space-y-2">
              <div className="border-b border-white/5 pb-1.5">
                <h2
                  id="weekly-frequency"
                  className="text-sm font-semibold text-text-secondary"
                >
                  Frecuencia semanal
                </h2>
                <p className="text-xs text-text-muted">
                  Veces que entrenaste cada zona por semana
                </p>
              </div>
              <FrequencyTable
                weekStarts={weekStarts}
                currentWeek={weekStart}
                frequency={frequency}
              />
            </section>
          ) : null}

          {exerciseStats.length > 0 ? (
            <section aria-labelledby="by-exercise" className="space-y-2">
              <div className="flex items-baseline justify-between gap-2 border-b border-white/5 pb-1.5">
                <h2
                  id="by-exercise"
                  className="text-sm font-semibold text-text-secondary"
                >
                  Por ejercicio
                </h2>
                <p className="text-xs text-text-muted">Progreso: 1.ª vs última sesión</p>
              </div>
              <ul className="grid gap-2 lg:grid-cols-2">
                {visibleExercises.map((stats) => (
                  <ExerciseRow key={stats.key} stats={stats} />
                ))}
              </ul>
              {hiddenExercises.length > 0 ? (
                <details className="group">
                  <summary className="cursor-pointer list-none rounded-xl border border-white/10 px-4 py-3 text-center text-sm text-text-secondary transition-colors hover:text-text-primary">
                    <span className="group-open:hidden">
                      Ver {hiddenExercises.length} ejercicios más
                    </span>
                    <span className="hidden group-open:inline">Ver menos</span>
                  </summary>
                  <ul className="mt-2 grid gap-2 lg:grid-cols-2">
                    {hiddenExercises.map((stats) => (
                      <ExerciseRow key={stats.key} stats={stats} />
                    ))}
                  </ul>
                </details>
              ) : null}
            </section>
          ) : null}
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="crystal-surface space-y-4 rounded-2xl p-6 text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-xl bg-surface-2">
            <History size={22} strokeWidth={1.75} className="text-text-muted" />
          </div>
          <div className="space-y-1">
            <p className="text-text-secondary">
              {range === 'week'
                ? 'Todavía no has entrenado esta semana.'
                : range === 'month'
                  ? 'Todavía no has entrenado este mes.'
                  : 'Todavía no has entrenado.'}
            </p>
            <p className="text-sm text-text-muted">
              Cuando inicies una rutina aparecerá aquí con sus series y su
              tiempo.
            </p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-text-primary transition-colors hover:bg-primary-hover"
          >
            Ir a hoy <ChevronRight size={16} strokeWidth={1.75} />
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.key} className="space-y-2">
              <div className="flex items-baseline justify-between gap-2 border-b border-white/5 pb-1.5">
                <h2 className="text-sm font-semibold capitalize text-text-secondary">
                  {group.label}
                </h2>
                <p className="font-mono text-xs text-text-muted">
                  {group.sessions.length}{' '}
                  {group.sessions.length === 1 ? 'entreno' : 'entrenos'}
                </p>
              </div>

              <ul className="grid gap-2 lg:grid-cols-3">
                {group.sessions.map((session) => {
                  const duration = durationLabel(session.duration_seconds)
                  const completed = session.status === 'completed'
                  return (
                    <li key={session.id}>
                      <Link
                        href={`/?date=${session.scheduled_date}`}
                        className="crystal-surface flex h-full items-center justify-between gap-3 rounded-2xl p-4 transition-colors hover:border-highlight/30"
                      >
                        <div className="min-w-0">
                          <p className="flex items-center gap-1.5 text-xs text-text-muted">
                            <CalendarDays size={13} strokeWidth={1.75} />
                            {dateLabel(session.scheduled_date)}
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                                completed
                                  ? 'bg-success/10 text-success'
                                  : 'bg-surface-2 text-text-muted'
                              }`}
                            >
                              {completed ? 'Terminada' : 'Sin terminar'}
                            </span>
                          </p>
                          <p className="mt-1 line-clamp-1 font-medium capitalize">
                            {session.title}
                          </p>
                          <p className="mt-1 font-mono text-xs text-text-muted">
                            {session.units_done}/{session.units_total} series ·{' '}
                            {session.exercise_count}{' '}
                            {session.exercise_count === 1
                              ? 'ejercicio'
                              : 'ejercicios'}
                            {duration ? ` · ${duration}` : ''}
                          </p>
                        </div>
                        <ChevronRight
                          size={18}
                          strokeWidth={1.75}
                          className="shrink-0 text-text-muted"
                        />
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
