'use client'

import { useActionState, useState } from 'react'
import { Camera, Lock } from 'lucide-react'
import { saveGameProfile, type GameFormState } from '@/app/actions/game'
import { Avatar } from '@/components/game/avatar'
import { suggestColorsFromPhoto } from '@/components/game/photo-colors'
import {
  ACCESSORIES,
  ACCESSORY_LABELS,
  AVATAR_BODIES,
  AVATAR_BODY_LABELS,
  GOALS,
  GOAL_LABELS,
  HAIR_COLORS,
  SKIN_TONES,
  WEEKLY_TARGET_MAX,
  WEEKLY_TARGET_MIN,
  type AvatarConfig,
  type Goal,
} from '@/lib/game/avatar-options'
import type { BodyParams } from '@/lib/game/avatar-params'

const GOAL_HINTS: Record<Goal, string> = {
  fuerza: 'Gana hombros, brazos y piernas.',
  grasa: 'Se estiliza la cintura.',
  bienestar: 'Cambia con tu constancia.',
}

const WEEKLY_TARGETS = Array.from(
  { length: WEEKLY_TARGET_MAX - WEEKLY_TARGET_MIN + 1 },
  (_, index) => WEEKLY_TARGET_MIN + index
)

type PhotoStatus = 'idle' | 'reading' | 'done' | 'error'

function Segmented<T extends string | number>({
  legend,
  name,
  options,
  value,
  onChange,
  label,
}: {
  legend: string
  name: string
  options: readonly T[]
  value: T
  onChange: (value: T) => void
  label: (option: T) => string
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-text-secondary">{legend}</legend>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((option) => (
          <label key={option} className="relative">
            <input
              type="radio"
              name={name}
              value={option}
              checked={option === value}
              onChange={() => onChange(option)}
              className="peer sr-only"
            />
            <span className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-surface-2 px-2 text-center text-sm text-text-secondary transition-colors duration-200 peer-checked:border-highlight/60 peer-checked:bg-primary peer-checked:font-semibold peer-checked:text-text-primary peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-highlight/50">
              {label(option)}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function Swatches<T extends string>({
  legend,
  name,
  colors,
  value,
  onChange,
}: {
  legend: string
  name: string
  colors: readonly T[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium text-text-secondary">{legend}</legend>
      <div className="flex flex-wrap gap-2.5">
        {colors.map((color, index) => (
          <label key={color} className="relative">
            <input
              type="radio"
              name={name}
              value={color}
              checked={color === value}
              onChange={() => onChange(color)}
              className="peer sr-only"
              aria-label={`${legend} ${index + 1}`}
            />
            <span
              className="block size-11 cursor-pointer rounded-xl border-2 border-surface ring-1 ring-white/15 transition-shadow duration-200 peer-checked:ring-2 peer-checked:ring-text-primary peer-focus-visible:outline peer-focus-visible:outline-1 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-highlight"
              style={{ background: color }}
            />
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function AvatarEditor({
  initial,
  previewParams,
  isNew,
}: {
  initial: { avatar: AvatarConfig; goal: Goal; weekly_target: number }
  /** Silueta para cada objetivo, calculada en el servidor (sin enviar el peso). */
  previewParams: Record<Goal, BodyParams>
  isNew: boolean
}) {
  const [state, action, pending] = useActionState<GameFormState, FormData>(
    saveGameProfile,
    undefined
  )
  const [avatar, setAvatar] = useState(initial.avatar)
  const [goal, setGoal] = useState(initial.goal)
  const [weeklyTarget, setWeeklyTarget] = useState(initial.weekly_target)
  const [photoStatus, setPhotoStatus] = useState<PhotoStatus>('idle')

  const update = (patch: Partial<AvatarConfig>) => setAvatar((current) => ({ ...current, ...patch }))

  async function onPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Se limpia el input: la foto no queda en ningún formulario.
    event.target.value = ''
    if (!file) return
    setPhotoStatus('reading')
    try {
      update(await suggestColorsFromPhoto(file))
      setPhotoStatus('done')
    } catch {
      setPhotoStatus('error')
    }
  }

  return (
    <div className="space-y-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8 lg:space-y-0">
      <div className="crystal-surface rounded-2xl p-4 lg:sticky lg:top-6">
        <Avatar
          config={avatar}
          params={{ ...previewParams[goal], body: avatar.body }}
          label="Vista previa de tu avatar"
          className="mx-auto h-64 w-auto"
        />
      </div>

      <div className="space-y-6">
        {/* Fuera del <form> y sin `name`: la foto nunca se envía al servidor. */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-text-secondary">Tu foto (opcional)</h2>
          <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-surface-2 px-4 text-sm font-semibold text-text-primary transition-colors duration-200 hover:border-white/20 has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-highlight/50">
            <Camera size={20} strokeWidth={1.75} aria-hidden="true" />
            {photoStatus === 'reading' ? 'Analizando…' : 'Sugerir colores con una selfie'}
            <input
              type="file"
              accept="image/*"
              capture="user"
              onChange={onPhoto}
              disabled={photoStatus === 'reading'}
              className="sr-only"
            />
          </label>
          <p className="flex gap-2 text-xs text-text-muted">
            <Lock size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden="true" />
            La foto se analiza solo en tu celular para sugerir tono de piel y pelo. No se sube
            ni se guarda.
          </p>
          <p aria-live="polite" className="text-xs">
            {photoStatus === 'done' ? (
              <span className="text-success">Colores sugeridos. Puedes ajustarlos abajo.</span>
            ) : photoStatus === 'error' ? (
              <span className="text-danger">No pudimos leer la foto. Elige los colores a mano.</span>
            ) : null}
          </p>
        </section>

        <form action={action} className="space-y-6">
          <Swatches legend="Tono de piel" name="skin" colors={SKIN_TONES} value={avatar.skin} onChange={(skin) => update({ skin })} />
          <Swatches legend="Color de pelo" name="hair" colors={HAIR_COLORS} value={avatar.hair} onChange={(hair) => update({ hair })} />
          <Segmented
            legend="Cuerpo del avatar"
            name="body"
            options={AVATAR_BODIES}
            value={avatar.body}
            onChange={(body) => update({ body })}
            label={(option) => AVATAR_BODY_LABELS[option]}
          />
          <Segmented
            legend="Accesorio"
            name="accessory"
            options={ACCESSORIES}
            value={avatar.accessory}
            onChange={(accessory) => update({ accessory })}
            label={(option) => ACCESSORY_LABELS[option]}
          />
          <div className="space-y-2">
            <Segmented
              legend="Objetivo"
              name="goal"
              options={GOALS}
              value={goal}
              onChange={setGoal}
              label={(option) => GOAL_LABELS[option]}
            />
            <p className="text-xs text-text-muted">{GOAL_HINTS[goal]}</p>
          </div>
          <Segmented
            legend="Meta semanal (días)"
            name="weekly_target"
            options={WEEKLY_TARGETS}
            value={weeklyTarget}
            onChange={setWeeklyTarget}
            label={(option) => String(option)}
          />

          {state?.error ? (
            <p role="alert" className="text-sm text-danger">
              {state.error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="min-h-12 w-full rounded-xl bg-primary px-4 text-base font-semibold text-text-primary transition-colors duration-200 hover:bg-primary-hover disabled:opacity-60"
          >
            {pending ? 'Guardando…' : isNew ? 'Crear mi avatar' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  )
}
