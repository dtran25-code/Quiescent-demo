// Upload rules for the Library's Upload dialog:
// type and size are checked before anything uploads, and a good PDF lands in Read later.

import { addItem, newId } from '../storage/db'
import { readPdf } from '../ingest/pdf'
import { registerSave } from '../proto/actions'
import { track } from '../events/track'
import type { Item } from '../types'

export const MAX_UPLOAD_MB = 25
export const MAX_BYTES = MAX_UPLOAD_MB * 1024 * 1024

export interface UploadError {
  reason: 'wrong_type' | 'too_large' | 'read_error'
  name: string
  bytes: number
}

export function fileType(file: File): 'pdf' | 'epub' | 'docx' | 'other' {
  const name = file.name.toLowerCase()
  if (file.type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  if (name.endsWith('.epub')) return 'epub'
  if (name.endsWith('.docx') || name.endsWith('.doc')) return 'docx'
  return 'other'
}

export function formatMb(bytes: number) {
  if (bytes < 100 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function errorTitle(reason: 'wrong_type' | 'too_large' | 'read_error') {
  return reason === 'wrong_type' ? 'PDF only for now' : reason === 'too_large' ? 'That file is too large' : "Couldn't read that PDF"
}

export function errorBody(s: UploadError) {
  if (s.reason === 'wrong_type') return `“${s.name}” isn't a PDF. Choose a .pdf file.`
  if (s.reason === 'too_large') return `“${s.name}” is ${formatMb(s.bytes)}. The limit is ${MAX_UPLOAD_MB} MB.`
  return `“${s.name}” may be damaged or password-protected. Nothing was added.`
}

/** Type and size are checked before anything uploads. */
export function checkUpload(file: File): 'wrong_type' | 'too_large' | null {
  if (fileType(file) !== 'pdf') return 'wrong_type'
  if (file.size > MAX_BYTES) return 'too_large'
  return null
}

/**
 * Reads a checked PDF, adds it to the library (Read later) and fires upload_completed.
 * Throws if the PDF can't be read.
 */
export async function savePdfUpload(file: File) {
  const started = performance.now()
  const [pdf] = await Promise.all([readPdf(file, file.name), new Promise((r) => setTimeout(r, 900))])
  const item: Item = {
    id: newId(),
    title: pdf.title,
    type: 'pdf',
    fileName: file.name,
    addedAt: Date.now(),
    progress: 0,
    chapters: pdf.chapters,
    pageCount: pdf.pageCount,
  }
  await addItem(item, file)
  registerSave(item, 'upload')
  track('upload_completed', {
    item_id: item.id,
    file_type: 'pdf',
    bytes: file.size,
    pages: pdf.pageCount,
    text_extractable: true,
    chapters_detected: pdf.chapters.length,
    processing_ms: performance.now() - started,
  })
  return item
}
