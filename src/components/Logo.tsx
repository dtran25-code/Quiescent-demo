/**
 * ReadHub mark plus the wordmark. `mark="turtle"` is the new logo (a turtle whose
 * shell is a speech bubble around an open book); so far only the Library uses it.
 * The other pages still show the original open book on the accent color.
 */
export function Logo({ size = 'md', mark = 'book' }: { size?: 'md' | 'lg'; mark?: 'book' | 'turtle' }) {
  const px = size === 'lg' ? 52 : 34
  return (
    <div className="inline-flex items-center gap-3">
      {mark === 'turtle' ? <TurtleMark size={px} /> : <BookMark size={px} />}
      <span className={`font-serif tracking-tight ${size === 'lg' ? 'text-5xl' : 'text-3xl'}`}>ReadHub</span>
    </div>
  )
}

function BookMark({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
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
  )
}

function TurtleMark({ size }: { size: number }) {
  const ink = '#1A2C4A'
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true">
      <rect width="100" height="100" rx="22" fill="#C9DDB8" />
      <g fill={ink}>
        {/* head, flippers, and the speech-bubble tail */}
        <rect x="45.5" y="17.5" width="9" height="12" rx="4.5" />
        <ellipse cx="25.5" cy="36" rx="5" ry="3.6" transform="rotate(35 25.5 36)" />
        <ellipse cx="74.5" cy="36" rx="5" ry="3.6" transform="rotate(-35 74.5 36)" />
        <ellipse cx="27" cy="63" rx="4.6" ry="3" transform="rotate(-35 27 63)" />
        <path d="M60 70 L78 77 L70 60 Z" />
      </g>
      {/* shell */}
      <circle cx="50" cy="51" r="19.5" fill="none" stroke={ink} strokeWidth="9.5" />
      {/* open book */}
      <g fill="none" stroke={ink} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        <path d="M40.5 46.6Q43.8 44 50 48.6Q56.2 44 59.5 46.6" />
        <path d="M40.5 53.2Q43.8 50.6 50 55.2Q56.2 50.6 59.5 53.2" />
        <path d="M50 48.6V55.2" />
      </g>
    </svg>
  )
}
