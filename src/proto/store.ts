// Prototype state that the v2 brief asks to keep in localStorage:
// statuses, folders, folder membership, recents, profile, and dev settings.
// Item content (text, PDF bytes, highlights) stays in IndexedDB (storage/db.ts).

import { persistedStore, useStore } from './persist'

// --- statuses -----------------------------------------------------------------

export type Status = 'in_progress' | 'read_later' | 'finished'
export const STATUSES: Status[] = ['in_progress', 'read_later', 'finished']
export const STATUS_LABEL: Record<Status, string> = {
  in_progress: 'In progress',
  read_later: 'Read later',
  finished: 'Finished',
}

export type SaveVia = 'extension' | 'upload' | 'seed'

/** Per-item library facts. Keyed by item id. */
export interface ItemMeta {
  status: Status
  savedAt: number
  via: SaveVia
  lastOpenedAt?: number
  finishedAt?: number
  /** Extension saves: normalized URL used for duplicate detection. */
  canonicalUrl?: string
  /** Extension saves: when the server "confirmed" (for item_fetched latency). */
  confirmedAt?: number
  /** Scroll progress first reached 95% (item_completed fired). */
  completedAt?: number
  /** The web app has loaded this save at least once (item_fetched fired). */
  fetched?: boolean
  wordCount?: number
}

export interface Folder {
  id: string
  name: string
  createdAt: number
  /** An item can be in several folders, or none. Order = order added. */
  itemIds: string[]
}

export type UserState = 'new' | 'existing' | 'existing_folders'
export const USER_STATE_LABEL: Record<UserState, string> = {
  new: 'New user (empty library)',
  existing: 'Existing user, no folders',
  existing_folders: 'Existing user, with folders',
}

export interface Profile {
  name: string
  email: string
  method: 'google' | 'email'
  /** Small data URL (downscaled on upload). */
  photo?: string
}

export interface ProtoState {
  userState: UserState
  meta: Record<string, ItemMeta>
  folders: Folder[]
  profile: Profile
  extensionConnected: boolean
  computersSignedIn: number
  lastSyncAt: number
}

export const protoStore = persistedStore<ProtoState>('quiescent.v2.proto', () => ({
  userState: 'existing',
  meta: {},
  folders: [],
  profile: { name: 'Tam Mai', email: 'tam@usf.edu', method: 'google' },
  extensionConnected: true,
  computersSignedIn: 2,
  lastSyncAt: Date.now(),
}))

export const useProto = <S>(select: (s: ProtoState) => S) => useStore(protoStore, select)

export function metaOf(id: string, fallbackSavedAt = 0): ItemMeta {
  return protoStore.get().meta[id] ?? { status: 'read_later', savedAt: fallbackSavedAt, via: 'upload' }
}

export function patchMeta(id: string, patch: Partial<ItemMeta>) {
  protoStore.set((s) => ({
    ...s,
    meta: { ...s.meta, [id]: { ...metaOf(id, Date.now()), ...s.meta[id], ...patch } },
    lastSyncAt: Date.now(),
  }))
}

/** The most recently opened item id (any status), or null if nothing has been opened. */
export function mostRecentId(meta: Record<string, ItemMeta>, liveIds?: Set<string>): string | null {
  let best: string | null = null
  let at = 0
  for (const [id, m] of Object.entries(meta)) {
    if (liveIds && !liveIds.has(id)) continue
    if (m.lastOpenedAt && m.lastOpenedAt > at) {
      at = m.lastOpenedAt
      best = id
    }
  }
  return best
}

// --- dev settings (per viewer) ----------------------------------------------------

export interface DevState {
  devNotes: boolean
  /** Simulated failures, set from the Dev menu. */
  offline: boolean
  timeout: boolean
  rateLimited: boolean
  qError: boolean
  sidebarCollapsed: boolean
  panelOpen: boolean
  panelTab: 'controls' | 'events'
}

export const devStore = persistedStore<DevState>('quiescent.v2.dev', () => ({
  devNotes: false,
  offline: false,
  timeout: false,
  rateLimited: false,
  qError: false,
  sidebarCollapsed: false,
  panelOpen: false,
  panelTab: 'controls',
}))

export const useDev = <S>(select: (s: DevState) => S) => useStore(devStore, select)
export const useDevNotes = () => useDev((s) => s.devNotes)
