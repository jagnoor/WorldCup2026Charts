# WorldCup2026Charts — Engineering & Quality Backlog

_Created 2026-07-22. A companion to [`BACKLOG.md`](BACKLOG.md)._

`BACKLOG.md` tracks **features and content** — what to build next. This file tracks
**engineering health** — how to keep what's built correct, maintainable, and trustworthy.
It's a code-quality review of the repo as it stands, grounded in specific files/lines.

**Context that shapes priority:** the tournament is over and the site is now a frozen
archive (polling stopped, `results.json` is the record). So live-feed *resilience* matters
less than it did; **correctness of the permanent archive, maintainability, and accessibility
matter more**. Priorities below reflect that.

Legend: **P0** = correctness/trust risk · **P1** = high-value, low-risk · **P2** = polish/nice-to-have.

---

## 🔴 P0 — Correctness & trust

### E-1. No automated tests on the bracket-resolution engine
The genuinely hard, correctness-critical logic has **zero test coverage**:
- `computeStandings()` with full FIFA tie-breakers incl. the head-to-head mini-league
  (`schedule.js`) — the exact code most likely to have a subtle ordering bug.
- Feeder/slot resolution (`1A`, `2B`, `3rd`, `W74`, `L101` → real teams) in `knockout.js`.
- The ET→UTC kickoff parser `parseET`/`koUtc` (`feed.js:22-31`) — hand-rolled AM/PM
  math with `+4` hardcoded for the ET→UTC offset (no DST handling; the tournament spans
  a DST-stable window, but the assumption is undocumented and untested).
- ESPN/openfootball → internal-shape mapping (`feed.js` `mapEspn`/`mapOpenfootball`),
  including the "nearest kickoff within 8h" knockout-matching heuristic (`feed.js:100`).

`BACKLOG.md` NEXT-6 already *wishes* for this ("Automated test: every feeder … resolves").
**Action:** add a minimal, zero-dependency test harness (Node's built-in `node:test` +
`assert`, no framework needed for a no-build project). Start with:
1. A crafted group where H2H must override GD/seed → assert final order.
2. A full `results.json` replay → assert all 104 feeders resolve to valid teams, no `TBD`
   leaks, champion = Spain.
3. `parseET` table test (`12a`, `12p`, `3p`, `4:30p`, midnight rollover).

### E-2. Validate the retrospective datasets against the frozen archive
`incidents.js`, `argentina.html`, and `controversies.html` cite scores, rounds, and match
numbers that must agree with `results.json`. Nothing enforces this — a manual edit to one
can silently drift. This is exactly `BACKLOG.md` **F1**, and it's a *credibility* issue for
pages whose whole point is "tested against primary data."
**Action:** a small script that asserts every incident's `matchNum`/score/date matches
`results.json`; run it in CI (see E-3). Fail the build on drift.

### E-3. No CI — nothing runs on push
There's no `.github/`, no CI, so tests (E-1, E-2) and link/HTML checks never run
automatically.
**Action:** one GitHub Actions workflow that, on push/PR: runs the tests, runs a static
HTML validator + internal-link check, and (optionally) validates `results.json`/`overrides.json`
against a JSON schema. GitHub Pages deploy already exists; gate it on the workflow passing.

---

## 🟠 P1 — Maintainability & repo hygiene

### E-4. Manual cache-bust versioning has already drifted
Every page hand-bumps `?v=N` on assets, and they're **already inconsistent**:
`schedule.js?v=2` in [index.html:71](index.html) but `schedule.js?v=3` in
[controversies.html:294](controversies.html). A wrong/stale number ships old code to
returning visitors — a real, silent bug class. The README even documents the manual
bump-after-edit ritual, which means it *will* keep drifting.
**Action:** stamp one version automatically. Cheapest option that preserves "no build step":
a tiny `stamp.mjs` (or a pre-commit hook / CI step) that rewrites every `?v=` to a single
content hash or a shared constant across all HTML. Even a one-line `sed` script beats manual.

### E-5. Duplicated logic across files (DRY)
- **ICS generation** is implemented twice — `app.js:285` and `knockout.js:817` both build
  the same `BEGIN:VCALENDAR` block. Two copies to fix when the format changes.
- **HTML-escape / string helpers**: `esc()` in `knockout.js:369`, a separate `norm()` in
  `feed.js:20` — each page re-defines its own.
- **`poster.html` vs `poster-vertical.html`**: ~360 of ~925 lines differ (≈40%) — the rest
  is copy-paste that must be kept in sync by hand.
**Action:** extract a shared `util.js` (esc, `parseET`/`koUtc`, ICS builder, code
normalization) loaded by every page. For the posters, generate both variants from one
template + a layout flag rather than maintaining two near-copies.

### E-6. No `package.json` / dev tooling
No manifest, so no pinned dev deps, no `npm test`, no lint/format config (no ESLint,
no Prettier, no `.editorconfig`). The runtime stays dependency-free (good), but *development*
has no guardrails — style is enforced by hand across 6k+ lines.
**Action:** add a `package.json` with **dev-only** scripts (`serve`, `test`, `lint`,
`stamp`) and ESLint + Prettier + `.editorconfig`. Ship nothing to the client — the site
stays a no-build static app; this is purely the contributor toolchain.

### E-7. Subresource Integrity (SRI) on CDN scripts
`html2canvas` and `jsPDF` load from a CDN on demand with no `integrity`/`crossorigin`
attributes — a supply-chain exposure (a compromised CDN could inject script into the export
path). 
**Action:** pin exact versions and add SRI hashes, or vendor the two libraries locally
(they're only pulled on the download click, so bundle size at load is unaffected).

---

## 🟡 P2 — Accessibility, performance, polish

### E-8. Accessibility pass (target WCAG 2.1 AA)
Some good habits are already present (decorative orbs `aria-hidden`, `aria-label`s on the
theme/lang buttons). Gaps to close:
- **Async content isn't announced.** The bracket loads into `#kapp` with a hardcoded-color
  placeholder ([index.html:59](index.html)) and no `role="status"`/`aria-live`, so screen
  readers get silence then a full swap. The live-era **goal alerts** likewise need an
  `aria-live="assertive"` region.
- **Modal focus management.** The match-detail modal should trap focus, set `aria-modal`,
  and restore focus to the trigger on close (Esc handling exists at `knockout.js:908`).
- **Reduced motion.** Confetti, goal-flash, hover-tilt, and the ambient orbs should honor
  `@media (prefers-reduced-motion: reduce)`.
- **Contrast.** Verify the "Matchday Fiesta" palette (and the placeholder `#9aa6cf` on cream)
  against AA — the playful theme is exactly where contrast slips.

### E-9. Fetch resilience in the data layer (lower priority now, but cheap)
`WC_FEED.load()` (`feed.js:206`) has no timeout/abort — a hung ESPN request never falls
through to openfootball. There's also a **synchronous XHR at parse time** in the posters
(per README/`BACKLOG.md` NEXT-5) which blocks rendering and is a deprecated pattern.
**Action:** wrap fetches in `AbortController` + timeout so fallback actually triggers;
replace the sync XHR with an async load + a "loading" state. (Priority is P2 only because
the archive rarely hits the network now.)

### E-10. Asset & metadata cleanup
- **Orphan asset:** `og-image.png` (443 KB) isn't referenced anywhere — only `og-image.jpg`
  is used in `index.html`/`chart.html`. Delete it (repo weight + confusion).
- **Structured data:** consider JSON-LD (`SportsEvent`/`ItemList`) for the archive — cheap
  SEO win for a results-archive site.

### E-11. Split the 1,187-line `knockout.js`
It's a single IIFE doing i18n, rendering, bracket resolution, the funnel, the modal, alerts,
and polling. It works, but it's the file most likely to grow and the hardest to test in
pieces. Once E-6 (tooling) lands, splitting into `render / resolve / i18n / feed-glue`
modules (still concatenated or ES-module-loaded, no bundler) would make E-1's tests far
easier to target.

---

## Suggested order of work
**E-4** (stop shipping stale assets — fastest win) → **E-6** (tooling foundation) →
**E-1 + E-2 + E-3** (tests + dataset validation + CI, the trust core) →
**E-5 / E-7** (dedupe + SRI) → **E-8** (a11y) → the rest.
