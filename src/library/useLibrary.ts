import { useMemo } from 'react'
import { useItems } from '../storage/db'
import { metaOf, useProto, type ItemMeta, type Status } from '../proto/store'
import type { Item } from '../types'

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

/**
 * DEFAULT order, no user-facing sort:
 *   In progress by last opened · Read later by last saved · Finished by last finished.
 */
export function groupByStatus(entries: Entry[]): Record<Status, Entry[]> {
  const by = (status: Status) => entries.filter((e) => e.meta.status === status)
  const desc = (key: (e: Entry) => number) => (a: Entry, b: Entry) => key(b) - key(a)
  return {
    in_progress: by('in_progress').sort(desc((e) => e.meta.lastOpenedAt ?? e.meta.savedAt)),
    read_later: by('read_later').sort(desc((e) => e.meta.savedAt)),
    finished: by('finished').sort(desc((e) => e.meta.finishedAt ?? e.meta.savedAt)),
  }
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
