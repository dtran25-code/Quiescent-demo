// Mock mode: builds a believable reply without calling any AI service.
// Sample items get hand-written answers (sampleScripts.ts). Anything else gets a
// reply assembled from the real chapter text and the user's own notes, clearly
// marked as a demo response.

import type { Highlight } from '../types'
import { SAMPLE_SCRIPTS, type SampleScript } from './sampleScripts'
import type { AIContext, AIRequest } from './types'

const DEMO_NOTE = '\n\n_Demo response: the live assistant will interpret your own documents in depth._'

export function mockReply({ action, message, context }: AIRequest): string {
  const script = SAMPLE_SCRIPTS[context.item.id]
  switch (action) {
    case 'explain':
      return explain(context, script)
    case 'summarize':
      return summarize(context, script)
    case 'polish':
      return polish(context, script)
    case 'expand':
      return expand(context, script)
    default:
      return chat(message ?? '', context, script)
  }
}

// --- Explain this --------------------------------------------------------------

function explain(ctx: AIContext, script?: SampleScript) {
  const passage = ctx.attachment?.text
  if (!passage) {
    return 'Select a passage in the text (or click **Ask AI** on a note) and I\'ll explain it.'
  }
  if (script) {
    const best = bestMatch(passage, script.explain)
    if (best) return best
    const summary = script.summaries[ctx.chapter.id]
    if (summary) {
      return `This line sits in **${ctx.chapter.title}**, and it supports the section's main point:\n\n${summary}`
    }
  }
  const around = surroundingSentences(ctx.chapter.text, passage)
  const role = describeRole(passage)
  return [
    `**In context:** this passage is from *${ctx.chapter.title}*.`,
    around ? `The text around it reads: “${around}”` : '',
    `**What it's doing:** it ${role}.`,
    ctx.attachment?.note ? `**Your note on it:** “${ctx.attachment.note.trim()}”, which picks up on exactly that.` : '',
  ]
    .filter(Boolean)
    .join('\n\n') + DEMO_NOTE
}

function describeRole(passage: string) {
  const p = passage.toLowerCase()
  if (/\d/.test(p)) return 'gives a concrete figure or example to back up the argument'
  if (/^(but|however|yet|still|although)\b/.test(p)) return 'pushes back on the point that came right before it'
  if (/\b(because|so that|therefore|thus|hence|as a result)\b/.test(p)) return 'explains a cause and its effect'
  if (/\b(should|must|need to|ought)\b/.test(p)) return 'makes a recommendation'
  if (/\b(for example|for instance|such as|like)\b/.test(p)) return 'illustrates the idea with an example'
  return 'states one of the key claims of this section'
}

// --- Summarize what I just read ------------------------------------------------

function summarize(ctx: AIContext, script?: SampleScript) {
  const canned = script?.summaries[ctx.chapter.id]
  if (canned) return `**${ctx.chapter.title}**\n\n${canned}`
  const key = keySentences(ctx.chapter.text, 4)
  if (key.length === 0) return `I couldn't find any text in *${ctx.chapter.title}* to summarize (it may be a scanned image).`
  return `**${ctx.chapter.title}**, key points:\n${key.map((s) => `- ${s}`).join('\n')}` + DEMO_NOTE
}

// --- Polish my notes -------------------------------------------------------------

function polish(ctx: AIContext, script?: SampleScript) {
  const notes = inChapter(ctx).filter((h) => h.note.trim())
  if (notes.length === 0) {
    return `You haven't written any notes in **${ctx.chapter.title}** yet. Highlight a passage and choose **Highlight + note**, then ask me again.`
  }
  const seen = new Set<string>()
  const cleaned = notes
    .map((h) => ({ note: tidy(h.note), quote: h.quote }))
    .filter(({ note }) => {
      const k = note.toLowerCase()
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
  const lines = cleaned.map(({ note, quote }) => `- ${note}  \n  _on “${shorten(quote, 70)}”_`)
  const takeaway = script?.takeaways[ctx.chapter.id]
  return [
    `**Your notes on ${ctx.chapter.title}, cleaned up** (${notes.length} ${notes.length === 1 ? 'note' : 'notes'}):`,
    lines.join('\n'),
    takeaway ? `**One-line takeaway:** ${takeaway}` : '',
  ]
    .filter(Boolean)
    .join('\n\n') + (script ? '' : DEMO_NOTE)
}

// --- Expand this idea -----------------------------------------------------------------

function expand(ctx: AIContext, script?: SampleScript) {
  const target =
    ctx.attachment ??
    (() => {
      const latest = [...inChapter(ctx)].filter((h) => h.note.trim()).sort((a, b) => b.updatedAt - a.updatedAt)[0]
      return latest ? { kind: 'note' as const, text: latest.quote, note: latest.note } : null
    })()
  const about = target
    ? `Expanding on ${target.note?.trim() ? `your note “${shorten(target.note.trim(), 90)}”` : `“${shorten(target.text, 90)}”`}:\n\n`
    : `Expanding on **${ctx.chapter.title}**:\n\n`
  if (script) return about + (script.expand[ctx.chapter.id] ?? script.expand.default)
  const focus = shorten(target?.text ?? keySentences(ctx.chapter.text, 1)[0] ?? ctx.chapter.title, 80)
  return (
    about +
    [
      '**Connections**',
      `- How does “${focus}” relate to the other passages you highlighted in *${ctx.item.title}*?`,
      '- Is there an example from your own work or reading that fits this idea?',
      '',
      '**Counterpoint**',
      '- What would someone who disagrees say? Under what conditions would this stop being true?',
      '',
      '**Questions to explore**',
      '- What evidence supports this, and what would change your mind?',
      '- What is one way to apply this in the next week?',
    ].join('\n') +
    DEMO_NOTE
  )
}

// --- Free chat -------------------------------------------------------------------------

function chat(message: string, ctx: AIContext, script?: SampleScript) {
  const m = message.toLowerCase()
  if (/summar|recap|tl;?dr|what (did|have) i (just )?read/.test(m)) return summarize(ctx, script)
  if (/polish|clean up|tidy|my notes/.test(m)) return polish(ctx, script)
  if (/expand|counter|connect|follow.?up|question/.test(m)) return expand(ctx, script)
  if (/explain|what does|mean|confus|don'?t (get|understand)/.test(m) && ctx.attachment) return explain(ctx, script)

  // Samples: if the question touches a topic we have an answer for, use it.
  const topical = script && bestMatch(message, script.explain)
  if (topical) return `Here's how the text handles that:\n\n${topical}`

  const notes = inChapter(ctx).filter((h) => h.note.trim())
  const lead = script?.takeaways[ctx.chapter.id] ?? keySentences(ctx.chapter.text, 1)[0]
  return [
    `Good question. You're in **${ctx.chapter.title}**${lead ? `, whose main point is: ${stripMarkdown(lead)}` : '.'}`,
    notes.length ? `Your notes here focus on: “${shorten(tidy(notes[notes.length - 1].note), 100)}”` : '',
    'I can **explain** a passage you select, **summarize** this section, **polish** your notes, or **expand** an idea into connections and follow-up questions.',
  ]
    .filter(Boolean)
    .join('\n\n') + DEMO_NOTE
}

// --- helpers -----------------------------------------------------------------------------

function inChapter(ctx: AIContext): Highlight[] {
  return ctx.highlights.filter((h) => h.chapterId === ctx.chapter.id)
}

function bestMatch(passage: string, entries: { keys: string[]; text: string }[]) {
  const p = passage.toLowerCase()
  let best: { score: number; text: string } | null = null
  for (const e of entries) {
    const score = e.keys.reduce((n, k) => n + (p.includes(k.toLowerCase()) ? k.length : 0), 0)
    if (score > 0 && (!best || score > best.score)) best = { score, text: e.text }
  }
  return best?.text ?? null
}

function sentences(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9“"(])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25)
}

/** The most "central" sentences: those sharing the most frequent words, kept in reading order. */
function keySentences(text: string, n: number) {
  // Skip fragments that come from tables, headings or glossaries in PDFs.
  const readable = (s: string) => {
    const letters = s.replace(/[^\p{L}]/gu, '')
    const upper = s.replace(/[^\p{Lu}]/gu, '')
    return s.length >= 50 && s.length <= 320 && upper.length / Math.max(1, letters.length) < 0.2 && !/\b\p{Lu}{2,} \p{Lu}\b/u.test(s)
  }
  const all = sentences(text).filter(readable)
  if (all.length <= n) return all.map((s) => shorten(s, 220))
  const freq = new Map<string, number>()
  const words = (s: string) => s.toLowerCase().match(/[\p{L}]{5,}/gu) ?? []
  all.forEach((s) => new Set(words(s)).forEach((w) => freq.set(w, (freq.get(w) ?? 0) + 1)))
  const scored = all.map((s, i) => {
    const ws = words(s)
    const score = ws.reduce((t, w) => t + (freq.get(w) ?? 0), 0) / Math.max(4, ws.length)
    return { s, i, score }
  })
  // Take the best-scoring sentences, skipping near-duplicates of ones already picked.
  const picked: typeof scored = []
  for (const cand of scored.sort((a, b) => b.score - a.score)) {
    const w = new Set(words(cand.s))
    const dup = picked.some((p) => {
      const pw = words(p.s)
      return pw.filter((x) => w.has(x)).length / Math.max(1, Math.min(w.size, pw.length)) > 0.6
    })
    if (!dup) picked.push(cand)
    if (picked.length === n) break
  }
  return picked.sort((a, b) => a.i - b.i).map(({ s }) => shorten(s, 220))
}

function surroundingSentences(text: string, passage: string) {
  const all = sentences(text)
  const probe = passage.slice(0, 40).toLowerCase()
  const i = all.findIndex((s) => s.toLowerCase().includes(probe))
  if (i === -1) return ''
  const before = all[i - 1]
  return shorten(before ? `${before} ${all[i]}` : all[i], 260)
}

/** Light clean-up of a quick note: spacing, repeated punctuation, capitals, dashes, final period. */
function tidy(note: string) {
  let s = note.replace(/\s+/g, ' ').trim()
  s = s.replace(/([!?.])\1+/g, '$1') // "!!" → "!"
  s = s.replace(/\s+-\s+/g, ': ') // "rule of 72 - handy" → "rule of 72: handy"
  s = s.replace(/\s+([,.;:!?])/g, '$1')
  s = s.replace(/(^|[.!?]\s+)(\p{Ll})/gu, (_, pre, c) => pre + c.toUpperCase())
  s = s.replace(/\bi\b/g, 'I')
  if (!/[.!?)]$/.test(s)) s += '.'
  return s
}

function shorten(s: string, max: number) {
  const t = s.replace(/\s+/g, ' ').trim()
  return t.length <= max ? t : t.slice(0, max - 1).replace(/\s+\S*$/, '') + '…'
}

function stripMarkdown(s: string) {
  return s.replace(/\*\*|\*|_/g, '')
}
