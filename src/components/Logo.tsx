/**
 * Quiescent mark (a turtle whose shell is a speech bubble around an open book, from PR #1)
 * plus the wordmark. Colors come from tokens.css (sage + ink).
 */
export function LogoMark({ size = 34 }: { size?: number }) {
  const ink = { fill: 'var(--color-ink)' }
  const line = { stroke: 'var(--color-ink)' }
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="shrink-0">
      <rect width="100" height="100" rx="22" style={{ fill: 'var(--color-sage)' }} />
      <g style={ink}>
        {/* head, flippers, and the speech-bubble tail */}
        <rect x="45.5" y="17.5" width="9" height="12" rx="4.5" />
        <ellipse cx="25.5" cy="36" rx="5" ry="3.6" transform="rotate(35 25.5 36)" />
        <ellipse cx="74.5" cy="36" rx="5" ry="3.6" transform="rotate(-35 74.5 36)" />
        <ellipse cx="27" cy="63" rx="4.6" ry="3" transform="rotate(-35 27 63)" />
        <path d="M60 70 L78 77 L70 60 Z" />
      </g>
      {/* shell */}
      <circle cx="50" cy="51" r="19.5" fill="none" style={line} strokeWidth="9.5" />
      {/* open book */}
      <g fill="none" style={line} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M40.5 46.6Q43.8 44 50 48.6Q56.2 44 59.5 46.6" />
        <path d="M40.5 53.2Q43.8 50.6 50 55.2Q56.2 50.6 59.5 53.2" />
        <path d="M50 48.6V55.2" />
      </g>
    </svg>
  )
}

export function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const mark = size === 'lg' ? 52 : size === 'sm' ? 28 : 34
  const text = size === 'lg' ? 'text-5xl' : size === 'sm' ? 'text-2xl' : 'text-3xl'
  return (
    <div className="inline-flex items-center gap-3">
      <LogoMark size={mark} />
      <span className={`font-serif font-semibold tracking-tight ${text}`}>Quiescent</span>
    </div>
  )
}
