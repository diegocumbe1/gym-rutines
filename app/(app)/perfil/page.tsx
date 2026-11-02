import Link from 'next/link'
import { ChevronRight, Lock, LogOut, ShieldCheck, TrendingUp, UserRound } from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { Avatar } from '@/components/game/avatar'
import { DeleteMeasurements } from '@/components/game/delete-measurements'
import { getUser } from '@/lib/dal'
import { getGameProfile, listMeasurements } from '@/lib/data/game'
import { TIME_ZONE } from '@/lib/dates'
import { GOAL_LABELS } from '@/lib/game/avatar-options'
import { bodyParams } from '@/lib/game/avatar-params'

function consentDateLabel(iso: string) {
  return new Intl.DateTimeFormat('es', {
    timeZone: TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(iso))
}

function SectionTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="border-b border-white/5 pb-1.5 text-sm font-semibold text-text-secondary">
      {children}
    </h2>
  )
}

const rowLink =
  'flex min-h-12 items-center gap-3 rounded-xl border border-white/10 px-4 text-text-secondary transition-colors duration-200 hover:text-text-primary'

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ borrado?: string }>
}) {
  const [user, profile, { borrado }] = await Promise.all([getUser(), getGameProfile(), searchParams])
  const consentAt = profile?.measurements_consent_at ?? null
  const measurements = consentAt ? await listMeasurements() : []

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Mi perfil</h1>

      <section aria-labelledby="cuenta" className="space-y-2">
        <SectionTitle id="cuenta">Cuenta</SectionTitle>
        <p className="truncate text-text-primary">{user?.email}</p>
      </section>

      <section aria-labelledby="liga" className="space-y-3">
        <SectionTitle id="liga">Liga Fit</SectionTitle>
        {profile ? (
          <div className="flex items-center gap-4">
            <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
              <Avatar
                config={profile.avatar}
                // Miniatura: silueta neutra, sin usar medidas.
                params={bodyParams({ body: profile.avatar.body, goal: profile.goal, heightCm: null, weightKg: null, weeksMet: 0 })}
                variant="bust"
                label="Tu avatar"
                className="size-full"
              />
            </div>
            <p className="text-sm text-text-secondary">
              Objetivo: <span className="text-text-primary">{GOAL_LABELS[profile.goal]}</span>
              <br />
              Meta: <span className="font-mono text-text-primary">{profile.weekly_target}</span> días por semana
            </p>
          </div>
        ) : (
          <p className="text-sm text-text-muted">Aún no has creado tu avatar.</p>
        )}
        <Link href="/liga/avatar" className={rowLink}>
          <UserRound size={20} strokeWidth={1.75} aria-hidden="true" />
          <span className="flex-1">{profile ? 'Editar avatar, objetivo y meta' : 'Crear mi avatar'}</span>
          <ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" />
        </Link>
      </section>

      <section aria-labelledby="privacidad" className="space-y-3">
        <SectionTitle id="privacidad">Privacidad y datos sensibles</SectionTitle>

        {borrado === '1' && !consentAt ? (
          <p role="status" className="rounded-xl border border-success/30 px-4 py-3 text-sm text-success">
            Borramos todas tus medidas y tu talla, y retiramos tu autorización.
          </p>
        ) : null}

        <div className="flex gap-3 rounded-xl border border-white/5 bg-surface-2 px-4 py-3">
          {consentAt ? (
            <ShieldCheck size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
          ) : (
            <Lock size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-text-muted" aria-hidden="true" />
          )}
          <div className="space-y-0.5 text-sm">
            <p className="font-medium text-text-primary">
              {consentAt ? 'Medidas autorizadas' : 'Sin autorización para medidas'}
            </p>
            <p className="text-text-muted">
              {consentAt
                ? `Autorizaste guardar tus medidas el ${consentDateLabel(consentAt)}. Tienes ${measurements.length} ${measurements.length === 1 ? 'medida guardada' : 'medidas guardadas'}.`
                : 'No guardamos tu peso, talla ni otras medidas.'}
            </p>
          </div>
        </div>

        <p className="text-xs text-text-muted">
          Tus medidas solo las ves tú: nunca aparecen en rankings ni en enlaces compartidos. La
          foto del avatar se analiza en tu celular y no se guarda.
        </p>

        <Link href="/liga/evolucion" className={rowLink}>
          <TrendingUp size={20} strokeWidth={1.75} aria-hidden="true" />
          <span className="flex-1">{consentAt ? 'Ver y registrar medidas' : 'Autorizar y registrar medidas'}</span>
          <ChevronRight size={18} strokeWidth={1.75} aria-hidden="true" />
        </Link>

        {consentAt ? <DeleteMeasurements returnTo="/perfil" /> : null}
      </section>

      <form action={logout}>
        <button
          type="submit"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-4 text-text-secondary transition-colors duration-200 hover:text-text-primary"
        >
          <LogOut size={18} strokeWidth={1.75} aria-hidden="true" />
          Cerrar sesión
        </button>
      </form>
    </div>
  )
}
