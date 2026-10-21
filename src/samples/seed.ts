// Builds the demo library for each dev user state. Items run through the same
// code paths as a real save or upload (articleFromText / readPdf).
//
//   new               -> empty library, extension not installed
//   existing          -> 12 items across all three statuses, no folders
//   existing_folders  -> the same 12 items plus four folders (one empty)

import { articleFromText } from '../ingest/article'
import { readPdf } from '../ingest/pdf'
import { addItem, clearAllData, getItem, isSeeded, markSeeded, newId, signIn, updateHighlights } from '../storage/db'
import { protoStore, type Folder, type ItemMeta, type Status, type UserState } from '../proto/store'
import { canonicalUrl } from '../proto/canonical'
import type { Highlight, Item } from '../types'
import { compoundingText, compoundingUrl } from './compoundingArticle'
import { sampleArticles } from './articles'

export const SAMPLE_ARTICLE_ID = 'sample-compounding'
export const SAMPLE_PDF_ID = 'sample-wealth'

const DAY = 86_400_000

interface Plan {
  id: string
  status: Status
  /** Days ago. */
  saved: number
  opened?: number
  finished?: number
  progress: number
}

// 4 in progress · 5 read later · 3 finished
const PLAN: Plan[] = [
  { id: SAMPLE_ARTICLE_ID, status: 'in_progress', saved: 6, opened: 0.05, progress: 34 },
  { id: SAMPLE_PDF_ID, status: 'in_progress', saved: 12, opened: 1, progress: 8 },
  { id: 'seed-hashing', status: 'in_progress', saved: 4, opened: 2, progress: 62 },
  { id: 'seed-switching', status: 'in_progress', saved: 9, opened: 5, progress: 20 },
  { id: 'seed-productivity', status: 'read_later', saved: 0.2, progress: 0 },
  { id: 'seed-tri-hoan', status: 'read_later', saved: 1.5, progress: 0 },
  { id: 'seed-prd', status: 'read_later', saved: 3, progress: 0 },
  { id: 'seed-raft', status: 'read_later', saved: 5, progress: 0 },
  { id: 'seed-dull-tools', status: 'read_later', saved: 8, progress: 0 },
  { id: 'seed-spaced', status: 'finished', saved: 20, opened: 3, finished: 3, progress: 100 },
  { id: 'seed-monetary', status: 'finished', saved: 25, opened: 7, finished: 7, progress: 96 },
  { id: 'seed-slow-reading', status: 'finished', saved: 30, opened: 15, finished: 14, progress: 100 },
]

const PDFS: Record<string, string> = {
  [SAMPLE_PDF_ID]: 'wealth-of-nations.pdf',
  'seed-switching': 'switching-costs.pdf',
  'seed-raft': 'raft-lecture-notes.pdf',
  'seed-monetary': 'monetary-policy-basics.pdf',
}
/** Online PDFs saved from a link (the others were uploaded). */
const PDF_SOURCES: Record<string, string> = {
  'seed-switching': 'https://papers.example.edu/hartmann-osei/switching-costs.pdf',
  'seed-raft': 'https://dsrg.example.org/week6/raft-slowly.pdf',
}

const FOLDERS: { name: string; itemIds: string[] }[] = [
  { name: 'Interview prep', itemIds: ['seed-hashing', 'seed-raft', 'seed-prd', 'seed-dull-tools'] },
  { name: 'Econ 301', itemIds: [SAMPLE_ARTICLE_ID, SAMPLE_PDF_ID, 'seed-productivity', 'seed-monetary'] },
  { name: 'How I read', itemIds: ['seed-switching', 'seed-spaced', 'seed-slow-reading', 'seed-tri-hoan', SAMPLE_ARTICLE_ID] },
  { name: 'Thesis, someday', itemIds: [] },
]

let running: Promise<void> | null = null

/** First run in this browser: build the library for the current user state. */
export function seedSamples() {
  running ??= (async () => {
    if (await isSeeded()) return
    // A first run interrupted by a reload may have left part of a library: start clean.
    await clearAllData()
    await buildLibrary(protoStore.get().userState)
  })()
  return running
}

/** Dev menu: switch user state (or reset). Wipes everything and signs in as that user. */
export async function resetDemo(state: UserState) {
  await clearAllData()
  await buildLibrary(state)
  const isNew = state === 'new'
  await signIn('google', isNew ? 'new.reader@gmail.com' : 'tam@usf.edu')
}

async function buildLibrary(state: UserState) {
  const now = Date.now()
  const meta: Record<string, ItemMeta> = {}
  let folders: Folder[] = []

  if (state !== 'new') {
    for (const plan of PLAN) {
      const item = await buildItem(plan, now)
      if (!item) continue
      meta[item.id] = {
        status: plan.status,
        savedAt: now - plan.saved * DAY,
        via: 'seed',
        lastOpenedAt: plan.opened !== undefined ? now - plan.opened * DAY : undefined,
        finishedAt: plan.finished !== undefined ? now - plan.finished * DAY : undefined,
        canonicalUrl: item.sourceUrl ? canonicalUrl(item.sourceUrl) : undefined,
        fetched: true,
      }
    }
    await seedHighlights(now)
  }
  if (state === 'existing_folders') {
    folders = FOLDERS.map((f, i) => ({ id: `folder-${i + 1}`, name: f.name, createdAt: now - (10 - i) * DAY, itemIds: f.itemIds }))
  }

  protoStore.reset({
    ...protoStore.get(),
    userState: state,
    meta,
    folders,
    extensionConnected: state !== 'new',
    computersSignedIn: state === 'new' ? 1 : 2,
    lastSyncAt: now,
    profile:
      state === 'new'
        ? { name: '', email: 'new.reader@gmail.com', method: 'google' }
        : { name: 'Tam Mai', email: 'tam@usf.edu', method: 'google' },
  })
  await markSeeded()
}

async function buildItem(plan: Plan, now: number): Promise<Item | null> {
  const base = {
    id: plan.id,
    addedAt: now - plan.saved * DAY,
    progress: plan.progress,
    lastScroll: plan.progress / 100,
    isSample: true,
  }
  const file = PDFS[plan.id]
  if (file) {
    const blob = await fetch(`/samples/${file}`).then((r) => r.blob())
    const pdf = await readPdf(blob, file)
    const item: Item = {
      ...base,
      title: pdf.title,
      type: 'pdf',
      fileName: file,
      sourceUrl: PDF_SOURCES[plan.id],
      chapters: pdf.chapters,
      pageCount: pdf.pageCount,
    }
    await addItem(item, blob)
    return item
  }
  const source =
    plan.id === SAMPLE_ARTICLE_ID
      ? { text: compoundingText, url: compoundingUrl }
      : sampleArticles.find((a) => a.id === plan.id)
  if (!source) return null
  const article = articleFromText(source.text, 'Untitled article')
  const item: Item = {
    ...base,
    title: article.title,
    type: 'article',
    sourceUrl: source.url,
    chapters: article.chapters,
    blocks: article.blocks,
  }
  await addItem(item)
  return item
}

// A few real highlights and notes, so panels and Q have something to show.
// (Located by searching the article's blocks for the quote.)
const HIGHLIGHTS: { itemId: string; quote: string; note: string; daysAgo: number }[] = [
  { itemId: SAMPLE_ARTICLE_ID, quote: 'most of it is growth on growth', note: 'This is the whole idea in five words.', daysAgo: 6 },
  { itemId: SAMPLE_ARTICLE_ID, quote: 'It is a curve that looks like a slope for a long time.', note: '', daysAgo: 6 },
  { itemId: 'seed-hashing', quote: 'The ring does not make the work smaller. It makes the change smaller.', note: 'Use this line in the interview answer.', daysAgo: 2 },
  { itemId: 'seed-hashing', quote: 'called virtual nodes', note: 'Why ~100 per machine? Check the Dynamo paper.', daysAgo: 2 },
  { itemId: 'seed-spaced', quote: 'familiarity is not the same as recall', note: 'Rereading my highlights ≠ remembering them.', daysAgo: 4 },
]

async function seedHighlights(now: number) {
  for (const h of HIGHLIGHTS) {
    const item = await getItem(h.itemId)
    const blocks = item?.blocks ?? []
    const k = blocks.findIndex((b) => b.text.includes(h.quote))
    if (k < 0) continue
    const o = blocks[k].text.indexOf(h.quote)
    const hl: Highlight = {
      id: newId(),
      itemId: h.itemId,
      chapterId: blocks[k].chapterId,
      quote: h.quote,
      start: { k, o },
      end: { k, o: o + h.quote.length },
      note: h.note,
      createdAt: now - h.daysAgo * DAY,
      updatedAt: now - h.daysAgo * DAY,
    }
    await updateHighlights(h.itemId, (list) => [...list, hl])
  }
}
