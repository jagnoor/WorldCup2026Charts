# WorldCup2026Charts — Feature Backlog

_Last updated: 2026-06-29. The **Live Knockout Hub** (Epic 1) is now shipped — see
"Done" below. This backlog now reflects the new direction: the group stage is over, so the
priority is the live knockout view and a real data feed, not the print posters._

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
- `results.json` is **sample data** (full group stage + a partial R32). Schema:
  `results[matchNum] = {h,a,status,minute?,pen?:[h,a]}`, `status: FT|AET|PENS|LIVE|HT|UPCOMING`.

---

## ▶ Where to work next (recommended order)

### NEXT-1 — Wire a real live-scores feed (P0, biggest leverage)
Right now `results.json` is hand-edited. Replace it with an automatically-updated feed so the
hub is truly live with zero manual work.
- [ ] Pick a source: a free football API (football-data.org / API-FOOTBALL / TheSportsDB) or
  a scheduled job that writes `results.json`.
- [ ] **Map provider fixtures → our match numbers** (1–104). The mapping is the real work; key
  by date + the two team codes.
- [ ] A tiny scheduled updater (GitHub Action on a cron, or a serverless function) that fetches
  scores and commits/serves `results.json`. Keeps the site fully static.
- [ ] Surface feed health on the page (stale-data badge if `updated` is old).

### NEXT-2 — Make the Hub the live home during the tournament (P1)
- [ ] **"Today" / match-day strip** at the top of Overview: today's fixtures with live scores
  and next kickoff countdown.
- [ ] **Auto-advance the active tab** to the current round (deep-link still wins).
- [ ] **Goal-flash micro-animation** when a score changes between polls (diff the old/new state).
- [ ] **Per-match detail** popover (scorers/cards) if the feed provides it.

### NEXT-3 — Correct the knockout qualification logic (P1, accuracy)
- [ ] **Official third-place assignment table.** Current pairing is a provisional best-effort
  (documented in `knockout.js`); replace with FIFA's official slot table for the exact 8-of-12
  combination so R32 third-place matchups are correct.
- [ ] **Head-to-head tiebreakers** in `computeStandings()` — it explicitly skips them today
  (noted in `schedule.js`); add the full FIFA tiebreak order so 1st/2nd/3rd are exact.
- [ ] **Group-stage live view inside the Hub** (a "Groups" tab) so it's a complete tracker, not
  just knockouts — reuse `computeStandings()` + the live feed.

### NEXT-4 — Hub polish & delight (P2)
- [ ] **Timezone selector** on the Hub (reuse the poster's TZ list) — today it uses the
  browser's zone only.
- [ ] **"Path to glory"** — click a team to highlight its full route across every round tab
  (Overview already highlights its cards; extend across tabs).
- [ ] **Mini visual bracket** on Overview (connected lines) in addition to the per-round tabs.
- [ ] **Share/short-link a team or round**; **add-to-calendar for knockout matches** (now
  possible since opponents resolve — the poster's ICS skips them today).
- [ ] **Champion celebration state** when match #104 resolves (confetti / trophy moment).

### NEXT-5 — Feed the print poster from the same data (P2)
- [ ] Point `poster.html` / `poster-vertical.html` at `results.json` (today they only read
  `?results=` / `window.WC_RESULTS`) so KO cells and bracket show live scores + resolved teams.
- [ ] De-prioritized per your steer: the **24×36 vertical print** is lowest priority now.

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
