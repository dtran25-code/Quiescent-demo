// Q, the reading companion, drawn as a small turtle. Same family as the stele
// (shared hex shell pattern), in the logo's colors: a sage shell outlined in navy
// ink. A character, not an icon: big eye, a smile, head out and curious.
//
//   <QTurtle size={44} state="idle" />   floating toggle
//   <QTurtle size={20} />                beside Q's messages in the panel
//   state: 'idle' | 'thinking' | 'answered' | 'error'
//
// thinking: head tucks toward the shell and the shell pulses (CSS in index.css).
// Under prefers-reduced-motion the head stays tucked and nothing moves.

import { hexPoints, ink, paint } from './shell'

export type QState = 'idle' | 'thinking' | 'answered' | 'error'

export function QTurtle({ size = 44, state = 'idle', title }: { size?: 44 | 20 | number; state?: QState; title?: string }) {
  const small = size <= 28
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true as const }
  return (
    <svg width={size} height={size} viewBox={small ? '0 0 20 20' : '0 0 44 44'} className="q-turtle shrink-0" data-state={state} {...a11y}>
      {small ? <Small state={state} /> : <Large state={state} />}
    </svg>
  )
}

function Large({ state }: { state: QState }) {
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      {/* feet */}
      <ellipse cx="15" cy="34.5" rx="3.6" ry="2.6" style={{ ...paint('sage-500'), ...ink('ink') }} strokeWidth="1.1" />
      <ellipse cx="32" cy="34.5" rx="3.6" ry="2.6" style={{ ...paint('sage-500'), ...ink('ink') }} strokeWidth="1.1" />
      {/* tail */}
      <path d="M39.5 30 L43 31.5 L39.5 32.5 Z" style={{ ...paint('sage-500'), ...ink('ink') }} strokeWidth="1" />

      {/* head (tucks while thinking) */}
      <g className="q-head">
        <path d="M12 28 C9 27 7.5 25 7 22.5" fill="none" style={ink('ink')} strokeWidth="5.4" />
        <path d="M12 28 C9 27 7.5 25 7 22.5" fill="none" style={ink('sage-300')} strokeWidth="3.4" />
        <circle cx="6.6" cy="19.6" r="5.4" style={{ ...paint('sage-300'), ...ink('ink') }} strokeWidth="1.3" />
        {/* eye with a highlight */}
        <circle cx="5.2" cy="18.6" r="1.75" style={paint('stone-900')} />
        <circle cx="4.7" cy="18" r="0.55" style={paint('white')} />
        {/* smile */}
        <path d="M3.2 22.2 Q5 23.6 7 22.6" fill="none" style={ink('ink')} strokeWidth="1" />
      </g>

      {/* shell */}
      <g className="q-shell">
        <path d="M9.5 31.5 C10 16 16 11.5 24 11.5 C32 11.5 38 16 38.5 31.5 Z" style={{ ...paint('sage-300'), ...ink('ink') }} strokeWidth="1.4" />
        <g fill="none" style={ink('ink')} strokeWidth="1.1">
          <polygon points={hexPoints(24, 21, 4.6)} />
          <polygon points={hexPoints(16.6, 26.2, 3.8)} />
          <polygon points={hexPoints(31.4, 26.2, 3.8)} />
        </g>
        <rect x="8" y="30" width="32" height="3.4" rx="1.7" style={{ ...paint('sage-500'), ...ink('ink') }} strokeWidth="1.1" />
      </g>

      {/* status badge */}
      {state === 'answered' && (
        <g className="q-badge">
          <circle cx="37" cy="9" r="6" style={{ ...paint('ok'), ...ink('white') }} strokeWidth="1.5" />
          <path d="M34.3 9.2 L36.3 11.1 L39.8 7.2" fill="none" style={ink('white')} strokeWidth="1.7" />
        </g>
      )}
      {state === 'error' && (
        <g className="q-badge">
          <circle cx="37" cy="9" r="6" style={{ ...paint('danger'), ...ink('white') }} strokeWidth="1.5" />
          <line x1="37" y1="5.8" x2="37" y2="9.8" style={ink('white')} strokeWidth="1.8" />
          <circle cx="37" cy="12.2" r="1" style={paint('white')} />
        </g>
      )}
    </g>
  )
}

function Small({ state }: { state: QState }) {
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      <g className="q-head">
        <circle cx="3.6" cy="10" r="2.9" style={{ ...paint('sage-300'), ...ink('ink') }} strokeWidth="1" />
        <circle cx="2.9" cy="9.5" r="0.95" style={paint('stone-900')} />
      </g>
      <g className="q-shell">
        <path d="M5 15 C5.3 8 8.2 5.5 12 5.5 C15.8 5.5 18.7 8 19 15 Z" style={{ ...paint('sage-300'), ...ink('ink') }} strokeWidth="1.1" />
        <polygon points={hexPoints(12, 10.6, 2.4)} fill="none" style={ink('ink')} strokeWidth="0.9" />
        <rect x="4.2" y="14.2" width="15.6" height="2.2" rx="1.1" style={{ ...paint('sage-500'), ...ink('ink') }} strokeWidth="0.8" />
      </g>
      {state === 'error' && <circle cx="17" cy="4" r="2.6" style={{ ...paint('danger'), ...ink('white') }} strokeWidth="0.9" />}
      {state === 'answered' && <circle cx="17" cy="4" r="2.6" style={{ ...paint('ok'), ...ink('white') }} strokeWidth="0.9" />}
    </g>
  )
}
