// Link-fetch helper. Runs on a server (never in the browser), so it isn't
// blocked by CORS. It downloads the page and uses Mozilla Readability to pull
// out the title and main article content.
//
//   GET /api/extract?url=https://...   ->   { title, html, siteName } or { error }
//
// Used in two places with the same code:
//  - locally, inside the Vite dev server (articleExtractor plugin below)
//  - when deployed, as a Netlify Function (netlify/functions/extract.mts)

import type { Plugin } from 'vite'
import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
import { Readability } from '@mozilla/readability'
import { parseHTML } from 'linkedom'

const MAX_REDIRECTS = 5
const MAX_BYTES = 5 * 1024 * 1024

export interface ExtractResult {
  status: number
  body: { title: string; html: string; siteName: string | null } | { error: string }
}

export async function extract(rawUrl: string): Promise<ExtractResult> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return { status: 400, body: { error: "That doesn't look like a valid link." } }
  }

  // Follow redirects by hand so every hop gets the same safety check.
  let res: Response | null = null
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const problem = await unsafeTarget(url)
    if (problem) return { status: 400, body: { error: problem } }
    try {
      res = await fetch(url, {
        redirect: 'manual',
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
    const next = res.status >= 300 && res.status < 400 ? res.headers.get('location') : null
    if (!next) break
    url = new URL(next, url)
    res = null
  }
  if (!res) return { status: 502, body: { error: 'That link redirects too many times.' } }
  if (!res.ok) return { status: 502, body: { error: `The site responded with an error (${res.status}).` } }
  if (!(res.headers.get('content-type') ?? '').includes('html')) {
    return { status: 415, body: { error: "That link isn't a web page." } }
  }
  if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES) {
    return { status: 413, body: { error: 'That page is too large to import.' } }
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

/**
 * Only public web pages may be fetched. Blocks anything that points into a
 * private or internal network (e.g. localhost, 192.168.x.x, cloud metadata
 * addresses), since the deployed helper is reachable by anyone with the link.
 */
async function unsafeTarget(url: URL): Promise<string | null> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'Only http(s) links are supported.'
  if (url.port && url.port !== '80' && url.port !== '443') return 'Only standard web links are supported.'
  const host = url.hostname.replace(/^\[|\]$/g, '')
  let addresses: string[]
  try {
    addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address)
  } catch {
    return "Couldn't find that website."
  }
  return addresses.some(isPrivateAddress) ? 'Only public web links are supported.' : null
}

function isPrivateAddress(ip: string): boolean {
  const v4 = ip.startsWith('::ffff:') ? ip.slice(7) : ip
  if (isIP(v4) === 4) {
    const [a, b] = v4.split('.').map(Number)
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) || // carrier-grade NAT
      (a === 169 && b === 254) || // link-local, cloud metadata
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224 // multicast and reserved
    )
  }
  const v6 = ip.toLowerCase()
  return v6 === '::' || v6 === '::1' || v6.startsWith('fc') || v6.startsWith('fd') || v6.startsWith('fe80')
}

/** Local development: serve the helper from the Vite dev server. */
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
