export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-10">
      {/* Un único reflejo contenido: la luz como material, sin gradientes pesados. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-highlight/10 blur-[120px]"
      />
      <div className="relative w-full max-w-sm">{children}</div>
    </main>
  )
}
