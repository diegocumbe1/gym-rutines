import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowDown,
  ArrowUp,
  CalendarPlus,
  ChevronDown,
  ChevronLeft,
  Copy,
  ExternalLink,
  Plus,
  Share2,
  Trash2,
} from 'lucide-react'
import { getTemplate, type TemplateExercise } from '@/lib/data/templates'
import {
  deleteTemplate,
  duplicateTemplate,
  enableTemplatePublicShare,
  moveTemplateExercise,
  removeTemplateExercise,
  updateTemplateExercises,
} from '@/app/actions/templates'
import {
  scheduleTemplateSessionToday,
  scheduleTemplateSessionTomorrow,
} from '@/app/actions/sessions'
import { bodyPartLabel } from '@/lib/exercises/labels'
import { getSignedMediaUrls } from '@/lib/supabase/storage'

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string
  name: string
  defaultValue: number | null
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] text-text-muted">{label}</span>
      <input
        name={name}
        type="number"
        inputMode="numeric"
        defaultValue={defaultValue ?? ''}
        className="w-full rounded-lg border border-white/10 bg-surface-2 px-1.5 py-1.5 text-center font-mono text-sm text-text-primary outline-none focus:border-highlight"
      />
    </label>
  )
}

function ExerciseRow({
  te,
  index,
  defaultSelected,
  mediaUrl,
  canMoveUp,
  canMoveDown,
}: {
  te: TemplateExercise
  index: number
  defaultSelected: boolean
  mediaUrl: string | null
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  const removeFormId = `remove-template-exercise-${te.id}`
  const moveUpFormId = `move-template-exercise-up-${te.id}`
  const moveDownFormId = `move-template-exercise-down-${te.id}`

  return (
    <li className="crystal-surface relative overflow-hidden rounded-2xl">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-start justify-between gap-2 p-4 pr-14 transition-colors hover:bg-white/[0.02]">
          <div className="flex min-w-0 gap-3">
            <label
              className="mt-1 flex size-5 shrink-0 items-center justify-center rounded border border-white/10 bg-surface-2"
            >
              <input
                type="checkbox"
                name="selected_template_exercise_id"
                value={te.id}
                defaultChecked={defaultSelected}
                className="size-3 accent-highlight"
                aria-label={`Incluir ${te.exercise?.name ?? 'ejercicio'} en la sesión`}
              />
            </label>
            <div className="min-w-0">
              <p className="text-xs text-text-muted">
                {index + 1} · {bodyPartLabel(te.exercise?.body_part)}
              </p>
              <p className="line-clamp-1 font-medium capitalize">
                {te.exercise?.name ?? '—'}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-text-secondary">
            <span className="group-open:hidden">Detalle</span>
            <span className="hidden group-open:inline">Cerrar</span>
            <ChevronDown
              size={16}
              strokeWidth={1.75}
              className="transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </div>
        </summary>

        <div className="space-y-3 border-t border-white/10 p-4 pt-3">
          <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-white/5 bg-surface-2">
              {mediaUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mediaUrl}
                  alt={te.exercise?.name ?? 'Ejercicio'}
                  className="h-full w-full object-contain"
                />
              ) : (
                <p className="px-4 text-center text-sm text-text-muted">
                  Sin imagen todavía
                </p>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/5 bg-surface/70 p-3">
                <dt className="text-xs text-text-muted">Objetivo</dt>
                <dd className="mt-0.5 text-sm capitalize text-text-primary">
                  {te.exercise?.target ?? '—'}
                </dd>
              </div>
              <div className="rounded-xl border border-white/5 bg-surface/70 p-3">
                <dt className="text-xs text-text-muted">Equipo</dt>
                <dd className="mt-0.5 text-sm capitalize text-text-primary">
                  {te.exercise?.equipment ?? '—'}
                </dd>
              </div>
              <div className="rounded-xl border border-white/5 bg-surface/70 p-3">
                <dt className="text-xs text-text-muted">Grupo</dt>
                <dd className="mt-0.5 text-sm capitalize text-text-primary">
                  {te.exercise?.muscle_group ?? '—'}
                </dd>
              </div>
              <div className="rounded-xl border border-white/5 bg-surface/70 p-3">
                <dt className="text-xs text-text-muted">Parte</dt>
                <dd className="mt-0.5 text-sm capitalize text-text-primary">
                  {bodyPartLabel(te.exercise?.body_part)}
                </dd>
              </div>
            </dl>
          </div>

          {te.exercise?.instructions && (
            <p className="text-sm leading-relaxed text-text-secondary">
              {te.exercise.instructions}
            </p>
          )}
        </div>
      </details>

      <button
        type="submit"
        form={removeFormId}
        aria-label="Quitar ejercicio"
        className="absolute right-3 top-3 rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-2 hover:text-danger"
      >
        <Trash2 size={16} strokeWidth={1.75} />
      </button>

      <div className="space-y-3 border-t border-white/5 p-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="submit"
            form={moveUpFormId}
            disabled={!canMoveUp}
            className="flex items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-xs font-semibold text-text-secondary transition-colors hover:border-highlight/30 hover:text-text-primary disabled:opacity-35"
          >
            <ArrowUp size={15} strokeWidth={1.75} /> Subir
          </button>
          <button
            type="submit"
            form={moveDownFormId}
            disabled={!canMoveDown}
            className="flex items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-xs font-semibold text-text-secondary transition-colors hover:border-highlight/30 hover:text-text-primary disabled:opacity-35"
          >
            <ArrowDown size={15} strokeWidth={1.75} /> Bajar
          </button>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          <input type="hidden" name="template_exercise_id" value={te.id} />
          <Field label="Series" name={`target_sets_${te.id}`} defaultValue={te.target_sets} />
          <Field label="Rep min" name={`target_reps_min_${te.id}`} defaultValue={te.target_reps_min} />
          <Field label="Rep max" name={`target_reps_max_${te.id}`} defaultValue={te.target_reps_max} />
          <Field label="Peso sug." name={`target_weight_${te.id}`} defaultValue={te.target_weight} />
          <Field label="Desc s" name={`rest_seconds_${te.id}`} defaultValue={te.rest_seconds} />
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] text-text-muted">
            Nombre claro opcional
          </span>
          <input
            name={`notes_${te.id}`}
            defaultValue={te.notes ?? ''}
            placeholder={te.exercise?.name ?? 'Nombre para esta rutina'}
            className="w-full rounded-lg border border-white/10 bg-surface-2 px-3 py-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-disabled focus:border-highlight"
          />
        </label>
      </div>
    </li>
  )
}

function recommendation(count: number) {
  if (count === 0) return null
  if (count <= 5) {
    return `Recomendado: puedes hacer los ${count} ejercicios de esta plantilla.`
  }
  return `Recomendado: elige 4-5 ejercicios por sesión. Esta plantilla tiene ${count}, no tienes que hacerlos todos.`
}

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const template = await getTemplate(id)
  if (!template) notFound()
  const mediaPaths = template.exercises
    .map((te) => te.exercise?.gif_url ?? te.exercise?.image_url)
    .filter((path): path is string => Boolean(path))
  const signedMedia = await getSignedMediaUrls([...new Set(mediaPaths)])

  return (
    <div className="space-y-5">
      <Link
        href="/templates"
        className="inline-flex items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
      >
        <ChevronLeft size={18} strokeWidth={1.75} /> Plantillas
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{template.name}</h1>
          <p className="text-sm text-text-muted">
            {template.exercises.length}{' '}
            {template.exercises.length === 1 ? 'ejercicio' : 'ejercicios'}
          </p>
        </div>
        <form action={deleteTemplate}>
          <input type="hidden" name="id" value={template.id} />
          <button
            type="submit"
            aria-label="Eliminar plantilla"
            className="flex size-9 items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-2 hover:text-danger"
          >
            <Trash2 size={18} strokeWidth={1.75} />
          </button>
        </form>
      </div>

      {recommendation(template.exercises.length) && (
        <div className="crystal-surface rounded-2xl p-4">
          <p className="text-sm font-medium text-text-primary">
            Guía de sesión
          </p>
          <p className="mt-1 text-sm leading-relaxed text-text-secondary">
            {recommendation(template.exercises.length)}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-text-muted">
            El peso en esta plantilla es solo sugerido. El peso real se registra
            cuando haces la rutina del día.
          </p>
        </div>
      )}

      <div className="crystal-surface space-y-3 rounded-2xl p-4">
        <div>
          <p className="text-sm font-medium text-text-primary">
            Compartir solo lectura
          </p>
          <p className="mt-1 text-xs leading-relaxed text-text-muted">
            Crea un link público para verla desde otro celular o mostrársela a
            alguien sin iniciar sesión. No permite editar ni marcar ejercicios.
          </p>
        </div>
        {template.is_public && template.public_share_id ? (
          <Link
            href={`/share/templates/${template.public_share_id}`}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:border-highlight/30 hover:text-text-primary"
          >
            <ExternalLink size={16} strokeWidth={1.75} /> Abrir link público
          </Link>
        ) : (
          <form action={enableTemplatePublicShare}>
            <input type="hidden" name="id" value={template.id} />
            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-2.5 text-sm font-semibold text-text-secondary transition-colors hover:border-highlight/30 hover:text-text-primary"
            >
              <Share2 size={16} strokeWidth={1.75} /> Crear link público
            </button>
          </form>
        )}
      </div>

      {template.exercises.length === 0 ? (
        <div className="crystal-surface rounded-2xl p-6 text-center">
          <p className="text-text-secondary">Sin ejercicios todavía.</p>
          <p className="mt-1 text-sm text-text-muted">
            Añade ejercicios del catálogo en el orden que quieras.
          </p>
        </div>
      ) : (
        <form action={updateTemplateExercises} className="space-y-4">
          <input type="hidden" name="template_id" value={template.id} />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="submit"
              formAction={scheduleTemplateSessionToday}
              className="flex items-center justify-center gap-2 rounded-xl border border-highlight/30 bg-primary/70 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-primary"
            >
              <CalendarPlus size={17} strokeWidth={1.75} /> Hoy
            </button>
            <button
              type="submit"
              formAction={scheduleTemplateSessionTomorrow}
              className="flex items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-semibold text-text-secondary transition-colors hover:border-highlight/30 hover:text-text-primary"
            >
              <CalendarPlus size={17} strokeWidth={1.75} /> Mañana
            </button>
          </div>
          <ol className="space-y-3">
            {template.exercises.map((te, i) => (
              <ExerciseRow
                key={te.id}
                te={te}
                index={i}
                defaultSelected
                canMoveUp={i > 0}
                canMoveDown={i < template.exercises.length - 1}
                mediaUrl={
                  te.exercise?.gif_url
                    ? signedMedia.get(te.exercise.gif_url) ?? null
                    : te.exercise?.image_url
                      ? signedMedia.get(te.exercise.image_url) ?? null
                      : null
                }
              />
            ))}
          </ol>
          <button
            type="submit"
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-primary-hover"
          >
            Guardar plantilla
          </button>
        </form>
      )}

      {template.exercises.map((te) => (
        <div key={`forms-${te.id}`} className="hidden">
          <form
            id={`remove-template-exercise-${te.id}`}
            action={removeTemplateExercise}
          >
            <input type="hidden" name="id" value={te.id} />
            <input type="hidden" name="template_id" value={template.id} />
          </form>
          <form
            id={`move-template-exercise-up-${te.id}`}
            action={moveTemplateExercise}
          >
            <input type="hidden" name="id" value={te.id} />
            <input type="hidden" name="template_id" value={template.id} />
            <input type="hidden" name="direction" value="up" />
          </form>
          <form
            id={`move-template-exercise-down-${te.id}`}
            action={moveTemplateExercise}
          >
            <input type="hidden" name="id" value={te.id} />
            <input type="hidden" name="template_id" value={template.id} />
            <input type="hidden" name="direction" value="down" />
          </form>
        </div>
      ))}

      <Link
        href={`/templates/${template.id}/add`}
        className="flex items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-medium text-text-secondary transition-colors hover:border-highlight/30 hover:text-text-primary"
      >
        <Plus size={18} strokeWidth={1.75} /> Añadir ejercicios
      </Link>

      <form action={duplicateTemplate}>
        <input type="hidden" name="id" value={template.id} />
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 py-3 text-sm font-medium text-text-secondary transition-colors hover:border-highlight/30 hover:text-text-primary"
        >
          <Copy size={17} strokeWidth={1.75} /> Duplicar y editar como nueva
        </button>
      </form>
    </div>
  )
}
