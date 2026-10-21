// Every library change goes through here, so each one fires its event once.
//
// DEFAULT status rules (v2 brief):
//   - new saves land in Read later (or In progress if saved with "Read now")
//   - opening a Read later item moves it to In progress
//   - Finished is only set by hand (reader button or card menu)
// DEFAULT membership: an item can be in several folders or none; folders are
// independent of status; removing from a folder never deletes the item.

import { deleteItem, getHighlights, newId } from '../storage/db'
import { track } from '../events/track'
import { devStore, metaOf, patchMeta, protoStore, type Folder, type SaveVia, type Status } from './store'
import type { Item } from '../types'

export const FOLDER_NAME_MAX = 40

/** Dev → Offline: changes still apply locally, but the sync failure is logged. */
function syncCheck(object: 'reading' | 'highlight' | 'note' | 'folder') {
  if (devStore.get().offline) track('sync_failed', { object, reason: 'offline' })
}

// --- statuses -------------------------------------------------------------------

export function setStatus(itemId: string, to: Status, via: 'card_menu' | 'reader' | 'opened' | 'read_now') {
  const from = metaOf(itemId).status
  if (from === to) return
  patchMeta(itemId, { status: to, finishedAt: to === 'finished' ? Date.now() : undefined })
  track('item_status_changed', { item_id: itemId, from, to, via })
  syncCheck('reading')
}

/** Called when the reader opens an item. Returns facts for item_opened. */
export function markOpened(itemId: string, savedAtFallback: number) {
  const meta = metaOf(itemId, savedAtFallback)
  const now = Date.now()
  const first = !meta.lastOpenedAt
  const daysSince = meta.lastOpenedAt ? Math.floor((now - meta.lastOpenedAt) / 86_400_000) : 0
  patchMeta(itemId, { lastOpenedAt: now, savedAt: meta.savedAt || savedAtFallback })
  if (meta.status === 'read_later') setStatus(itemId, 'in_progress', 'opened')
  return { first, daysSince }
}

/** Register a brand-new library item (extension save or upload). */
export function registerSave(item: Item, via: SaveVia, opts: { canonical?: string; status?: Status; wordCount?: number } = {}) {
  patchMeta(item.id, {
    status: opts.status ?? 'read_later',
    savedAt: Date.now(),
    via,
    canonicalUrl: opts.canonical,
    confirmedAt: via === 'extension' ? Date.now() : undefined,
    fetched: via !== 'extension',
    wordCount: opts.wordCount,
  })
}

/** Remove from library (after the confirm dialog). Also leaves every folder. */
export async function removeItem(itemId: string) {
  const highlights = await getHighlights(itemId)
  const folderCount = protoStore.get().folders.filter((f) => f.itemIds.includes(itemId)).length
  await deleteItem(itemId)
  protoStore.set((s) => {
    const meta = { ...s.meta }
    delete meta[itemId]
    return { ...s, meta, folders: s.folders.map((f) => ({ ...f, itemIds: f.itemIds.filter((i) => i !== itemId) })) }
  })
  track('item_removed', { item_id: itemId, highlight_count: highlights.length, folder_count: folderCount })
  syncCheck('reading')
}

// --- folders ----------------------------------------------------------------------

/** Required, ≤ 40 characters, unique (ignoring case and outer spaces). */
export function folderNameError(name: string, excludeId?: string): string | null {
  const n = name.trim()
  if (!n) return 'Give the folder a name.'
  if (n.length > FOLDER_NAME_MAX) return `Keep it to ${FOLDER_NAME_MAX} characters or fewer.`
  const clash = protoStore.get().folders.some((f) => f.id !== excludeId && f.name.trim().toLowerCase() === n.toLowerCase())
  return clash ? 'You already have a folder with this name.' : null
}

export function createFolder(name: string, itemIds: string[], from: 'header' | 'card_menu'): Folder {
  const folder: Folder = { id: `folder-${newId().slice(0, 8)}`, name: name.trim(), createdAt: Date.now(), itemIds: [...new Set(itemIds)] }
  protoStore.set((s) => ({ ...s, folders: [...s.folders, folder] }))
  track('folder_created', {
    folder_id: folder.id,
    items_added: folder.itemIds.length,
    folder_count: protoStore.get().folders.length,
    name_length: folder.name.length,
    from,
  })
  syncCheck('folder')
  return folder
}

export function renameFolder(folderId: string, name: string) {
  protoStore.set((s) => ({ ...s, folders: s.folders.map((f) => (f.id === folderId ? { ...f, name: name.trim() } : f)) }))
  track('folder_renamed', { folder_id: folderId, name_length: name.trim().length })
  syncCheck('folder')
}

/** Deletes the folder only. Its items stay in the library. */
export function deleteFolder(folderId: string) {
  const folder = protoStore.get().folders.find((f) => f.id === folderId)
  protoStore.set((s) => ({ ...s, folders: s.folders.filter((f) => f.id !== folderId) }))
  track('folder_deleted', { folder_id: folderId, item_count: folder?.itemIds.length ?? 0, folder_count: protoStore.get().folders.length })
  syncCheck('folder')
}

/** Set exactly which items a folder holds (folder detail → Add items). */
export function setFolderItems(folderId: string, itemIds: string[], via: 'folder_detail' | 'create_modal') {
  const folder = protoStore.get().folders.find((f) => f.id === folderId)
  if (!folder) return
  const next = [...folder.itemIds.filter((i) => itemIds.includes(i)), ...itemIds.filter((i) => !folder.itemIds.includes(i))]
  const added = next.filter((i) => !folder.itemIds.includes(i)).length
  const removed = folder.itemIds.filter((i) => !next.includes(i)).length
  if (!added && !removed) return
  protoStore.set((s) => ({ ...s, folders: s.folders.map((f) => (f.id === folderId ? { ...f, itemIds: next } : f)) }))
  track('folder_items_changed', { folder_id: folderId, added, removed, via })
  syncCheck('folder')
}

/** Set exactly which folders one item is in (card menu → Add to folder). */
export function setItemFolders(itemId: string, folderIds: string[]) {
  const before = protoStore.get().folders
  protoStore.set((s) => ({
    ...s,
    folders: s.folders.map((f) => {
      const has = f.itemIds.includes(itemId)
      const want = folderIds.includes(f.id)
      if (has === want) return f
      return { ...f, itemIds: want ? [...f.itemIds, itemId] : f.itemIds.filter((i) => i !== itemId) }
    }),
  }))
  for (const f of before) {
    const has = f.itemIds.includes(itemId)
    const want = folderIds.includes(f.id)
    if (has !== want) track('folder_items_changed', { folder_id: f.id, added: want ? 1 : 0, removed: want ? 0 : 1, via: 'card_menu' })
  }
  syncCheck('folder')
}

export function removeFromFolder(folderId: string, itemId: string) {
  protoStore.set((s) => ({
    ...s,
    folders: s.folders.map((f) => (f.id === folderId ? { ...f, itemIds: f.itemIds.filter((i) => i !== itemId) } : f)),
  }))
  track('folder_items_changed', { folder_id: folderId, added: 0, removed: 1, via: 'folder_detail' })
  syncCheck('folder')
}
