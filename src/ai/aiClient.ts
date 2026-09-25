// The single entry point the UI uses to talk to the AI assistant.
//
//   ask({ action, message, context }) -> Promise<string>   (the reply, in light markdown)
//
// Two modes:
//  - 'mock' (default, built): canned but context-aware replies after a short
//    delay. Free, works offline. See ./mockResponses.ts.
//  - 'live' (deferred, NOT built): will call the OpenAI API through a small
//    serverless function. The UI won't need to change.

import { mockReply } from './mockResponses'
import type { AIRequest } from './types'

export type AIMode = 'mock' | 'live'

export const AI_MODE: AIMode = 'mock'

export async function ask(request: AIRequest): Promise<string> {
  if (AI_MODE === 'live') return askLive(request)
  return askMock(request)
}

async function askMock(request: AIRequest): Promise<string> {
  // A short, slightly variable pause so it feels like a real assistant thinking.
  await new Promise((r) => setTimeout(r, 700 + Math.random() * 700))
  return mockReply(request)
}

// ---------------------------------------------------------------------------
// LIVE MODE PLACEHOLDER (deferred, do not build yet)
//
// Plan:
//  1. A serverless function at POST /api/ai receives { action, message, context }.
//  2. It reads OPENAI_API_KEY from the server environment (.env.local locally,
//     the host's secret settings when deployed). The key never reaches the browser
//     and .env* files are git-ignored.
//  3. It turns `context` into a prompt (system prompt per action + chapter text,
//     selection, the user's highlights/notes, and chat history), calls OpenAI,
//     and returns { text }.
//  4. This function becomes: fetch('/api/ai', { method: 'POST', body: JSON.stringify(request) })
// ---------------------------------------------------------------------------
async function askLive(_request: AIRequest): Promise<string> {
  throw new Error('Live AI mode is not built yet. The mockup runs in mock mode.')
}
