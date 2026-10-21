import type { ReactNode } from 'react'

/**
 * Hover/focus tooltip. Works for keyboard users (shows on focus-within) and for
 * aria-disabled controls, which a native `title` doesn't reliably cover.
 */
export function Tooltip({
  label,
  children,
  side = 'right',
  show = true,
}: {
  label: ReactNode
  children: ReactNode
  side?: 'right' | 'top' | 'bottom'
  show?: boolean
}) {
  const place =
    side === 'right'
      ? 'left-full top-1/2 ml-2 -translate-y-1/2'
      : side === 'top'
        ? 'bottom-full left-1/2 mb-2 -translate-x-1/2'
        : 'top-full left-1/2 mt-2 -translate-x-1/2'
  return (
    <span className="group/tip relative inline-flex">
      {children}
      {show && (
        <span
          role="tooltip"
          className={`pointer-events-none invisible absolute z-[70] w-max max-w-60 rounded-md bg-ink px-2.5 py-1.5 text-xs font-medium leading-snug text-paper opacity-0 shadow-lg transition-opacity group-focus-within/tip:visible group-focus-within/tip:opacity-100 group-hover/tip:visible group-hover/tip:opacity-100 ${place}`}
        >
          {label}
        </span>
      )}
    </span>
  )
}
