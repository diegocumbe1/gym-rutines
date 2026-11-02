export default function LigaLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando Liga Fit">
      <div className="h-8 w-32 animate-pulse rounded-lg bg-surface-2 motion-reduce:animate-none" />
      <div className="h-52 animate-pulse rounded-2xl bg-surface-2 motion-reduce:animate-none" />
      <div className="h-64 animate-pulse rounded-2xl bg-surface-2 motion-reduce:animate-none" />
    </div>
  )
}
