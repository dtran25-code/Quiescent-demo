import type { ReactNode } from 'react'

/**
 * Renders the assistant's light markdown: paragraphs, "- " and "1. " lists,
 * **bold**, *italic* / _italic_, and "  \n" line breaks.
 */
export function RichText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n{2,}/)
  return (
    <div className="space-y-2.5">
      {blocks.map((block, i) => {
        const lines = block.split('\n')
        const isList = lines.some((l) => /^(- |\d+\. )/.test(l))
        if (!isList) return <p key={i}>{inline(lines.join(' '))}</p>
        const header = lines.slice(0, lines.findIndex((x) => /^(- |\d+\. )/.test(x)))
        const items: string[] = []
        lines.slice(header.length).forEach((l) => {
          if (/^(- |\d+\. )/.test(l)) items.push(l.replace(/^(- |\d+\. )/, ''))
          else if (items.length) items[items.length - 1] += '\n' + l.trim()
        })
        const ordered = /^\d+\. /.test(lines[header.length])
        const List = ordered ? 'ol' : 'ul'
        return (
          <div key={i}>
            {header.length > 0 && <p className="mb-1">{inline(header.join(' '))}</p>}
            <List className={`space-y-1 pl-5 ${ordered ? 'list-decimal' : 'list-disc'} marker:text-accent/70`}>
              {items.map((it, j) => (
                <li key={j}>
                  {it.split('\n').map((part, k) => (
                    <span key={k}>
                      {k > 0 && <br />}
                      {inline(part.replace(/\s+$/, ''))}
                    </span>
                  ))}
                </li>
              ))}
            </List>
          </div>
        )
      })}
    </div>
  )
}

function inline(s: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index))
    if (m[1]) out.push(<strong key={m.index} className="font-semibold text-ink">{m[1]}</strong>)
    else out.push(<em key={m.index}>{m[2] ?? m[3]}</em>)
    last = m.index + m[0].length
  }
  if (last < s.length) out.push(s.slice(last))
  return out
}
