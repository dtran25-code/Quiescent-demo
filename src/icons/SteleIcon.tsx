// Folder icon: a stone stele on a tortoise's back (bia đá trên lưng rùa), after
// the steles at Văn Miếu – Quốc Tử Giám. Original flat drawing, not a tracing.
//
//   <SteleIcon size={96} />            grid
//   <SteleIcon size={24} />            menus, breadcrumbs (no inscription, no shell detail)
//   state: 'default' | 'hover' | 'selected' | 'empty'
//
// The folder name is rendered below the icon by the caller, never on the slab.
// Hover lift is CSS (.stele / .stele-host in index.css), so it also works when a
// parent link is hovered or focused.

import { hexPoints, ink, paint } from './shell'

export type SteleState = 'default' | 'hover' | 'selected' | 'empty'

export function SteleIcon({
  size = 96,
  state = 'default',
  title,
  className = '',
}: {
  size?: 96 | 24 | number
  state?: SteleState
  /** Accessible name; omit when a visible label sits next to the icon. */
  title?: string
  className?: string
}) {
  const small = size <= 40
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true as const }
  return (
    <svg
      width={size}
      height={size}
      viewBox={small ? '0 0 24 24' : '0 0 96 96'}
      className={`stele shrink-0 ${className}`}
      data-state={state}
      {...a11y}
    >
      {small ? <Small state={state} /> : <Large state={state} />}
    </svg>
  )
}

function Large({ state }: { state: SteleState }) {
  const selected = state === 'selected'
  const empty = state === 'empty'
  const edge = selected ? ink('accent') : ink('stone-500')
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      {/* ground */}
      <ellipse cx="50" cy="87" rx="36" ry="3.2" style={paint(selected ? 'accent-soft' : 'stone-100')} />

      {/* feet, tucked under the rim */}
      <ellipse cx="25" cy="83" rx="6" ry="3.4" style={{ ...paint('stone-400'), ...ink('stone-500') }} strokeWidth="1.2" />
      <ellipse cx="74" cy="83" rx="6" ry="3.4" style={{ ...paint('stone-400'), ...ink('stone-500') }} strokeWidth="1.2" />

      {/* head: extended forward and slightly raised */}
      <path
        d="M20 76 C14 75 11 72 9.5 67.5"
        fill="none"
        style={ink('stone-500')}
        strokeWidth="7.5"
      />
      <path d="M20 76 C14 75 11 72 9.5 67.5" fill="none" style={ink('stone-300')} strokeWidth="5" />
      <ellipse cx="8" cy="64.5" rx="6.6" ry="4.9" transform="rotate(-18 8 64.5)" style={{ ...paint('stone-300'), ...ink('stone-500') }} strokeWidth="1.3" />
      <circle cx="6" cy="63.2" r="1.15" style={paint('stone-900')} />

      {/* shell: domed, with hexagonal plates */}
      <path d="M15 79 C16 58 30 53 50 53 C70 53 84 58 85 79 Z" style={{ ...paint('stone-300'), ...ink('stone-500') }} strokeWidth="1.5" />
      <g fill="none" style={ink('stone-500')} strokeWidth="1.15">
        <polygon points={hexPoints(24, 72, 5)} />
        <polygon points={hexPoints(37, 74, 5)} />
        <polygon points={hexPoints(50, 75, 5)} />
        <polygon points={hexPoints(63, 74, 5)} />
        <polygon points={hexPoints(76, 72, 5)} />
        <polygon points={hexPoints(21.5, 62.5, 4.2)} />
        <polygon points={hexPoints(78.5, 62.5, 4.2)} />
      </g>
      {/* rim */}
      <rect x="13" y="77.5" width="74" height="4.5" rx="2.25" style={{ ...paint('stone-400'), ...ink('stone-500') }} strokeWidth="1.2" />

      {/* plinth the slab stands in */}
      <rect x="30" y="61" width="40" height="6" rx="1.5" style={{ ...paint('stone-400'), ...edge }} strokeWidth="1.3" />

      {/* slab with arched top */}
      <path
        d="M33 62 V25 A17 17 0 0 1 67 25 V62 Z"
        style={{ ...paint(empty ? 'stone-100' : 'stone-200'), ...edge }}
        strokeWidth={selected ? 2.2 : 1.6}
      />
      {/* carved border */}
      <path
        d="M37 59 V26 A13 13 0 0 1 63 26 V59 Z"
        fill="none"
        style={edge}
        strokeWidth="1"
        strokeDasharray={empty ? '2.5 2.5' : undefined}
        opacity={empty ? 0.7 : 1}
      />
      {/* inscription (blank slab for an empty folder) */}
      {!empty && (
        <g style={ink('stone-500')} strokeWidth="1.7">
          <line x1="42" y1="32" x2="58" y2="32" />
          <line x1="42" y1="38.5" x2="58" y2="38.5" />
          <line x1="42" y1="45" x2="55" y2="45" />
          <line x1="42" y1="51.5" x2="57" y2="51.5" />
        </g>
      )}
    </g>
  )
}

function Small({ state }: { state: SteleState }) {
  const selected = state === 'selected'
  const empty = state === 'empty'
  const edge = selected ? ink('accent') : ink('stone-700')
  return (
    <g strokeLinejoin="round" strokeLinecap="round">
      {/* head */}
      <circle cx="3" cy="16.2" r="2.1" style={{ ...paint('stone-300'), ...ink('stone-700') }} strokeWidth="1" />
      {/* shell */}
      <path d="M3.5 21 C3.8 15.5 7 14 12 14 C17 14 20.2 15.5 20.5 21 Z" style={{ ...paint('stone-300'), ...ink('stone-700') }} strokeWidth="1.1" />
      {/* slab */}
      <path
        d="M8 16 V6.5 A4 4 0 0 1 16 6.5 V16 Z"
        style={{ ...paint(empty ? 'stone-100' : 'stone-200'), ...edge }}
        strokeWidth={selected ? 1.6 : 1.2}
        strokeDasharray={empty ? '1.6 1.2' : undefined}
      />
    </g>
  )
}
