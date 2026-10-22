# Gap list: design handoff v1.1 vs. prototype

Handoff: `docs/design/quiescent-handoff.html` (v1.1, Oct 22, 2026): Chrome extension popup and Accounts & sync.
Prototype checked: branch `spec-alignment` (includes the spec-alignment edits, e.g. "Saved to Read later" and the
popup folder picker). No app code was changed for this list.

Prototype-only helpers (dev notes, "Simulate…" buttons, `/screens`) are not counted as gaps unless a viewer sees them
with dev notes off.

## Where the prototype builds these screens

| Surface | File |
|---|---|
| Popup (all states, header, item line, status line) | `src/extension/Popup.tsx` |
| Popup flow, held save, OS notification, events | `src/extension/DemoBrowser.tsx` |
| Sign-in parts shared by popup and website (Google button, email field, Check email, Link expired, Too many requests, Signing in) | `src/auth/SignInParts.tsx` |
| Website sign-in page (all states) | `src/landing/LoginPage.tsx` |
| "Header": a left sidebar (Library, Most recent read, sync status, Account) | `src/shell/AppShell.tsx` |
| Install banner | `src/library/LibraryPage.tsx` (`InstallBanner`, ~line 632) |
| Account page | `src/account/AccountPage.tsx` |
| Sign-in / sign-out logic and events | `src/auth/auth.ts` |
| Logo | `src/components/Logo.tsx` (SVG drawing of the same turtle mark as `logo.png`) |
| Tokens | `src/styles/tokens.css`, fonts in `index.html` |

---

## 1. Tokens: colors, fonts, corners, button sizes

| Item | Handoff | Prototype | Match? | File |
|---|---|---|---|---|
| Ink | #1A2C4A | `--color-ink` #1a2c4a | yes | `src/styles/tokens.css:29` |
| Ink 70 (meta text) | #4A5A72 | `--color-ink-soft` #4a5a72 exists, but meta lines (source names, helper text, "New here?") mostly use `--color-ink-faint` #66758a, which is not in the handoff palette and has lower contrast | partly | `tokens.css:30-31`; `Popup.tsx:327`; `SignInParts.tsx:84` |
| Sage | #C9DDB8 | `--color-sage` #c9ddb8 | yes | `tokens.css:40` |
| Sage tint | #E3EDDA | `--color-paper-deep` / `--color-sage-100` / `--color-ok-soft` #e3edda | yes | `tokens.css:27,41,48` |
| Soft light | #F2E6A7 | `--color-warn-soft` / `--color-notice` #f2e6a7 | yes | `tokens.css:44,50` |
| Mist | #F3F6F4 | `--color-paper` #f3f6f4 | yes | `tokens.css:26` |
| White | #FFFFFF | `--color-card` #ffffff | yes | `tokens.css:28` |
| Line | #D3DCD6 | `--color-rule` #d3dcd6 | yes | `tokens.css:32` |
| Extra colors not in the handoff | (none) | ok green #3e6b35 (success icons), warn olive #6b5a12 (notice icons), danger #9b3b2e, ink-faint #66758a | differs | `tokens.css:31,47-52` |
| Wordmark font | Caladea 700, 18 popup / 20 website | Cormorant Garamond 600, 15 px in the popup; `text-3xl` (30 px) on the sign-in page | differs | `Popup.tsx:76`; `Logo.tsx:37` |
| Status / headings font | Caladea 700; 24 popup status, 22 popup heading, 34 page title | Cormorant Garamond 600; popup status 20 px (`text-xl`), popup heading 20 px, check-email heading 24 px, Account title 30 px (`text-3xl`), sign-in heading 24 px | differs | `Popup.tsx:94,306,317`; `SignInParts.tsx:113`; `AccountPage.tsx:28`; `LoginPage.tsx:67` |
| Article title font | Source Serif 4, 17 / 400, line 1.4, cut at 3 lines | Cormorant Garamond 600, 18 px (`text-lg`), cut at 2 lines | differs | `Popup.tsx:326` |
| UI and buttons font | Source Sans 3, 15 / 400 and 600 | Open Sans; buttons 14 px (`text-sm`) / 500 | differs | `index.css:31-34`; `tokens.css:104` |
| Meta font | Source Sans 3, 13 / 400 | Open Sans 12 px (`text-xs`) | differs | `Popup.tsx:327`; `SignInParts.tsx:84` |
| Popup fonts bundled | Bundle 4 font files in the extension; no Google Fonts in the popup | Fonts load from Google Fonts (fine for a demo; the real extension must bundle them) | differs (build note) | `index.html:9-11` |
| Popup corners | 12 px | `rounded-xl` = 12 px | yes | `Popup.tsx:73` |
| Website card corners | 12 px | sign-in card `rounded-2xl` = 16 px; Account sections `rounded-xl` = 12 px | partly | `LoginPage.tsx:59`; `AccountPage.tsx:101` |
| Button corners | 8 px | `rounded-lg` = 8 px | yes | `index.css:31-34` |
| Button height | 44 px min | `btn-primary`/`btn-secondary` are `py-2` + 14 px text (about 36 px); popup and sign-in use `py-2.5` (about 40 px) | differs | `index.css:31-34`; `Popup.tsx:162,183`; `SignInParts.tsx:42,79` |
| Button weight | 600 | 500 (`font-medium`) | differs | `index.css:31-34` |
| Secondary button | 1.5 px Ink border | 1 px Line border (`border-rule`) | differs | `index.css:34` |
| Quiet button | underlined text, 15 px, min 36 px tall | `btn-link`: underlined, 14 px, no min height | partly | `index.css:39-41` |
| Disabled button | Line border, Ink 70 text | 50% opacity | differs | `index.css:31-34` |
| Email field | 44 px, 8 px corners, 1.5 px Ink 70 border, label "Email" above | about 40 px (`py-2.5`), 8 px corners, 1 px Line border, label "Email" above | partly | `SignInParts.tsx:60-71`; `index.css:45-47` |
| Focus ring | 2 px Ink, 3 px offset | 2 px accent (= Ink), 2 px offset | partly | `index.css:23-26` |
| Logo | `logo.png`, 28 px popup, 32 px website header | SVG `LogoMark` of the same mark; 22 px in the popup, 34 px on the sign-in page, 30 px in the sidebar | partly (same mark, other sizes) | `Logo.tsx`; `Popup.tsx:75`; `AppShell.tsx:72` |

## 2. Extension popup

### Frame

| State | In prototype? | What differs | File |
|---|---|---|---|
| Popup frame | partly | **Layout:** header `px-4 py-2.5` with a Line bottom border (handoff 14/20 padding, Sage tint border); body 16 px padding (handoff 24/20/20, gap 16). Logo 22 px (handoff 28). Prototype adds a close ✕ button in the header (handoff: Esc closes, no ✕). Shadow `shadow-2xl` vs. handoff soft shadow. | `Popup.tsx:73-85` |
| Status line | partly | **Layout:** handoff = 28 px circle + Caladea 24 text; Sage circle with check for success, Sage tint circle for neutral, spinner for waiting. Prototype: Saved/Saving/Already use a bare 20 px icon with no circle (success icon is green `text-ok`); Can't save / Blocked / PDF use a 36 px Sage tint circle **above** the heading, not beside it. | `Popup.tsx:304-321` |
| Article block | partly | **Layout:** handoff has Sage tint rules above and below with faint ruled lines behind, title in Source Serif 4 17 px (3 lines), source in Ink 70 13 px. Prototype: Line-colored rules, no ruled background, title Cormorant 18 px semibold cut at 2 lines, source 12 px `ink-faint` with a globe icon. | `Popup.tsx:324-333` |
| Notice (errors) | partly | **Layout:** Soft light box and 8 px corners match. Icon 18 px in olive `text-warn` (handoff 20 px, Ink). Title Cormorant 18 px (handoff Caladea 20). No meta line ("Nothing was saved." missing). | `Popup.tsx:243-248`; `SignInParts.tsx:147,162` |

### Save states

| State | In prototype? | What differs | File |
|---|---|---|---|
| Ready | yes | Copy matches ("Add to Quiescent"). Focus starts on it. **Layout:** article block style (see Frame). | `Popup.tsx:158-167` |
| Online PDF | yes | Copy matches; source shows "{host} · PDF". | `Popup.tsx:158`; `DemoBrowser.tsx:406-409` |
| Saving | yes | Copy matches ("Saving…"); no buttons; same height as Saved; spinner stops for reduced motion. **Layout:** spinner is a 20 px icon, not the 26 px ring. | `Popup.tsx:168-177` |
| Saved to Read Later | partly | **Copy:** "Saved to Read later" (lowercase l, team sentence-case decision) vs handoff "Saved to Read Later". See Conflicts C2. **Layout:** green check icon without Sage circle. **Behavior:** prototype adds an optional "Add to a folder" checklist (see Conflicts C4). "Read now" opens the reader full screen (matches) at the last position read (handoff: "furthest point read", see C3). **Events:** save_confirmed, save_shown, read_now_clicked {from: popup} match; prototype also fires `save_popup_dismissed` (proposed, not in handoff). | `Popup.tsx:178-195`; `DemoBrowser.tsx:117-124,184-198` |
| Saved, partial | yes | Copy matches ("Saved what's visible", "Read now"). Success style, not Soft light (matches). Also shows the folder picker (C4). | `Popup.tsx:181` |
| Already saved | yes | Copy matches ("Already in your library", "Read now", "Open library"). Canonical URL rule matches. **Layout:** bookmark icon without the Sage tint circle. Events match. | `Popup.tsx:196-214` |
| Read Later full | missing | Removed on purpose (no save cap in the MVP). See Conflicts C1. Event `read_later_full_shown` not in the dictionary. | `Popup.tsx:1-7` (comment) |

### Sign-in states

| State | In prototype? | What differs | File |
|---|---|---|---|
| Signed out | partly | Copy matches: "Sign in to save this article", "Continue with Google", "or", "Email", "Send link", "New here? Signing in creates your account." **Copy:** invalid-email error is "Enter an email address like you@example.com." (handoff "Enter a full email, like you@example.com."). **Layout:** heading Cormorant 20 px (handoff Caladea 22); Google button has the real Google "G" (handoff placeholder circle) with a 1 px border at 40% Ink 70 (handoff: secondary button, 1.5 px Ink). **Events:** sign_in_prompt_shown {trigger: first_save} and sign_in_started {provider} match. | `Popup.tsx:91-105`; `SignInParts.tsx:20-87` |
| Check email | partly | Copy matches: "Check your email", the address, "The link should arrive within a minute. If not, check your spam folder.", "Resend in {n} s", "Use a different email". **Missing copy:** "You can close this popup. The article saves after you sign in." **Layout:** 44 px green mail circle above a 24 px heading (handoff: 28 px Sage tint circle inline with the heading). A "Prototype only" box with "Simulate clicking the email link" / "Simulate an expired link" is visible with dev notes off (needed to run the demo). | `SignInParts.tsx:89-140` |
| Check email, resend ready | partly | Copy matches ("Still nothing? Check your spam folder, or resend.", "Resend"). **Events:** Resend fires `sign_in_link_resent {reason: resend}`; handoff says `sign_in_started {provider: email}`. | `SignInParts.tsx:116-123`; `DemoBrowser.tsx:245-250` |
| Waiting for sign-in | partly | Copy matches: "Finish signing in to save this article", "We sent a link to {email}. Held for 10 minutes." **Layout:** handoff shows the article title as a small meta line, then the heading, the line, "Resend" and "Use a different email". Prototype shows the full article block (muted), then the heading and line, then the whole Check email block again (second "Check your email" heading, spam line, countdown, simulate box), plus "Simulate 10 minutes passing". **Behavior:** Resend counts down here; handoff shows "Resend" active. | `Popup.tsx:117-138` |
| Too many requests | partly | Copy "Try again later" matches. **Copy:** sub line is "Too many sign-in links were sent to this address in the last hour." (handoff "You can request a new link in an hour."). **Behavior:** the way out is "Use a different email" (handoff: "Continue with Google", since Google still works). Event matches. | `Popup.tsx:149-157`; `SignInParts.tsx:158-174` |
| Link expired (popup) | partly (extra) | The handoff moves "Link expired" to the website only. The prototype still has a popup version (reachable via "Simulate an expired link"). Its dev note already says it is likely unreachable. | `Popup.tsx:139-148` |
| Saved after sign-in (notification) | partly | Copy matches ("Saved to Quiescent", article title, "Read now"); events match. **Colors:** mock toast is dark (#2f2f31 / #f1f1f1) vs handoff light OS card (#ECECEC / #1F1F1F); label "Mock OS notification · Chrome" shows. **Missing behavior:** toolbar check badge for 5 s when notifications are blocked. **Behavior:** if the held save fails, prototype shows a "Couldn't save" notification with no Retry (not in handoff). | `DemoBrowser.tsx:200-223,576-611` |

### Can't save and errors

| State | In prototype? | What differs | File |
|---|---|---|---|
| Can't save | partly | Copy "Can't save this page" and "Library" match. **Missing copy:** "Open an article, then click the Q." **Layout:** button full width; icon circle above heading. Event matches (not_article). | `Popup.tsx:215-224` |
| Blocked page | yes | Copy matches ("Open an article to save it"), no buttons, Esc closes. Event matches. **Layout:** icon circle above heading. | `Popup.tsx:225-231` |
| PDF on computer | partly | Copy "Upload PDFs in Quiescent" and "Upload" match. **Missing copy:** "PDFs saved on your computer can't be read from Chrome's viewer." "Upload" opens upload on the website in a new tab (matches). **Events:** prototype fires `save_failed {error_type: local_pdf}`; the handoff lists no event here. | `Popup.tsx:232-241`; `DemoBrowser.tsx:93-94` |
| Couldn't save | partly | Copy "Couldn't save" and "Retry" match. **Missing copy:** "Nothing was saved." (the dev note itself flags this gap). **Behavior:** handoff says focus moves to Retry; prototype focuses the first primary button, which is Retry (matches). Event values timeout / server_error exist; `extract_failed` is in the dictionary but never fired. Demo timeout is 3 s (real rule 10 s, documented). | `Popup.tsx:242-260`; `DemoBrowser.tsx:33` |
| Couldn't save, offline | partly | Copy "Couldn't save, you're offline" and "Retry" match; different (wifi-off) icon matches. **Missing copy:** "Nothing was saved." | `Popup.tsx:242-260` |

## 3. Website: sign-in

| State | In prototype? | What differs | File |
|---|---|---|---|
| Sign in | partly | Copy matches: "Sign in to Quiescent", "Continue with Google", "Email", "Send link", "New here? Signing in creates your account." **Copy:** invalid-email error differs (see popup Signed out). **Layout:** no website header on the page (handoff: white 64 px header with logo + wordmark only); the logo sits above the card instead. Card 384 px wide, 16 px corners, 28 px padding, light shadow (handoff 400 px, 12 px corners, 32/28 padding, no shadow). Heading Cormorant 24 px (handoff Caladea 28 inside the card). Events match. | `LoginPage.tsx:55-90`; `SignInParts.tsx` |
| Check your email | partly | **Missing copy:** "We sent a sign-in link to **{email}**." (prototype shows the bare address under the heading). Rest of copy matches; same countdown. Simulate box visible (prototype helper). **Layout:** as popup Check email. | `LoginPage.tsx:79-94`; `SignInParts.tsx:89-140` |
| Sign-in email | missing | No email screen. The prototype skips it with "Simulate clicking the email link". Missing copy: subject "Your sign-in link for Quiescent", heading "Sign in to Quiescent", button "Sign in", footer "This link works once and expires in 15 minutes. If you didn't ask for it, you can ignore this email." | (none) |
| Signing in | yes | Copy matches ("Signing you in…"). Events sign_in_completed {provider, account} and new_device_sign_in match. **Layout:** small spinner left of the text inside the shared card, not centered; no header. | `SignInParts.tsx:177-184`; `auth.ts:11-19` |
| Link expired | partly | Copy "Link expired" and "Send a new link" match. **Extra copy:** "Sign-in links work once and expire after 15 minutes." (not in handoff). **Colors:** clock icon olive (`text-warn`). Event matches. | `SignInParts.tsx:144-156`; `LoginPage.tsx:96-104` |
| Too many requests | partly | Same as popup: sub line and way out ("Use a different email" vs "Continue with Google") differ. | `SignInParts.tsx:158-174`; `LoginPage.tsx:106` |
| Signed out | yes | Copy matches ("Signed out on this computer. Your library is kept."). **Layout:** plain Sage tint box, 14 px text, no Sage check dot. Event `signed_out` matches; sign-out also signs out the extension on this computer (matches). | `LoginPage.tsx:60-64`; `auth.ts:31-35` |

## 4. Website: header and banner

| State | In prototype? | What differs | File |
|---|---|---|---|
| Header | partly | **Layout:** the prototype has a collapsible **left sidebar** (logo, Library, Most recent read, Prototype tools, sync status, Account, Collapse), not a 64 px top header with Library · Account · sync · avatar. See Conflicts C6. | `AppShell.tsx:43-186` |
| Sync status | partly | Copy "Synced {time}" and "Offline, changes won't save" match. **Copy/behavior:** time format is "just now" (< 45 s), "{n} min ago", "{n} h ago", "{n} d ago"; handoff is "just now" under 1 min, "{n} min ago" under 1 hour, then clock time "at 3:42 PM". **Layout:** offline state is olive text with a cloud-off icon (handoff: Soft light pill, Ink text, wifi-off icon). When the sidebar is collapsed only an icon shows. | `AppShell.tsx:155-163,211-219` |
| Header offline | partly | See Sync status. Event `sync_failed` fires on each change while offline (handoff: announced once). | `AppShell.tsx:155-163`; `proto/actions.ts` (`syncCheck`) |
| Install banner | partly | Copy matches ("Add Quiescent to Chrome to save articles in one click.", "Add to Chrome"); not dismissible (matches); hides once the extension is connected (matches). **Colors/layout:** white card with a Line border and a puzzle icon (handoff: Sage tint fill, logo 28 px); "Add to Chrome" is a secondary button (handoff primary). Event `extension_install_clicked {from: banner}` is proposed, not in handoff. | `LibraryPage.tsx:632-642` |
| Avatar menu | missing | No avatar or avatar menu ({email}, "Sign out of this computer"). Sign-out lives only on the Account page. See Conflicts C6. | (none) |

## 5. Website: Account

| State | In prototype? | What differs | File |
|---|---|---|---|
| Account | partly | **Copy that matches:** "Account", "Profile", "Sign-in", "Sync", "Upload photo", "Remove", "Name", "Save changes", "Email", "Sign-in method", "You stay signed in unless you don't use Quiescent for 30 days.", "Status", "Connected on this computer", "Computers signed in", "Items in library", "Your library is kept when you sign out.", "Sign out of this computer", "To delete your account and everything in it, email support@quiescent.app.", photo states "Uploading…" / "Saved" / "Couldn't upload. Use a JPG or PNG under 5 MB." **Copy differs:** photo help is "JPG or PNG, up to 5 MB. If you signed in with Google, we use your Google photo until you upload one." (handoff "…Google sign-in uses your Google photo until you upload one."). **Layout:** the delete line is its own titled section "Delete account" (handoff: under the sign-out row, no title); title Cormorant 30 px (handoff Caladea 34); section titles Open Sans 18 px semibold (handoff Caladea 20); avatar placeholder Sage tint (handoff Sage); sync time format as above. Date of birth not built (matches the Open default). | `AccountPage.tsx:26-234` |
| Account, no extension | partly | "Not installed" + "Add to Chrome" match. **Layout:** "Add to Chrome" is a secondary button (handoff primary). "Computers signed in" is 2 in the demo seed regardless of state (handoff shows 1 for a new user). | `AccountPage.tsx:46-66`; `proto/store.ts:76` |

## 6. Flows

| Flow | In prototype? | What differs | File |
|---|---|---|---|
| f1 Returning reader saves an article | yes | Ready → Saving → Saved → Read now (full screen) works. Reader opens at the last position (handoff "furthest point", C3). | `DemoBrowser.tsx` |
| f2 First save, no account yet | partly | Signed out → Check email → (no email screen; "Simulate clicking the email link") → notification → Read now. The popup closes when sign-in starts (matches). | `DemoBrowser.tsx:191-235` |
| f3 Signs up on the website first | partly | Sign in → Signing in → Library with install banner → "Add to Chrome" opens `/demo-browser` (no Web Store step) → extension already signed in (matches). | `LoginPage.tsx`; `LibraryPage.tsx:632-642` |

---

## Conflicts (not decided here)

| # | Topic | Handoff says | Prototype / team decision says | Source of the prototype side |
|---|---|---|---|---|
| C1 | **Read Later cap** | Cap of 10; "Read Later is full (10 of 10)" state with "Read now" / "Open library"; event `read_later_full_shown`; open question "held save completes while Read Later is full". Timers table lists "Read Later cap: 10, newest first". | No save limit in the MVP; the full state was deleted. | `quiescent-spec.md` §1 and §3; `CHANGELOG-v2.md`; `Popup.tsx:1-7` |
| C2 | **Status names and casing** | "Reading", "Read Later", "Finished" (e.g. "Saved to Read Later", "moves it to Reading", library ghost "Reading · Read Later · Finished"). | "In progress · Read later · Finished", sentence case, everywhere (spec-alignment A10; prototype-edits section C). | `proto/store.ts:11-15`; `Popup.tsx:181` |
| C3 | **Reading position** | "Read now" opens "at the furthest point read". | MVP tracks the last position where the reader stopped (team meeting). | `quiescent-spec.md` §3 "Reading progress"; `ReaderPage.tsx` |
| C4 | **Folders in the popup** | No folder picker; open question says the PRD story "choose a shelf when I save" contradicts "shelves are Phase 2" and should be removed or moved to P1. | Folders are P0; the popup's Saved screen has an optional "Add to a folder" checklist (existing folders only, several or none). | `Popup.tsx` (`FolderPicker`); spec-alignment A6; `prototype-edits.md` §A6 |
| C5 | **Fonts and wordmark** | Caladea (wordmark, headings), Source Serif 4 (article titles, since Caladea lacks Vietnamese letters), Source Sans 3 (UI). | Cormorant Garamond + Open Sans across the whole app, kept from PR #1. Switching affects the library and reader too, not only the two handoff features. | `tokens.css:102-106`; `index.html:9-11`; `CHANGELOG-v2.md` ("Kept from PR #1") |
| C6 | **Navigation and sign-out** | Top header: logo · Library · Account · sync status · avatar menu with "Sign out of this computer". | Left sidebar (Library, Most recent read, Account); sign-out only on the Account page; no avatar menu. Accepted into MVP in prototype-edits section C. | `AppShell.tsx`; `prototype-edits.md` §C |
| C7 | **Popup close button** | No ✕; Esc closes (Chrome closes popups when focus leaves). | ✕ button in the popup header. | `Popup.tsx:77-79` |
| C8 | **Account Profile status** | Profile (photo, name) is an approved change. | Profile is still badged "proposed" in dev notes; CHANGELOG open question 8 asks "in or out for the MVP?". | `AccountPage.tsx:30`; `CHANGELOG-v2.md` open question 8 |
| C9 | **Extra events not in the handoff** | (no such events) | `save_popup_dismissed`, `sign_in_link_resent` (handoff uses `sign_in_started` for Resend), `save_failed {local_pdf}`, `extension_install_clicked`, `profile_photo_changed`, `profile_name_saved`. | `events/dictionary.ts` |
| C10 | **"Computers signed in"** | Open: needs Neon Auth to list sessions per computer; drop the row if not. | Row is shown with a mocked count. | `AccountPage.tsx:65` |
