/** Quiescent mark (the v1 open book on the accent color) plus the wordmark. */
export function LogoMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" className="shrink-0">
      <rect width="32" height="32" rx="7" style={{ fill: 'var(--color-accent)' }} />
      <path
        d="M8 9.5c2.8-.9 5.5-.6 8 1 2.5-1.6 5.2-1.9 8-1v13c-2.8-.9-5.5-.6-8 1-2.5-1.6-5.2-1.9-8-1z"
        fill="none"
        style={{ stroke: 'var(--color-on-accent)' }}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M16 10.5v13" style={{ stroke: 'var(--color-on-accent)' }} strokeWidth="1.8" />
    </svg>
  )
}

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const mark = size === 'lg' ? 52 : size === 'sm' ? 28 : 34
  const text = size === 'lg' ? 'text-5xl' : size === 'sm' ? 'text-xl' : 'text-3xl'
  return (
    <div className="inline-flex items-center gap-3">
      <LogoMark size={mark} />
      <span className={`font-serif tracking-tight ${text}`}>Quiescent</span>
    </div>
  )
}
