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
| Notes View | Real. A Word-like page per item: type anything, format it, and jump around with the outline. Highlights appear as linked cards. |
| AI assistant | **Mocked.** Hand-written answers for the two sample items; answers built from the chapter text and your notes for anything else (marked as demo responses). No API calls, no cost. |
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

## Notes View (your notes page)

- Each item has its own page. The first time you open it, it fills itself with your highlights and notes,
  grouped under chapter headings. After that it's yours: type anywhere, use the toolbar (headings, bold,
  italic, underline, lists, quotes, undo/redo), and it autosaves.
- **Highlight cards** stay linked to the Reading View. Click a card to open that passage; edit its note with
  the pencil (it updates in both places). **✕** removes the card from the page only.
- New highlights you make later are filed at the end of their chapter's section automatically.
- **Insert highlight** puts any highlight (back) on the page at the cursor.
- **Outline** (left side, on wider screens) lists your headings; click one to jump to it.
- **Clear all notes** empties the page (with 10 seconds to undo). Highlights in the Reading View are not affected,
  and cleared ones don't come back on their own.

## AI assistant

- The red circle (bottom right) is the assistant. Drag it anywhere; it remembers the spot. Click it to chat.
- Quick actions: **Explain this** (select text and click **Ask AI**, click **Ask AI** in a highlight's note window,
  or use the ✨ button on a Notes View card), **Summarize this
  section**, **Polish my notes**, **Expand this idea**. You can also type a question.
- Each request includes: the selected passage, the current chapter's text, all your highlights and notes for the item,
  what you typed on the Notes page for that section, and the item's conversation history. Nothing from other items (yet).
- Turn it off with the eye icon in the panel, or the **Assistant on/off** switch in any page header.
- Code: `src/ai/aiClient.ts` is the single entry point. Live mode (OpenAI via a serverless function) is a marked
  placeholder there and is not built.

## Resetting the demo

Clear the site's data in your browser (DevTools → Application → Clear storage) and reload.
The sample items will be recreated.
