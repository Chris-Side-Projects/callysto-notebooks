# Callysto M0 static mockups

Status: **approved M0 visual reference — 2026-07-20**

These dependency-free HTML/CSS artifacts translate the approved `UX_SPEC.md` direction into the required responsive M0 screen set:

1. [`homepage-responsive.html`](./homepage-responsive.html) — category-first homepage, review-loop demonstration, trust boundary, and honest empty publication state.
2. [`desktop-notebook-review.html`](./desktop-notebook-review.html) — desktop artifact and contextual review rail.
3. [`mobile-inline-discussion.html`](./mobile-inline-discussion.html) — mobile selected-cell discussion expanded inline.
4. [`draft-processing-failure.html`](./draft-processing-failure.html) — durable processing and actionable failure alternatives.

Open [`index.html`](./index.html) in a browser to review the complete set. No server, package installation, network access, JavaScript, or build step is required.

## What these mockups decide

- A light editorial/technical visual system using the approved Callysto tokens.
- A first-screen homepage composition that names the category, states the review loop, and uses one explicitly labeled demonstration instead of fabricated social proof.
- The notebook remains the primary reading surface.
- Artifact identity, question for reviewers, trust language, and essential provenance precede engagement controls.
- Desktop review uses a 336 px sticky contextual rail.
- Mobile review expands immediately after the selected cell and does not introduce a bottom sheet.
- The application owns cell chrome and review controls. A sandboxed output frame demonstrates the separate rich-output boundary.
- Processing uses named durable states. Failure copy says what failed, whether the original is safe, whether anything became public, and what the publisher can do next.
- Every sample notebook, person, metric, date, support code, and review is labeled or named as a product demonstration.
- Product mutation controls are disabled or read-only. Only real mockup navigation, disclosures, and in-page anchors remain operable.

## What these mockups do not decide

- Final production fonts. The CSS prefers locally installed IBM Plex and falls back without downloading anything; production should self-host approved font files.
- Exact component implementation, API behavior, authentication, upload, comment mutation, notifications, or renderer behavior.
- Final copy after legal, trust, and moderation review.
- Dark mode, motion, broad discovery, search, votes, forks, execution, or other deferred product scope.
- Pixel-perfect rich notebook output. The iframe exists to test the visual and keyboard boundary, not to reproduce `nbconvert` output.

## Accessibility represented

- Semantic landmarks, headings, breadcrumbs, labels, and review regions.
- Skip links for notebook and review destinations.
- 44 px minimum control targets and visible focus treatment.
- A single mobile interaction pattern with an explicit return-to-cell action.
- Descriptive iframe title, sandbox attribute, visible frame boundary, and adjacent plain-language fallback.
- Error summary with alert semantics, support code, data-safety copy, and action target.
- Forced-colors and reduced-motion CSS.
- Responsive layouts at the specified desktop, tablet, and mobile ranges.

Static controls intentionally do not submit or persist data. Full keyboard, screen-reader, zoom, contrast, and real cross-origin tests remain implementation acceptance gates.

## Owner approval record

The project owner approved all ten items without amendment in the Codex task on 2026-07-20:

1. **Visual direction:** Does the light, low-shadow, IBM Plex-led editorial system feel appropriately serious and distinctive?
2. **Homepage composition:** Does the first viewport explain publish → inspect/discuss → respond/revise without extra feature sections?
3. **Homepage honesty:** Approve one separately labeled review demonstration and a truthful empty publication section until real pilot records exist?
4. **Desktop review placement:** Approve the sticky review rail, or prefer inline threads at every viewport?
5. **Mobile review placement:** Approve the selected thread immediately after its cell, including the explicit `Close and return to cell` action?
6. **Provenance density:** Approve essential facts above the document and technical facts inside disclosure?
7. **Review language:** Approve `Open`, `Owner addressed`, and reviewer-controlled resolution language?
8. **Processing hierarchy:** Approve the four named steps inside the broader five-stage publishing flow?
9. **Failure hierarchy:** Approve failure reason → original safety → no-publication status → next actions?
10. **Demonstration treatment:** Is the persistent `Product demonstration` labeling impossible to confuse with production evidence?

## Review disposition

- **Disposition:** approved without amendments.
- **Decision record:** D024 in [`DECISIONS.md`](../../../DECISIONS.md).
- **Future changes:** revise this set and the affected UX decision before implementation if the visual direction changes.

Approval of these mockups does not authorize product implementation beyond the separately approved milestone gate.
