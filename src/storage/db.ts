// All saving and loading goes through this file. It uses the browser's built-in
// database (IndexedDB) via idb-keyval, a tiny key/value wrapper.
//
// Keys:
//   items              -> Item[]            (the library, without file bytes)
//   file:<itemId>      -> Blob              (PDF bytes)
//   highlights:<id>    -> Highlight[]
//   seeded             -> true once the sample items have been created

import { del, get, set } from 'idb-keyval'
import { useEffect, useState } from 'react'
import type { Highlight, Item } from '../types'

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

// --- first-run seeding flag ------------------------------------------------

export async function isSeeded() {
  return (await get<boolean>('seeded')) === true
}
export async function markSeeded() {
  await set('seeded', true)
}
