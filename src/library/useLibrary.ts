import { useMemo } from 'react'
import { useItems } from '../storage/db'
import { metaOf, useProto, type ItemMeta, type Status } from '../proto/store'
import type { Item, ItemType } from '../types'

export interface Entry {
  item: Item
  meta: ItemMeta
}

/** Library items joined with their prototype status. undefined while loading. */
export function useLibrary(): Entry[] | undefined {
  const items = useItems()
  const meta = useProto((s) => s.meta)
  return useMemo(
    () => items?.map((item) => ({ item, meta: meta[item.id] ?? metaOf(item.id, item.addedAt) })),
    [items, meta],
  )
}

// --- sort and filter (team meeting) ------------------------------------------------
// Sort: newest first (default), oldest first, title A to Z. "Newest" means date
// saved, everywhere. Filter: content type and source site. Both apply inside the
// current status tab or folder.

export type SortKey = 'newest' | 'oldest' | 'title'
export const SORTS: SortKey[] = ['newest', 'oldest', 'title']
export const SORT_LABEL: Record<SortKey, string> = {
  newest: 'Newest first',
  oldest: 'Oldest first',
  title: 'Title A to Z',
}

export interface LibraryQuery {
  sort: SortKey
  /** null = all types */
  type: ItemType | null
  /** A sourceLabel() value; null = all sites */
  site: string | null
}

export function filterEntries(entries: Entry[], q: LibraryQuery): Entry[] {
  return entries.filter((e) => (!q.type || e.item.type === q.type) && (!q.site || sourceLabel(e.item) === q.site))
}

export function sortEntries(entries: Entry[], sort: SortKey): Entry[] {
  const list = [...entries]
  if (sort === 'title') return list.sort((a, b) => a.item.title.localeCompare(b.item.title, undefined, { sensitivity: 'base' }))
  const dir = sort === 'newest' ? -1 : 1
  return list.sort((a, b) => dir * (a.meta.savedAt - b.meta.savedAt))
}

/** Filtered and sorted. */
export function applyQuery(entries: Entry[], q: LibraryQuery): Entry[] {
  return sortEntries(filterEntries(entries, q), q.sort)
}

/** Every source site in the library, for the filter. */
export function sourceSites(entries: Entry[]): string[] {
  return [...new Set(entries.map((e) => sourceLabel(e.item)))].sort((a, b) => a.localeCompare(b))
}

/** Split into the three status lists, each sorted (default: newest saved first). */
export function groupByStatus(entries: Entry[], sort: SortKey = 'newest'): Record<Status, Entry[]> {
  const by = (status: Status) => sortEntries(entries.filter((e) => e.meta.status === status), sort)
  return { in_progress: by('in_progress'), read_later: by('read_later'), finished: by('finished') }
}

export function hostOf(url?: string) {
  if (!url) return null
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

export function sourceLabel(item: Item) {
  if (item.type === 'pdf') return hostOf(item.sourceUrl) ?? 'Uploaded PDF'
  return hostOf(item.sourceUrl) ?? 'Pasted text'
}

export function shortDate(at: number) {
  const sameYear = new Date(at).getFullYear() === new Date().getFullYear()
  return new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) })
}
