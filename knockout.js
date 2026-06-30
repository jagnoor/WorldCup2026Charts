/* ============================================================================
   knockout.js — LIVE Knockout Hub for the 2026 World Cup
   ----------------------------------------------------------------------------
   A screen-first companion to the printable wall chart. It reads the schedule
   from window.WC_SCHEDULE (schedule.js) and live scores from results.json,
   then:
     • resolves the bracket — turns slot placeholders (1A / 2B / 3rd) and
       feeders (W74 / L101) into real qualified teams as matches finish;
     • renders one tab per round (Round of 32 → Final) plus an Overview;
     • shows each match in a "great graphic format" with live/FT/upcoming
       states, scores, penalties, the advancing side highlighted;
     • tracks who is "still standing" and polls results.json so the view
       updates in real time without a reload.

   results.json schema:
     { "updated": ISO8601,
       "results": { "<matchNum>": { "h":int, "a":int,
                                    "status":"FT|AET|PENS|LIVE|HT|UPCOMING",
                                    "minute":int?, "pen":[int,int]? } } }
   Only h/a/pen are needed by the printable poster, so the same file can feed
   both. Anything missing simply renders as not-yet-played.
   ========================================================================== */
'use strict';
(function () {
  const S = window.WC_SCHEDULE;
  if (!S) { document.body.innerHTML = '<p style="padding:40px">schedule.js failed to load.</p>'; return; }

  /* ---- static lookups from the schedule -------------------------------- */
  const byNum = {}; S.M.forEach(m => { byNum[m[0]] = m; });
  const META = {};                                   // code → {iso, nm}
  Object.values(S.GROUPS).flat().forEach(([iso, ab, nm]) => { META[ab] = { iso, nm }; });
  const VEN = {}; S.V.forEach(v => { VEN[v.id] = v; });
  const flag = c => 'https://flagcdn.com/w80/' + ((META[c] && META[c].iso) || 'xx') + '.png';
  const nameOf = c => (META[c] && META[c].nm) || c;

  /* The five knockout rounds, in order. Final tab also carries 3rd place. */
  const STAGES = [
    { key: 'R32', codes: ['R32'],         label: 'Round of 32',   tab: 'Round of 32',  enter: 32, sub: '32 teams. 16 survive. No second chances.' },
    { key: 'R16', codes: ['R16'],         label: 'Round of 16',   tab: 'Round of 16',  enter: 16, sub: 'The last 16. Win or fly home.' },
    { key: 'QF',  codes: ['QF'],          label: 'Quarterfinals', tab: 'Quarterfinals',enter: 8,  sub: 'Eight left. Every kick is history.' },
    { key: 'SF',  codes: ['SF'],          label: 'Semifinals',    tab: 'Semifinals',   enter: 4,  sub: 'So close they can taste it.' },
    { key: 'FIN', codes: ['FIN', '3RD'],  label: 'The Final',     tab: 'Final',        enter: 2,  sub: 'One match. One trophy. Forever.' },
  ];
  const stageByKey = Object.fromEntries(STAGES.map(s => [s.key, s]));

  /* ====================================================================== */
  /*  STATE — refreshed from results.json on every poll                     */
  /* ====================================================================== */
  let RESULTS = {};                 // {matchNum: {h,a,status,minute,pen,_t1,_t2}}
  let FEED_KO = {};                 // {matchNum: {home,away}} confirmed knockout pairings
  let UPDATED = 0;                  // when the SOURCE data was last changed (ms)
  let PULLED = 0;                   // when THIS page last fetched the data (ms)
  let SOURCE = '';                  // 'openfootball' | 'sample' | 'live' | ''
  let NOTE = '';                    // human caveat about the current data source
  let SRCURL = '';                  // link to the data source
  let OVR = new Set();              // match numbers carrying an owner-entered override
  let OVR_UPDATED = 0;              // when the overrides file was last edited (ms)
  let NOW = Date.now();             // the "as of" clock = the data timestamp (UPDATED)
  let SYNCING = false;              // true while a manual fresh pull is in flight
  let issueNums = new Set();         // match numbers that failed a validation check
  let HILITE = '';                   // team code being "tracked" (path-to-glory), '' = none
  let activeTab = (location.hash || '#overview').slice(1);
  let memo;                         // per-render resolution cache
  const FORCE = new URLSearchParams(location.search).get('data'); // 'sample' | 'live' override

  /* ====================================================================== */
  /*  BRACKET RESOLUTION ENGINE                                              */
  /* ====================================================================== */
  function resultOf(n) { return RESULTS[n] || null; }
  function isDecided(n) {
    const r = resultOf(n); if (!r) return false;
    if (r.status === 'LIVE' || r.status === 'HT' || r.status === 'UPCOMING') return false;
    if (['FT', 'AET', 'PENS'].includes(r.status)) return true;
    return r.h != null && r.a != null;             // scores present, no live flag → treat as final
  }
  function groupComplete(g) { return S.M.filter(m => m[5] === g).every(m => isDecided(m[0])); }

  /* Assign the 8 best third-placed teams to the 8 "3rd" slots, avoiding a
     same-group rematch. Provisional pairing (see BACKLOG) — only runs once the
     whole group stage is decided; otherwise 3rd slots stay TBD. */
  function computeThirds() {
    memo.thirdByMatch = {};
    const groups = Object.keys(S.GROUPS);
    if (!groups.every(groupComplete)) return;
    const ranked = groups
      .map(g => ({ g, t: S.computeStandings(g, RESULTS)[2] }))
      .map(x => ({ g: x.g, ab: x.t.ab, Pts: x.t.Pts, GD: x.t.GD, GF: x.t.GF, seed: x.t.seed }))
      .sort((a, b) => (b.Pts - a.Pts) || (b.GD - a.GD) || (b.GF - a.GF) || (a.seed - b.seed));
    const avail = ranked.slice(0, 8);
    const slotMatches = S.M.filter(m => m[5] === 'R32' && (m[3] === '3rd' || m[4] === '3rd'))
      .map(m => ({ num: m[0], winGroup: (m[3] === '3rd' ? m[4] : m[3])[1] }));
    slotMatches.forEach(sm => {
      let i = avail.findIndex(t => t.g !== sm.winGroup);
      if (i < 0) i = 0;
      memo.thirdByMatch[sm.num] = avail[i] ? avail[i].ab : null;
      avail.splice(i, 1);
    });
  }

  function resolveSlot(slot, num) {
    if (/^1[A-L]$/.test(slot)) { const st = S.computeStandings(slot[1], RESULTS); return groupComplete(slot[1]) ? st[0].ab : prov(st[0].ab); }
    if (/^2[A-L]$/.test(slot)) { const st = S.computeStandings(slot[1], RESULTS); return groupComplete(slot[1]) ? st[1].ab : prov(st[1].ab); }
    if (slot === '3rd') return memo.thirdByMatch[num] || null;
    return null;
  }
  function prov(ab) { return ab ? { ab, provisional: true } : null; }   // leader before group is done

  function resolveFeeder(ref) {
    const o = outcome(+ref.slice(1));
    return ref[0] === 'W' ? o.winner : o.loser;
  }

  /* {home,away} resolved team codes (or null), plus the raw slot text for TBD
     labelling and a `provisional` flag for not-yet-settled group slots. */
  function participants(num) {
    if (memo.part[num] !== undefined) return memo.part[num];
    memo.part[num] = { home: null, away: null, homeRaw: '', awayRaw: '', homeProv: false, awayProv: false };
    const m = byNum[num];
    // Prefer the feed's CONFIRMED knockout pairing over our own projection.
    if (FEED_KO[num] && FEED_KO[num].home && FEED_KO[num].away) {
      memo.part[num] = { home: FEED_KO[num].home, away: FEED_KO[num].away, homeRaw: m[3], awayRaw: m[4], homeProv: false, awayProv: false, confirmed: true };
      return memo.part[num];
    }
    let h, a;
    if (m[8]) { h = resolveFeeder(m[8]); a = resolveFeeder(m[9]); memo.part[num].homeRaw = m[8]; memo.part[num].awayRaw = m[9]; }
    else { h = resolveSlot(m[3], num); a = resolveSlot(m[4], num); memo.part[num].homeRaw = m[3]; memo.part[num].awayRaw = m[4]; }
    const unwrap = (x, side) => { if (x && x.provisional) { memo.part[num][side + 'Prov'] = true; return x.ab; } return x; };
    memo.part[num].home = unwrap(h, 'home');
    memo.part[num].away = unwrap(a, 'away');
    return memo.part[num];
  }

  /* {winner, loser, decided} for a match, cascading through the bracket. */
  function outcome(num) {
    if (memo.out[num] !== undefined) return memo.out[num];
    memo.out[num] = { winner: null, loser: null, decided: false };
    const p = participants(num), r = oriented(num);
    if (p.home && p.away && r && isDecided(num)) {
      let w = null, l = null;
      if (r.h > r.a) { w = p.home; l = p.away; }
      else if (r.a > r.h) { w = p.away; l = p.home; }
      else if (r.pen) { if (r.pen[0] >= r.pen[1]) { w = p.home; l = p.away; } else { w = p.away; l = p.home; } }
      if (w) memo.out[num] = { winner: w, loser: l, decided: true };
    }
    return memo.out[num];
  }

  /* Display state for a single match. */
  function stateOf(num) {
    const p = participants(num), r = resultOf(num);
    if (r && (r.status === 'LIVE' || r.status === 'HT')) return 'live';   // feed says live
    if (isDecided(num)) return 'done';
    if (!p.home || !p.away) return 'tbd';
    // Teams known, no result yet: split on the REAL clock. If the scheduled
    // kickoff has passed, the match is underway (the ~daily feed just hasn't
    // posted it) — show "in play / awaiting", never a future countdown.
    return Date.now() >= kickoff(byNum[num]).getTime() ? 'awaiting' : 'upcoming';
  }

  /* Who is still alive in the tournament. */
  function survivors() {
    const entrants = new Set();
    S.M.filter(m => m[5] === 'R32').forEach(m => { const p = participants(m[0]); if (p.home) entrants.add(p.home); if (p.away) entrants.add(p.away); });
    const elim = new Set();
    S.M.filter(m => ['R32', 'R16', 'QF', 'SF'].includes(m[5])).forEach(m => { const o = outcome(m[0]); if (o.decided && o.loser) elim.add(o.loser); });
    const remaining = [...entrants].filter(c => !elim.has(c));
    return { entrants: [...entrants], remaining, elim: [...elim] };
  }

  /* Current live stage = first round not fully decided. */
  function currentStage() {
    for (const s of STAGES) { const ms = S.M.filter(m => s.codes.includes(m[5])); if (!ms.every(m => isDecided(m[0]))) return s; }
    return stageByKey.FIN;
  }

  /* ====================================================================== */
  /*  TIME — kickoff (canonical ET → real Date) + local formatting          */
  /* ====================================================================== */
  function parseET(time) {
    let h, mi = 0;
    if (time === '12a') h = 0;
    else if (time === '12p') h = 12;
    else if (time.endsWith('a')) { const x = time.slice(0, -1); if (x.includes(':')) { [h, mi] = x.split(':').map(Number); } else h = +x; if (h === 12) h = 0; }
    else if (time.endsWith('p')) { const x = time.slice(0, -1); if (x.includes(':')) { [h, mi] = x.split(':').map(Number); } else h = +x; if (h !== 12) h += 12; }
    else if (time.includes(':')) { [h, mi] = time.split(':').map(Number); if (h !== 12) h += 12; }
    else h = +time;
    return [h, mi];
  }
  function kickoff(m) { const [mo, dy] = m[1].split('/').map(Number); const [h, mi] = parseET(m[2]); return new Date(Date.UTC(2026, mo - 1, dy, h + 4, mi)); }
  const TZNAME = (Intl.DateTimeFormat().resolvedOptions().timeZone || 'local');
  function fmtLocal(d) { return d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
  /* Countdowns are measured against the REAL clock (not the feed's timestamp),
     so a match that has actually kicked off never shows a future countdown. */
  function countdown(d) {
    const ms = d.getTime() - Date.now(); if (ms <= 0) return null;
    const days = Math.floor(ms / 86400000), hrs = Math.floor(ms / 3600000) % 24, min = Math.floor(ms / 60000) % 60;
    if (days > 0) return days + 'd ' + hrs + 'h';
    if (hrs > 0) return hrs + 'h ' + min + 'm';
    return min + 'm';
  }

  /* ====================================================================== */
  /*  RENDER HELPERS                                                         */
  /* ====================================================================== */
  function labelSlot(raw) {
    if (/^1[A-L]$/.test(raw)) return 'Winner · Group ' + raw[1];
    if (/^2[A-L]$/.test(raw)) return 'Runner-up · Group ' + raw[1];
    if (raw === '3rd') return '3rd-place team';
    if (/^W\d+$/.test(raw)) return 'Winner of #' + raw.slice(1);
    if (/^L\d+$/.test(raw)) return 'Loser of #' + raw.slice(1);
    return raw;
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function teamRow(code, raw, opts) {
    opts = opts || {};
    if (code) {
      const cls = 'kteam' + (opts.win ? ' win' : '') + (opts.lose ? ' lose' : '') + (opts.prov || opts.proj ? ' prov' : '');
      const tag = opts.prov ? '<i class="ktag">provisional</i>' : opts.proj ? '<i class="ktag proj">projected</i>' : '';
      return `<div class="${cls}" data-team="${esc(code)}" title="Track ${esc(nameOf(code))}'s path">
        <img class="kflag" src="${flag(code)}" alt="" loading="lazy">
        <span class="kcode">${esc(code)}</span>
        <span class="kname">${esc(nameOf(code))}${tag}</span>
        <span class="kscore">${opts.score != null ? opts.score : ''}</span>
        ${opts.win ? '<span class="kadv" title="Advances">▶</span>' : opts.lose ? '<span class="kout">✕</span>' : '<span class="kadv-sp"></span>'}
      </div>`;
    }
    return `<div class="kteam tbd">
      <span class="kflag ph"></span>
      <span class="kcode">—</span>
      <span class="kname">${esc(labelSlot(raw))}</span>
      <span class="kscore"></span><span class="kadv-sp"></span>
    </div>`;
  }

  function pill(state, num) {
    if (state === 'live') { const r = resultOf(num); const mn = r && r.minute ? r.minute + "'" : (r && r.status === 'HT' ? 'HT' : 'LIVE'); return `<span class="kpill live"><span class="lvdot"></span>${mn}</span>`; }
    if (state === 'awaiting') {
      const mins = Math.floor((Date.now() - kickoff(byNum[num]).getTime()) / 60000);
      return mins <= 135
        ? `<span class="kpill awaiting" title="Kicked off per the schedule — the community feed hasn't posted a live score yet"><span class="lvdot"></span>IN PLAY</span>`
        : `<span class="kpill awaiting" title="This match has kicked off but the community feed hasn't posted the result yet — it updates roughly daily">AWAITING</span>`;
    }
    if (state === 'done') { const r = resultOf(num); const tag = r && r.status === 'PENS' ? 'PENS' : r && r.status === 'AET' ? 'AET' : 'FT'; return `<span class="kpill done">${tag}</span>`; }
    if (state === 'upcoming') { const cd = countdown(kickoff(byNum[num])); return `<span class="kpill soon">${cd ? 'in ' + cd : 'Upcoming'}</span>`; }
    return `<span class="kpill tbd">TBD</span>`;
  }

  function scorerList(list) {
    return (list || []).map(s => `<span class="ksc-1">${esc(s.n)} <span class="ksc-min">${esc(s.m)}'${s.og ? ' OG' : s.pk ? ' P' : ''}</span></span>`).join('');
  }
  function matchCard(num, opts) {
    opts = opts || {};
    const m = byNum[num], p = participants(num), r = oriented(num), o = outcome(num), st = stateOf(num);
    const hS = r && r.h != null ? r.h : null, aS = r && r.a != null ? r.a : null;
    const v = VEN[m[6]] || { city: m[6], stad: '' }, d = kickoff(m), chan = m[7];
    const winH = o.decided && o.winner === p.home, winA = o.decided && o.winner === p.away;
    const loseH = o.decided && o.loser === p.home, loseA = o.decided && o.loser === p.away;
    // Knockout teams we resolved ourselves (not yet confirmed by the feed) are projections.
    const koMatch = ['R32', 'R16', 'QF', 'SF', '3RD', 'FIN'].includes(m[5]);
    const projH = koMatch && !p.confirmed && !!p.home && !p.homeProv;
    const projA = koMatch && !p.confirmed && !!p.away && !p.awayProv;
    const pens = r && r.pen ? `<div class="kpens">Penalties ${r.pen[0]}–${r.pen[1]}</div>` : '';
    const sc = r && r.sc;
    const scorers = (!opts.compact && sc && (sc.h.length || sc.a.length))
      ? `<div class="kscorers"><div class="ksc-col">${scorerList(sc.h)}</div><span class="ksc-ball">⚽</span><div class="ksc-col a">${scorerList(sc.a)}</div></div>` : '';
    const roundLbl = m[5] === 'FIN' ? '🏆 Final' : m[5] === '3RD' ? '🥉 3rd place' : (stageByKey[m[5]] ? stageByKey[m[5]].label : m[5]);
    return `<article class="kcard kcard--${st}" data-num="${num}" data-teams="${(p.home || '') + ',' + (p.away || '')}">
      <header class="kcard-top">
        <span class="kround">${issueNums.has(num) ? '<span class="kwarnflag" title="Data check failed for this match">⚠</span> ' : ''}${roundLbl}${OVR.has(num) ? ' <span class="kmanual" title="Manually entered by the site owner — the live feed has not recorded it yet">✎ manual</span>' : ''}</span>
        ${pill(st, num)}
      </header>
      <div class="kteams">
        ${teamRow(p.home, p.homeRaw, { win: winH, lose: loseH, prov: p.homeProv, proj: projH, score: hS })}
        ${teamRow(p.away, p.awayRaw, { win: winA, lose: loseA, prov: p.awayProv, proj: projA, score: aS })}
      </div>
      ${pens}${scorers}
      <footer class="kcard-bot">
        <span class="kmeta">#${num} · ${fmtLocal(d)}</span>
        <span class="kmeta kvenue">${esc(v.city)}${chan ? ' · ' + esc(chan) : ''}</span>
      </footer>
    </article>`;
  }

  /* ---- survival funnel (48 → 1) ---------------------------------------- */
  function funnel() {
    const cur = currentStage();
    const sv = survivors();
    const steps = [
      { k: 'GS', n: 48, label: 'Groups' },
      { k: 'R32', n: 32, label: 'R32' },
      { k: 'R16', n: 16, label: 'R16' },
      { k: 'QF', n: 8, label: 'QF' },
      { k: 'SF', n: 4, label: 'SF' },
      { k: 'FIN', n: 2, label: 'Final' },
      { k: 'CH', n: 1, label: 'Champion' },
    ];
    const order = ['GS', 'R32', 'R16', 'QF', 'SF', 'FIN', 'CH'];
    const jump = { GS: 'groups', R32: 'r32', R16: 'r16', QF: 'qf', SF: 'sf', FIN: 'fin', CH: 'fin' };
    const curIdx = order.indexOf(cur.key === 'FIN' ? 'FIN' : cur.key);
    return '<div class="kfunnel">' + steps.map((s, i) => {
      const cls = i < curIdx ? 'past' : i === curIdx ? 'now' : 'future';
      const liveCount = (i === curIdx && cur.key !== 'GS') ? sv.remaining.length : s.n;
      return `<button class="kfstep ${cls}" data-jump="${jump[s.k]}" title="Go to ${esc(s.label)}"><b>${i === curIdx && cur.key !== 'GS' ? liveCount : s.n}</b><span>${s.label}</span></button>` +
        (i < steps.length - 1 ? '<span class="kfarrow">›</span>' : '');
    }).join('') + '</div>';
  }

  /* ---- tabs ------------------------------------------------------------- */
  function tabbar() {
    const tabs = [{ key: 'overview', tab: 'Overview' }, { key: 'groups', tab: 'Groups' }]
      .concat(STAGES.map(s => ({ key: s.key.toLowerCase(), tab: s.tab })));
    return '<div class="ktabs" role="tablist">' + tabs.map(t =>
      `<button class="ktab${activeTab === t.key ? ' on' : ''}" data-tab="${t.key}" role="tab">${t.tab}</button>`
    ).join('') + '</div>';
  }

  /* ---- round view ------------------------------------------------------- */
  function stageProgress(s) {
    const ms = S.M.filter(m => s.codes.includes(m[5]));
    const done = ms.filter(m => stateOf(m[0]) === 'done').length;
    const live = ms.filter(m => { const s = stateOf(m[0]); return s === 'live' || s === 'awaiting'; }).length;
    return { total: ms.length, done, live };
  }
  function roundView(s) {
    const ms = S.M.filter(m => s.codes.includes(m[5])).sort((a, b) => kickoff(a) - kickoff(b));
    const pr = stageProgress(s);
    const liveTxt = pr.live ? ` · <b class="lv">${pr.live} live</b>` : '';
    return `<div class="kround-head">
        <p class="eyebrow">${s.enter} teams → ${s.enter / 2 < 1 ? 1 : s.enter / 2} ${s.key === 'FIN' ? 'champion' : 'advance'}</p>
        <h2>${s.label}</h2>
        <p class="ksub">${s.sub}</p>
        <p class="kprog">${pr.done} of ${pr.total} played${liveTxt}</p>
      </div>
      <div class="kgrid">${ms.map(m => matchCard(m[0])).join('')}</div>`;
  }

  /* ---- groups view ------------------------------------------------------ */
  /* The eight best third-placed teams (and whether the group stage is done). */
  function bestThirds() {
    const gs = Object.keys(S.GROUPS);
    const thirds = gs.map(g => { const st = S.computeStandings(g, RESULTS); return st[2] ? Object.assign({ g }, st[2]) : null; }).filter(Boolean);
    thirds.sort((a, b) => (b.Pts - a.Pts) || (b.GD - a.GD) || (b.GF - a.GF) || (a.seed - b.seed));
    return { set: new Set(thirds.slice(0, 8).map(t => t.ab)), allDone: gs.every(groupComplete) };
  }
  function groupFixture(m) {
    const num = m[0], r = RESULTS[num], home = m[3], away = m[4];
    const played = r && r.h != null && r.a != null;
    let mid;
    if (played) mid = `<span class="kfx-sc">${r.h}<span class="kfx-dash">–</span>${r.a}</span>`;
    else mid = `<span class="kfx-v">${kickoff(m).toLocaleString([], { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>`;
    const hw = played && r.h > r.a, aw = played && r.a > r.h;
    return `<div class="kfx-row"><span class="kfx-t ${hw ? 'w' : ''}">${esc(home)}</span>${mid}<span class="kfx-t a ${aw ? 'w' : ''}">${esc(away)}</span></div>`;
  }
  function groupCard(g, thirdSet) {
    const st = S.computeStandings(g, RESULTS);
    const gm = S.M.filter(m => m[5] === g);
    const played = gm.filter(m => { const r = RESULTS[m[0]]; return r && r.h != null && r.a != null; }).length;
    const rows = st.map((t, i) => {
      const qcls = i < 2 ? 'q-adv' : i === 2 ? (thirdSet.has(t.ab) ? 'q-third in' : 'q-third out') : 'q-out';
      const tag = i === 2 ? (thirdSet.has(t.ab) ? '<i class="kqtag in">3rd · advancing</i>' : '<i class="kqtag out">3rd · out</i>') : '';
      return `<tr class="kgrow ${qcls}">
        <td class="kgpos">${i + 1}</td>
        <td class="kgteam"><img src="${flag(t.ab)}" alt="" loading="lazy"><b>${esc(t.ab)}</b><span class="kgnm">${esc(nameOf(t.ab))}</span>${tag}</td>
        <td>${t.P}</td><td>${t.W}</td><td>${t.D}</td><td>${t.L}</td><td>${t.GF}</td><td>${t.GA}</td>
        <td class="kgd">${t.GD > 0 ? '+' + t.GD : t.GD}</td><td class="kgpts">${t.Pts}</td>
      </tr>`;
    }).join('');
    const fixtures = gm.slice().sort((a, b) => kickoff(a) - kickoff(b)).map(groupFixture).join('');
    return `<section class="kgroup">
        <div class="kgroup-h"><h3>Group ${g}</h3><span class="kgroup-prog">${played}/${gm.length} played</span></div>
        <table class="kgtable"><thead><tr><th></th><th>Team</th><th title="Played">P</th><th>W</th><th>D</th><th>L</th><th title="Goals for">GF</th><th title="Goals against">GA</th><th title="Goal difference">GD</th><th>Pts</th></tr></thead><tbody>${rows}</tbody></table>
        <div class="kfix">${fixtures}</div>
      </section>`;
  }
  function groupsView() {
    const bt = bestThirds();
    const head = `<div class="kround-head">
        <p class="eyebrow">12 groups → 24 winners &amp; runners-up + 8 best thirds</p>
        <h2>Group stage</h2>
        <p class="ksub">Top two of every group advance, plus the eight best third-placed teams.</p>
        <p class="kglegend"><span class="kdot adv"></span> Through <span class="kdot third"></span> 3rd ${bt.allDone ? '— 8 best confirmed' : '— provisional'} <span class="kdot out"></span> Out</p>
      </div>
      <div class="kgroups">${Object.keys(S.GROUPS).map(g => groupCard(g, bt.set)).join('')}</div>`;
    return head;
  }

  /* ---- overview --------------------------------------------------------- */
  function overview() {
    const sv = survivors();
    const cur = currentStage();
    // remaining flags, then eliminated (greyed)
    const remHtml = sv.remaining.map(c => `<span class="kchip" data-team="${c}"><img src="${flag(c)}" alt="" loading="lazy"><b>${c}</b></span>`).join('');
    const elimHtml = sv.elim.map(c => `<span class="kchip out" data-team="${c}"><img src="${flag(c)}" alt="" loading="lazy"><b>${c}</b></span>`).join('');
    // in-play + up next (next 6 by kickoff, undecided) — in-play/awaiting first
    const liveish = s => (s === 'live' || s === 'awaiting') ? 1 : 0;
    const upcoming = S.M.filter(m => ['R32', 'R16', 'QF', 'SF', 'FIN', '3RD'].includes(m[5]))
      .filter(m => ['live', 'awaiting', 'upcoming'].includes(stateOf(m[0])))
      .sort((a, b) => liveish(stateOf(b[0])) - liveish(stateOf(a[0])) || kickoff(a) - kickoff(b))
      .slice(0, 6);
    // latest results (most recent decided)
    const latest = S.M.filter(m => ['R32', 'R16', 'QF', 'SF', 'FIN', '3RD'].includes(m[5]))
      .filter(m => stateOf(m[0]) === 'done').sort((a, b) => kickoff(b) - kickoff(a)).slice(0, 6);

    let html = `<div class="kover">`;
    html += `<section class="kpanel">
        <div class="kpanel-h"><h3>Still standing</h3><span class="kcount">${sv.remaining.length} of ${sv.entrants.length || 32}</span></div>
        <div class="kchips">${remHtml || '<em class="kmute">Resolves when the group stage finishes.</em>'}</div>
        ${elimHtml ? `<div class="kpanel-h sub"><h4>Eliminated</h4></div><div class="kchips dim">${elimHtml}</div>` : ''}
      </section>`;
    html += `<div class="kover-2col">`;
    html += `<section class="kpanel"><div class="kpanel-h"><h3>Live & up next</h3></div><div class="kgrid kgrid--mini">${upcoming.length ? upcoming.map(m => matchCard(m[0], { compact: true })).join('') : '<em class="kmute">Nothing scheduled.</em>'}</div></section>`;
    html += `<section class="kpanel"><div class="kpanel-h"><h3>Latest results</h3></div><div class="kgrid kgrid--mini">${latest.length ? latest.map(m => matchCard(m[0], { compact: true })).join('') : '<em class="kmute">No knockout matches played yet.</em>'}</div></section>`;
    html += `</div></div>`;
    return html;
  }

  /* ====================================================================== */
  /*  TOP-LEVEL RENDER                                                       */
  /* ====================================================================== */
  function headerStatus() {
    const cur = currentStage();
    const sv = survivors();
    if (cur.key === 'GS') return 'Group stage in progress';
    const pr = stageProgress(cur);
    const allDone = STAGES.every(s => S.M.filter(m => s.codes.includes(m[5])).every(m => isDecided(m[0])));
    if (allDone) { const champ = outcome(104).winner; return champ ? '🏆 ' + nameOf(champ) + ' are World Champions' : 'Tournament complete'; }
    return `${cur.label} · ${pr.done}/${pr.total} played${pr.live ? ' · ' + pr.live + ' live' : ''} · ${sv.remaining.length} teams still in`;
  }

  function fmtAbs(ms) { return ms ? new Date(ms).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'; }

  /* Compact freshness strip for the TOP — badge + the two timestamps + Refresh.
     The verbose limitations live in dataCaveat() at the bottom of the page. */
  function dataStrip(v) {
    const isSample = SOURCE === 'sample', isFeed = SOURCE === 'openfootball';
    const stale = isFeed && UPDATED && v.ageMs > 36 * 3600000;
    const badge = isSample ? '<span class="kbadge sample">● SAMPLE DATA</span>'
      : isFeed ? `<span class="kbadge near">● NEAR-LIVE${stale ? ' · STALE' : ''}</span>`
        : UPDATED ? '<span class="kbadge live">● LIVE DATA</span>' : '<span class="kbadge stale">● NO DATA</span>';
    const pulledAge = PULLED ? fmtAge(Date.now() - PULLED) : '—';
    const updTxt = UPDATED ? `${fmtAbs(UPDATED)} <span class="kdim">(${fmtAge(v.ageMs)})</span>` : '—';
    const ovr = OVR.size ? ` <span class="kdim">· +${OVR.size} manual</span>` : '';
    return `<div class="kstrip">
        ${badge}
        <span class="kstrip-txt">refreshed <b>${esc(pulledAge)}</b> · source updated <b>${updTxt}</b>${ovr}</span>
        <button id="krefresh" class="kbtn-sync${SYNCING ? ' busy' : ''}"${SYNCING ? ' disabled' : ''}>${SYNCING ? '<span class="spin"></span> Pulling…' : '↻ Refresh data'}</button>
      </div>`;
  }

  /* The verbose "about this data" caveat — moved to the BOTTOM so it doesn't
     crowd the top. Explains the feed's limitations + any manual entries. */
  function dataCaveat() {
    const isFeed = SOURCE === 'openfootball', isSample = SOURCE === 'sample';
    const lines = [];
    if (isFeed) lines.push(`Live results come from <a href="${esc(SRCURL)}" target="_blank" rel="noopener">openfootball</a>, a free community feed. It is <u>not</u> an in-match live ticker — scores are entered by volunteers, usually within a day of a match ending, so a result can lag by hours and the odd match may be missing or wrong. Knockout matchups the feed hasn’t confirmed yet are shown as <i>projections</i>. For anything that matters, check the official FIFA app or your broadcaster.`);
    else if (isSample) lines.push(`<b>Sample data:</b> the live feed was unreachable, so these are illustrative placeholder scores — <b>not real results</b>. Use “Refresh data” above to retry the live feed (openfootball).`);
    if (OVR.size) lines.push(`<b>Manually added:</b> ${OVR.size} owner-entered result${OVR.size > 1 ? 's' : ''} the feed hasn’t recorded yet <span class="kdim">(last edited ${esc(fmtAbs(OVR_UPDATED))})</span>.`);
    const inPlay = S.M.filter(m => stateOf(m[0]) === 'awaiting').length;
    if (isFeed && inPlay) lines.push(`<b>In play now:</b> ${inPlay} match${inPlay > 1 ? 'es have' : ' has'} kicked off (per the schedule) but the feed hasn’t posted a score yet — they’ll fill in on the next update. You can hand-enter one in <code>overrides.json</code> to show it instantly.`);
    if (!lines.length) return '';
    return `<aside class="kcaveat">
        <h4>About this data</h4>
        ${lines.map(l => '<p>' + l + '</p>').join('')}
        <p class="kcaveat-tz">Match times shown in ${esc(TZNAME)}.</p>
      </aside>`;
  }

  /* Accuracy guard: surfaces matches whose status contradicts the schedule. */
  function validationBanner(v) {
    if (!v.issues.length) return '';
    return `<div class="kwarn"><p>⚠ <b>${v.issues.length} data check${v.issues.length > 1 ? 's' : ''} flagged</b> (status vs. schedule): ${esc(v.issues.slice(0, 4).map(i => i.msg).join('; '))}${v.issues.length > 4 ? ' …' : ''}</p></div>`;
  }

  function render() {
    memo = { part: {}, out: {}, thirdByMatch: {} };
    computeThirds();
    const v = validate();
    issueNums = new Set(v.issues.map(i => i.num));

    let body = '';
    if (activeTab === 'overview') body = overview();
    else if (activeTab === 'groups') body = groupsView();
    else { const s = stageByKey[activeTab.toUpperCase()]; body = s ? roundView(s) : overview(); }

    $('#kapp').innerHTML =
      `<header class="khero">
         <span class="status-chip"><span class="dot"></span><span>${esc(headerStatus())}</span></span>
         <h1 class="khead">The Road to the <span class="grad-text">Final</span></h1>
         ${dataStrip(v)}
         ${funnel()}
         ${validationBanner(v)}
       </header>
       ${tabbar()}
       <div id="khilite-bar" class="khilite"></div>
       <main class="ktabpane">${body}</main>
       ${dataCaveat()}`;

    // wire tabs + funnel jumps + fresh-pull + team tracking
    $$('.ktab').forEach(b => b.addEventListener('click', () => { setTab(b.dataset.tab); }));
    $$('.kfstep[data-jump]').forEach(b => b.addEventListener('click', () => { setTab(b.dataset.jump); }));
    const rb = $('#krefresh'); if (rb) rb.addEventListener('click', syncAll);
    $$('.kchip[data-team], .kteam[data-team]').forEach(c => c.addEventListener('click', () => setHilite(c.dataset.team)));
    applyHilite();
  }

  function setTab(t) { activeTab = t; location.hash = t; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  /* "Path to glory": track one team's matches across every tab. Toggles without
     a full re-render so the scroll position and tab stay put. */
  function setHilite(code) { HILITE = (HILITE === code) ? '' : code; applyHilite(); }
  function applyHilite() {
    const kapp = $('#kapp'); if (kapp) kapp.classList.toggle('tracking', !!HILITE);
    $$('.kcard').forEach(c => { const t = (c.dataset.teams || '').split(','); c.classList.toggle('hot', !!HILITE && t.includes(HILITE)); });
    $$('.kchip[data-team], .kteam[data-team]').forEach(c => c.classList.toggle('tracked', !!HILITE && c.dataset.team === HILITE));
    const bar = $('#khilite-bar'); if (!bar) return;
    if (HILITE) {
      bar.innerHTML = `<img src="${flag(HILITE)}" alt=""><span>Tracking <b>${esc(nameOf(HILITE))}</b> across all rounds</span><button class="khilite-x" id="khilite-clear" type="button">clear ✕</button>`;
      bar.classList.add('on');
      const x = $('#khilite-clear'); if (x) x.addEventListener('click', () => setHilite(HILITE));
    } else { bar.classList.remove('on'); bar.innerHTML = ''; }
  }

  /* ====================================================================== */
  /*  DATA — fetch + poll results.json                                      */
  /* ====================================================================== */
  /* Apply a payload from the live feed (feed.js → openfootball). */
  function applyFeed(d) {
    RESULTS = d.results || {}; FEED_KO = d.koTeams || {};
    UPDATED = d.updated || 0; PULLED = d.pulled || Date.now(); SOURCE = d.source || 'live';
    NOTE = d.note || ''; SRCURL = d.url || ''; NOW = UPDATED || Date.now();
  }
  /* Apply the bundled sample file (offline / fallback). */
  function applyData(data) {
    RESULTS = (data && data.results) || {}; FEED_KO = {};
    UPDATED = (data && Date.parse(data.updated)) || 0; PULLED = Date.now();
    SOURCE = (data && data.source) || '';
    NOTE = ''; SRCURL = ''; NOW = UPDATED || Date.now();
  }
  function loadSample() {
    return fetch('results.json?t=' + Date.now(), { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(r.status)).then(applyData);
  }
  /* Overlay owner-entered manual results (overrides.json) on top of the base
     data. Overrides win and are flagged in the UI. Because an override means a
     match has finished, advance the "as of" clock so validation/countdowns stay
     consistent with the feed's older timestamp. */
  function mergeOverrides() {
    OVR = new Set(); OVR_UPDATED = 0;
    if (!window.WC_FEED || !window.WC_FEED.overrides) return Promise.resolve();
    return window.WC_FEED.overrides().then(ovr => {
      if (!ovr) return;
      OVR_UPDATED = ovr.updated || 0;
      Object.keys(ovr.results).forEach(k => { RESULTS[k] = Object.assign({}, ovr.results[k], { src: 'manual' }); OVR.add(+k); });
      if (OVR_UPDATED > NOW) NOW = OVR_UPDATED;
    });
  }
  /* The unified loader: live feed first (unless ?data=sample), else the bundled
     sample, then overlay manual overrides. The page is never left blank. */
  function loadData(manual) {
    if (manual) { SYNCING = true; render(); }
    const tryFeed = FORCE !== 'sample' && window.WC_FEED;
    const base = tryFeed ? window.WC_FEED.load().then(applyFeed).catch(() => loadSample()) : loadSample();
    return base
      .then(() => mergeOverrides())
      .then(() => {
        const y = window.scrollY;            // keep the reader where they were
        SYNCING = false; render();
        window.scrollTo(0, y);
        if (manual) {
          const extra = OVR.size ? ' + ' + OVR.size + ' manual' : '';
          toast(SOURCE === 'openfootball' ? 'Pulled live data · openfootball' + extra
            : (FORCE === 'sample' ? 'Showing sample data' + extra : 'Live feed unavailable — showing sample' + extra),
            SOURCE !== 'openfootball' && FORCE !== 'sample');
        }
      })
      .catch(() => { SYNCING = false; if (!Object.keys(RESULTS).length) RESULTS = {}; render(); if (manual) toast('No data available', true); });
  }
  const syncAll = () => { if (!SYNCING) loadData(true); };

  /* Orient a result's score to a match's resolved home/away. Feed knockout
     results carry the openfootball team codes (_t1/_t2); group results are
     already stored home-oriented. */
  function oriented(num) {
    const r = resultOf(num); if (!r) return r;
    if (!r._t1) return r;                          // group result: already home-oriented (incl. r.sc)
    const p = participants(num);
    const swapped = p.home === r._t2 && p.away === r._t1;
    const base = swapped
      ? { h: r.a, a: r.h, status: r.status, minute: r.minute, pen: r.pen ? [r.pen[1], r.pen[0]] : undefined, _t1: r._t1, _t2: r._t2 }
      : { h: r.h, a: r.a, status: r.status, minute: r.minute, pen: r.pen, _t1: r._t1, _t2: r._t2 };
    base.sc = { h: swapped ? (r.g2 || []) : (r.g1 || []), a: swapped ? (r.g1 || []) : (r.g2 || []) };
    return base;
  }
  function toast(msg, bad) {
    let t = document.getElementById('ktoast');
    if (!t) { t = document.createElement('div'); t.id = 'ktoast'; document.body.appendChild(t); }
    t.className = 'ktoast' + (bad ? ' bad' : '') + ' show'; t.textContent = msg;
    clearTimeout(toast._t); toast._t = setTimeout(() => { t.className = 'ktoast' + (bad ? ' bad' : ''); }, 2800);
  }

  /* ====================================================================== */
  /*  VALIDATION — catch data that disagrees with the clock                 */
  /*  (e.g. a match marked FT while its kickoff window is still in play —    */
  /*   the Brazil v Japan class of bug). Compared against NOW = pull time.   */
  /* ====================================================================== */
  function validate() {
    const issues = [];
    const PLAY = 115 * 60000, MAXLIVE = 165 * 60000;
    S.M.forEach(m => {
      const num = m[0], r = resultOf(num); if (!r || !r.status) return;
      const ko = kickoff(m).getTime(), st = r.status;
      if (['FT', 'AET', 'PENS'].includes(st)) {
        if (NOW < ko) issues.push({ num, msg: '#' + num + ' marked ' + st + ' before kickoff' });
        else if (NOW < ko + PLAY) issues.push({ num, msg: '#' + num + ' marked ' + st + ' but should still be in play' });
      } else if (st === 'LIVE' || st === 'HT') {
        if (NOW < ko - 2 * 60000) issues.push({ num, msg: '#' + num + ' marked LIVE before kickoff' });
        else if (NOW > ko + MAXLIVE) issues.push({ num, msg: '#' + num + ' has been LIVE too long — data looks stale' });
      }
    });
    return { issues, ageMs: Date.now() - (UPDATED || Date.now()) };
  }
  function fmtAge(ms) {
    const min = Math.round(ms / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return min + ' min ago';
    const h = Math.round(min / 60); if (h < 36) return h + 'h ago';
    const d = Math.round(h / 24); if (d < 45) return d + ' days ago';
    return Math.round(d / 30) + ' months ago';
  }

  /* ---- tiny DOM helpers ------------------------------------------------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return [...(r || document).querySelectorAll(s)]; }

  /* ---- boot ------------------------------------------------------------- */
  window.addEventListener('hashchange', () => { const t = (location.hash || '#overview').slice(1); if (t !== activeTab) { activeTab = t; render(); } });
  render();                    // first paint (empty → resolves to TBD)
  loadData(false);             // then pull the live feed (falls back to sample)
  setInterval(() => loadData(false), 5 * 60000);   // refresh every 5 min
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadData(false); });
})();
