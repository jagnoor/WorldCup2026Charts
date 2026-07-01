<div align="center">

# ⚽ World Cup 2026 Charts 🏆

### A live bracket that actually updates. In your time zone. Every round to the Final.

A free, printable wall chart **and** a real-time knockout tracker for the **2026 FIFA World Cup** —
the biggest ever: **48 teams · 104 matches · 16 cities · 3 host nations.**

[![Live bracket](https://img.shields.io/badge/🏆_Live_bracket-Road_to_the_Final-2ea44f?style=for-the-badge)](https://jagnoor.github.io/WorldCup2026Charts/)
[![Wall chart](https://img.shields.io/badge/🖨️_Wall_chart-Printable_keepsake-orange?style=for-the-badge)](https://jagnoor.github.io/WorldCup2026Charts/chart.html)

![No build step](https://img.shields.io/badge/build_step-none-blue)
![Vanilla JS](https://img.shields.io/badge/stack-HTML_·_CSS_·_JS-f7df1e)
![Live data](https://img.shields.io/badge/live_data-ESPN_·_no_key-red)
![Hosting](https://img.shields.io/badge/hosting-GitHub_Pages-181717?logo=github)
![License](https://img.shields.io/badge/license-MIT-green)
![Cost](https://img.shields.io/badge/cost-%240_·_no_ads_·_no_tracking-ff69b4)

🇨🇦 Canada · 🇲🇽 Mexico · 🇺🇸 USA &nbsp;|&nbsp; 🌎 your time zone &nbsp;|&nbsp; 🗣️ wall chart in English & Español

</div>

---

## 🎯 The whole thing in 30 seconds

The group stage is done — the knockouts are here. This project turns a sprawling, three-country,
every-time-zone tournament into **two tools**, and you never need to touch code to use either one:

<table>
<tr>
<td width="55%" valign="top">

### 📡 &nbsp;A real-time "Road to the Final" hub &nbsp;⭐
**This is the home page.** A screen-first, always-current bracket — **Round of 32 → Final** — with
**live scores, goal scorers, a tap-to-open match center, goal alerts, and a visual bracket.** Powered
by a free public feed (ESPN), refreshed every minute. No API key, no server.

</td>
<td width="45%" valign="top">

### 🖨️ &nbsp;A printable wall chart *(keepsake)*
Now a secondary page at **[`/chart.html`](https://jagnoor.github.io/WorldCup2026Charts/chart.html)**.
Build a poster with **every match in *your* time zone and *your* language** — the knockout bracket,
group tables, TV channels — and download it as **PDF/PNG**. A perfect wall souvenir of the tournament.

</td>
</tr>
</table>

> 💡 **It's a 100% static website** — plain HTML, CSS & JavaScript. **No build step, no framework,
> no backend.** It loads instantly and is hosted free on GitHub Pages.

---

## ✨ What you can do with it

| | Feature | What it means for you |
| :---: | :--- | :--- |
| ⚡ | **Real-time live scores** | In-match scores, goal scorers and the current half — straight from ESPN's public feed, re-checked every 60 s. No key, no backend. |
| 🏆 | **Live knockout hub** | One tab per round (Groups · R32 · R16 · QF · SF · Final): who advanced, live/finished/upcoming states, and countdowns. |
| ⚽ | **Live goal alerts** | A card flashes and a *"GOAL! France 3–0 Sweden"* banner pops the moment a score changes — plus **confetti** when the Final is won. |
| 📋 | **Tap-to-expand match center** | Click any match (card *or* bracket node) for a **stats breakdown** (possession, shots, corners, cards) and a **goal / card / sub timeline**. |
| 🗺️ | **Mini visual bracket** | A mirrored, bird's-eye bracket on the Overview — the whole Road to the Final with dates & times, at a glance. |
| 🗂️ | **Live group tables** | All 12 standings with proper FIFA tie-breakers (incl. head-to-head), colour-coded for *through / best-3rd / out*, plus every fixture & score. |
| 🧭 | **Path to glory** | Tap any team to spotlight its run across every round — its matches glow, the rest fade. |
| 🕑 | **Your time zone** | Every kickoff is shown in *your* device's local time. The wall chart adds US (FOX/FS1) & UK (BBC/ITV) channels. |
| 🖼️ | **Print-ready posters** | Letter, A3, a 24×16″ poster, or a tall 24×36″ vertical — as **PDF** or **PNG**, or print straight from the browser. |
| 🔄 | **A *living* wall chart** | The printable chart self-updates: scores fill in and announced R32 cells show **real teams** (`RSA 0–1 CAN`) instead of `2A v 2B`. |
| 📅 | **Add to calendar** | Export your favourite teams' fixtures as a standard `.ics` file. |
| 🎨 | **Bright, playful design** | A warm "Matchday Fiesta" sticker theme (with an optional night mode) — the whole thing is fun to look at. |
| 🆓 | **Free & private** | No sign-ups, no ads, no tracking, no cost. |

---

## 🧭 A guided tour (no code required)

Everything happens in your browser.

<details open>
<summary><b>🏆 &nbsp;Follow the knockouts live &nbsp;(the home page)</b></summary>

<br>

Just open **[the site](https://jagnoor.github.io/WorldCup2026Charts/)** — the live bracket *is* the home page now. This is *The Road to the Final*:

- **🌀 A survival funnel** — `48 → 32 → 16 → 8 → 4 → 2 → 1` — showing how many teams remain. Tap a stage to jump to it.
- **🗂️ Tabs for the whole tournament** — *Overview · Groups · R32 · R16 · QF · SF · Final.*
- **🗺️ A mini bracket** (on Overview) — the entire draw at a glance, with dates & times; tap any match to open its details.
- **⚔️ Round pages as a left/right grid** — each round is split into the two halves of the draw, mirroring the bracket.
- **🥇 Clear match cards** — the team that **advances** glows gold with a ▶; the one out is dimmed and struck through. Finished games show **FT / AET / PENS** and **⚽ goal scorers with the minute**; live games pulse and show the **half** (see the note on the clock below); upcoming games show a **countdown**.
- **📋 Tap any match** — for a full match center: possession/shots/corners/cards and a goal-by-goal timeline.
- **⚽ Goal alerts** — when a score changes, the card flashes and a *"GOAL!"* banner pops. When the Final resolves, **confetti** 🎉.
- **🛡️ A "Still standing" board** and **🧭 "Path to glory"** — tap any team (a chip *or* a team on a card) to track its route across every round; everything else dims until you clear it.
- **↻ Refresh** — the hub re-checks the feed every ~60 seconds and on tab focus, or pull the latest yourself any time.

</details>

<details>
<summary><b>🖨️ &nbsp;Build & download your wall chart &nbsp;(at <code>/chart.html</code>)</b></summary>

<br>

1. Open **[the wall-chart builder](https://jagnoor.github.io/WorldCup2026Charts/chart.html)** (also linked as **🖨️ Wall chart** in the top-right nav).
   A control panel sits on the left; a **live preview** on the right updates the instant you change anything.
2. Set your preferences:
   - 📐 **Paper size** — Letter / A3 for home printers; 24×16″ or 24×36″ for a print-shop poster.
   - 🕑 **Time zone** — auto-detected, but pick yours. US/UK zones also show each match's TV channel.
   - 🎨 **Colour scheme** — this is the *poster's* look: *Light* (printer-friendly, the default) or *Dark* (striking on screen).
   - ⭐ **Favourite teams** *(optional)* — tick teams to highlight them everywhere and unlock calendar export.
   - 🗣️ **Language** — English or Spanish (the wall chart is fully bilingual).
3. Then use the buttons:
   - **Open poster** — full-size chart in a new tab.
   - **Print** — opens the print dialog. *Tip: Landscape, Fit-to-page, and enable Background graphics.*
   - **Download PDF / PNG** — high-res file generated right in your browser. *(Big posters take a few seconds — normal.)*
   - **Add to calendar** — pick favourite teams first, then download an `.ics` for Apple / Google / Outlook, in your local time.

</details>

<details>
<summary><b>🚦 &nbsp;Reading the data banner (please do!)</b></summary>

<br>

The hub always tells you **where the numbers come from and how fresh they are** — so you're never misled:

| Badge | Meaning |
| :--- | :--- |
| 🟢 **LIVE · ESPN** | Real-time in-match scores from ESPN's public feed (the normal state). |
| 🟦 **NEAR-LIVE** | ESPN was unreachable, so it fell back to the community feed (openfootball, ~daily). |
| 🟧 **SAMPLE DATA** | No feed reachable — *illustrative placeholders*, **not real** (and clearly labelled). |

It shows **when you last refreshed** (openfootball also shows when the *source* last changed), a bottom
**"About this data"** note spelling out the limitations, and flags any **✎ manual** result the owner
hand-entered before the feed caught up.

> ⏱️ **On the live clock:** ESPN's soccer minute is an *estimate* (it doesn't subtract the half-time
> break), so we show the **half** (1st / 2nd) rather than a misleading exact minute. The score, scorers
> and live/finished state are reliable.

> 🧭 **The guiding rule:** *never present a guess or a placeholder as if it were a confirmed fact.*
> Confirmed results are shown plainly; anything we derived is labelled **"projected"**; anything fake is **"sample."**

</details>

---

## 🔍 How the data stays honest

Layers of match data, applied in order — primary first, fallback last:

```
  1. ⚡  LIVE FEED        ESPN public scoreboard (site.api.espn.com). Real-time:
         (primary)        in-match scores, current half, goal scorers, and a per-
                          match summary (stats + timeline). No API key, CORS-enabled
                          → read straight from the browser, no server. Unofficial.
              │
              ▼
  2. 🌍  FALLBACK FEED    openfootball/worldcup.json — public-domain community data,
         (if ESPN down)   same draw as this app. Near-live (~daily), not in-match.
              │
              ▼
  3. ✎  OVERRIDES        overrides.json — the owner can hand-enter a result the feed
         (top layer)      hasn't logged yet. Visibly tagged ✎ manual. (Rarely needed
                          now that ESPN carries live scores; ships empty.)
              │
              ▼
  4. 🧪  SAMPLE           results.json — bundled snapshot shown only if every feed is
         (last resort)    unreachable, so the page is never blank. Labelled "not real."
```

This project deliberately uses **free feeds only** — real-time when ESPN is up, near-live otherwise.

---

## 🛠️ How it's built (for the curious)

> **Design principles:** No build step, ever · One source of truth for data · Static & free to host · Honest by construction.

<details>
<summary><b>🗺️ &nbsp;The big picture</b></summary>

<br>

```
                    ┌──────────────────────┐
                    │      schedule.js     │  104 matches · 48 teams · 16 venues
                    │  (window.WC_SCHEDULE)│  + FIFA standings calculator
                    └───────────┬──────────┘  ── single source of truth ──
            ┌───────────────────┼───────────────────────────┐
            ▼                   ▼                            ▼
   ┌──────────────────┐  ┌──────────────────┐        ┌──────────────────┐
   │   index.html ⭐  │  │   poster.html    │        │   chart.html     │
   │  (live hub, 7    │  │ poster-vertical  │        │   (builder)      │
   │ tabs) knockout.js│  │      .html       │        │     app.js       │
   └────────┬─────────┘  └──────────────────┘        └────────┬─────────┘
            │ resolves the bracket,                           │ builds a poster URL from
            │ renders each round + detail                     │ your choices & live-previews it
            ▼                                                 ▼
      ┌──────────────┐                             poster.html?tz=…&size=…&results=…
      │   feed.js    │  ESPN (primary) →                 ▲ (chart also passes live scores)
      │ (live data)  │  openfootball (fallback)          └────────── feed.js ───────────┘
      └──────┬───────┘  + overrides + summary()
   ESPN / openfootball ◄──┘  + overrides.json + results.json

   ( knockout.html — old URL — is now a tiny redirect stub → the home page )
```

</details>

<details>
<summary><b>📁 &nbsp;File-by-file</b></summary>

<br>

| File | Role |
| :--- | :--- |
| `index.html` ⭐ | **The home page — the live knockout hub** shell (loads schedule → feed → knockout.js). |
| `knockout.js` | The home page's brain: **bracket-resolution engine**, 7 tabs, groups view, mini bracket, survival funnel, "still standing", path-to-glory, **goal alerts + confetti**, **match-detail modal**, data banner, validation, polling, overrides. |
| `knockout.css` | Hub styling — sticker cards, tabs, funnel, bracket, modal, alerts, confetti. |
| `chart.html` | The **wall-chart builder** (controls + live preview + freshness strip) — the secondary "keepsake poster" page. |
| `app.js` | Builder brain: reads choices, builds the poster URL, syncs the `<iframe>` preview, feeds live scores + resolved R32 names into the poster, PDF/PNG/print/`.ics` export, EN↔ES translation, time-zone autodetect. |
| `app.css` | Design system (colour tokens, "Matchday Fiesta" sticker theme + night mode) & all landing-page styling. |
| `schedule.js` | **The single source of truth.** `window.WC_SCHEDULE`: 104-match array, 48 teams by group, 16 venues, flag codes, and `computeStandings()` (with full FIFA tie-breakers incl. head-to-head). |
| `poster.html` | The **landscape** printable poster (Letter / A3 / 24×16). Venue×date grid, SVG bracket, group tables; reads live `results`/`koteams` from the URL; self-generates PDF/PNG. |
| `poster-vertical.html` | The tall **24×36″ vertical** poster variant. |
| `knockout.html` | A tiny **redirect stub** → the home page (keeps old shared links & `?data=…` params working). |
| `feed.js` | The **live-data adapter**: `WC_FEED.load()` tries **ESPN** then **openfootball**; maps events → our match numbers (+ live minute/half, scorers, penalties); `summary()` fetches a match's timeline & stats; `overrides()` reads `overrides.json`. |
| `results.json` | Bundled **sample** snapshot — last-resort fallback only (clearly labelled). |
| `overrides.json` | **Owner-entered** results that overlay the feed (ships empty). |
| `BACKLOG.md` | The living roadmap — what's shipped and what's next. |
| `sitemap.xml`, `robots.txt`, `favicon*`, `og-image.png` | SEO & social-sharing assets. |
| `.claude/launch.json` | One-command local preview config. · `LICENSE` — MIT. |

</details>

<details>
<summary><b>🧩 &nbsp;The bracket-resolution engine</b></summary>

<br>

The hard part of a knockout tracker: in the schedule, knockout slots aren't teams yet — they're
*placeholders.* A R32 match reads `2A vs 2B` (runners-up of groups A & B); later rounds read `W74`
(winner of match 74) or `L101` (loser of 101). `knockout.js` resolves these as results arrive:

1. **Group standings** via `computeStandings()` — points → GD → goals for, then a **head-to-head
   mini-league** among teams tied on all three (official FIFA order).
2. **Group slots** like `1A` / `2B` resolve to the real winner / runner-up.
3. **Third-place slots** (`3rd`) filled from the 8 best third-placed teams, avoiding a same-group rematch. *(The one genuinely heuristic step.)*
4. **Feeders** (`W74`, `L101`) cascade winners & losers forward: R32 → R16 → QF → SF → Final.
5. **Survivors** computed by removing every decided match's loser.

The moment the feed knows a match's real teams, **those override our projection**; scores are
*oriented* to whichever side resolved, so a feed score always sticks to the correct team.

</details>

<details>
<summary><b>🛡️ &nbsp;Accuracy safeguards</b></summary>

<br>

Correctness over completeness — the app is conservative about what it claims:

- **Confirmed over guessed.** Once the feed knows a match's real teams, they override our projection; anything we still derive is tagged **projected**, the unknown stays **TBD**.
- **Honest clock.** Live matches show the **half**, not ESPN's over-estimated minute. Countdowns & "has it kicked off?" use the *real* clock, so a live match never shows a future countdown.
- **A validation pass** cross-checks each result against the schedule and flags contradictions (e.g. a "full-time" match that can't have kicked off yet).
- **Provenance is always visible** — source, timestamps and limitations live in the banner; sample is labelled not-real; manual is labelled manual.

</details>

---

## 💻 Run it locally

No build step — any static file server works. From the project folder:

```bash
python3 -m http.server 8000        # then open http://localhost:8000
# — or —
npx serve .
```

> ⚠️ Don't double-click `index.html` — the `file://` protocol blocks the data `fetch`. Serve it over `http://`.

**Handy URL params for testing:**

| URL | Effect |
| :--- | :--- |
| `/` | The live knockout hub (home page). |
| `/?data=sample` | Force the bundled sample data on the hub (skip the live feed). |
| `/chart.html?lang=es` | Open the wall-chart builder in Spanish. |
| `/poster.html?tz=BST&theme=light&size=A3` | Open a poster with specific settings. |

*Conventions:* static assets carry a version query (e.g. `knockout.js?v=17`) — **bump it after editing that file** so browsers pick up the change. No dependencies to install; `html2canvas` & `jsPDF` load from a CDN on demand, only when you click download.

---

## ✍️ Updating results yourself

Usually you do nothing — ESPN's feed updates on its own. But if a match **just finished** and the feed
is briefly lagging, the owner can record it immediately by editing **`overrides.json`**:

```jsonc
{
  "updated": "2026-06-30T22:25:00Z",   // when you made this edit (UTC)
  "results": {
    // matchNumber: { home goals, away goals, status, team codes }
    "76": { "h": 2, "a": 1, "status": "FT", "_t1": "BRA", "_t2": "JPN" }
  }
}
```

- `h` / `a` → **home / away** goals · `_t1` / `_t2` → home / away **team codes** (3-letter, from `schedule.js`).
- `status` is usually `"FT"` (or `"LIVE"` for an in-progress score). For a shootout add `"pen": [homePens, awayPens]`.
- The match number is the `#` on each card (R32 is 73–88, the Final is 104).

Save, hit **↻ Refresh data** — it appears tagged **✎ manual** and cascades through the bracket.
**Remove the entry** once the feed catches up, so the feed becomes the source of truth again.

---

## 🚀 Deploy it (free)

It's static, so **GitHub Pages** hosts it for free:

1. Push the repo to GitHub.
2. **Settings → Pages** → set the source to the `main` branch (root).
3. Live at `https://<your-username>.github.io/<repo-name>/`.

No build, no server, no secrets.

---

## ⚠️ Accuracy, limitations & disclaimers

- **Not an official FIFA product.** A fan-made tool — for authoritative scores always check the official FIFA app or your broadcaster.
- **The live feed is unofficial.** ESPN's public scoreboard is real-time and free, but it's an undocumented endpoint. If it changes or is unreachable, the app falls back to openfootball (near-live, ~daily), then to a clearly-labelled sample.
- **The live minute is a half, not a number** — ESPN's match clock over-estimates, so live games show *1st / 2nd half* instead of a misleading minute.
- **Third-place pairings are a best-effort projection** until the feed confirms the real R32 matchups.
- **Group tie-breakers** apply the official FIFA order (points → goal difference → goals scored, then head-to-head); fair-play points and drawing of lots are approximated by the original seeding.
- **The live hub UI is English** for now; the printable wall chart and builder are fully bilingual (EN/ES).
- **Sample data is fictional** — fallback scores are illustrative placeholders, labelled as such.

See **[`BACKLOG.md`](BACKLOG.md)** for the roadmap and known limitations.

---

## 🙏 Credits & license

| | |
| :--- | :--- |
| ⚡ **Live scores** | [ESPN public scoreboard](https://www.espn.com/soccer/scoreboard) *(unofficial, free)* — primary |
| 📊 **Fallback data** | [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json) *(public domain)* |
| 🏳️ **Flags** | [flagcdn.com](https://flagcdn.com) |
| 🔤 **Fonts** | Bricolage Grotesque · Outfit · Space Mono *(Google Fonts)* |
| 🖨️ **PDF/PNG export** | html2canvas · jsPDF *(loaded on demand)* |
| 👷 **Built by** | [@jagnoor](https://github.com/jagnoor) |

<div align="center">

Released under the **[MIT License](LICENSE)** — free for personal use.

### Enjoy the tournament. ⚽🏆

</div>
