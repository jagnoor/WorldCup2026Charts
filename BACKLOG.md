# WorldCup2026Charts — Feature Backlog

_Last updated: 2026-07-20. **The tournament is over** (Spain 1–0 Argentina aet, Jul 19).
The site has pivoted from live tracker to permanent archive — see "Retrospective era" below._

## ✅ Done — Retrospective era (2026-07-20)
The day after the final, the site became a permanent archive:
- **Retrospective mode** (`knockout.js`): when every match is decided the hub re-brands itself —
  "The 2026 Retrospective" hero, "🏆 Spain are World Champions" status, the funnel rests on
  CHAMPION = 1, the default tab is the full-bracket Overview, and the 60-second background
  polling stops (results are final). All match/round/group archives stay fully browsable.
- **Frozen results archive** (`results.json`): the old fictional sample was replaced with a real
  snapshot of all 104 final results + KO pairings + scorers (ESPN, taken 2026-07-20,
  `source:"archive"`). The hub shows a "🏁 FINAL RESULTS · ARCHIVE" badge and an honest caveat;
  the wall-chart builder now also falls back to this archive (it still refuses `source:"sample"`),
  so the site keeps working even if the remote feeds disappear.
- **The Whistle Ledger** (`argentina.html`): a standalone retrospective report on the tournament's
  biggest controversy — Argentina and the officiating. All eight matches, every contested call,
  weighted and tested. v2 closes every open data cell with ESPN primary data (boxscores +
  timelines) — which **corrected** the widely-shared "1 card per 19.7 fouls" leniency claim to
  12.2 through the QF / 8.7 full-tournament (≈ the 9.5 field rate; opponents 8.9). The
  discretionary-call ledger (8/10 contested calls favoring Argentina) stands. Verdict unchanged:
  benefit of the doubt on judgment calls — yes; demonstrable orchestration — no. Linked from a
  "Retrospective reads" panel on the hub Overview.

## ✅ Done — Knockout-first pivot (2026-07-01)
The group stage finished, so the site was re-centred on the live bracket:
- **The live hub is now the home page** (`index.html`). The old wall-chart builder moved to
  `chart.html` (demoted, reframed as a printable *keepsake*), and `knockout.html` is now a tiny
  redirect stub so old links keep working. Canonicals, OG/Twitter tags and `sitemap.xml` updated.
- **Opens on the current round** — the hub lands on the live round (R32 now) instead of Overview,
  via `defaultTab()` (group stage → Groups; else the first undecided knockout round).
- **"Today" strip** — a pinned row at the top of the hub with every match kicking off today
  (live score or countdown), in the viewer's zone; falls back to the next match-day. *(closes NEXT-2)*
- **Fully bilingual hub** — an EN/ES toggle + a complete i18n layer in `knockout.js` (hero, tabs,
  funnel, pills, Today strip, data banner, disclaimers, match-detail modal, relative times). The
  builder was already bilingual. *(advances NEXT-6 "more languages" scaffolding)*
- **Bracket-themed social image** — `og-image.jpg` (1200×630) rendered for the new home page;
  the poster pages retitled "Wall Chart" and their bracket heading is now "THE ROAD TO THE FINAL".

## ✅ Done — Live moments, match detail & visual bracket
- **Goal-flash + live alerts:** each poll diffs the previous results vs. the new ones; on a score
  change the card flashes gold and a stacked **"⚽ GOAL! France 3–0 Sweden"** alert pops (full-time
  alerts too). Suppressed when the tab is backgrounded. **Champion confetti + banner** fire once
  when match #104 resolves. (`knockout.js`: detectChanges / announce / celebrateChampion / confetti.)
- **Tap-to-expand match detail:** click any match (card *or* bracket node) → a modal fetches
  ESPN's per-game **summary** (`feed.js summary()`) and renders **stat bars** (possession, shots,
  on-target, corners, fouls, cards) + a **goals/cards/subs timeline**. Falls back to our scorers if
  ESPN has no detail. (`knockout.js`: openDetail / renderSummary; `feed.js` stores the ESPN event id.)
- **Mini visual bracket on Overview:** a mirrored R32→Final→R32 bracket (winners in gold, resolved
  teams flowing forward, TBD as feeders, Final centered & gold). Each node now carries the **date &
  time**. Clickable → detail; integrates with path-to-glory dimming. (`knockout.js`: miniBracket / bnode.)
- **Round tabs are a left/right grid** (`kround-cols`): each round splits into the two halves of the
  draw, side by side in bracket order (R32 = 8+8, R16 = 4+4, …); the Final tab stays centred.

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

### ✅ Also done — REAL-TIME feed wired (ESPN, with openfootball fallback)
- **`feed.js` now tries ESPN first** — `site.api.espn.com/.../soccer/fifa.world/scoreboard`
  (date-ranged for the whole tournament). It's **free, no API key, CORS-enabled** (read straight
  from the browser, no backend) and **truly live**: in-match scores, the live **minute**, and
  **goal scorers**, plus FT/AET/PENS. ESPN's 3-letter codes map 1:1 to ours (only `CUW→CUR`);
  group matches map by team pair, knockouts by nearest kickoff time.
- **openfootball stays as the fallback** if ESPN is unreachable; sample is the last resort.
  Source badge shows **● LIVE · ESPN** (green) vs NEAR-LIVE (openfootball) vs SAMPLE.
- The hub now **polls every 60s** (was 5 min) since the feed is live. Manual overrides are now
  rarely needed (ESPN carries live scores directly) — `overrides.json` shipped empty.
- Verified live: France 3–0 Sweden with scorers; Ivory Coast 1–2 Norway FT (which openfootball
  hadn't even posted) — both straight from ESPN, no key, no server.
- **Live pill shows the HALF (1st/2nd), not an exact minute.** ESPN's soccer clock estimates the
  minute from elapsed wall-clock time (it doesn't subtract half-time), so it runs a few minutes
  ahead — we surface the reliable period instead and explain it in the caveat + a tooltip. The
  score, scorers and live/finished state are accurate; an owner-entered minute still wins.

### ✅ Earlier — LIVE FEED wired (openfootball)
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
- **Real-clock kickoff state (fix):** countdowns and "has it started?" now use the **real clock**,
  not the feed's (often hours-stale) timestamp — so a match that has actually kicked off never
  shows a future countdown. A new **`awaiting`** state shows such matches as **IN PLAY** (within
  ~135 min of kickoff) or **AWAITING** (kicked off, feed yet to post), counted as "live" in the
  header, surfaced first in "up next", and explained in the caveat ("In play now: N matches…").

---

## ▶ NEXT EPOCH — "The Reckoning": the officiating retrospective (researched 2026-07-21)

**The data is gathered** (`incidents.js`): 20 cross-verified incidents across 17 matches — every
contested call of the tournament with beneficiary, victim, weight, and *attributed* expert
verdicts (SI's ranked 13, The VAR Verdict's 10 with correct/incorrect reads, ESPN's VAR review,
Fox's officiating experts, AP, Al Jazeera) — plus the objective counted layer for all 48 teams
(fouls, cards, penalties from ESPN boxscores, all 104 matches). Every match context was
cross-checked against our frozen archive; several outlets' round labels were corrected in the
process (Balogun was R32 #81, Kane R32 #80, Gvardiol R32 #83).

**What the research actually shows** (the story the pages must tell):
1. **The narrative chased Argentina; the counted record points elsewhere.** Argentina's card
   rate matched the field (8.7 fouls/booking vs 8.6 avg). The *champion*, Spain, was the most
   leniently-carded deep-run team (16.8 — incl. 21 fouls, 0 cards in the final), and Norway the
   most lenient overall (19.3). Nobody wrote that story.
2. **Egypt is the tournament's clearest victim** — hardest-carded team of all 48 (4.9
   fouls/booking), 0 penalties won / 2 conceded, and the two heaviest contested calls of the
   R16 both against them (Zico goal, Fathy penalty) in one match.
3. **Argentina still leads the contested-call ledger** (+11 net weighted benefit; 8/10 calls
   their way) — but the two heaviest were rated protocol-correct by some experts and wrong by
   others. The verdict genuinely splits, and the final flipped the pattern (correct red against,
   wrongly-disallowed Spain goal notwithstanding — Argentina lost).
4. **The worst wounds were institutional, not on-field**: the Balogun ban suspended after
   presidential pressure (UEFA: FIFA "crossed a red line"), the Artan visa denial, the
   all-Argentine crew appointment, cable-gate's unresolved optics.

### Design doctrine — "a masterclass in visual storytelling" (applies to every epic below)
- **Two visual grammars, never mixed:** counted facts = solid fills; contested opinions =
  outlined/hatched marks with attribution chips. The reader should *see* the epistemic
  difference before reading a word.
- **Progressive disclosure:** headline → chart → incident cards → expert verdicts → sources.
  One idea per screen; depth on demand. No wall-of-table openings.
- **Show the sensitivity, not just the answer:** the benefit/burden chart ships with a
  definition toggle (strict = only expert-rated-incorrect calls · standard = all contested ·
  expansive = incl. factual/institutional). Conclusions that survive all three are presented
  as findings; ones that don't are presented as "depends what you count" — on screen.
- **Harsh truths get stated plainly** ("Egypt paid the most. Spain was carded least. The
  ledger leaned Argentina's way and it still wasn't enough.") — then immediately sourced,
  weighted, and counter-argued. Verdict language stays attributed, never editorial-voice.
- Same no-build stack; sober "ink" editorial sub-theme (à la Whistle Ledger) for retro pages,
  fiesta theme stays on the archive hub.

### EPIC A — The Decision Ledger page (P1) `controversies.html` — ✅ SHIPPED 2026-07-21
- [x] A1. `incidents.js` dataset (20 incidents, 48-team counted layer).
- [x] A2. **Timeline**: one card per incident grouped by stage — match chip, beneficiary→victim
      line with flags, weight dots, verdict badge (RATED CORRECT/INCORRECT/EXPERTS SPLIT/
      FACTUAL/UNRESOLVED), per-outlet expert reads on expand. Filters (stage · team · type ·
      verdict), deep-linkable (#incident-id). Two visual grammars enforced: counted = solid,
      contested = dashed.
- [x] A3. **Hub integration**: match modal shows "⚖️ Contested calls" chips (deep-linked) for
      the 17 affected matches; Decision Ledger leads the Retrospective-reads panel. EN/ES chips.

### EPIC B — Benefit & Burden (P1) — ✅ SHIPPED inside controversies.html
- [x] B1. **Diverging chart** (weighted net benefit per team) with the three-way definition
      toggle (strict / standard / expansive) re-sorting live; auto-generated reading line.
- [x] B2. **Discipline table**: fouls-per-booking for all 48 teams (bar-in-table, field-average
      marker, ESP/NOR/ARG/EGY highlighted, top/bottom collapsed view) + the confound panel
      displayed adjacent, not hidden.
- [x] B3. **Findings cards**: the 4 harsh-truth cards, each claim → evidence → falsifier.
      (Per-card OG images deferred to E3.)

### EPIC C — Match retrospectives (P2) — Whistle-Ledger-style standalone pages
- [ ] C1. ARG–EGY R16 #95 (the loudest one; partially covered by argentina.html — extract to
      its own page with Egypt's side centered).
- [ ] C2. USA–BIH R32 #81 + the ban saga (on-field call + institutional timeline in one page).
- [ ] C3. GER–PAR R32 #74 (SI's #1 call + shootout heartbreak).
- [ ] C4. NOR–ENG QF #99 (cable-gate: claim vs FIFA sensor data, unresolved verdict done right).
- [ ] C5. The Final #104 (already half-told in argentina.html — a neutral-voice version).
- [ ] C6. Cross-links: each page ↔ ledger ↔ archive match modal.

### EPIC D — The institutional record (P2) `governance.html`
- [ ] D1. Timeline page: Artan visa denial → Balogun ban suspension (UEFA quote) → Infantino
      commentary → crew appointments → VAR-officials-to-stadiums → ticket-price subpoena.
      Strictly sourced, quote-first, zero speculation.

### EPIC E — Storytelling polish (P3)
- [ ] E1. "How the Cup was won" scroll replay (bracket animates round by round, incidents pinned).
- [ ] E2. ES translations of all retrospective pages (hub i18n already exists).
- [ ] E3. Per-finding OG images; `og:image` per retro page.
- [ ] E4. Sensitivity widget embedded in argentina.html (reuse B1 with ARG pre-filtered).

### EPIC F — Data integrity (P3)
- [ ] F1. Validation script: every incident's match/score/date against results.json (drift check).
- [ ] F2. "Corrections cut both ways" page listing every media error we corrected (Jordan foul
      inversion, 19.7 leniency figure, round mislabels) — the site's credibility flex.
- [ ] F3. Complete the two open cells: tournament penalty base rate; final VAR-intervention totals.

---

## ▶ Where to work next (pre-retrospective backlog, superseded items pruned)

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
- [x] **Done — "Today" / match-day strip** (2026-07-01): pinned at the **top of the whole hub**
  (all tabs), today's fixtures with live score or countdown in the viewer's zone; "Next up"
  fallback when nothing is on today. (`knockout.js` `todayStrip`/`todayChip`; `knockout.css` `.ktoday`.)
- [x] **Done — Goal-flash micro-animation** (see "Live moments" above; each poll diffs old/new).

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
- [x] **Done — Timezone selector on the Hub** (2026-07-01): a 🌐 picker in the header with a
  curated IANA list (host + participating-nation zones + UTC); persisted to `localStorage` and
  applied to every kickoff, the "Today" strip (including which matches count as *today*), the mini
  bracket, and the data-freshness timestamps. Defaults to the device zone. (`knockout.js`
  `TZONES`/`tzo()`/`tzControl()`; `knockout.css` `.ktz`.)
- [ ] **Mini visual bracket** on Overview (connected lines) in addition to the per-round tabs.
- [x] **Done — Add-to-calendar for knockout matches** (2026-07-01): a "📅 Add to calendar" on
  each match-detail modal (single match) and "📅 Add round to calendar" on every round tab. The
  `.ics` uses the **resolved** team names + score, venue and UTC kickoff. (`knockout.js`
  `downloadMatchesICS`.)
- [ ] **Share/short-link a team or round** (the hub already deep-links tabs via `#hash`; add a
  copy-link for a tracked team / round).
- [ ] **Champion celebration state** when match #104 resolves (confetti / trophy moment).

### NEXT-5 — Feed the print poster from the same data (P2)
- [x] **Done:** the builder (`app.js` → `initPosterLiveData`) now pulls the live feed + overrides
  and passes `&results=` + `&koteams=` to both posters, so the printable chart shows live group
  scores/standings and **real Round-of-32 names + scores** (not slot placeholders). Applies to
  `poster.html` and `poster-vertical.html`; PDF/PNG/print inherit it. Feed-or-nothing (never
  prints the fictional sample) so a downloaded chart can't show fake scores.
- [x] **Done — Keepsake mode (2026-07-21):** both posters now show the **final score in every
  cell** — group grid cells (score replaces "v", winner in bold), every knockout round resolved
  via the archive (score + winner bold + shootout line), and the bottom group-box fixtures.
  **Kickoff times, TV channels and the vertical poster's write-in score boxes are removed**
  once a result is known — the keepsake records who won, not when it kicked off. The header
  swaps "All times ET | FOX/FS1" for "Final results | Champions: Spain 🏆". Posters opened
  with no URL params now self-load the frozen archive (sync XHR at parse time), so the
  keepsake is always complete.

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
