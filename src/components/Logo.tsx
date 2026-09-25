/** ReadHub mark (an open book on the accent color) plus the wordmark. */
export function Logo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const mark = size === 'lg' ? 52 : 34
  return (
    <div className="inline-flex items-center gap-3">
      <svg width={mark} height={mark} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="7" fill="#A64B4F" />
        <path
          d="M8 9.5c2.8-.9 5.5-.6 8 1 2.5-1.6 5.2-1.9 8-1v13c-2.8-.9-5.5-.6-8 1-2.5-1.6-5.2-1.9-8-1z"
          fill="none"
          stroke="#FBF8F3"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path d="M16 10.5v13" stroke="#FBF8F3" strokeWidth="1.8" />
      </svg>
      <span className={`font-serif tracking-tight ${size === 'lg' ? 'text-5xl' : 'text-3xl'}`}>ReadHub</span>
    </div>
  )
}
