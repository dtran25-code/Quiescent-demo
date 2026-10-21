// Shared drawing helpers for the turtle family (SteleIcon and QTurtle), so the
// folder icon and Q use the same hexagonal shell pattern.

/** Points for a flat-topped hexagon centred at (cx, cy) with radius r. */
export function hexPoints(cx: number, cy: number, r: number) {
  const pts: string[] = []
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i
    pts.push(`${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`)
  }
  return pts.join(' ')
}

/** Token-based paint, so icons follow tokens.css. */
export const paint = (token: string) => ({ fill: `var(--color-${token})` })
export const ink = (token: string) => ({ stroke: `var(--color-${token})` })
