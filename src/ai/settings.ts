// Per-browser assistant preferences: whether it's shown, and where the bubble sits.
// These are small conveniences, so they live in localStorage (with safe fallbacks).

import { useEffect, useState } from 'react'

const KEY = 'readhub.assistant'
const EVENT = 'readhub-assistant-settings'

export interface AssistantSettings {
  enabled: boolean
  /** Bubble position as fractions of the window (0–1), so it survives resizing. */
  x: number
  y: number
}

const DEFAULTS: AssistantSettings = { enabled: true, x: 0.94, y: 0.84 }

function read(): AssistantSettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return DEFAULTS
  }
}

export function saveAssistantSettings(patch: Partial<AssistantSettings>) {
  const next = { ...read(), ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Storage unavailable (private mode etc.): the change just won't persist.
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: next }))
}

export function useAssistantSettings() {
  const [settings, setSettings] = useState(read)
  useEffect(() => {
    const onChange = (e: Event) => setSettings((e as CustomEvent<AssistantSettings>).detail)
    window.addEventListener(EVENT, onChange)
    return () => window.removeEventListener(EVENT, onChange)
  }, [])
  return settings
}
