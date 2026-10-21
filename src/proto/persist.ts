// A tiny persisted store for prototype state. Lives in localStorage (every read
// and write wrapped in try/catch: private windows and blocked storage just fall
// back to in-memory state). Other tabs pick up changes through the `storage`
// event, so a save in /demo-browser shows up in an open Library tab.

import { useSyncExternalStore } from 'react'

export interface Store<T> {
  get(): T
  set(update: Partial<T> | ((prev: T) => T)): void
  reset(value?: T): void
  subscribe(fn: () => void): () => void
}

export function persistedStore<T extends object>(key: string, defaults: () => T): Store<T> {
  const listeners = new Set<() => void>()
  let value: T = load()

  function load(): T {
    try {
      const raw = localStorage.getItem(key)
      if (raw) return { ...defaults(), ...JSON.parse(raw) }
    } catch {
      // Unreadable or blocked storage: start from defaults.
    }
    return defaults()
  }
  function save() {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // Storage full or unavailable: the change lives in memory for this tab only.
    }
  }
  const emit = () => listeners.forEach((l) => l())

  try {
    window.addEventListener('storage', (e) => {
      if (e.key !== key) return
      value = load()
      emit()
    })
  } catch {
    // No window (tests, scripts): no cross-tab sync.
  }

  return {
    get: () => value,
    set(update) {
      value = typeof update === 'function' ? update(value) : { ...value, ...update }
      save()
      emit()
    },
    reset(next) {
      value = next ?? defaults()
      save()
      emit()
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}

export function useStore<T, S>(store: Store<T>, select: (state: T) => S): S {
  return useSyncExternalStore(store.subscribe, () => select(store.get()))
}
