# Quiescent prototype v2 — changelog

Branch `prototype-v2`, built on top of `main` **including PR #1** (Reading Room palette, Cormorant Garamond + Open
Sans, turtle logo). v1 (`main`, readhub-demo.netlify.app) is untouched.
Everything here is a **prototype for developers**: mock data, no backend, state in the browser.

Start at **/screens** (every screen and state), **/events** (event dictionary + funnel), **/demo-browser** (simulated
extension), and the **Dev** button (bottom-right of every page).

---

## Spec alignment (branch `spec-alignment`)

Edits after the Oct 21, 2026 check against `quiescent-spec.md` (items from `prototype-edits.md`, sections A and B;
item 9, Q quick actions, is not confirmed and was skipped).

| Item | What changed |
|---|---|
| A1 | Reader asks **"Finished?"** with **Mark as finished** / **Not yet** when progress reaches 95%, once per reading session (only when the session started below 95%, so reopening a nearly finished item doesn't ask straight away; not shown if already Finished). The header's manual Mark as finished stays. `item_completed` now fires at 95% (was 90%). |
| A2 | **👍 / 👎** under every Q answer (not under the "couldn't answer" error). The choice is saved with the chat; clicking it again clears it. Fires `answer_rated` (`helpful` = true/false). No reason field (P1). |
| A3 | **"Ask AI" → "Ask Q!"** in the selection menu and the note box, with the Q turtle instead of the sparkle icon (on a light disc in the dark selection menu). Tooltips and the one canned Q reply that named "Ask AI" now say "Ask Q!". |
| A4 | **Q off hides "Ask Q!"** in the selection menu and the note box (it used to stay and do nothing). Turning Q back on brings it back. |
| A5 | **Progress bar in the reader:** a thin accent bar along the top of the page shows how far through the item you are, from the same scroll position the reader resumes at. Visible while reading and in full screen; narrows with the highlights panel. The Section / Page pill adds the % ("Section 2 / 6 · 42%"). |
| A6 | **Optional folder picker in the popup:** under Read now on the Saved screen (and "Saved what's visible"), "Add to a folder (optional)" lists the reader's existing folders as a checklist, several or none. Hidden when there are no folders; no "create folder" in the popup. The save is already done, so each tick applies at once (`folder_items_changed` with `via = popup`). `/screens` has a "Saved, with the optional folder picker" link. |
| A7 | **Sort and filter in the library** (team meeting). Sort: Newest first (default) · Oldest first · Title A to Z; "newest" means **date saved**, everywhere, which replaces the old fixed order (In progress by last opened, Finished by last finished). Filter: type (Article, PDF) and source (site, or "Uploaded PDF"). They apply inside the current status sub-view or folder, live in the URL (`?sort=&type=&site=`) so they survive switching sub-views, and the sub-view counts follow the filter. No matches: "No items match these filters." with Clear filters. Proposed events `library_sorted` and `library_filtered`. Manual reordering stays out (moved to P1). |
| A8 | **"Read now" opens the reader full screen** from the popup, "Already in your library" and the Chrome notification, same as the reader's full screen button (`fullscreen_entered` with `from = extension`). If the browser refuses, the reader opens in the window. |
| A10 | **Sentence case:** "Saved to Read later" (popup), "By status" / "By folder" (library view tabs, the folder breadcrumb, screen-reader labels), and the same names on /screens, in the event dictionary and in this changelog. |
| A11 | **Docs brought up to date:** rating is P0 and built (A2); folders are P0, not "pending dev estimate" (conflict 3, open question 3, and the dev-note badges in the library, the create-folder dialog, /screens and the event dictionary; the "custom shelves as Phase 2" dev note is gone); README gives the MVP date, Nov 15, 2026 (the old "Oct 23" was in this changelog). |
| B12 | **Leaving the reader returns to the item's own tab** (In progress, Read later or Finished), from the ✕ button or Esc, instead of always opening on In progress. |
| B13 | **"Delete highlight and note?"** confirm when removing a highlight that has a note (Delete / Cancel). A highlight without a note still goes straight away. |
| B14 | **Read later cards show reading time** ("4 min read": word count ÷ 230, rounded up) and, for articles, the **first two lines** of text in small grey type. PDFs show no reading time: the demo doesn't count the words in PDF text (the real build should). |

---

## What changed vs v1

### Kept from PR #1 (merged into this branch)
- **Theme:** the "Reading Room" palette (white/sage surfaces, navy ink, sage selection, soft yellow highlights) — now
  defined in `src/styles/tokens.css`, the single tokens file.
- **Fonts:** Cormorant Garamond (semibold) for titles and headings, Open Sans for body and reading text.
- **Logo and favicon:** the turtle mark (shell as a speech bubble around an open book), drawn from tokens.
- **Quiescent naming**, PDF author / article byline capture, reader typography.
- Not kept from PR #1, because the v2 brief replaces them: its Library sort and filters (`libraryView.ts`), status and
  folders stored on items in IndexedDB (v2 keeps them in localStorage), the Notes page, the landing page and the
  undo-toast delete (v2 uses a confirm, per the brief).

### Removed
- **Notes page** (`/notes/:id`), its TipTap editor, and every link to it (library row, highlights panel, note popover).
  Old `/notes/:id` links redirect to the reader. The reader's side panel listing highlights and notes is kept.
- **Library sort and filter.** v1 had none in the UI; v2 first added none. Spec alignment (A7) adds them back as decided in the team meeting.
- **Landing page** ("Upload your reading" before sign-in). `/` now goes to Library when signed in, `/signin` otherwise,
  matching the PRD's website-first flow.
- **Article-link import tab** in the add dialog (link import is P1 in the PRD). The Netlify function
  (`netlify/functions/extract.mts`) is still in the repo but nothing calls it.
- **Apple and Microsoft sign-in** (P2 in the PRD). Google + email link only.
- Extension popup **"Read Later is full (10 of 10)"** state (queue cap dropped).

### Added
| Area | What |
|---|---|
| Shell (A1) | Left sidebar: logo → Library → Most recent read → (sync status) → Account at the bottom. Collapsible to icons; active page highlighted; replaces all top-nav links. Hidden in browser full screen. |
| Library (A2) | Notion-style view tabs **By status** / **By folder**, **+ Create new folder**, **Upload**. **By status has three sub-views — In progress · Read later · Finished — shown one at a time** (segmented control with counts, ←/→ keys, `?status=` in the URL; DEFAULT opens on In progress). Cards with title, source domain, type, date saved, progress % (In progress only), ⋯ menu (Change status, Add to folder, Remove from library). |
| Folders (A2) | Create (name ≤ 40, unique, + searchable item checklist), grid of steles, folder detail (breadcrumb, status badges, Rename, Add items, Delete with "Items stay in your library"), card "Add to folder" multi-select + "New folder…". |
| Upload (A2) | PDF only, ≤ 25 MB: picker, uploading (progress), success → Read later (+ Read now), errors for wrong type / too large / unreadable. |
| Stele icon (A3) | `src/icons/SteleIcon.tsx`, original flat SVG in cool stone tones matched to the sage palette: arched slab with carved border and inscription lines on a hex-shelled tortoise, head forward and raised, feet tucked. 96 px and 24 px (24 drops inscription and shell detail). States: default, hover (lift), selected, empty (blank slab). |
| Q turtle (A4) | `src/icons/QTurtle.tsx`: same shell pattern as the stele, in the logo's colors (sage shell, navy outline); eye and smile so it reads as a character. 44 px toggle, 20 px beside Q's messages. States: idle, thinking (head tucks, shell pulses; static under reduced motion), answered (✓ badge), error (! badge). Q's behavior and panel logic unchanged; toggle now also opens with Enter/Space. |
| Account (A5) | Rebuilt from the reference inside the shell: Profile (photo upload/remove with Uploading / Saved / Couldn't upload states, name + Save), Sign-in (email, method, 30-day note), Sync (status, extension, computers, item count), Sign out of this computer, Delete account via support email. Date of birth removed. Annotation badges show only with dev notes on. |
| Sign-in (A6) | `/signin` with every state: Continue with Google · email + Send link; Check your email (Resend after 60 s, Use a different email, "Simulate clicking the email link"); Signing you in…; Link expired; Too many requests; Signed out. Shares components with the popup so both surfaces match. |
| Reader | Sits inside the shell (sidebar collapsed by default), Q turtle, and a **Mark as finished** / **Finished** toggle in the header (Finished is manual). Everything else unchanged. |
| Dev tools (A7) | Dev menu: user state switcher (New / Existing no folders / Existing with folders), Show dev notes, simulated failures (Offline, Server timeout, Too many requests, Q provider error), Reset demo data, live **Event log**. `/screens` links to every screen and state. |
| Extension (B1) | `/demo-browser`: fake Chrome window (tab, address bar, toolbar with the Quiescent icon), 6 page types, 360 px popup with every wireframe state rebuilt in v2 tokens, simulated sign-in, mock OS notification, saves flowing into the real Library. |
| Events (B2) | `src/events/dictionary.ts` + `track()`; `/events` page with the dictionary table and the funnel. |
| Tokens | `src/styles/tokens.css` is the only place colors, fonts, spacing and radii are defined. Tailwind's default palette and fonts are reset, so nothing else can sneak in. Used by the app, the popup, the dev panels and the SVG icons. |
| Data | 12 seeded items (8 articles incl. one Vietnamese, 4 PDFs) across all statuses, with real highlights. 4 new generated sample PDFs (`npm run make-sample-pdf`). Statuses, folders, membership, recents and profile persist in localStorage (try/catch everywhere); item content stays in IndexedDB. |

---

## DEFAULTs

All brief DEFAULTs were **kept as written**:

| DEFAULT | Where |
|---|---|
| Sidebar starts collapsed to icons inside the reader | `src/shell/AppShell.tsx` |
| By status opens on the In progress sub-view (my default; the brief doesn't say which) | `src/library/LibraryPage.tsx` |
| Order: newest first by date saved in every status sub-view and folder; the reader can switch to oldest first or title A to Z (spec alignment, A7; replaced "In progress by last opened · Read later by last saved · Finished by last finished") | `src/library/useLibrary.ts` |
| New saves → Read later (In progress if saved with "Read now"); opening a Read later item → In progress; Finished set by hand | `src/proto/actions.ts` |
| An item can be in several folders or none; folders independent of status; removing from a folder never deletes the item | `src/proto/actions.ts` |
| Upload: PDF only, ≤ 25 MB | `src/library/UploadDialog.tsx` |

Decisions I made where the brief was silent (please confirm):
- **Opening a Finished item keeps it Finished** (it doesn't move back to In progress). The reader's "Finished" button moves it back by hand.
- **Remove from library also removes the item from every folder** (folder membership can't point at a deleted item).
- **Saved-after-sign-in when the article is already in the library** shows the "Saved to Quiescent" notification for the existing item rather than a duplicate notice.
- **Most recent read ignores removed items**; if the most recent one is removed it falls back to the next most recent.

---

## PRD states and events added

### States not in the PRD tables
- Popup **Waiting for sign-in** (reopening the popup during the 10-minute hold) and **Pending save expired** — both
  from the wireframes' proposals.
- Popup **Too many requests** (in the Accounts spec, missing from the popup table).
- Popup **Saved to Read later** replaces "Saved" + Read now/Later (adopted proposal).
- Library: **Create folder / Rename / Add items / Add to folder / Delete folder** dialogs, folder detail, empty folder, By folder grid.
- Upload: **wrong type** and **too large** use the v2 limits; **unreadable PDF** state.
- Reader: **Mark as finished** control in the header, plus the PRD's "Finished?" prompt at 95% (added in spec alignment, A1).

### Events
Canonical names come from the PRD's **Event Logging** catalog (it says the feature sections match it). Where the two
disagree (`reading_saved` vs `save_confirmed`, `reading_opened` vs `item_opened`, `ai_*` vs `q_*`), the Event Logging
name is used.

Added properties or values on PRD events:
- `save_clicked.source_domain`; `save_failed.error_type = local_pdf`; `save_shown.shown_in`;
  `read_now_clicked.from = upload` (and `full_state` removed); `side_panel_opened.days_since_first_highlight`
  (needed for the North Star proxy); item/highlight ids on reader events.

Proposed events (marked "proposed — not in PRD" in the Event log and on /events):
`save_popup_dismissed`, `sign_in_link_resent`, `extension_install_clicked`, `profile_photo_changed`,
`profile_name_saved`, `library_view_switched`, `item_status_changed`, `item_removed`, `most_recent_read_clicked`,
`library_status_switched`, `folder_created`, `folder_renamed`, `folder_deleted`, `folder_items_changed`, `folder_opened`, `upload_started`.

`answer_rated` fires from the 👍 / 👎 under each Q answer (P0; added in spec alignment, A2).

Privacy: `track()` only accepts ids, bare domains, declared enum values, non-negative numbers and booleans. Anything else
is dropped and flagged red in the Event log, so article, highlight, note and Q text can't be logged.

---

## Conflicts between the brief and the PRD (resolved by the brief)

1. **List names:** PRD "Reading" → brief "In progress". Used "In progress" everywhere.
2. **Read Later cap of 10:** PRD Save section has it; the PRD Library section says no limit; brief drops it. Dropped.
3. **Folders:** PRD calls custom shelves Phase 2; brief makes them P0. Now decided: folders are **P0** (the UI says "folder", never "shelf").
4. **Saved popup:** PRD "Read now" + "Later"; brief adopts "Saved to Read later" with one Read now.
5. **Upload:** PRD PDF + EPUB up to 100 MB / 1,000 pages; brief DEFAULT PDF only, 25 MB.
6. **Library sort/filter:** PRD Library goals mention them; brief removes them. Later reversed by the team meeting: sort and filter added in spec alignment (A7).

Brief inconsistencies I resolved:
- Branch named both `prototype-v2` and `prototype-mvp`: used **`prototype-v2`** (the deploy target).
- Reference paths say `docs/…`; the files are in `Prototype docs/…` (untracked; not committed).
- `docs/reference/extension-wireframes.html` doesn't exist; the three PNGs in `extension-wireframes/` were used.
  `Quiescent Visual Directions.html` is a saved claude.ai shell whose artifact iframe wasn't saved, so it has no content.
- Existing logo/wordmark said "ReadHub": kept the v1 mark, changed the wordmark to "Quiescent".

---

## Known limits of the prototype
- **Extension is a simulation.** The real build needs in-page content extraction, PDF handling, Chrome permissions and a
  Save API: estimate from the PRD, not from `/demo-browser`. Server timeout is shortened to 3 s (real rule: 10 s).
- Data lives in one browser. "Synced", "computers signed in" and item_fetched latency are mocked.
- `reading_session_ended` is lost if the tab is closed or reloaded (the PRD notes this for client events).
- The favicon (`public/favicon.svg`) is a static file and can't read CSS tokens; its two colors match `--color-accent`
  and `--color-on-accent`.

## Open questions
1. Opening a Finished item: keep Finished (current) or move to In progress?
2. ~~Should the reader also ask "Finished?" at 95% (PRD), now that Finished is manual?~~ Answered: yes, both (A1).
3. ~~Folders are P0 here vs Phase 2 in the PRD: dev estimate needed before committing to Oct 23.~~ Answered: folders are P0. MVP date is **Nov 15, 2026**.
4. `save_confirmed.destination` is always `read_later` under the adopted popup flow. Keep the property, or drop it and
   derive Read-now share from `read_now_clicked`?
5. Is "Try again later" enough, or should it say when ("in an hour")?
6. Should an empty folder be allowed (current: yes, blank slab)?
7. The North Star (weekly recall) isn't measurable in the MVP. Approve the proxy "reopens a past item's highlights in a
   later week" (`side_panel_opened` with `days_since_first_highlight ≥ 7`)?
8. Profile photo and name editing are marked "proposed": in or out for the MVP?
