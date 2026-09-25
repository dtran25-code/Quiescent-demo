// Link-fetch helper. Runs inside the local dev server (not the browser), so it
// isn't blocked by CORS. It downloads the page and uses Mozilla Readability to
// pull out the title and main article content.
//
// Endpoint: GET /api/extract?url=https://...
// Returns:  { title, html, siteName } or { error }
//
// Only available while `npm run dev` is running. A deployed version would move
// this into a serverless function with the same request/response shape.

import type { Plugin } from 'vite'
import { Readability } from '@mozilla/readability'
import { parseHTML } from 'linkedom'

async function extract(rawUrl: string) {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return { status: 400, body: { error: "That doesn't look like a valid link." } }
  }
  if (!['http:', 'https:'].includes(url.protocol) || ['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
    return { status: 400, body: { error: 'Only public http(s) links are supported.' } }
  }

  let res: Response
  try {
    res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
    })
  } catch {
    return { status: 502, body: { error: "Couldn't reach that site." } }
  }
  if (!res.ok) return { status: 502, body: { error: `The site responded with an error (${res.status}).` } }
  if (!(res.headers.get('content-type') ?? '').includes('html')) {
    return { status: 415, body: { error: "That link isn't a web page." } }
  }

  const { document } = parseHTML(await res.text())
  const article = new Readability(document as unknown as ConstructorParameters<typeof Readability>[0]).parse()
  if (!article?.content || (article.textContent ?? '').trim().length < 200) {
    return { status: 422, body: { error: "Couldn't find an article on that page." } }
  }
  return {
    status: 200,
    body: { title: article.title ?? url.hostname, html: article.content, siteName: article.siteName ?? null },
  }
}

export function articleExtractor(): Plugin {
  return {
    name: 'readhub-article-extractor',
    configureServer(server) {
      server.middlewares.use('/api/extract', async (req, res) => {
        const target = new URL(req.url ?? '', 'http://local').searchParams.get('url') ?? ''
        const { status, body } = await extract(target)
        res.statusCode = status
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(body))
      })
    },
  }
}
