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
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <AppHeader />
      <main className="flex-1 px-5 pb-24 pt-5">{children}</main>
      <BottomNav />
    </div>
  )
}
