// All saving and loading goes through this file. It uses the browser's built-in
// database (IndexedDB) via idb-keyval, a tiny key/value wrapper.
//
// Keys:
//   items              -> Item[]            (the library, without file bytes)
//   file:<itemId>      -> Blob              (PDF bytes)
//   highlights:<id>    -> Highlight[]
//   folders            -> Folder[]          (Library folders; items list theirs in folderIds)
//   seeded             -> true once the sample items have been created

import { del, get, set } from 'idb-keyval'
import { useEffect, useState } from 'react'
import type { Folder, Highlight, Item } from '../types'

// --- change notifications, so screens re-render when data changes ---------

type Listener = () => void
const listeners = new Set<Listener>()
function notify() {
  listeners.forEach((l) => l())
}
function useStored<T>(load: () => Promise<T>, deps: unknown[]): T | undefined {
  const [value, setValue] = useState<T>()
  useEffect(() => {
    let alive = true
    const refresh = () => load().then((v) => alive && setValue(v))
    refresh()
    listeners.add(refresh)
    return () => {
      alive = false
      listeners.delete(refresh)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return value
}

export function newId() {
  return crypto.randomUUID()
}

// Writes run one at a time so two quick saves can't overwrite each other.
let queue: Promise<unknown> = Promise.resolve()
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn)
  queue = run.catch(() => {})
  return run
}

// --- items ---------------------------------------------------------------

export async function getItems(): Promise<Item[]> {
  return (await get<Item[]>('items')) ?? []
}

export async function getItem(id: string): Promise<Item | undefined> {
  return (await getItems()).find((i) => i.id === id)
}

export const addItem = (item: Item, file?: Blob) =>
  serial(async () => {
    if (file) await set(`file:${item.id}`, file)
    const items = await getItems()
    await set('items', [item, ...items])
    notify()
  })

export const updateItem = (id: string, patch: Partial<Item>) =>
  serial(async () => {
    const items = await getItems()
    await set(
      'items',
      items.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    )
    notify()
  })

export const deleteItem = (id: string) =>
  serial(async () => {
    const items = await getItems()
    await set(
      'items',
      items.filter((i) => i.id !== id),
    )
    await del(`file:${id}`)
    await del(`highlights:${id}`)
    await del(`chat:${id}`)
    await del(`notesdoc:${id}`)
    notify()
  })

/** Everything stored for one item, so a delete can be undone. */
export interface ItemSnapshot {
  item: Item
  /** Where it sat in the library list, so Undo puts it back in the same place. */
  index: number
  values: [key: string, value: unknown][]
}

const itemKeys = (id: string) => [`file:${id}`, `highlights:${id}`, `chat:${id}`, `notesdoc:${id}`]

/** Deletes an item and returns what's needed to restore it (see restoreItem). */
export const deleteItemUndoable = (id: string) =>
  serial(async () => {
    const items = await getItems()
    const index = items.findIndex((i) => i.id === id)
    if (index < 0) return null
    const values: ItemSnapshot['values'] = []
    for (const key of itemKeys(id)) {
      const value = await get(key)
      if (value !== undefined) values.push([key, value])
    }
    await set(
      'items',
      items.filter((i) => i.id !== id),
    )
    for (const key of itemKeys(id)) await del(key)
    notify()
    return { item: items[index], index, values } satisfies ItemSnapshot
  })

export const restoreItem = (snapshot: ItemSnapshot) =>
  serial(async () => {
    for (const [key, value] of snapshot.values) await set(key, value)
    const items = (await getItems()).filter((i) => i.id !== snapshot.item.id)
    // Folders deleted in the meantime no longer exist; don't bring their ids back.
    const folderIds = new Set((await getFolders()).map((f) => f.id))
    const item = { ...snapshot.item, folderIds: snapshot.item.folderIds?.filter((f) => folderIds.has(f)) }
    items.splice(Math.min(snapshot.index, items.length), 0, item)
    await set('items', items)
    notify()
  })

export async function getFile(id: string): Promise<Blob | undefined> {
  return get<Blob>(`file:${id}`)
}

export function useItems() {
  return useStored(getItems, [])
}

export function useItem(id: string | undefined) {
  return useStored(async () => (id ? ((await getItem(id)) ?? null) : null), [id])
}

// --- highlights ------------------------------------------------------------

export async function getHighlights(itemId: string): Promise<Highlight[]> {
  return (await get<Highlight[]>(`highlights:${itemId}`)) ?? []
}

/** Read-modify-write the highlight list for one item. */
export const updateHighlights = (itemId: string, fn: (list: Highlight[]) => Highlight[]) =>
  serial(async () => {
    await set(`highlights:${itemId}`, fn(await getHighlights(itemId)))
    notify()
  })

export function useHighlights(itemId: string | undefined) {
  return useStored(async () => (itemId ? getHighlights(itemId) : []), [itemId])
}

// --- Library folders ---------------------------------------------------------
// Folders are made and filled by hand. Deleting one only removes the folder:
// its items stay in the library.

export async function getFolders(): Promise<Folder[]> {
  return (await get<Folder[]>('folders')) ?? []
}

export function useFolders() {
  return useStored(getFolders, [])
}

export const createFolder = (name: string) =>
  serial(async () => {
    const folder: Folder = { id: newId(), name: name.trim(), createdAt: Date.now() }
    await set('folders', [...(await getFolders()), folder])
    notify()
    return folder
  })

export const renameFolder = (id: string, name: string) =>
  serial(async () => {
    await set(
      'folders',
      (await getFolders()).map((f) => (f.id === id ? { ...f, name: name.trim() } : f)),
    )
    notify()
  })

export const deleteFolder = (id: string) =>
  serial(async () => {
    await set(
      'folders',
      (await getFolders()).filter((f) => f.id !== id),
    )
    const items = await getItems()
    await set(
      'items',
      items.map((i) => (i.folderIds?.includes(id) ? { ...i, folderIds: i.folderIds.filter((f) => f !== id) } : i)),
    )
    notify()
  })

/** Adds the item to the folder, or takes it out if it's already there. */
export const toggleItemFolder = (itemId: string, folderId: string) =>
  serial(async () => {
    const items = await getItems()
    await set(
      'items',
      items.map((i) => {
        if (i.id !== itemId) return i
        const ids = i.folderIds ?? []
        return { ...i, folderIds: ids.includes(folderId) ? ids.filter((f) => f !== folderId) : [...ids, folderId] }
      }),
    )
    notify()
  })

// --- first-run seeding flag ------------------------------------------------

export async function isSeeded() {
  return (await get<boolean>('seeded')) === true
}
export async function markSeeded() {
  await set('seeded', true)
}

// --- pending upload (chosen on the landing page, saved after sign-in) --------

export interface PendingUpload {
  item: Item
  file?: Blob
}

export async function setPending(item: Item, file?: Blob) {
  await set('pending', { item, file } satisfies PendingUpload)
}

export async function getPending() {
  return get<PendingUpload>('pending')
}

/** Move the pending upload into the library (dated now), then forget it. */
export async function commitPending() {
  const pending = await getPending()
  if (!pending) return
  await addItem({ ...pending.item, addedAt: Date.now() }, pending.file)
  await del('pending')
}

// --- mock session ------------------------------------------------------------
// MOCKUP ONLY: "signing in" just records which button was clicked. There is no
// real account, password check, or identity provider behind it.

export type SignInMethod = 'google' | 'apple' | 'microsoft' | 'email'

export interface Session {
  method: SignInMethod
  email?: string
  signedInAt: number
}

export async function signIn(method: SignInMethod, email?: string) {
  await set('session', { method, email, signedInAt: Date.now() } satisfies Session)
  notify()
}

export async function signOut() {
  await del('session')
  notify()
}

/** undefined while loading, null when signed out. */
export function useSession() {
  return useStored(async () => (await get<Session>('session')) ?? null, [])
}

// --- AI assistant chat history (one conversation per item) --------------------

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  createdAt: number
}

export async function getChat(itemId: string): Promise<ChatMessage[]> {
  return (await get<ChatMessage[]>(`chat:${itemId}`)) ?? []
}

export const appendChat = (itemId: string, message: ChatMessage) =>
  serial(async () => {
    await set(`chat:${itemId}`, [...(await getChat(itemId)), message])
    notify()
  })

export const clearChat = (itemId: string) =>
  serial(async () => {
    await del(`chat:${itemId}`)
    notify()
  })

export function useChat(itemId: string | undefined) {
  return useStored(async () => (itemId ? getChat(itemId) : []), [itemId])
}

// --- Notes page (one free-form document per item) -------------------------------
// The page is the user's own document. It embeds highlight cards by id, but
// editing or clearing it never changes the highlights themselves.

export interface NotesDoc {
  /** TipTap/ProseMirror document JSON. */
  doc: unknown
  /** Every highlight id ever placed on the page, so cleared ones don't come back on their own. */
  known: string[]
  updatedAt: number
}

export async function getNotesDoc(itemId: string): Promise<NotesDoc | undefined> {
  return get<NotesDoc>(`notesdoc:${itemId}`)
}

/** Saved quietly (no re-render broadcast): the editor already shows what it saves. */
export const saveNotesDoc = (itemId: string, value: NotesDoc) =>
  serial(async () => {
    await set(`notesdoc:${itemId}`, value)
  })
