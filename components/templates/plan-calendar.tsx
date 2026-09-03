import Link from 'next/link'
import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  addMonths,
  dayNumberLabel,
  monthLabel,
  monthOf,
  monthGridDays,
} from '@/lib/dates'
import { scheduleTemplateSessionOnDates } from '@/app/actions/sessions'

const WEEK_DAY_LABELS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/**
 * Calendario del mes para armar el plan de una plantilla: se marcan los días
 * y se crean todas las rutinas de una vez.
 *
 * Es HTML puro (checkboxes dentro del formulario de la plantilla), así que
 * funciona sin JavaScript en el cliente y hereda los ajustes de ejercicios que
 * haya en el formulario.
 */
export function PlanCalendar({
  templateId,
  month,
  today,
  sessionCounts,
}: {
  templateId: string
  /** Mes visible en formato `YYYY-MM`. */
  month: string
  today: string
  /** Rutinas ya programadas por día. */
  sessionCounts: Map<string, number>
}) {
  const days = monthGridDays(month)

  return (
    <div className="grid gap-3 rounded-2xl border border-white/5 bg-surface/50 p-3">
      <input type="hidden" name="calendar_month" value={month} />

      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/templates/${templateId}?month=${addMonths(month, -1)}`}
          aria-label="Mes anterior"
          className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-text-muted transition-colors hover:border-highlight/30 hover:text-text-primary"
        >
          <ChevronLeft size={17} strokeWidth={1.75} />
        </Link>
        <p className="text-sm font-semibold text-text-primary">
          {monthLabel(month)}
        </p>
        <Link
          href={`/templates/${templateId}?month=${addMonths(month, 1)}`}
          aria-label="Mes siguiente"
          className="flex size-9 items-center justify-center rounded-lg border border-white/10 text-text-muted transition-colors hover:border-highlight/30 hover:text-text-primary"
        >
          <ChevronRight size={17} strokeWidth={1.75} />
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-text-disabled">
        {WEEK_DAY_LABELS.map((label, index) => (
          <span key={`${label}-${index}`}>{label}</span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const inMonth = monthOf(day) === month
          const isToday = day === today
          const planned = sessionCounts.get(day) ?? 0

          return (
            <label key={day} className="block">
              <input
                type="checkbox"
                name="scheduled_dates"
                value={day}
                className="peer sr-only"
                aria-label={`Programar el ${day}${planned > 0 ? ` (ya tiene ${planned})` : ''}`}
              />
              <span
                className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border py-1.5 transition-colors peer-checked:border-highlight peer-checked:bg-primary peer-checked:text-text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-highlight ${
                  isToday
                    ? 'border-highlight/50 bg-surface-2'
                    : 'border-white/10 bg-surface-2/40'
                } ${inMonth ? 'text-text-secondary' : 'text-text-disabled opacity-50'}`}
              >
                <span className="font-mono text-sm leading-none">
                  {dayNumberLabel(day)}
                </span>
                <span
                  className={`h-1 w-1 rounded-full ${
                    planned > 0 ? 'bg-highlight' : 'bg-transparent'
                  }`}
                  aria-hidden="true"
                />
              </span>
            </label>
          )
        })}
      </div>

      <p className="text-xs leading-relaxed text-text-muted">
        Marca los días de este mes y prográmalos todos de una vez. El punto
        señala los días que ya tienen una rutina. Si cambias de mes se pierden
        las marcas todavía no programadas.
      </p>

      <button
        type="submit"
        formAction={scheduleTemplateSessionOnDates}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-primary-hover"
      >
        <CalendarPlus size={17} strokeWidth={1.75} /> Programar días marcados
      </button>
    </div>
  )
}
