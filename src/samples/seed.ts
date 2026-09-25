// Creates the two sample items the first time the app opens, so the demo works
// with no setup. Runs through the same code paths as a real upload.

import { articleFromText, withUntitledOpening } from '../ingest/article'
import { readPdf } from '../ingest/pdf'
import { addItem, getItems, isSeeded, markSeeded, updateItem } from '../storage/db'
import { compoundingText, compoundingUrl } from './compoundingArticle'

export const SAMPLE_ARTICLE_ID = 'sample-compounding'
export const SAMPLE_PDF_ID = 'sample-wealth'

let running: Promise<void> | null = null

export function seedSamples() {
  running ??= (async () => {
    if (await isSeeded()) return
    const now = Date.now()

    // Added in this order so the article sits on top of the library.
    const pdfFile = await fetch('/samples/wealth-of-nations.pdf').then((r) => r.blob())
    const pdf = await readPdf(pdfFile, 'wealth-of-nations.pdf')
    await addItem(
      {
        id: SAMPLE_PDF_ID,
        title: pdf.title,
        type: 'pdf',
        fileName: 'wealth-of-nations.pdf',
        addedAt: now - 1000,
        progress: 0,
        chapters: pdf.chapters,
        pageCount: pdf.pageCount,
        isSample: true,
      },
      pdfFile,
    )

    const article = articleFromText(compoundingText, 'The Quiet Math of Compounding')
    await addItem({
      id: SAMPLE_ARTICLE_ID,
      title: article.title,
      type: 'article',
      sourceUrl: compoundingUrl,
      addedAt: now,
      progress: 0,
      chapters: article.chapters,
      blocks: article.blocks,
      isSample: true,
    })

    await markSeeded()
  })()
  return running
}

/** Small data fixes for items saved by earlier versions of the app. Safe to run on every start. */
export async function upgradeSavedItems() {
  for (const item of await getItems()) {
    const chapters = withUntitledOpening(item)
    if (chapters) await updateItem(item.id, { chapters })
  }
}
