/* ============================================================================
   feed.js — live results adapter for the 2026 World Cup
   ----------------------------------------------------------------------------
   Maps real match data into the {matchNum: {h,a,status,minute?,pen?,sc?}} shape
   the hub + poster already use. Two free, no-key, CORS-friendly sources:

     1) ESPN (PRIMARY) — site.api.espn.com public scoreboard. Truly LIVE
        (in-match scores, minute, goal scorers), no API key, served with CORS so
        a static page can read it straight from the browser. Unofficial.
     2) openfootball (FALLBACK) — public-domain JSON on GitHub. Community-
        maintained, updated ~daily; used only if ESPN can't be reached.

   load() tries ESPN, then openfootball; callers fall back to results.json if
   both fail. overrides() overlays owner-entered results on top.
   ========================================================================== */
window.WC_FEED = (function () {
  'use strict';

  /* ---- shared helpers --------------------------------------------------- */
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');
  // ET wall-clock time string ("3p","10p","4:30p","12a") → [hour24, minute].
  function parseET(t) {
    let h, mi = 0;
    if (t === '12a') h = 0; else if (t === '12p') h = 12;
    else if (t.endsWith('a')) { const x = t.slice(0, -1); if (x.includes(':')) [h, mi] = x.split(':').map(Number); else h = +x; if (h === 12) h = 0; }
    else if (t.endsWith('p')) { const x = t.slice(0, -1); if (x.includes(':')) [h, mi] = x.split(':').map(Number); else h = +x; if (h !== 12) h += 12; }
    else if (t.includes(':')) { [h, mi] = t.split(':').map(Number); if (h !== 12) h += 12; }
    else h = +t;
    return [h, mi];
  }
  const koUtc = m => { const [mo, dy] = m[1].split('/').map(Number); const [h, mi] = parseET(m[2]); return Date.UTC(2026, mo - 1, dy, h + 4, mi); };

  /* ====================================================================== */
  /*  PRIMARY — ESPN public scoreboard (live, no key, CORS)                  */
  /* ====================================================================== */
  const ESPN_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260611-20260719&limit=400';

  /* ESPN scoreboard JSON → { results, koTeams }. Group matches map by team pair
     (oriented to our schedule's home/away so computeStandings stays correct);
     knockout matches map by nearest kickoff time. Live status, minute and goal
     scorers come straight through. */
  function mapEspn(data) {
    const S = window.WC_SCHEDULE;
    const OUR = new Set(Object.values(S.GROUPS).flat().map(t => t[1]));
    const alias = { CUW: 'CUR' };                          // ESPN ⇄ our codes (only diff)
    const codeOf = ab => { ab = String(ab || '').toUpperCase(); return OUR.has(ab) ? ab : (alias[ab] || null); };

    const byPair = {};                                     // group: unordered pair → our match
    S.M.forEach(m => { if (/^[A-L]$/.test(m[5])) byPair[[m[3], m[4]].sort().join('-')] = { num: m[0], home: m[3], away: m[4] }; });
    const koList = S.M.filter(m => !/^[A-L]$/.test(m[5])).map(m => ({ num: m[0], utc: koUtc(m) }));
    const koStart = Math.min.apply(null, koList.map(k => k.utc));

    function statusOf(e, comp) {
      const t = (e.status && e.status.type) || {}, state = t.state, name = t.name || '';
      const detail = String(t.detail || t.shortDetail || '').toLowerCase();
      if (state === 'in') {
        // ESPN's soccer minute is an elapsed-time estimate (it doesn't subtract
        // the half-time break), so it runs ahead. We show the reliable PERIOD
        // instead of a misleading exact minute.
        if (name === 'STATUS_HALFTIME' || /half\s*time|halftime|^ht$/.test(detail)) return { status: 'HT' };
        let period = 'live';
        if (name === 'STATUS_FIRST_HALF' || /1st half|first half/.test(detail)) period = '1st half';
        else if (name === 'STATUS_SECOND_HALF' || /2nd half|second half/.test(detail)) period = '2nd half';
        else if (/EXTRA|OVERTIME/.test(name) || /extra time/.test(detail)) period = 'extra time';
        else if (/PEN|SHOOTOUT/.test(name) || /penalt|shootout/.test(detail)) period = 'penalties';
        return { status: 'LIVE', period: period };
      }
      if (state === 'post') {
        const h = comp.competitors.find(c => c.homeAway === 'home'), a = comp.competitors.find(c => c.homeAway === 'away');
        if (h && h.shootoutScore != null && a && a.shootoutScore != null) return { status: 'PENS', pen: [parseInt(h.shootoutScore), parseInt(a.shootoutScore)] };
        if (/aet|extra/.test(detail) || /aet/i.test(t.name || '')) return { status: 'AET' };
        return { status: 'FT' };
      }
      return null;                                         // 'pre' → not played
    }
    function goalsBySide(comp, homeId) {
      const gHome = [], gAway = [];
      (comp.details || []).forEach(x => {
        if (!x.scoringPlay) return;
        const who = x.athletesInvolved && x.athletesInvolved[0] && x.athletesInvolved[0].displayName;
        if (!who) return;
        const g = { n: who, m: String((x.clock && x.clock.displayValue) || '').replace(/[^0-9+]/g, ''), og: !!x.ownGoal, pk: !!x.penaltyKick };
        (x.team && String(x.team.id) === homeId ? gHome : gAway).push(g);
      });
      return [gHome, gAway];
    }

    const out = {}, koTeams = {};
    (data.events || []).forEach(e => {
      const comp = e.competitions && e.competitions[0]; if (!comp) return;
      const hc = comp.competitors.find(c => c.homeAway === 'home'), ac = comp.competitors.find(c => c.homeAway === 'away');
      if (!hc || !ac) return;
      const h = codeOf(hc.team.abbreviation), a = codeOf(ac.team.abbreviation);
      if (!h || !a) return;                                // placeholder / unmapped slot
      const evMs = Date.parse(e.date) || 0;
      const pair = [h, a].sort().join('-');

      let num = null, isGroup = false;
      if (byPair[pair] && evMs < koStart) { num = byPair[pair].num; isGroup = true; }
      else { let bd = Infinity; koList.forEach(k => { const d = Math.abs(k.utc - evMs); if (d < bd) { bd = d; num = k.num; } }); if (bd > 8 * 3600000) num = null; }
      if (!num) return;
      if (!isGroup) koTeams[num] = { home: h, away: a };   // record the confirmed KO matchup

      const stt = statusOf(e, comp); if (!stt) return;     // upcoming → matchup only
      const hs = parseInt(hc.score), as = parseInt(ac.score); if (isNaN(hs) || isNaN(as)) return;
      const [gHome, gAway] = goalsBySide(comp, String(hc.team.id));

      if (isGroup) {
        if (stt.status === 'LIVE' || stt.status === 'HT') return;   // don't let a live score pollute standings
        const tgt = byPair[pair], fwd = tgt.home === h;
        out[tgt.num] = { h: fwd ? hs : as, a: fwd ? as : hs, status: stt.status, sc: { h: fwd ? gHome : gAway, a: fwd ? gAway : gHome } };
      } else {
        out[num] = { h: hs, a: as, status: stt.status, period: stt.period, pen: stt.pen, _t1: h, _t2: a, g1: gHome, g2: gAway };
      }
    });
    return { results: out, koTeams };
  }

  async function espnLoad() {
    const r = await fetch(ESPN_URL, { cache: 'no-store' });
    if (!r.ok) throw new Error('ESPN HTTP ' + r.status);
    const data = await r.json();
    const { results, koTeams } = mapEspn(data);
    if (!Object.keys(results).length && !Object.keys(koTeams).length) throw new Error('ESPN returned no usable events');
    return {
      results, koTeams, updated: Date.now(), pulled: Date.now(),
      source: 'espn', label: 'ESPN live scores',
      note: 'Live in-match scores from ESPN’s public sports data, updated in real time. It’s unofficial — for anything critical, confirm with the official FIFA app or your broadcaster.',
      url: 'https://www.espn.com/soccer/scoreboard'
    };
  }

  /* ====================================================================== */
  /*  FALLBACK — openfootball public-domain JSON (community, ~daily)         */
  /* ====================================================================== */
  const OF_URLS = [
    'https://cdn.jsdelivr.net/gh/openfootball/worldcup.json@master/2026/worldcup.json',
    'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json'
  ];
  const OF_COMMIT = 'https://api.github.com/repos/openfootball/worldcup.json/commits?path=2026/worldcup.json&per_page=1';
  const OF_SELF = 'https://github.com/openfootball/worldcup.json';

  function ofNameMap() {
    const S = window.WC_SCHEDULE, map = {};
    Object.values(S.GROUPS).flat().forEach(([iso, ab, nm]) => { map[norm(nm)] = ab; });
    const alias = {
      'south korea': 'KOR', 'korea republic': 'KOR', 'czech republic': 'CZE', 'turkey': 'TUR', 'turkiye': 'TUR',
      'bosnia & herzegovina': 'BIH', 'bosnia and herzegovina': 'BIH', 'usa': 'USA', 'united states': 'USA',
      'ivory coast': 'CIV', "cote d'ivoire": 'CIV', 'dr congo': 'COD', 'democratic republic of congo': 'COD',
      'curacao': 'CUR', 'cape verde': 'CPV', 'cabo verde': 'CPV', 'new zealand': 'NZL', 'saudi arabia': 'KSA'
    };
    Object.keys(alias).forEach(k => { map[norm(k)] = alias[k]; });
    return map;
  }
  function mapOpenfootball(feed) {
    const S = window.WC_SCHEDULE;
    const code = ofNameMap(), codeOf = nm => code[norm(nm)] || null;
    const byPair = {};
    S.M.forEach(m => { if (/^[A-L]$/.test(m[5])) byPair[m[5] + '|' + [m[3], m[4]].sort().join('-')] = { num: m[0], home: m[3], away: m[4] }; });
    const isKO = num => { const m = S.M.find(x => x[0] === num); return m && !/^[A-L]$/.test(m[5]); };
    const goalsOf = arr => (Array.isArray(arr) ? arr : []).map(x => ({ n: x.name || x.player || '', m: String(x.minute != null ? x.minute : (x.min != null ? x.min : '')), og: !!x.owngoal, pk: !!(x.penalty || x.pen) })).filter(x => x.n);

    const out = {}, koTeams = {};
    (feed.matches || []).forEach(om => {
      const t1 = codeOf(om.team1), t2 = codeOf(om.team2);
      const grp = om.group ? String(om.group).replace(/group/i, '').trim() : null;
      if (om.num && t1 && t2 && isKO(om.num)) koTeams[om.num] = { home: t1, away: t2 };
      const sc = om.score && om.score.ft; if (!sc || sc[0] == null || sc[1] == null) return;
      const pen = (om.score.p || om.score.pen), penOK = Array.isArray(pen) && pen.length === 2 ? pen : undefined;
      const g1 = goalsOf(om.goals1), g2 = goalsOf(om.goals2);
      if (grp && t1 && t2) {
        const tgt = byPair[grp + '|' + [t1, t2].sort().join('-')]; if (!tgt) return;
        const fwd = tgt.home === t1 && tgt.away === t2;
        out[tgt.num] = { h: fwd ? sc[0] : sc[1], a: fwd ? sc[1] : sc[0], status: 'FT', sc: { h: fwd ? g1 : g2, a: fwd ? g2 : g1 } };
      } else if (om.num && t1 && t2) {
        out[om.num] = { h: sc[0], a: sc[1], status: 'FT', _t1: t1, _t2: t2, pen: penOK, g1: g1, g2: g2 };
      }
    });
    return { results: out, koTeams };
  }
  async function openfootballLoad() {
    let feed, err;
    for (const u of OF_URLS) { try { const r = await fetch(u, { cache: 'no-store' }); if (r.ok) { feed = await r.json(); break; } err = 'HTTP ' + r.status; } catch (e) { err = e; } }
    if (!feed) throw new Error('openfootball unreachable (' + err + ')');
    const { results, koTeams } = mapOpenfootball(feed);
    let updated = 0;
    try { const c = await fetch(OF_COMMIT); if (c.ok) { const j = await c.json(); updated = Date.parse(j[0].commit.committer.date); } } catch (e) { /* best-effort */ }
    return {
      results, koTeams, updated: updated || Date.now(), pulled: Date.now(),
      source: 'openfootball', label: 'openfootball community data',
      note: 'Community-maintained (openfootball) and updated roughly daily by hand — not an in-match live feed. Scores can lag; verify against official sources.',
      url: OF_SELF
    };
  }

  /* ====================================================================== */
  /*  Orchestrator + manual overrides                                       */
  /* ====================================================================== */
  async function load() {
    try { return await espnLoad(); }
    catch (e) { return await openfootballLoad(); }
  }
  async function overrides() {
    try {
      const r = await fetch('overrides.json?t=' + Date.now(), { cache: 'no-store' });
      if (!r.ok) return null;
      const d = await r.json();
      const results = (d && d.results) || {}; const nums = Object.keys(results);
      if (!nums.length) return null;
      return { updated: Date.parse(d.updated) || Date.now(), results, count: nums.length };
    } catch (e) { return null; }
  }

  return { load, overrides, espnLoad, openfootballLoad };
})();
