import Link from 'next/link'
import { CalendarDays, ChevronRight, History } from 'lucide-react'
import { listSessionHistory, type SessionHistoryItem } from '@/lib/data/sessions'
import {
  addDays,
  addMonths,
  dateLabel,
  monthLabel,
  monthOf,
  startOfWeek,
  todayDateString,
  weekRangeLabel,
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

  const totals = sessions.reduce(
    (acc, session) => {
      acc.done += session.units_done
      acc.volume += session.volume_kg
      return acc
    },
    { done: 0, volume: 0 }
  )
  const groups = groupSessions(sessions, range)

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Historial</h1>

      <nav aria-label="Periodo" className="flex gap-2">
        {RANGES.map((option) => (
          <RangeChip key={option} range={option} active={option === range} />
        ))}
      </nav>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Entrenos" value={String(sessions.length)} />
        <Stat label="Series hechas" value={String(totals.done)} />
        <Stat
          label="Volumen"
          value={
            totals.volume > 0 ? `${totals.volume.toLocaleString('es')} kg` : '—'
          }
        />
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

              <ul className="space-y-2">
                {group.sessions.map((session) => {
                  const duration = durationLabel(session.duration_seconds)
                  const completed = session.status === 'completed'
                  return (
                    <li key={session.id}>
                      <Link
                        href={`/?date=${session.scheduled_date}`}
                        className="crystal-surface flex items-center justify-between gap-3 rounded-2xl p-4 transition-colors hover:border-highlight/30"
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
                            {session.volume_kg > 0
                              ? ` · ${session.volume_kg.toLocaleString('es')} kg`
                              : ''}
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
