# ReadHub (clickable mockup)

A personal reading notebook: save articles and PDFs, read them in a focused view,
highlight passages and write quick notes, then review those notes grouped by chapter.
A context-aware AI assistant helps while reading and reviewing.

**This is a clickable mockup for user interviews, not a production app.**
The loop it demonstrates: **save → read → highlight + note → review notes → (AI helps at each step)**.

## Run it locally

Requires [Node.js](https://nodejs.org) 20+.

```bash
npm install
npm run dev
```

Then open the address it prints (usually http://localhost:5173).

## The demo flow

1. **Landing page:** the participant clicks **Upload your reading** and picks a PDF or an article link.
2. **Sign-in page:** they choose Google, Apple, Microsoft, or email.
3. **Library:** their upload is at the top, with two sample items below it.

Use **Sign out** in the Library header to return to the landing page for the next participant.
Saved items stay in the library across sign-outs.

## What's real and what's mocked

| Area | Status |
|---|---|
| Library, reading view, highlights, notes | Real. Stored in your browser (IndexedDB). |
| Reading progress | Real. Saved as you scroll; reopening an item resumes where you left off. |
| PDF upload + chapter detection | Real. Uses the PDF's table of contents, or page ranges if there isn't one. |
| Article from a link | Fetched by a helper in the local dev server (Mozilla Readability). Only works while `npm run dev` is running. If a site blocks it, paste the article text instead. |
| AI assistant | **Mocked.** Canned responses after a short delay. No API calls, no cost. |
| Sign-in | **Mocked.** Every option signs in instantly. No real Google/Apple/Microsoft login, no password, no account. |
| Accounts, sync, mobile layout | Not built. Data lives in one browser on one computer. |

Two sample items (an article and a multi-chapter PDF) load automatically on first run.

## Reading View tips

- Select text to get **Highlight**, **Highlight + note**, and **Ask AI** (Ask AI arrives with the assistant).
- Click any highlight to reopen its note. Notes save as you type.
- **Esc** closes the note or toolbar, then leaves the reader. The top bar hides while you read; hover near the top to bring it back.
- The **highlighter button** on the right edge shows how many highlights the item has. It opens a panel listing
  them by chapter; click one to jump to it (it pulses, and its note opens).
- **Margin markers** (small red ticks on the right edge) show where every highlight sits in the document.
  Solid ticks have notes; faint ticks are plain highlights. Click a tick to jump there.
- PDF highlights stay within one page.

## Resetting the demo

Clear the site's data in your browser (DevTools → Application → Clear storage) and reload.
The sample items will be recreated.
