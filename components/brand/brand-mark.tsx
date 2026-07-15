type BrandMarkProps = {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeClass = {
  sm: 'size-7 rounded-lg',
  md: 'size-9 rounded-xl',
  lg: 'size-12 rounded-2xl',
}

export function BrandMark({ size = 'md', className = '' }: BrandMarkProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden border border-white/10 bg-surface-2 shadow-[0_0_24px_rgba(49,93,168,0.18)] ${sizeClass[size]} ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/gym-routines-icon.png"
        alt=""
        aria-hidden="true"
        className="h-full w-full object-cover"
      />
    </span>
  )
}
