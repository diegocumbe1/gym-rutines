import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { AvatarEditor } from '@/components/game/avatar-editor'
import { getGameProfile, listGameSessions, listMeasurements } from '@/lib/data/game'
import { DEFAULT_AVATAR, GOALS, type Goal } from '@/lib/game/avatar-options'
import { bodyParams, type BodyParams } from '@/lib/game/avatar-params'
import { weeksMetTarget } from '@/lib/game/weeks'

const DEFAULT_WEEKLY_TARGET = 3

export default async function AvatarPage() {
  const profile = await getGameProfile()
  const initial = profile ?? {
    avatar: DEFAULT_AVATAR,
    goal: 'bienestar' as const,
    weekly_target: DEFAULT_WEEKLY_TARGET,
  }

  const [sessions, measurements] = await Promise.all([
    listGameSessions(),
    profile?.measurements_consent_at ? listMeasurements() : Promise.resolve([]),
  ])
  const weeksMet = weeksMetTarget(sessions, initial.weekly_target).size

  // El peso no viaja al cliente: solo la silueta ya calculada por objetivo.
  const previewParams = Object.fromEntries(
    GOALS.map((goal) => [
      goal,
      bodyParams({
        body: initial.avatar.body,
        goal,
        heightCm: profile?.height_cm ?? null,
        weightKg: measurements.at(-1)?.weight_kg ?? null,
        weeksMet,
      }),
    ])
  ) as Record<Goal, BodyParams>

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        {profile ? (
          <Link
            href="/liga"
            className="-ml-1 inline-flex min-h-11 items-center gap-1 text-sm text-text-muted transition-colors hover:text-text-primary"
          >
            <ChevronLeft size={18} strokeWidth={1.75} aria-hidden="true" /> Liga Fit
          </Link>
        ) : null}
        <h1 className="text-2xl font-bold">{profile ? 'Tu avatar' : 'Crea tu avatar'}</h1>
        <p className="text-sm text-text-muted">
          Tu avatar evoluciona según tu objetivo y tu constancia.
        </p>
      </div>

      <AvatarEditor initial={initial} previewParams={previewParams} isNew={!profile} />
    </div>
  )
}
