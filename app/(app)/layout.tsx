import { verifySession } from '@/lib/dal'
import { AppHeader } from '@/components/layout/app-header'
import { BottomNav } from '@/components/layout/bottom-nav'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Gate optimista de sesión. La verificación real por dato vive en la DAL/RLS.
  await verifySession()

  return (
    // En escritorio el contenedor se ensancha, pero cada página sigue en una
    // columna salvo que pida más espacio con `data-wide` (ver `.app-main`).
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col lg:max-w-6xl">
      <AppHeader />
      <main className="app-main flex-1 px-5 pb-24 pt-5 lg:px-8">{children}</main>
      <BottomNav />
    </div>
  )
}
