# WorldCup2026Charts — Feature Backlog

_Last updated: 2026-06-29. The **Live Knockout Hub** (Epic 1) is now shipped — see
"Done" below. This backlog now reflects the new direction: the group stage is over, so the
priority is the live knockout view and a real data feed, not the print posters._

## ✅ Done — "Matchday Fiesta" visual redesign
The whole web interface was reskinned from the dark "midnight" look to a bright, playful
**sticker-album** theme (per owner: "do something really fun and creative, not dark"):
- Warm cream paper background + confetti-dot texture + soft sunny colour blobs.
- Deep grape ink text; candy energy palette (hot pink / tangerine / sunshine / sky / mint).
- Everything is a **sticker**: white cards with a 2px ink outline, a hard offset drop-shadow,
  chunky rounded corners and a cheeky tilt on hover. Candy gradient buttons & active tabs;
  tilted number-stickers for stats and the survival funnel.
- Bright is now the **default** (`data-theme="light"`); a rich indigo **"night match"** variant
  remains behind the ◑ toggle. The page theme is decoupled from the poster's colour scheme, and
  the poster preview now defaults to its light (printer-friendly) palette.
- All in `app.css` (tokens + components) + `knockout.css`; no markup churn. Verified across the
  landing hero/builder/features/cities and the hub (Overview/Groups/R32), light + night.

## ✅ Done — Live Knockout Hub (`knockout.html`)
A screen-first, real-time companion to the print poster.
- **One tab per round** — Overview · Round of 32 · Round of 16 · Quarterfinals · Semifinals ·
  Final (+ 3rd place).
- **Bracket resolution engine** (`knockout.js`): group slots (`1A/2B/3rd`) and feeders
  (`W74/L101`) resolve to real teams as matches finish; eliminations cascade round to round.
  Best-8 third-place ranking + same-group-avoidance pairing.
- **"Great graphic format" match cards** — flags, score, winner highlighted gold with ▶,
  loser dimmed + struck through with ✕, LIVE pill with pulsing minute, FT/AET/PENS, upcoming
  countdown, venue + local kickoff time, penalties line.
- **"Still standing" rail** — remaining teams vs eliminated (greyed), live count.
- **Survival funnel** — 48 → 32 → 16 → 8 → 4 → 2 → 1, current stage highlighted.
- **Real-time** — reads `results.json`, polls every 30 s + on tab focus + manual refresh.
  Times shown in the viewer's own timezone. Dark/light + mobile responsive. Verified: editing
  `results.json` flips a match to FT/LIVE and re-resolves the whole bracket on refresh.
- `results.json` is **sample data** (full group stage + a partial R32, `source:"sample"`).
  Schema: `results[matchNum] = {h,a,status,minute?,pen?:[h,a]}`, `updated`, `source`;
  `status: FT|AET|PENS|LIVE|HT|UPCOMING`.

### ✅ Also done — LIVE FEED wired (openfootball)
- **`feed.js`** pulls real results from the **openfootball** public-domain dataset
  (`cdn.jsdelivr.net/gh/openfootball/worldcup.json` → raw GitHub fallback). No API key,
  CORS-enabled, fetched **client-side** (the site stays static). It shares this app's exact
  draw, so groups map by team pair and knockout matches map by `num`.
- Verified live: pulls all 72 group results + played R32 matches; resolves the bracket from
  real standings (e.g. South Africa eliminated by Canada in R32 #73). Brazil v Japan now shows
  its **true** state (upcoming/where applicable), fixing the original wrong-FT complaint.
- **Honest labelling:** a cyan **NEAR-LIVE** badge + a banner crediting openfootball and noting
  it's community-maintained, ~daily, **not in-match live**, "verify against official sources."
- **Graceful fallback:** if the feed is unreachable it falls back to the bundled `results.json`
  sample (SAMPLE badge). `?data=sample` forces the sample for testing.
- **Accuracy: knockout matchups now come from the feed, not a guess.** When openfootball has
  confirmed a KO match's real teams, the hub uses those directly (overriding our third-place
  heuristic). KO teams we still derive ourselves are labeled **“projected”** (orange tag);
  unknown ones stay **TBD**. So nothing fabricated is shown as confirmed.
- **Clear data banner** shows two timestamps — **“You last refreshed”** (this page) and
  **“Source data last updated”** (openfootball's commit time) — plus the feed's limitations
  (not in-match live; volunteer-entered; can lag/err; verify against official sources). Sample
  fallback is labeled “illustrative placeholders — NOT real results.”
- **Owner overrides (`overrides.json`)** overlay the feed for matches it hasn't recorded yet
  (e.g. a match that just finished). Tagged **✎ manual** on the card + noted in the banner;
  advances the "as of" clock so validation stays consistent. Remove an entry once the feed
  catches up. (Used to record e.g. Brazil 2–1 Japan immediately.)
- **Decision (per owner): free feeds only; refresh delays are acceptable.** No paid providers.
  openfootball (near-live, ~daily) is the intended steady-state feed.
- **Comprehensive `README.md`** shipped — non-tech usage guide + full build/architecture docs.

### ✅ Also done — data freshness, fresh pull & validation
- **Fresh pull / "Refresh data"** — a hard, cache-busted re-fetch with a busy spinner + toast
  on the Hub, and a **Refresh** button in the new home-page freshness strip.
- **"Last data pull" indicator** on the **home page** (hero) and the Hub: shows the pull time,
  relative age, and a **SAMPLE DATA / LIVE DATA / STALE** badge so users always know whether the
  data is live. (Directly answers "showcase when the last data pull happened.")
- **Validation pass** — flags matches whose status contradicts the clock, e.g. *"#76 marked FT
  but should still be in play"* (the Brazil v Japan bug). Failed checks show a warning banner +
  a ⚠ on the offending card. The "as-of" clock is now the data-pull time (`updated`), not a
  `max(realNow, updated)` hack, so sample data can no longer silently look "finished".
- Assets are now versioned (`?v=2`) for cache-busting on deploy.

---

## ▶ Where to work next (recommended order)

### NEXT-1 — Strengthen the FREE feed (P2) — no paid providers
Owner decision: **free feeds only, refresh delays are fine.** openfootball stays the primary
feed. Optional, low-effort robustness within that constraint:
- [ ] **Faster freshness, still free:** a GitHub Action cron in this repo that re-commits
  openfootball's JSON (or a thinned `results.json`) every N minutes, so the page reads our own
  copy and isn't subject to upstream CDN caching. Pure free-tier, keeps the site static.
- [ ] **Optional second free source for redundancy:** TheSportsDB free tier, or worldcup26.ir
  (free, but needs a JWT register + is a hobby project) — only if openfootball ever goes stale.
  Layer it as a fallback in `feed.js`; don't replace openfootball.
- [ ] Show "next expected update" hint so users know the cadence (e.g. "openfootball refreshes
  ~daily").

### NEXT-2 — Make the Hub the live home during the tournament (P1)
- [x] **Done — Clickable survival funnel:** every stage in the 48→1 funnel jumps to its tab
  (Groups, R32 … Final), so it doubles as quick navigation.
- [x] **Done — Goal scorers** on match cards: `feed.js` captures `goals1`/`goals2` (name, minute,
  OG/penalty flags); `knockout.js` orients them to home/away and renders a ⚽ scorer line per
  side. Verified (e.g. R32 #73 shows "Eustáquio 90+2'"). Compact Overview cards omit them.
- [x] **Done — Scroll preservation:** background refreshes (5-min poll / tab-refocus) no longer
  jump the page to the top — `loadData` restores the scroll position around the re-render.
- [ ] **"Today" / match-day strip** at the top of Overview: today's fixtures with live scores
  and next kickoff countdown.
- [ ] **Goal-flash micro-animation** when a score changes between polls (diff the old/new state).

### NEXT-3 — Correct the knockout qualification logic (P1, accuracy)
- [x] **Done — Head-to-head tiebreakers** in `computeStandings()` (`schedule.js`): full FIFA
  order — Pts → GD → GF overall, then a head-to-head mini-league (Pts → GD → GF among teams
  tied on all three), then seed as a stand-in for fair-play/lots. Verified with a crafted tie
  where H2H correctly overrides seed order. Applies to the Hub, the Groups tab, and the poster.
- [x] **Done — Groups tab in the Hub** (`knockout.js` `groupsView`): all 12 groups with live
  standings (P/W/D/L/GF/GA/GD/Pts), qualification colour-bands (top-2 through, best-8 thirds in
  amber, others out), per-group fixtures with scores, and a legend. Dark/light + mobile verified.
- [ ] **Official third-place assignment table.** Current pairing is a provisional best-effort
  (documented in `knockout.js`). Lower priority now that the feed confirms real R32 matchups, but
  matters before the feed catches up. Replace with FIFA's official 8-of-12 slot table.

### NEXT-4 — Hub polish & delight (P2)
- [x] **Done — "Path to glory":** click any team (a still-standing chip or a team row on a card)
  to track it — its matches glow gold and everything else dims, across *every* tab, with a
  "Tracking X" bar and a clear button. Verified it persists tab-to-tab (e.g. Canada → R16 #90).
- [ ] **Timezone selector** on the Hub (reuse the poster's TZ list) — today it uses the
  browser's zone only.
- [ ] **Mini visual bracket** on Overview (connected lines) in addition to the per-round tabs.
- [ ] **Share/short-link a team or round**; **add-to-calendar for knockout matches** (now
  possible since opponents resolve — the poster's ICS skips them today).
- [ ] **Champion celebration state** when match #104 resolves (confetti / trophy moment).

### NEXT-5 — Feed the print poster from the same data (P2)
- [x] **Done:** the builder (`app.js` → `initPosterLiveData`) now pulls the live feed + overrides
  and passes `&results=` + `&koteams=` to both posters, so the printable chart shows live group
  scores/standings and **real Round-of-32 names + scores** (not slot placeholders). Applies to
  `poster.html` and `poster-vertical.html`; PDF/PNG/print inherit it. Feed-or-nothing (never
  prints the fictional sample) so a downloaded chart can't show fake scores.
- [ ] Optional next: show resolved scores inside the top group-stage *grid* cells too (today
  scores live in the bottom group boxes + the R32 cells); highlight favourites in resolved R32.

### NEXT-6 — Data integrity & trust (P2/P3)
- [ ] **Verify the schedule** against official FIFA fixtures (times, venues, channels).
- [ ] **Automated test**: every feeder (`W##/L##`) and slot (`1A..3rd`) resolves to a valid
  match/group; bracket wiring has no typos.
- [ ] **Timezone/DST edge tests** for the kickoff parser around midnight rollovers.
- [ ] More languages (FR/PT) — i18n scaffolding already exists.

---

### Suggested next sprint
**NEXT-1 (real feed)** → **NEXT-3 (correct qualification logic)** → **NEXT-2 (match-day home +
goal flash)**. That turns the Hub from "live with sample data" into "the thing you leave open
on a second screen during every match."
