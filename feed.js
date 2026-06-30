/* ============================================================================
   feed.js — live(ish) results adapter for the 2026 World Cup
   ----------------------------------------------------------------------------
   Pulls real match data from the openfootball public-domain dataset and maps it
   into the {matchNum: {h,a,status,pen?}} shape the hub + poster already use.

   Why openfootball?
     • Same draw as this app — identical 12 groups, same 48 teams, same 104
       matches; knockout entries even carry the same `num` (73–104) and W##/L##
       feeders. So the mapping is clean.
     • Public domain, NO API key, served over CORS (jsDelivr / raw GitHub), so a
       static site can read it straight from the browser.

   Honest caveat (surfaced in the UI): openfootball is community-maintained and
   updated ROUGHLY DAILY BY HAND. It is NOT an in-match live feed — scores appear
   after a match, can lag, and should be verified against official sources. For
   true second-by-second data you need a paid feed (Sportmonks / API-Football /
   TheStatsAPI) behind a scheduled job — see BACKLOG.

   Exposes window.WC_FEED.load() -> Promise<{
     results, updated(ms), source:'openfootball', label, note, url
   }>. Throws if the feed can't be reached (callers fall back to results.json).
   ========================================================================== */
window.WC_FEED = (function () {
  'use strict';
  const DATA_URLS = [
    'https://cdn.jsdelivr.net/gh/openfootball/worldcup.json@master/2026/worldcup.json',
    'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'
  ];
  // Upstream "data last changed" time (best-effort; unauthenticated, rate-limited).
  const COMMIT_URL = 'https://api.github.com/repos/openfootball/worldcup.json/commits?path=2026/worldcup.json&per_page=1';
  const SELF = 'https://github.com/openfootball/worldcup.json';

  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

  /* normalized team name → our 3-letter code (from the schedule + aliases for
     the few spellings openfootball writes differently). */
  function nameMap() {
    const S = window.WC_SCHEDULE, map = {};
    Object.values(S.GROUPS).flat().forEach(([iso, ab, nm]) => { map[norm(nm)] = ab; });
    const alias = {
      'south korea': 'KOR', 'korea republic': 'KOR', 'czech republic': 'CZE',
      'turkey': 'TUR', 'turkiye': 'TUR', 'bosnia & herzegovina': 'BIH',
      'bosnia and herzegovina': 'BIH', 'usa': 'USA', 'united states': 'USA',
      'ivory coast': 'CIV', "cote d'ivoire": 'CIV', 'dr congo': 'COD',
      'democratic republic of congo': 'COD', 'curacao': 'CUR', 'cape verde': 'CPV',
      'cabo verde': 'CPV', 'new zealand': 'NZL', 'saudi arabia': 'KSA'
    };
    Object.keys(alias).forEach(k => { map[norm(k)] = alias[k]; });
    return map;
  }

  /* openfootball match list → our results map. Group matches are matched by
     {group, team pair} and oriented to our home/away (so computeStandings stays
     correct); knockout matches are matched by `num` and carry the openfootball
     team codes so the hub can orient the score to whichever side resolved. */
  /* Returns { results, koTeams }:
       results  — {matchNum: {h,a,status,pen?,_t1,_t2}} for PLAYED matches
       koTeams  — {matchNum: {home,away}} for any knockout match whose real teams
                  the feed already knows (played or not), so the hub can show the
                  CONFIRMED matchup instead of our own projection. */
  function mapResults(feed) {
    const S = window.WC_SCHEDULE;
    const code = nameMap(), codeOf = nm => code[norm(nm)] || null;
    const byPair = {};
    S.M.forEach(m => { if (/^[A-L]$/.test(m[5])) byPair[m[5] + '|' + [m[3], m[4]].sort().join('-')] = { num: m[0], home: m[3], away: m[4] }; });
    const isKO = num => { const m = S.M.find(x => x[0] === num); return m && !/^[A-L]$/.test(m[5]); };

    // Normalise a goals list → [{n:name, m:minute, og?, pk?}].
    const goalsOf = arr => (Array.isArray(arr) ? arr : [])
      .map(x => ({ n: x.name || x.player || '', m: String(x.minute != null ? x.minute : (x.min != null ? x.min : '')), og: !!x.owngoal, pk: !!(x.penalty || x.pen) }))
      .filter(x => x.n);

    const out = {}, koTeams = {};
    (feed.matches || []).forEach(om => {
      const t1 = codeOf(om.team1), t2 = codeOf(om.team2);
      const grp = om.group ? String(om.group).replace(/group/i, '').trim() : null;
      // Record confirmed knockout pairings (real team names, whether or not played).
      if (om.num && t1 && t2 && isKO(om.num)) koTeams[om.num] = { home: t1, away: t2 };

      const sc = om.score && om.score.ft;
      if (!sc || sc[0] == null || sc[1] == null) return;          // not played yet
      const pen = (om.score.p || om.score.pen);
      const penOK = Array.isArray(pen) && pen.length === 2 ? pen : undefined;
      const g1 = goalsOf(om.goals1), g2 = goalsOf(om.goals2);
      if (grp && t1 && t2) {                                       // group stage → by pair
        const tgt = byPair[grp + '|' + [t1, t2].sort().join('-')]; if (!tgt) return;
        const fwd = tgt.home === t1 && tgt.away === t2;
        out[tgt.num] = { h: fwd ? sc[0] : sc[1], a: fwd ? sc[1] : sc[0], status: 'FT', sc: { h: fwd ? g1 : g2, a: fwd ? g2 : g1 } };
      } else if (om.num && t1 && t2) {                             // knockout → by num (orient at render)
        out[om.num] = { h: sc[0], a: sc[1], status: 'FT', _t1: t1, _t2: t2, pen: penOK, g1: g1, g2: g2 };
      }
    });
    return { results: out, koTeams };
  }

  async function fetchFirst(urls) {
    let err;
    for (const u of urls) {
      try { const r = await fetch(u, { cache: 'no-store' }); if (r.ok) return await r.json(); err = 'HTTP ' + r.status; }
      catch (e) { err = e; }
    }
    throw new Error('openfootball feed unreachable (' + err + ')');
  }

  async function load() {
    const feed = await fetchFirst(DATA_URLS);
    const { results, koTeams } = mapResults(feed);
    let updated = 0;
    try { const c = await fetch(COMMIT_URL); if (c.ok) { const j = await c.json(); updated = Date.parse(j[0].commit.committer.date); } } catch (e) { /* best-effort */ }
    return {
      results,
      koTeams,
      updated: updated || Date.now(),
      pulled: Date.now(),
      source: 'openfootball',
      label: 'openfootball community data',
      note: 'Community-maintained (openfootball) and updated roughly daily by hand — not an in-match live feed. Scores appear after matches and may lag; verify against official sources.',
      url: SELF
    };
  }

  /* Owner-entered manual overrides (overrides.json), overlaid on whatever base
     data is loaded. Returns null if the file is absent/empty. */
  async function overrides() {
    try {
      const r = await fetch('overrides.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return null;
      const d = await r.json();
      const results = (d && d.results) || {};
      const nums = Object.keys(results);
      if (!nums.length) return null;
      return { updated: Date.parse(d.updated) || Date.now(), results, count: nums.length };
    } catch (e) { return null; }
  }

  return { load, overrides, mapResults, nameMap, DATA_URLS };
})();
