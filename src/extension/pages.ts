// The pages the simulated browser can show. Each has what the extension would
// see: a URL, a title, and the text it would extract. Written for this
// prototype; domains are example domains.

export type PageKind = 'article' | 'paywalled' | 'online-pdf' | 'local-pdf' | 'blocked' | 'non-article'

export interface DemoPage {
  kind: PageKind
  label: string
  url: string
  tabTitle: string
  /** Article text in the same lightweight markup as pasted articles. */
  text?: string
  /** For PDFs: the sample file the "server" would fetch. */
  pdf?: string
}

export const PAGES: Record<PageKind, DemoPage> = {
  article: {
    kind: 'article',
    label: 'Normal article',
    url: 'https://example.substack.com/p/how-central-banks-decide-interest-rates',
    tabTitle: 'How Central Banks Decide Interest Rates',
    text: `# How Central Banks Decide Interest Rates

Eight times a year, a small committee meets to decide one number. That number, the policy rate, ripples out into every mortgage, credit card and savings account in the country. How the committee arrives at it is less mysterious than it looks.

## The mandate

Most central banks are given a target for inflation, usually around two percent a year. Some are also asked to support employment. Everything the committee does is an attempt to hit those targets over the next year or two, not this month.

That time horizon matters. A change in the policy rate takes a year or more to have its full effect on spending and prices. A committee that reacts only to today's inflation figure is always steering by the rear-view mirror.

## The inputs

Before each meeting, staff economists prepare forecasts: growth, unemployment, wages, prices, and how each would change under different rate paths. Committee members also hear from business contacts and read surveys of what households expect inflation to be.

> The forecast is the decision. The meeting is an argument about which forecast to believe.

## The trade-off

Raising rates cools spending and, eventually, inflation. It also slows hiring. Cutting rates does the opposite. When inflation is high and unemployment is low, the choice is easy. When both are rising, it is not, and members disagree about which risk is worse.

## The announcement

The decision is published with a statement explaining the reasoning, and often a projection of where members expect rates to go. Markets react as much to that guidance as to the decision itself, because it shapes what borrowers and lenders expect next.

## Why it matters to a reader

When you read that rates rose a quarter of a point, the useful question is not whether that is large. It is what the committee expects to happen next, and whether the people setting prices believe it.`,
  },
  paywalled: {
    kind: 'paywalled',
    label: 'Paywalled article (partial)',
    url: 'https://medium.com/@readingsystems/the-two-column-problem-why-pdfs-break-readers-8c1d2e',
    tabTitle: 'The Two-Column Problem: Why PDFs Break Readers',
    // Only the free preview is visible: under 300 words → "Saved what's visible".
    text: `# The Two-Column Problem: Why PDFs Break Readers

Anyone who has copied text out of an academic paper knows the moment. You select a paragraph in the left column, paste it, and find half a sentence from the right column stitched into the middle. The PDF looked perfect. The text underneath it was chaos.

## Layout is not structure

A PDF describes where marks go on a page, not what those marks mean. A heading is just larger text in a certain position. A column is just text that happens to line up. Reading order is something your eyes infer, and software has to guess.

Most of the time, the guess is good enough. Single-column documents with clean fonts come out in order. The trouble starts with columns, footnotes, running headers and figures with captions, which describes almost every research paper ever written.

## Why it matters for reading tools

If the extracted text is out of order, everything built on it breaks: highlights land in the wrong place, search misses phrases, and an AI asked to explain a passage receives a sentence that never existed.`,
  },
  'online-pdf': {
    kind: 'online-pdf',
    label: 'Online PDF',
    url: 'https://files.example.org/reports/interest-rates-plainly.pdf',
    tabTitle: 'interest-rates-plainly.pdf',
    pdf: 'interest-rates-report.pdf',
  },
  'local-pdf': {
    kind: 'local-pdf',
    label: 'PDF on computer (file://)',
    url: 'file:///C:/Users/tam/Downloads/lecture-week7.pdf',
    tabTitle: 'lecture-week7.pdf',
  },
  blocked: {
    kind: 'blocked',
    label: 'Blocked page (chrome://)',
    url: 'chrome://newtab',
    tabTitle: 'New Tab',
  },
  'non-article': {
    kind: 'non-article',
    label: 'Non-article page (homepage / feed)',
    url: 'https://news.example.com/',
    tabTitle: 'Example News — Home',
    text: `# Example News

- Markets steady ahead of rate decision
- City council approves new bike lanes
- Five books to read this autumn
- Weather: cool and clear through the weekend
- Opinion: the case for slower cities`,
  },
}

export const PAGE_ORDER: PageKind[] = ['article', 'paywalled', 'online-pdf', 'local-pdf', 'blocked', 'non-article']

export function wordCount(text = '') {
  return text
    .replace(/^[#>-]+\s*/gm, '')
    .split(/\s+/)
    .filter(Boolean).length
}

/** PRD business rules: ≥ 150 words = article; < 300 words = "Saved what's visible". */
export const ARTICLE_MIN_WORDS = 150
export const PARTIAL_UNDER_WORDS = 300
