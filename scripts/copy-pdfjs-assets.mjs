// Copies pdf.js font data (character maps and standard fonts) into public/pdfjs,
// so PDFs with non-Latin text or unembedded fonts render correctly offline.
import { cpSync } from 'node:fs'

for (const dir of ['cmaps', 'standard_fonts']) {
  cpSync(`node_modules/pdfjs-dist/${dir}`, `public/pdfjs/${dir}`, { recursive: true })
}
