# Callysto experience specification

- Status: **APPROVED DIRECTION AND M0 VISUAL REFERENCE — 2026-07-20**
- Scope: pilot application UI and notebook review experience
- Design classification: hybrid, with a restrained marketing homepage and task-focused application screens
- Visual mockups: [`docs/design/m0`](./docs/design/m0/) approved without amendment under D024; the legacy scaffold remains reference material, not the design source of truth

## 1. Experience goal

A first-time reader should understand within five seconds that Callysto is showing a real notebook behind a real claim, not a blog post and not a runnable sandbox. Within five minutes, that reader should be able to inspect provenance, navigate cells, open a contextual thread, and understand what Callysto did and did not verify.

## 2. Design principles

1. **The artifact is primary.** The notebook occupies the main reading surface. Platform chrome and engagement counters never compete with it.
2. **Trust before activity.** Owner, version, digest, source, license, and check labels appear before comment counts or calls to participate.
3. **Review in context.** A cell thread opens next to or immediately after the cell it discusses. The reader should not shuttle between a distant comment feed and the artifact.
4. **Calm, editorial, technical.** Use whitespace, typography, rules, and one accent color. Avoid decorative card mosaics, gradients, moon illustrations, emoji, and fake terminal theatrics.
5. **State is copy.** “Rendering,” “failed validation,” and “published version 2” are user-facing facts, not implementation details hidden behind spinners.
6. **Subtraction wins.** No vote count, fork count, trending score, or “Run” button exists until the underlying feature is real and approved.

## 3. Visual system proposal

This approved direction governs the later application UI milestone without requiring preservation of the current CSS.

### Typography

- UI and prose: self-hosted `IBM Plex Sans`, variable weight where supported.
- Code, digests, cell labels, and identifiers: self-hosted `IBM Plex Mono`.
- Maximum readable prose measure: 72 characters.
- Notebook code preserves author formatting but uses the platform monospace fallback where the render lacks its own font.

### Color tokens

```text
paper-0       #FFFFFF  main reading surface
paper-50      #F7F7F4  page background
ink-950       #171A1C  primary text
ink-700       #3F474D  secondary text
ink-500       #687178  metadata
line-200      #D9DDDF  dividers
signal-700    #155E75  primary action and link
signal-100    #CFFAFE  selected-cell wash
success-700   #2F6B3C  completed state
warning-700   #8A5A12  attention state
danger-700    #A33A32  destructive and failure state
```

- No color is the only carrier of state.
- Text and interactive-control contrast meets WCAG 2.2 AA.
- Border radius is restrained: 4 px for controls, 0–2 px for notebook/document surfaces.
- Shadows are limited to transient overlays. Document hierarchy uses spacing and rules.

### Spacing and density

- Base spacing unit: 4 px.
- Common steps: 4, 8, 12, 16, 24, 32, 48, 64.
- Notebook cells have compact vertical rhythm; comments add separation only when opened.
- Minimum interactive target: 44 × 44 CSS pixels even when the visible icon is smaller.

### Interaction tokens

- Body text: 16/24 px; compact metadata: 14/20 px; notebook title: responsive 32/38 to 44/50 px.
- Focus ring: 2 px `signal-700` with 2 px paper-colored offset; it remains visible in forced-colors mode.
- Overlay/backdrop and table-density tokens must be defined in the implementation theme rather than repeated ad hoc.
- Long digests use a shortened visual form plus `Show full` and `Copy digest`; the complete value remains available to assistive technology and copy feedback is announced.

## 4. Information architecture

```text
PUBLIC
├── /                         Product promise + selected real notebooks
├── /explore                  Recent notebooks + topic filter
├── /@owner/notebook          Canonical latest-version entry
├── /@owner/notebook/v/:n     Immutable notebook version + review record
├── /@owner                   Public profile and publications
├── /about/trust              What Callysto checks and does not check
├── /policies/*               Terms, privacy, acceptable use, copyright, licenses
└── /login                    GitHub / ORCID sign-in

AUTHENTICATED
├── /submit                   Invitation check + draft creation
├── /drafts/:id               Metadata, upload, progress, preview, publish
├── /assignments/:id          Accept/decline one exact-version review request
├── /settings/identity        Linked providers and public profile
├── /settings/notifications   Verified private address + review email preference
└── /reports/:id              Reporter receipt only

OPERATOR
└── /ops                      Failed jobs, reports, invitations, restriction actions
```

The canonical notebook route redirects or resolves to the latest published version but visibly identifies that version. Search engines receive a canonical version URL to avoid mutable citation targets.

## 5. Global navigation

### Logged out

1. Callysto wordmark.
2. Explore.
3. What Callysto checks.
4. Sign in.

### Authenticated member

If the member is an invited publisher, adds `Publish notebook` as the single emphasized action. The pilot has transactional email but no in-app notification center or notification navigation item.

### Mobile

The header shows wordmark, `Explore`, and an account/menu button. The menu opens a modal sheet with focus trapping, Escape dismissal, and focus restoration. There is no desktop sidebar squeezed into a hamburger by accident.

## 6. Screen specifications

### 6.1 Homepage `/`

Hierarchy:

1. Product category: “Open review for computational notebooks.”
2. One sentence explaining publish → inspect → discuss.
3. Primary action: `Explore notebooks`.
4. Secondary action: `Request a publisher invitation` during pilot.
5. A single real notebook excerpt showing a cell and an attached resolved thread.
6. A short trust statement linking to `/about/trust`.
7. Selected recent notebooks, only when real data exists.

No 3-column feature grid. No fabricated counts. With zero publications, the notebook excerpt is a visually distinct static block labeled `Product demonstration`. It is not a notebook/review record, never contributes to counts or analytics, and the recent section becomes an honest pilot invitation.

### 6.2 Explore `/explore`

Hierarchy:

1. Page title and result count.
2. Recent/topic controls.
3. Linear result list, not a decorative card grid.
4. Each row shows title, owner, source/claim summary, version, topics, publication date, and count of open/resolved review threads.

The first pilot does not include free-text search or ranking. Topic filters update the URL. Pagination uses `Load more` with progressive enhancement and preserves browser history.

### 6.3 Notebook version page

Desktop structure:

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Breadcrumb / owner / notebook / version                            │
│ Title                                                              │
│ Claim or source statement                                          │
│ Question for reviewers                                             │
│ Static render. Callysto did not run or verify this analysis.       │
│ owner · version · source · license · published · technical details │
├───────────────────────────────────────────────┬─────────────────────┤
│ Notebook document                             │ Review panel        │
│                                               │ - notebook threads  │
│ Cell A                                        │ - selected cell     │
│   code/output                                 │ - open/resolved     │
│   [Discuss this cell]                         │ - reply form        │
│                                               │                     │
│ Cell B (selected wash + focus marker)         │                     │
└───────────────────────────────────────────────┴─────────────────────┘
```

Primary order:

1. Artifact identity and claim.
2. Question for reviewers.
3. Persistent trust sentence and essential provenance.
4. Notebook outline, version controls, and content.
5. Review actions.

Owner, version, source, license, and the trust sentence are immediately visible. Digest, renderer version, render-policy/revision, kernel, format version, normalization details, and any security regeneration event live in an expandable `Technical details` disclosure and remain present in machine-readable metadata.

Long notebooks include a generated outline, current-section indication, cells with open-review markers, and a `Next open thread` action. Human context leads cell labels (`Methods · code cell 14`); the short stable ID is available in details and permalinks.

The review panel is sticky only when viewport height permits. It never covers notebook content. A permalink to a cell uses `#cell-<id>`.

Mobile structure:

- Metadata remains above the notebook.
- Review expands inline immediately after the selected cell. It does not use a second, competing bottom-sheet pattern.
- Opening a thread updates the URL fragment and history so Back returns to reading position.
- Long code scrolls horizontally inside its cell; the whole page never acquires horizontal overflow.

### 6.4 Draft and publish flow

The flow is one page with explicit stages, not a wizard that hides previous input:

```text
1 DETAILS -> 2 NOTEBOOK -> 3 PROCESSING -> 4 PREVIEW -> 5 PUBLISH
```

- Details can be saved before upload.
- Upload starts only after local extension/size feedback.
- Browser computes an advisory digest while uploading and shows deterministic progress. Copy explains that Callysto separately verifies and promotes the bytes before rendering.
- Replacing a file clearly invalidates the prior preview. A late result for the old generation never replaces the current draft.
- Processing survives navigation and reconnect. Returning to the draft resumes from durable state.
- Preview uses an expiring, draft-generation-specific capability and shows the exact candidate source/manifest digests publication will compare.
- Rich output frames obtain short-lived access only as they approach the viewport. Expiry triggers one quiet, authorized refresh for the same output; restriction/revocation becomes the neutral unavailable state, never an infinite spinner or full-page position loss.
- Publish requires a final checkbox confirming rights, public visibility, and non-execution language.
- The publish button becomes disabled and displays progress after activation; duplicate activation is harmless server-side.

Rights affirmation and Callysto's non-execution statement are separate confirmations. Agreeing that Callysto did not run the notebook does not imply the uploader has publication rights, and vice versa.

### 6.5 Revision flow

An owner starts with `Create revised version` on a published page.

1. Eligible metadata is copied into a new draft; the prior version remains immutable.
2. The owner uploads the replacement notebook and completes the normal processing/preview path.
3. Before publishing, the owner must enter `What changed?` and may link prior threads as `Addressed in this version`.
4. The new version receives its own digest, render manifest, publication date, and review record.
5. Historical pages display a calm `Newer version available` banner. They never swap the notebook underneath an old URL.
6. The version switcher compares version number, date, digest, and change note. The pilot does not promise a cell diff.

### 6.6 Login and invitation states

The login page explains why identity is required and offers two branded provider buttons. ORCID is described as researcher identity, not as scientific verification.

After provider login, participation onboarding shows or requests a private notification email. Provider email is used only if delivered as a verified claim; otherwise Callysto sends its own confirmation. The address is never public. Reading and settings remain available while verification is pending, but commenting, reporting, accepting an assignment, and publishing are blocked with a direct resume action.

An assignment deep link identifies the owner, exact notebook version, review question, and expected pilot timing before `Accept` or `Decline`. Acceptance is idempotent and continues to the exact version; decline records no public judgment and returns to Explore. It is a single-request screen, not a general notification center.

A signed-in non-publisher opening `/submit` sees:

- a clear `Publisher invitation required` heading;
- why the pilot is gated;
- request-invitation action;
- a link back to reviewing notebooks.

### 6.7 Operator console

Utility UI only. Dense table/list patterns are appropriate. Every action shows target, consequence, audit reason, and confirmation. Operators can assign a named reviewer to an exact notebook version and see delivery state without seeing or exposing provider secrets. A scoped restriction is reversible; permanent deletion follows a separate retention/legal procedure and is not a one-click control.

Operator capability is additive and never grants notebook ownership. There is no self-elevation control. Publisher grants, account suspension, moderation close, retry, restriction, and restoration require recent reauthentication and an explicit reason. `Resolved` is never available as an operator moderation action.

Revoking publisher capability presents the exact consequence before confirmation: no new/edit/publish work, unpublished drafts become read-only, and existing ownership/publications remain. The active owner retains reply/address, export, unlist, and policy-removal access; the operator does not acquire it.

### 6.8 Supporting public screens

- **Profile `/@owner`:** identity, short biography, external identity links the owner chooses to expose, and a chronological publication list. No vanity score.
- **Trust `/about/trust`:** a plain-language table of what Callysto checks, what the author reports, what reviewers did, and what remains unknown.
- **Invitation request:** audience, intended notebook, review question, and contact/identity context; submission confirms receipt without promising acceptance.
- **Unavailable/restricted:** neutral title, no leaked metadata or output, public-safe reason category only when policy permits, support code, and route back to Explore.

## 7. Review interactions

### Starting a cell thread

1. Keyboard focus or pointer hover reveals `Discuss this cell` without causing layout shift.
2. Activation selects the cell, updates the URL fragment, and opens the composer.
3. The composer states “Commenting on version N, cell <short-id>.”
4. Submit shows pending state. Success inserts the thread and announces it. Failure retains the draft text and offers retry.

A separate `Discuss the notebook` action above the document starts a notebook-level thread. It never silently attaches to the currently visible cell.

### Thread display

- Root comment and replies are chronological.
- One nesting level only.
- `Open`, `Owner addressed`, `Reviewer resolved`, and `Reopened` are review-state labels. `Moderation closed` is a separate policy label that can accompany any of them; it never erases the preserved review state. They never collapse author response and reviewer satisfaction.
- The notebook owner sees `Mark addressed` with an optional response/version link. The root thread author sees `Resolve` or `Reopen`. An operator sees `Moderation close`/`Restore discussion` only after recent reauthentication and a policy reason; restore returns to the preserved review state.
- Deleted comments retain a timestamped tombstone so replies do not lose context.
- Version 2 never presents a version 1 comment as though it targets version 2.
- Each comment has a stable permalink and report control.
- A comment author may edit that comment for 15 minutes; every edit shows an `edited` label and retains revision evidence. After the window, correction uses a new reply.
- Public identity shows display name, avatar, and intentionally linked researcher/developer identity; email is never shown.

### Unsaved text

Comment drafts persist locally per account + version + cell for 24 hours. Signing out clears them. The UI warns before discarding a non-empty composer through an explicit Cancel action; navigation does not trigger a blocking browser dialog unless text would truly be lost.

### Notification deep links

Transactional messages identify the notebook, owner, version, and event without copying notebook source or private comment content into email. A review assignment opens the exact version and its stated review question. A thread notification opens the exact thread and cell anchor. A prior reviewer is notified about a revision only when the owner explicitly links that reviewer’s thread as addressed. `/settings/notifications` shows the verified private address and optional review-email preference. If the content is later restricted, the link resolves to a neutral unavailable state rather than leaking newly delivered platform content.

## 8. Interaction-state matrix

| Feature | Loading | Empty | Error | Success | Partial/stale |
|---|---|---|---|---|---|
| Homepage publications | Skeleton lines matching result layout | Explain pilot and show labeled demo excerpt | Short retry with status reference | Real notebook list | Show cached list with refresh note only if cache is stale |
| Explore | Preserve filters; row skeletons | “No notebooks in this topic yet” + clear filter | Retry without clearing filters | Results and next cursor | Existing results remain while loading more |
| Notebook metadata | Title-shaped skeleton | Not applicable for published record | Neutral unavailable page + support code | Provenance block | Show version update notice, never swap artifact silently |
| Notebook render | Document skeleton + named render status for owner preview | Valid zero-cell notebook is rejected during validation | Public-safe failure/restriction state | App-owned cell shell + isolated outputs | Large outputs may show explicit truncated/unsupported placeholder; security rerender is disclosed |
| Upload | Byte progress + digest progress | Drag/drop prompt with file limits | Specific invalid/expired/network message; retry preserves metadata | File name, size, digest | Reconnect checks server before resuming or restarting |
| Comments | Thread skeletons, composer stays usable when safe | Warm invitation: “No review threads yet. Ask about a cell or the notebook.” | Draft retained + retry | New comment focused and announced | If session expired, preserve draft and request sign-in |
| Publish | Button busy, duplicate activation disabled | Missing requirements listed inline | No visibility change; actionable error | Version URL + copy/share actions | If render changed since preview, block and require refreshed preview |
| Reports | Busy state | Not applicable | Retain reason + retry | Receipt without reporter identity exposure | Duplicate report returns existing receipt |
| Preview capability | Named verification/render state | No active upload | Expired/replaced capability returns to current draft safely | Exact candidate digests shown | Old-generation completion never replaces current preview |

## 9. User journey storyboard

| Step | User does | Intended feeling | Design support |
|---|---|---|---|
| 1 | Opens a notebook link | Oriented | Title, owner, version, claim, and trust labels before the artifact. |
| 2 | Scans methods and outputs | In control | Clear cells, anchors, document outline, no engagement clutter. |
| 3 | Notices a questionable step | Safe to ask | Contextual `Discuss` action with version/cell identity. |
| 4 | Writes a comment | Heard, not trapped | Draft preservation, clear authorship, visible pending/success state. |
| 5 | Returns later | Continuity | Frozen URL, thread state, author response, version lineage. |
| 6 | Sees a revision | Trust | Old artifact and discussion remain intact; new version explains relationship. |

### Publisher journey

| Step | Publisher does | Intended feeling | Design support |
|---|---|---|---|
| 1 | Creates a draft and states a review question | Focused | Requirements are visible together; metadata saves before upload. |
| 2 | Uploads a real notebook | Reassured | Limits, checksum progress, and rights warnings are explicit. |
| 3 | Waits for processing | Informed | Durable named stages survive refresh; failures say whether the original is safe. |
| 4 | Reviews exact public preview | Responsible | Isolated outputs, trust sentence, metadata, and rights confirmation match publication. |
| 5 | Receives a contextual review | Invited to respond | Deep link opens the exact version/cell/thread; draft reply is preserved. |
| 6 | Responds or creates a revision | Accountable | Resolution and `Addressed in version N` preserve the historical record. |

## 10. Responsive requirements

| Viewport | Behavior |
|---|---|
| 320–599 px | Single document column; metadata collapses into labeled rows; selected review expands inline after its cell; no fixed side panels or bottom-sheet alternative. |
| 600–1023 px | Document-first column; selected review expands inline after its cell. No overlay obscures notebook context. |
| 1024–1439 px | Two columns: flexible document + 320 px review panel. |
| 1440 px+ | Document measure remains bounded; extra width becomes breathing room, not wider prose or a third rail. |

Test at 320, 375, 768, 1024, and 1440 CSS pixels, with 200% browser zoom and long content.

## 11. Accessibility requirements

- Skip links to notebook, review panel, and metadata.
- Semantic heading outline generated from app structure without rewriting user notebook headings.
- Each notebook cell is a labeled region with a stable anchor; avoid making every cell an excessive landmark for assistive technology.
- All thread, resolve, report, upload, and publish interactions work with keyboard alone.
- Focus moves only after explicit actions and returns to the triggering control when overlays close.
- Status updates use restrained `aria-live` regions; code output is not repeatedly announced.
- Provider buttons follow GitHub and ORCID branding/accessibility rules.
- Reduced-motion preference removes nonessential transitions.
- Tables in notebook output retain horizontal access and a textual overflow cue.
- Each rich-output iframe has a descriptive title, visible focus treatment, bounded internal scroll behavior, and an adjacent plain-language fallback when the content is unsupported.
- Keyboard users can enter and leave output frames predictably; the application never traps focus inside a cross-origin frame.
- Error summaries receive focus after failed form submission and link to the exact invalid field.
- Layout, selection, and status remain perceivable in forced-colors mode.
- Large equations, tables, and code blocks are tested at 200% and 400% zoom with keyboard-only horizontal access.
- Application UI meets WCAG 2.2 AA. User notebook content receives an “author-supplied content” boundary and cannot be falsely certified accessible.

## 12. Content and copy rules

- Say `render`, never `run`, when code was not executed.
- Say `Callysto checked the notebook format`, never `Callysto verified the analysis`.
- Say `Owner addressed` and `Reviewer resolved`; never imply reviewer agreement from an owner or operator action.
- Never show fabricated votes, forks, comments, users, or publication dates outside a clearly labeled development fixture.
- Error copy names what failed, whether data is safe, and what the user can do next.
- Security details that aid abuse remain operator-only; user messages still include a support code.

## 13. Design decisions awaiting owner approval

1. Approve the calm editorial direction and proposed font pairing.
2. Approve a document-first notebook page with contextual review panel.
3. Approve removing votes, forks, `Run`, and decorative moon motifs from the pilot UI.
4. Approve honest empty states and one separately stored `Product demonstration`, never seeded social proof.
5. Approve the staged single-page publishing flow with verified-contact onboarding and expiring exact-preview state.
6. Approve owner `addressed` versus reviewer `resolved/reopened` language.

The approved M0 reference includes desktop notebook review, mobile inline cell discussion, and draft processing/failure mockups. Post-implementation, run visual QA against the live staging build at all specified viewports.
