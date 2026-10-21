# Quiescent — prototype v2

A clickable prototype of Quiescent for developers: save articles and PDFs (simulated Chrome extension or upload),
read them in a focused reader with highlights, notes and Q (the AI assistant), and track them in a library by status
and by folder. It shows the screens, states and edge cases the MVP needs. **Mock data only, no backend.**

What changed from v1, the DEFAULT product decisions, PRD conflicts and open questions: **[CHANGELOG-v2.md](CHANGELOG-v2.md)**.

## Run it locally

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Open http://localhost:5173 and sign in (simulated: Google signs in instantly).

## Where to start

| Page | What |
|---|---|
| `/screens` | Links to every screen and state, plus the stele and turtle icon specimen |
| `/events` | Event dictionary (event, trigger, surface, properties, metric) and the funnel |
| `/demo-browser` | Fake Chrome window with the Quiescent extension popup; saves land in the Library |
| **Dev** button (bottom-right, every page) | User state switcher, Show dev notes, simulated failures, Reset demo data, live Event log |

## Code map

| Path | What |
|---|---|
| `src/styles/tokens.css` | The only place colors, fonts, spacing and radii are defined |
| `src/shell/` | Sidebar app shell |
| `src/library/` | Library views, cards, folder dialogs, upload |
| `src/reader/` | Focused reader, highlights panel (unchanged from v1 apart from events and Mark as finished) |
| `src/ai/` | Q (mock mode; v1 logic, turtle look) |
| `src/icons/` | `SteleIcon` (folders) and `QTurtle` (Q) |
| `src/extension/` | Simulated browser and popup |
| `src/events/` | Event dictionary and `track()` (privacy guard) |
| `src/proto/` | Prototype state in localStorage: statuses, folders, membership, dev settings |
| `src/samples/` | Seed data for the three user states; `scripts/` generates the sample PDFs |

## Storage

- Item text, PDF files, highlights and Q chats: IndexedDB (`src/storage/db.ts`).
- Statuses, folders, folder membership, recents, profile, dev settings, event log: localStorage, every access wrapped in
  try/catch.
- Reset with Dev → Reset demo data, or switch user state.

## Deploy

Netlify builds with `npm run build` and publishes `dist` (see `netlify.toml`). v2 deploys to its own Netlify site from
the `prototype-v2` branch; the v1 site (readhub-demo.netlify.app) deploys from `main`.
