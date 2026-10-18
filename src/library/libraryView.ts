// What the Library shows: status tabs, sort order, and filters. The filter
// choices are built from the saved items themselves, never a fixed list.

import type { Folder, Item, ItemStatus } from '../types'

export const STATUSES: { id: ItemStatus; label: string }[] = [
  { id: 'in-progress', label: 'In Progress' },
  { id: 'read-later', label: 'Read Later' },
  { id: 'done', label: 'Done' },
]

export const statusOf = (item: Item): ItemStatus => item.status ?? 'in-progress'

export type SortOrder = 'newest' | 'oldest' | 'title-az' | 'title-za'

export const SORTS: { id: SortOrder; label: string }[] = [
  { id: 'newest', label: 'Time saved (newest first)' },
  { id: 'oldest', label: 'Time saved (oldest first)' },
  { id: 'title-az', label: 'Title A→Z' },
  { id: 'title-za', label: 'Title Z→A' },
]

export interface Filters {
  platform: string | null
  author: string | null
  folderId: string | null
}

export const NO_FILTERS: Filters = { platform: null, author: null, folderId: null }

// Hosts whose name isn't simply their domain. Subdomains count too
// (e.g. someone.substack.com is Substack).
const KNOWN_PLATFORMS: [host: string, name: string][] = [
  ['substack.com', 'Substack'],
  ['medium.com', 'Medium'],
  ['nytimes.com', 'The New York Times'],
  ['theguardian.com', 'The Guardian'],
  ['theatlantic.com', 'The Atlantic'],
  ['newyorker.com', 'The New Yorker'],
  ['wikipedia.org', 'Wikipedia'],
  ['github.com', 'GitHub'],
  ['arxiv.org', 'arXiv'],
]

/** Where an item comes from, as a short name for the platform filter. */
export function platformOf(item: Item): string {
  if (item.type === 'pdf') return 'PDF upload'
  const host = hostOf(item.sourceUrl)
  if (!host) return 'Pasted text'
  const known = KNOWN_PLATFORMS.find(([h]) => host === h || host.endsWith(`.${h}`))
  if (known) return known[1]
  return item.siteName?.trim() || host
}

export function hostOf(url?: string) {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

/** Distinct values with how many items have each, alphabetical. */
function tally(values: string[]) {
  const counts = new Map<string, number>()
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => a.value.localeCompare(b.value))
}

export function filterChoices(items: Item[]) {
  return {
    platforms: tally(items.map(platformOf)),
    authors: tally(items.flatMap((i) => (i.author?.trim() ? [i.author.trim()] : []))),
  }
}

export function applyView(items: Item[], status: ItemStatus, filters: Filters, sort: SortOrder) {
  const shown = items.filter(
    (i) =>
      statusOf(i) === status &&
      (!filters.platform || platformOf(i) === filters.platform) &&
      (!filters.author || i.author?.trim() === filters.author) &&
      (!filters.folderId || (i.folderIds ?? []).includes(filters.folderId)),
  )
  const byTitle = (a: Item, b: Item) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base', numeric: true })
  const compare: Record<SortOrder, (a: Item, b: Item) => number> = {
    newest: (a, b) => b.addedAt - a.addedAt,
    oldest: (a, b) => a.addedAt - b.addedAt,
    'title-az': byTitle,
    'title-za': (a, b) => byTitle(b, a),
  }
  return shown.sort(compare[sort])
}

/** Drops a folder filter that points at a folder which no longer exists. */
export function validFilters(filters: Filters, folders: Folder[]): Filters {
  return filters.folderId && !folders.some((f) => f.id === filters.folderId) ? { ...filters, folderId: null } : filters
}
