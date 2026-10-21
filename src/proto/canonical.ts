// Duplicate detection (PRD, Save → Business rules): match on the canonical URL.
// Ignore tracking parameters (utm_*, fbclid, gclid, ref), the # part, the
// trailing slash, and letter case in the domain.

const TRACKING = /^(utm_.*|fbclid|gclid|ref)$/i

export function canonicalUrl(raw: string): string {
  try {
    const url = new URL(raw)
    url.hash = ''
    url.hostname = url.hostname.toLowerCase()
    for (const key of [...url.searchParams.keys()]) if (TRACKING.test(key)) url.searchParams.delete(key)
    url.searchParams.sort()
    let out = url.toString()
    if (url.pathname.length > 1 || url.search) out = out.replace(/\/(?=\?|$)/, '')
    return out.replace(/\/$/, '')
  } catch {
    return raw.trim()
  }
}
