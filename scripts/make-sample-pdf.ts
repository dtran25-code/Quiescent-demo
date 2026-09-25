// Generates public/samples/wealth-of-nations.pdf: a small book-sized PDF with a
// built-in outline (table of contents), so ReadHub's chapter detection has
// something real to read. Run with: npm run make-sample-pdf

import { writeFileSync, mkdirSync } from 'node:fs'
import { PDFDocument, PDFHexString, PDFName, StandardFonts, rgb, type PDFFont, type PDFPage, type PDFRef } from 'pdf-lib'
import { pdfAuthor, pdfChapters, pdfSubtitle, pdfTitle } from './sample-pdf-text.ts'

const W = 432 // 6in
const H = 648 // 9in
const MARGIN_X = 60
const TOP = H - 70
const BOTTOM = 70
const BODY_SIZE = 11.5
const LEADING = 17
const INK = rgb(0.17, 0.15, 0.14)

function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const next = line ? `${line} ${w}` : w
    if (font.widthOfTextAtSize(next, size) > width && line) {
      lines.push(line)
      line = w
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

async function main() {
  const doc = await PDFDocument.create()
  doc.setTitle(pdfTitle)
  doc.setAuthor('Adam Smith')
  const body = await doc.embedFont(StandardFonts.TimesRoman)
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold)
  const italic = await doc.embedFont(StandardFonts.TimesRomanItalic)
  const textWidth = W - MARGIN_X * 2

  // Title page
  const cover = doc.addPage([W, H])
  cover.drawText(pdfTitle, { x: MARGIN_X, y: H / 2 + 40, size: 26, font: bold, color: INK })
  wrap(pdfSubtitle, italic, 13, textWidth).forEach((l, i) =>
    cover.drawText(l, { x: MARGIN_X, y: H / 2 + 5 - i * 18, size: 13, font: italic, color: INK }),
  )
  cover.drawText(pdfAuthor, { x: MARGIN_X, y: H / 2 - 50, size: 12, font: body, color: INK })

  const chapterStarts: PDFPage[] = []
  let page!: PDFPage
  let y = 0
  const newPage = () => {
    page = doc.addPage([W, H])
    y = TOP
  }

  for (const ch of pdfChapters) {
    newPage()
    chapterStarts.push(page)
    y -= 30
    for (const l of wrap(ch.title, bold, 16, textWidth)) {
      page.drawText(l, { x: MARGIN_X, y, size: 16, font: bold, color: INK })
      y -= 22
    }
    y -= 18
    for (const para of ch.paragraphs) {
      const lines = wrap(para, body, BODY_SIZE, textWidth - 0)
      lines.forEach((l, i) => {
        if (y < BOTTOM) newPage()
        page.drawText(l, { x: MARGIN_X + (i === 0 ? 16 : 0), y, size: BODY_SIZE, font: body, color: INK })
        y -= LEADING
      })
      y -= 6
    }
  }

  // Page numbers (skip the title page)
  doc.getPages().forEach((p, i) => {
    if (i === 0) return
    const label = String(i + 1)
    p.drawText(label, {
      x: W / 2 - body.widthOfTextAtSize(label, 9) / 2,
      y: 36,
      size: 9,
      font: body,
      color: rgb(0.5, 0.47, 0.44),
    })
  })

  // Outline (the PDF's built-in table of contents)
  const ctx = doc.context
  const outlineRef = ctx.nextRef()
  const refs: PDFRef[] = pdfChapters.map(() => ctx.nextRef())
  refs.forEach((ref, i) => {
    const entry = ctx.obj({
      Title: PDFHexString.fromText(pdfChapters[i].title),
      Parent: outlineRef,
      Dest: [chapterStarts[i].ref, 'Fit'],
      ...(i > 0 ? { Prev: refs[i - 1] } : {}),
      ...(i < refs.length - 1 ? { Next: refs[i + 1] } : {}),
    })
    ctx.assign(ref, entry)
  })
  ctx.assign(
    outlineRef,
    ctx.obj({ Type: 'Outlines', First: refs[0], Last: refs[refs.length - 1], Count: refs.length }),
  )
  doc.catalog.set(PDFName.of('Outlines'), outlineRef)
  doc.catalog.set(PDFName.of('PageMode'), PDFName.of('UseOutlines'))

  mkdirSync('public/samples', { recursive: true })
  const bytes = await doc.save()
  writeFileSync('public/samples/wealth-of-nations.pdf', bytes)
  console.log(`Wrote public/samples/wealth-of-nations.pdf (${doc.getPageCount()} pages, ${bytes.length} bytes)`)
}

main()
