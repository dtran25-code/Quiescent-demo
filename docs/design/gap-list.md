# Gap list: design handoff v1.2 vs. prototype

Handoff: `docs/design/quiescent-handoff.html` (v1.2, Oct 22, 2026): Chrome extension popup and Accounts & sync.
v1.2 updated the handoff to the prototype: the team decisions from the Oct 21 spec check (no Read later cap, In
progress · Read later · Finished, last position, optional folder picker after saving, left sidebar), plus the
prototype's fonts, the popup ✕ and the prototype's extra events. Every v1.1 conflict is resolved except "Computers signed in".
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
| Sidebar (Library, Most recent read, sync status, Account) | `src/shell/AppShell.tsx` |
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
| Wordmark font | Cormorant Garamond 600, 18 popup / 20 website | Cormorant Garamond 600; 15 px in the popup, `text-3xl` (30 px) on the sign-in page | partly (family matches, sizes differ) | `Popup.tsx:76`; `Logo.tsx:37` |
| Status / headings font | Cormorant Garamond 600; 24 popup status, 22 popup heading, 34 page title | Cormorant Garamond 600; popup status 20 px, popup heading 20 px, check-email heading 24 px, Account title 30 px, sign-in heading 24 px | partly (family matches, sizes differ) | `Popup.tsx:94,306,317`; `SignInParts.tsx:113`; `AccountPage.tsx:28`; `LoginPage.tsx:67` |
| Article title font | Cormorant Garamond 17 / 600, line 1.4, cut at 3 lines | Cormorant Garamond 600, 18 px, cut at 2 lines | partly | `Popup.tsx:326` |
| UI and buttons font | Open Sans, 15 / 400 and 600 | Open Sans; buttons 14 px / 500 | partly (family matches) | `index.css:31-34`; `tokens.css:104` |
| Meta font | Open Sans, 13 / 400 | Open Sans 12 px (`text-xs`) | partly (family matches) | `Popup.tsx:327`; `SignInParts.tsx:84` |
| Popup fonts bundled | Bundle the font files in the extension; no Google Fonts in the popup | Fonts load from Google Fonts (fine for a demo; the real extension must bundle them) | differs (build note) | `index.html:9-11` |
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
| Popup frame | partly | **Layout:** header `px-4 py-2.5` with a Line bottom border (handoff 14/20 padding, Sage tint border); body 16 px padding (handoff 24/20/20, gap 16). Logo 22 px (handoff 28). Close ✕ in the header matches. Shadow `shadow-2xl` vs. handoff soft shadow. | `Popup.tsx:73-85` |
| Status line | partly | **Layout:** handoff = 28 px circle + Caladea 24 text; Sage circle with check for success, Sage tint circle for neutral, spinner for waiting. Prototype: Saved/Saving/Already use a bare 20 px icon with no circle (success icon is green `text-ok`); Can't save / Blocked / PDF use a 36 px Sage tint circle **above** the heading, not beside it. | `Popup.tsx:304-321` |
| Article block | partly | **Layout:** handoff has Sage tint rules above and below with faint ruled lines behind, title in Source Serif 4 17 px (3 lines), source in Ink 70 13 px. Prototype: Line-colored rules, no ruled background, title Cormorant 18 px semibold cut at 2 lines, source 12 px `ink-faint` with a globe icon. | `Popup.tsx:324-333` |
| Notice (errors) | partly | **Layout:** Soft light box and 8 px corners match. Icon 18 px in olive `text-warn` (handoff 20 px, Ink). Title Cormorant 18 px (handoff Caladea 20). No meta line ("Nothing was saved." missing). | `Popup.tsx:243-248`; `SignInParts.tsx:147,162` |

### Save states

| State | In prototype? | What differs | File |
|---|---|---|---|
| Ready | yes | Copy matches ("Add to Quiescent"). Focus starts on it. **Layout:** article block style (see Frame). | `Popup.tsx:158-167` |
| Online PDF | yes | Copy matches; source shows "{host} · PDF". | `Popup.tsx:158`; `DemoBrowser.tsx:406-409` |
| Saving | yes | Copy matches ("Saving…"); no buttons; same height as Saved; spinner stops for reduced motion. **Layout:** spinner is a 20 px icon, not the 26 px ring. | `Popup.tsx:168-177` |
| Saved to Read later | yes | Copy matches ("Saved to Read later", "Read now", "Add to a folder (optional)"). Folder picker matches: existing folders, several or none, hidden with no folders, no "create folder", each tick applies at once (`folder_items_changed {via: popup}`). "Read now" opens the reader full screen at the last position (matches). **Layout:** green check icon without Sage circle; picker rows are 32 px with 16 px checkboxes and folder icons (handoff 40 px rows, 18 px checkboxes, no icons). **Events:** prototype also fires `save_popup_dismissed` (proposed, not in handoff). | `Popup.tsx:178-195,265-305`; `DemoBrowser.tsx:117-124,184-198` |
| Saved, partial | yes | Copy matches ("Saved what's visible", "Read now", folder picker). Success style, not Soft light (matches). | `Popup.tsx:181` |
| Already saved | yes | Copy matches ("Already in your library", "Read now", "Open library"). Canonical URL rule matches. **Layout:** bookmark icon without the Sage tint circle. Events match. | `Popup.tsx:196-214` |

### Sign-in states

| State | In prototype? | What differs | File |
|---|---|---|---|
| Signed out | partly | Copy matches: "Sign in to save this article", "Continue with Google", "or", "Email", "Send link", "New here? Signing in creates your account." **Copy:** invalid-email error is "Enter an email address like you@example.com." (handoff "Enter a full email, like you@example.com."). **Layout:** heading Cormorant 20 px (handoff Caladea 22); Google button has the real Google "G" (handoff placeholder circle) with a 1 px border at 40% Ink 70 (handoff: secondary button, 1.5 px Ink). **Events:** sign_in_prompt_shown {trigger: first_save} and sign_in_started {provider} match. | `Popup.tsx:91-105`; `SignInParts.tsx:20-87` |
| Check email | partly | Copy matches: "Check your email", the address, "The link should arrive within a minute. If not, check your spam folder.", "Resend in {n} s", "Use a different email". **Missing copy:** "You can close this popup. The article saves after you sign in." **Layout:** 44 px green mail circle above a 24 px heading (handoff: 28 px Sage tint circle inline with the heading). A "Prototype only" box with "Simulate clicking the email link" / "Simulate an expired link" is visible with dev notes off (needed to run the demo). | `SignInParts.tsx:89-140` |
| Check email, resend ready | partly | Copy matches ("Still nothing? Check your spam folder, or resend.", "Resend"). Events match (`sign_in_link_resent`). | `SignInParts.tsx:116-123`; `DemoBrowser.tsx:245-250` |
| Waiting for sign-in | partly | Copy matches: "Finish signing in to save this article", "We sent a link to {email}. Held for 10 minutes." **Layout:** handoff shows the article title as a small meta line, then the heading, the line, "Resend" and "Use a different email". Prototype shows the full article block (muted), then the heading and line, then the whole Check email block again (second "Check your email" heading, spam line, countdown, simulate box), plus "Simulate 10 minutes passing". **Behavior:** Resend counts down here; handoff shows "Resend" active. | `Popup.tsx:117-138` |
| Too many requests | partly | Copy "Try again later" matches. **Copy:** sub line is "Too many sign-in links were sent to this address in the last hour." (handoff "You can request a new link in an hour."). **Behavior:** the way out is "Use a different email" (handoff: "Continue with Google", since Google still works). Event matches. | `Popup.tsx:149-157`; `SignInParts.tsx:158-174` |
| Link expired (popup) | partly (extra) | The handoff moves "Link expired" to the website only. The prototype still has a popup version (reachable via "Simulate an expired link"). Its dev note already says it is likely unreachable. | `Popup.tsx:139-148` |
| Saved after sign-in (notification) | partly | Copy matches ("Saved to Quiescent", article title, "Read now"); events match. **Colors:** mock toast is dark (#2f2f31 / #f1f1f1) vs handoff light OS card (#ECECEC / #1F1F1F); label "Mock OS notification · Chrome" shows. **Missing behavior:** toolbar check badge for 5 s when notifications are blocked. **Behavior:** if the held save fails, prototype shows a "Couldn't save" notification with no Retry (not in handoff). | `DemoBrowser.tsx:200-223,576-611` |

### Can't save and errors

| State | In prototype? | What differs | File |
|---|---|---|---|
| Can't save | partly | Copy "Can't save this page" and "Library" match. **Missing copy:** "Open an article, then click the Q." **Layout:** button full width; icon circle above heading. Event matches (not_article). | `Popup.tsx:215-224` |
| Blocked page | yes | Copy matches ("Open an article to save it"), no buttons, Esc closes. Event matches. **Layout:** icon circle above heading. | `Popup.tsx:225-231` |
| PDF on computer | partly | Copy "Upload PDFs in Quiescent" and "Upload" match. **Missing copy:** "PDFs saved on your computer can't be read from Chrome's viewer." "Upload" opens upload on the website in a new tab (matches). Event `save_failed {local_pdf}` matches. | `Popup.tsx:232-241`; `DemoBrowser.tsx:93-94` |
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
| Sidebar | partly | Left sidebar with Library, Most recent read, sync status and Account matches; no avatar menu (matches); collapsible, collapsed in the reader, hidden in full screen (matches). **Layout:** sidebar background is a light Sage tint (`bg-paper-deep/60`, handoff white); logo 30 px (handoff 32); the active item uses Sage tint with dark text at 500 weight (handoff 600); the prototype adds a "Prototype tools" group and a "Collapse" button (demo only). | `AppShell.tsx:43-186` |
| Sync status | partly | Copy "Synced {time}" and "Offline, changes won't save" match. **Copy/behavior:** time format is "just now" (< 45 s), "{n} min ago", "{n} h ago", "{n} d ago"; handoff is "just now" under 1 min, "{n} min ago" under 1 hour, then clock time "at 3:42 PM". **Layout:** offline state is olive text with a cloud-off icon (handoff: Soft light pill, Ink text, wifi-off icon). When the sidebar is collapsed only an icon shows. | `AppShell.tsx:155-163,211-219` |
| Sidebar offline | partly | See Sync status. Event `sync_failed` fires on each change while offline (handoff: announced once). | `AppShell.tsx:155-163`; `proto/actions.ts` (`syncCheck`) |
| Install banner | partly | Copy matches ("Add Quiescent to Chrome to save articles in one click.", "Add to Chrome"); not dismissible (matches); hides once the extension is connected (matches). **Colors/layout:** white card with a Line border and a puzzle icon (handoff: Sage tint fill, logo 28 px); "Add to Chrome" is a secondary button (handoff primary). Event `extension_install_clicked {from: banner}` is proposed, not in handoff. | `LibraryPage.tsx:632-642` |

## 5. Website: Account

| State | In prototype? | What differs | File |
|---|---|---|---|
| Account | partly | **Copy that matches:** "Account", "Profile", "Sign-in", "Sync", "Upload photo", "Remove", "Name", "Save changes", "Email", "Sign-in method", "You stay signed in unless you don't use Quiescent for 30 days.", "Status", "Connected on this computer", "Computers signed in", "Items in library", "Your library is kept when you sign out.", "Sign out of this computer", "To delete your account and everything in it, email support@quiescent.app.", photo states "Uploading…" / "Saved" / "Couldn't upload. Use a JPG or PNG under 5 MB." **Copy differs:** photo help is "JPG or PNG, up to 5 MB. If you signed in with Google, we use your Google photo until you upload one." (handoff "…Google sign-in uses your Google photo until you upload one."). **Layout:** the delete line is its own titled section "Delete account" (handoff: under the sign-out row, no title); title Cormorant 30 px (handoff Caladea 34); section titles Open Sans 18 px semibold (handoff Caladea 20); avatar placeholder Sage tint (handoff Sage); sync time format as above. Date of birth not built (matches the Open default). | `AccountPage.tsx:26-234` |
| Account, no extension | partly | "Not installed" + "Add to Chrome" match. **Layout:** "Add to Chrome" is a secondary button (handoff primary). "Computers signed in" is 2 in the demo seed regardless of state (handoff shows 1 for a new user). | `AccountPage.tsx:46-66`; `proto/store.ts:76` |

## 6. Flows

| Flow | In prototype? | What differs | File |
|---|---|---|---|
| f1 Returning reader saves an article | yes | Ready → Saving → Saved → Read now (full screen) works; the reader opens at the last position (matches). | `DemoBrowser.tsx` |
| f2 First save, no account yet | partly | Signed out → Check email → (no email screen; "Simulate clicking the email link") → notification → Read now. The popup closes when sign-in starts (matches). | `DemoBrowser.tsx:191-235` |
| f3 Signs up on the website first | partly | Sign in → Signing in → Library with install banner → "Add to Chrome" opens `/demo-browser` (no Web Store step) → extension already signed in (matches). | `LoginPage.tsx`; `LibraryPage.tsx:632-642` |

---

## Conflicts (not decided here)

All v1.1 conflicts were resolved in handoff v1.2 by following the prototype (cap, status names, reading position, folder
picker, sidebar, fonts, popup ✕, events). Profile editing was already approved in the handoff; the prototype's "proposed"
badge on it is stale. One item is still open:

| # | Topic | Handoff says | Prototype says | Source |
|---|---|---|---|---|
| C10 | **"Computers signed in"** | Open: needs Neon Auth to list sessions per computer; drop the row if not. | Row is shown with a mocked count. | `AccountPage.tsx:65` |
