# WorldCup2026Charts

**A free, beautiful, printable wall chart and a live knockout tracker for the 2026 FIFA World Cup.**

The 2026 World Cup is the biggest in history — 48 teams, 104 matches, 16 cities, three host
nations (Canada · Mexico · USA), spread across every North American time zone. This project turns
all of that into two things any fan can use:

1. **A wall chart you can build and print** — every match in *your* time zone and *your* language,
   with group standings, the knockout bracket and TV channels, ready to download as a PDF/PNG or
   pin to your wall.
2. **A live "Road to the Final" knockout hub** — a screen-first, always-current view of the Round
   of 32 through the Final that shows who has advanced, in real time, pulled from a free public
   data feed.

It is a 100% static website — plain HTML, CSS and JavaScript with **no build step, no framework
and no backend** — so it loads instantly and can be hosted for free on GitHub Pages.

> **Live site:** https://jagnoor.github.io/WorldCup2026Charts/
> **Live bracket:** https://jagnoor.github.io/WorldCup2026Charts/knockout.html

---

## Table of contents

- [What you can do with it](#what-you-can-do-with-it)
- [A guided tour (for everyone)](#a-guided-tour-for-everyone)
  - [1. Build your wall chart](#1-build-your-wall-chart)
  - [2. Download, print, or add to your calendar](#2-download-print-or-add-to-your-calendar)
  - [3. Follow the knockouts live](#3-follow-the-knockouts-live)
  - [4. Reading the data banner (important)](#4-reading-the-data-banner-important)
- [How the data works (and how we keep it honest)](#how-the-data-works-and-how-we-keep-it-honest)
- [How it was built (for the technically curious)](#how-it-was-built-for-the-technically-curious)
  - [Design principles](#design-principles)
  - [The big picture](#the-big-picture)
  - [File-by-file](#file-by-file)
  - [The bracket resolution engine](#the-bracket-resolution-engine)
  - [The live feed adapter](#the-live-feed-adapter)
  - [Accuracy safeguards](#accuracy-safeguards)
- [Running it on your own computer](#running-it-on-your-own-computer)
- [Updating results yourself](#updating-results-yourself)
- [Deploying it (free hosting)](#deploying-it-free-hosting)
- [Accuracy, limitations & disclaimers](#accuracy-limitations--disclaimers)
- [Credits & license](#credits--license)

---

## What you can do with it

| Feature | What it means for you |
| --- | --- |
| 🕑 **Your time zone** | All 104 matches are converted from US Eastern to whichever of ~30 time zones you pick — with US (FOX/FS1) and UK (BBC/ITV) TV channels where relevant. |
| 🌎 **Two languages** | The whole experience is available in **English** and **Spanish**. |
| 🖨️ **Print-ready posters** | Letter, A3, a 24×16″ poster, or a tall 24×36″ vertical poster — download as **PDF** or **PNG**, or print straight from your browser. |
| 📊 **Live group standings** | The group tables fill in with wins/draws/losses, goal difference and points as results come in. |
| 🏆 **Live knockout hub** | A dedicated page with one tab per round (Round of 32 → Final) that shows who advanced, live scores, and upcoming kickoffs — refreshed automatically. |
| 📅 **Add to your calendar** | Export your favourite teams' group-stage fixtures as a standard `.ics` calendar file. |
| 🆓 **Free & private** | No sign-ups, no ads, no tracking, no cost. |

---

## A guided tour (for everyone)

You do **not** need to know anything about code to use this. Everything happens in your web
browser.

### 1. Build your wall chart

1. Open the site: **https://jagnoor.github.io/WorldCup2026Charts/**
2. Scroll to **"Build your wall chart."** On the left is a control panel; on the right is a
   **live preview** that updates the instant you change anything.
3. Set your preferences:
   - **Colour scheme** — *Dark* looks great on screen and as a poster; *Light* uses far less ink
     when printing at home.
   - **Time zone** — pick yours. US and UK zones also show the TV channel for each match. The site
     tries to guess your zone automatically.
   - **Paper size** — Letter or A3 for home printers; the 24×16″ or 24×36″ sizes for a big
     print-shop poster.
   - **Favourite teams** *(optional)* — tick any teams and they'll be highlighted throughout the
     chart, and you'll be able to export their matches to your calendar.
   - **Language** — English or Spanish.

### 2. Download, print, or add to your calendar

Once the preview looks right, use the buttons in the control panel:

- **Open poster** — opens the full-size chart in a new tab.
- **Print** — opens the chart and starts your browser's print dialog. Tip: choose *Landscape*,
  *Fit to page*, and enable **Background graphics** so the colours print.
- **Download PDF / PNG** — generates a high-resolution file right in your browser and downloads
  it. (Large posters take a few seconds — that's normal.)
- **Add to calendar** — pick one or more favourite teams first, then this downloads an `.ics`
  file you can import into Apple Calendar, Google Calendar or Outlook. Each match shows up in your
  own local time automatically.

### 3. Follow the knockouts live

Click **"Live bracket"** (top right) or **"🏆 Live knockout bracket"** in the hero, or go straight
to **`/knockout.html`**. This is *The Road to the Final*. You'll find:

- **A survival funnel** at the top — 48 → 32 → 16 → 8 → 4 → 2 → 1 — showing how many teams remain
  and which round we're in.
- **Tabs for every round** — *Overview · Round of 32 · Round of 16 · Quarterfinals · Semifinals ·
  Final*. Each round's page shows every match as a card with flags, score, kickoff time in your
  zone, and the venue.
- **Clear visual results** — the team that **advances** is highlighted in gold with a ▶; the team
  that's out is dimmed and struck through with a ✕. Live matches pulse; upcoming matches show a
  countdown.
- **A "Still standing" board** on the Overview tab — every surviving team's flag, with eliminated
  teams greyed out. Tap a team to highlight its matches.
- **A Refresh button** — the page refreshes itself every few minutes, but you can pull the latest
  data any time with **↻ Refresh data**.

### 4. Reading the data banner (important)

At the top of the live bracket there's a banner that always tells you **exactly where the numbers
come from and how fresh they are.** Please read it — it's there so you're never misled:

- **A coloured badge:**
  - 🟦 **NEAR-LIVE** — real results from the free community feed (see below).
  - 🟧 **SAMPLE DATA** — the live feed couldn't be reached, so you're seeing *illustrative
    placeholder* scores that are **not real**. (This is clearly stated.)
- **Two timestamps:**
  - **"You last refreshed"** — when *this page* last pulled data.
  - **"Source data last updated"** — when the underlying feed itself last changed.
- **The limitations**, in plain English: the feed is **not** an in-match live ticker; results are
  entered by volunteers and can lag by hours, so always double-check anything important against
  the official FIFA app or your broadcaster.
- **Manually added results** — if the site owner has hand-entered a result the feed hasn't caught
  up on yet (e.g. a match that *just* finished), the banner says so, and that match is tagged
  **✎ manual** on its card.

The guiding rule of this project: **never present a guess or a placeholder as if it were a
confirmed fact.** Confirmed results are shown plainly; anything we derived ourselves is labelled
**"projected"**; anything fake is labelled **"sample."**

---

## How the data works (and how we keep it honest)

There are three layers of match data, applied in order:

1. **The live feed (primary).** Real results come from
   [**openfootball/worldcup.json**](https://github.com/openfootball/worldcup.json) — a
   public-domain, community-maintained dataset on GitHub. It happens to use the *exact same draw*
   as this app (same 12 groups, same 48 teams, the same 104 match numbers), which makes it a clean
   fit. It's fetched **directly in your browser** over a CDN, so there's no server and no API key.
   - It is **near-live**, not in-match live: volunteers enter scores after matches, usually within
     a day. So expect refresh delays — that's by design and is clearly disclosed.
2. **Owner overrides (`overrides.json`).** When a match has just finished but the free feed hasn't
   recorded it yet, the site owner can hand-enter that result. Overrides are layered *on top of*
   the feed and are visibly tagged **✎ manual** so nobody mistakes them for automatic data.
3. **Bundled sample (`results.json`).** If the live feed can't be reached at all, the app falls
   back to a bundled snapshot so the page is never blank — and labels it unmistakably as
   **sample data / not real**.

This project deliberately uses **free feeds only**; refresh delays are an accepted trade-off.

---

## How it was built (for the technically curious)

### Design principles

- **No build step, ever.** Everything is hand-written HTML/CSS/JS that runs as-is. There's nothing
  to compile, bundle or transpile — you can open the files and read exactly what runs.
- **One source of truth for data.** The schedule lives in a single file (`schedule.js`) that every
  page reads, so there's no chance of the poster and the bracket disagreeing.
- **Static and free to host.** No backend, no database, no API keys. It deploys to GitHub Pages
  unchanged.
- **Honest by construction.** The UI distinguishes *confirmed*, *projected*, *manual* and *sample*
  data, and always shows when the data was last refreshed.

### The big picture

```
                    ┌──────────────────┐
                    │   schedule.js    │  104 matches, 48 teams, 16 venues,
                    │ (window.WC_SCHEDULE) │  standings calculator  ── single source of truth
                    └─────────┬────────┘
            ┌─────────────────┼──────────────────────────┐
            ▼                 ▼                          ▼
     ┌────────────┐    ┌──────────────┐          ┌──────────────────┐
     │ index.html │    │ poster.html  │          │  knockout.html   │
     │  (builder) │    │ poster-      │          │  (live hub)      │
     │  app.js    │    │ vertical.html│          │  knockout.js     │
     └─────┬──────┘    └──────────────┘          └────────┬─────────┘
           │  builds a URL with your choices               │ resolves the bracket,
           │  and live-previews the poster                 │ renders one tab per round
           ▼                                               ▼
   poster.html?tz=…&theme=…&size=…                  ┌──────────────┐
                                                    │   feed.js    │  pulls openfootball,
                                                    │ (live data)  │  maps it to our schema,
                                                    └──────┬───────┘  overlays overrides.json
                                          openfootball CDN ▼  +  overrides.json  +  results.json
```

### File-by-file

| File | Role |
| --- | --- |
| `index.html` | The landing page and the **wall-chart builder** (controls + live preview). |
| `app.js` | Builder behaviour: reads your choices, builds the poster URL, keeps the live `<iframe>` preview in sync, handles PDF/PNG/print/`.ics` export, English↔Spanish translation, time-zone autodetect, and the home-page data-freshness strip. |
| `app.css` | The design system (colour tokens, typography) and all landing-page styling, with dark and light themes. |
| `schedule.js` | **The single source of truth.** Exposes `window.WC_SCHEDULE`: the 104-match array, the 48 teams by group, the 16 venues, country flag codes, and `computeStandings()` — a pure function that turns results into a live group table. |
| `poster.html` | The **landscape** printable poster (Letter / A3 / 24×16). Self-contained: reads settings from the URL, renders the venue×date match grid, the SVG knockout bracket and the group tables, and can generate its own PDF/PNG. |
| `poster-vertical.html` | The tall **24×36″ vertical** poster variant. |
| `knockout.html` | The **live knockout hub** page shell. |
| `knockout.js` | The hub's brain: the **bracket-resolution engine**, the tabbed UI, the survival funnel, the "still standing" board, the data banner, validation, polling and the manual-override overlay. |
| `knockout.css` | All styling for the hub (tabs, match cards, badges, banner). |
| `feed.js` | The **live-data adapter**: fetches openfootball, maps it onto our match numbers, and exposes the manual `overrides.json`. |
| `results.json` | A bundled **sample** snapshot used only as an offline fallback (clearly labelled in the UI). |
| `overrides.json` | **Owner-entered** results that overlay the live feed (e.g. a match that just finished). |
| `BACKLOG.md` | The living roadmap — what's done and what's next. |
| `sitemap.xml`, `robots.txt`, icons, `og-image.png` | SEO and social-sharing assets. |
| `.claude/launch.json` | A tiny config so a local preview server can be started with one command. |

### The bracket resolution engine

The hardest part of a knockout tracker is that, in the schedule, knockout slots aren't teams yet —
they're *placeholders*. A Round-of-32 match might read "2A vs 2B" (runner-up of Group A vs
runner-up of Group B), and later rounds read "W74" (winner of match 74) or "L101" (loser of match
101). `knockout.js` resolves these progressively as results arrive:

1. **Group standings** are computed from results via `computeStandings()` (points → goal
   difference → goals scored).
2. **Group slots** like `1A` / `2B` resolve to the actual group winner / runner-up.
3. **Third-place slots** (`3rd`) are filled from the eight best third-placed teams, avoiding a
   same-group rematch. *(This is the one genuinely heuristic step — see safeguards below.)*
4. **Feeders** (`W74`, `L101`) propagate winners and losers forward, cascading Round of 32 → Round
   of 16 → Quarterfinals → Semifinals → Final.
5. **Survivors** are computed by removing the losers of every decided match.

Each match's outcome is memoised per render, and scores are *oriented* to whichever side actually
resolved, so a feed score is always attached to the correct team.

### The live feed adapter

`feed.js` is small and self-contained. It:

- Fetches openfootball's JSON from a CDN (`jsDelivr`, falling back to raw GitHub), so it works
  from a static page with **no key and no server**.
- Normalises team names to our 3-letter codes (with aliases for spelling differences like
  "Czech Republic" → `CZE`).
- Maps **group** matches by team pair and **knockout** matches by their shared match number.
- Reads the upstream commit time so the UI can show *when the source data actually changed*.
- Exposes the optional `overrides.json` overlay.

### Accuracy safeguards

Because correctness matters more than completeness, the app is conservative about what it claims:

- **Confirmed over guessed.** As soon as the feed knows a knockout match's real teams, those are
  used directly — overriding our own projection. The bracket reflects the real draw, not a guess.
- **"Projected" labelling.** Any knockout team we derived ourselves but the feed hasn't confirmed
  is tagged **projected**. Teams that aren't known at all stay **TBD**.
- **A validation pass** cross-checks every result's status against the schedule clock and flags
  contradictions (e.g. a match marked *full-time* that, by its kickoff time, can't have finished
  yet). Flags appear in the banner and on the offending card.
- **Provenance is always visible** — the source, both timestamps, and the limitations are shown in
  the banner; sample data is labelled as not real; manual entries are labelled as manual.

---

## Running it on your own computer

Because there's no build step, any static file server works. From the project folder:

```bash
# Python (already installed on macOS/Linux)
python3 -m http.server 8000
# then open http://localhost:8000
```

```bash
# or Node, if you prefer
npx serve .
```

> You can't just double-click `index.html` (the `file://` protocol blocks the data `fetch`).
> Serve it over `http://` with one of the commands above.

Handy URL parameters for testing the hub:

- `knockout.html?data=sample` — force the bundled sample data (skip the live feed).
- `poster.html?tz=BST&theme=light&size=A3` — open a poster with specific settings.

### Project conventions

- Static assets carry a version query (e.g. `app.js?v=3`) so browsers pick up changes after a
  deploy. Bump the number when you change a file.
- There are no dependencies to install. The PDF/PNG export loads `html2canvas` and `jsPDF` from a
  CDN on demand, only when you click download.

---

## Updating results yourself

Most of the time you don't have to do anything — the live feed updates on its own. But when a match
**just finished** and the free feed is lagging, you (the owner) can record the result immediately by
editing **`overrides.json`**. It's a small, human-readable file:

```jsonc
{
  "updated": "2026-06-29T19:15:00Z",      // when you made this edit (UTC)
  "results": {
    // matchNumber: { home goals, away goals, status, and the two team codes }
    "76": { "h": 2, "a": 1, "status": "FT", "_t1": "BRA", "_t2": "JPN" }
  }
}
```

- `h` / `a` are the **home** and **away** goals; `_t1` / `_t2` are the home/away **team codes**
  (the 3-letter codes from `schedule.js`, e.g. `BRA`, `JPN`).
- `status` is usually `"FT"` (full-time). For a penalty shootout add `"pen": [homePens, awayPens]`.
- The match number is the `#` shown on each card (Round of 32 is 73–88, the Final is 104).

Save the file and hit **Refresh data** — the result appears immediately, tagged **✎ manual**, and
cascades through the bracket (the winner advances, the loser is eliminated). **Remove the entry**
once the live feed catches up, so the feed becomes the source of truth again.

> This is the mechanism behind, for example, recording *Brazil 2–1 Japan* the moment the match
> ends, before openfootball's volunteers have logged it.

---

## Deploying it (free hosting)

It's a static site, so **GitHub Pages** hosts it for free:

1. Push the repository to GitHub.
2. In the repo's **Settings → Pages**, set the source to the `main` branch (root).
3. Your site goes live at `https://<your-username>.github.io/<repo-name>/`.

No build, no server, no secrets. Updating results is just editing `overrides.json` (or letting the
feed update itself) and pushing.

---

## Accuracy, limitations & disclaimers

- **Not an official FIFA product.** This is a fan-made tool. For authoritative scores and schedules
  always check the official FIFA app or your broadcaster.
- **Near-live, not in-match live.** The free feed updates roughly daily; results can lag by hours.
  This is shown clearly in the UI; it is a deliberate, cost-free trade-off.
- **Third-place pairings are a best-effort projection** until the feed confirms the real Round-of-32
  matchups (after which the real teams are used).
- **Group tie-breakers** currently use points, goal difference and goals scored; head-to-head
  tie-breakers are not yet applied.
- **Sample data is fictional.** When the feed is unreachable, the fallback scores are illustrative
  placeholders, labelled as such.

See [`BACKLOG.md`](BACKLOG.md) for the roadmap and known limitations.

---

## Credits & license

- **Match data:** [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json)
  (public domain).
- **Flags:** [flagcdn.com](https://flagcdn.com).
- **Fonts:** Bricolage Grotesque, Outfit, Space Mono (Google Fonts).
- **PDF/PNG export:** html2canvas and jsPDF (loaded on demand).
- **Built by** [@jagnoor](https://github.com/jagnoor).

Released under the [MIT License](LICENSE). Free for personal use — enjoy the tournament. ⚽🏆
