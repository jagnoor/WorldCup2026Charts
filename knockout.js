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
  let RESULTS = {};                 // {matchNum: {h,a,status,minute,pen}}
  let UPDATED = 0;                  // Date.parse(results.updated) — when data was pulled
  let SOURCE = '';                  // 'sample' | 'live' | '' (declared by results.json)
  let NOW = Date.now();             // the "as of" clock = the data-pull time (UPDATED)
  let SYNCING = false;              // true while a manual fresh pull is in flight
  let issueNums = new Set();         // match numbers that failed a validation check
  let activeTab = (location.hash || '#overview').slice(1);
  let memo;                         // per-render resolution cache

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
    const p = participants(num), r = resultOf(num);
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
    if (!p.home || !p.away) {
      if (r && (r.status === 'LIVE' || r.status === 'HT')) return 'live';
      if (r && isDecided(num)) return 'done';
      return 'tbd';
    }
    if (r && (r.status === 'LIVE' || r.status === 'HT')) return 'live';
    if (isDecided(num)) return 'done';
    return 'upcoming';
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
  function countdown(d) {
    const ms = d.getTime() - NOW; if (ms <= 0) return null;
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
      const cls = 'kteam' + (opts.win ? ' win' : '') + (opts.lose ? ' lose' : '') + (opts.prov ? ' prov' : '');
      return `<div class="${cls}">
        <img class="kflag" src="${flag(code)}" alt="" loading="lazy">
        <span class="kcode">${esc(code)}</span>
        <span class="kname">${esc(nameOf(code))}${opts.prov ? '<i class="ktag">provisional</i>' : ''}</span>
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
    if (state === 'done') { const r = resultOf(num); const tag = r && r.status === 'PENS' ? 'PENS' : r && r.status === 'AET' ? 'AET' : 'FT'; return `<span class="kpill done">${tag}</span>`; }
    if (state === 'upcoming') { const cd = countdown(kickoff(byNum[num])); return `<span class="kpill soon">${cd ? 'in ' + cd : 'Upcoming'}</span>`; }
    return `<span class="kpill tbd">TBD</span>`;
  }

  function matchCard(num) {
    const m = byNum[num], p = participants(num), r = resultOf(num), o = outcome(num), st = stateOf(num);
    const hS = r && r.h != null ? r.h : null, aS = r && r.a != null ? r.a : null;
    const v = VEN[m[6]] || { city: m[6], stad: '' }, d = kickoff(m), chan = m[7];
    const winH = o.decided && o.winner === p.home, winA = o.decided && o.winner === p.away;
    const loseH = o.decided && o.loser === p.home, loseA = o.decided && o.loser === p.away;
    const pens = r && r.pen ? `<div class="kpens">Penalties ${r.pen[0]}–${r.pen[1]}</div>` : '';
    const roundLbl = m[5] === 'FIN' ? '🏆 Final' : m[5] === '3RD' ? '🥉 3rd place' : (stageByKey[m[5]] ? stageByKey[m[5]].label : m[5]);
    return `<article class="kcard kcard--${st}" data-num="${num}" data-teams="${(p.home || '') + ',' + (p.away || '')}">
      <header class="kcard-top">
        <span class="kround">${issueNums.has(num) ? '<span class="kwarnflag" title="Data check failed for this match">⚠</span> ' : ''}${roundLbl}</span>
        ${pill(st, num)}
      </header>
      <div class="kteams">
        ${teamRow(p.home, p.homeRaw, { win: winH, lose: loseH, prov: p.homeProv, score: hS })}
        ${teamRow(p.away, p.awayRaw, { win: winA, lose: loseA, prov: p.awayProv, score: aS })}
      </div>
      ${pens}
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
    const curIdx = order.indexOf(cur.key === 'FIN' ? 'FIN' : cur.key);
    return '<div class="kfunnel">' + steps.map((s, i) => {
      const cls = i < curIdx ? 'past' : i === curIdx ? 'now' : 'future';
      const liveCount = (i === curIdx && cur.key !== 'GS') ? sv.remaining.length : s.n;
      return `<div class="kfstep ${cls}"><b>${i === curIdx && cur.key !== 'GS' ? liveCount : s.n}</b><span>${s.label}</span></div>` +
        (i < steps.length - 1 ? '<span class="kfarrow">›</span>' : '');
    }).join('') + '</div>';
  }

  /* ---- tabs ------------------------------------------------------------- */
  function tabbar() {
    const tabs = [{ key: 'overview', tab: 'Overview' }].concat(STAGES.map(s => ({ key: s.key.toLowerCase(), tab: s.tab })));
    return '<div class="ktabs" role="tablist">' + tabs.map(t =>
      `<button class="ktab${activeTab === t.key ? ' on' : ''}" data-tab="${t.key}" role="tab">${t.tab}</button>`
    ).join('') + '</div>';
  }

  /* ---- round view ------------------------------------------------------- */
  function stageProgress(s) {
    const ms = S.M.filter(m => s.codes.includes(m[5]));
    const done = ms.filter(m => stateOf(m[0]) === 'done').length;
    const live = ms.filter(m => stateOf(m[0]) === 'live').length;
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

  /* ---- overview --------------------------------------------------------- */
  function overview() {
    const sv = survivors();
    const cur = currentStage();
    // remaining flags, then eliminated (greyed)
    const remHtml = sv.remaining.map(c => `<span class="kchip" data-team="${c}"><img src="${flag(c)}" alt="" loading="lazy"><b>${c}</b></span>`).join('');
    const elimHtml = sv.elim.map(c => `<span class="kchip out" data-team="${c}"><img src="${flag(c)}" alt="" loading="lazy"><b>${c}</b></span>`).join('');
    // live + up next (next 6 by kickoff, undecided)
    const upcoming = S.M.filter(m => ['R32', 'R16', 'QF', 'SF', 'FIN', '3RD'].includes(m[5]))
      .filter(m => stateOf(m[0]) === 'live' || stateOf(m[0]) === 'upcoming')
      .sort((a, b) => (stateOf(b[0]) === 'live' ? 1 : 0) - (stateOf(a[0]) === 'live' ? 1 : 0) || kickoff(a) - kickoff(b))
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
    html += `<section class="kpanel"><div class="kpanel-h"><h3>Live & up next</h3></div><div class="kgrid kgrid--mini">${upcoming.length ? upcoming.map(m => matchCard(m[0])).join('') : '<em class="kmute">Nothing scheduled.</em>'}</div></section>`;
    html += `<section class="kpanel"><div class="kpanel-h"><h3>Latest results</h3></div><div class="kgrid kgrid--mini">${latest.length ? latest.map(m => matchCard(m[0])).join('') : '<em class="kmute">No knockout matches played yet.</em>'}</div></section>`;
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

  function dataStatusBar(v) {
    const abs = UPDATED ? new Date(UPDATED).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
    const age = UPDATED ? fmtAge(v.ageMs) : 'never';
    const isSample = SOURCE === 'sample';
    const stale = !isSample && UPDATED && v.ageMs > 5 * 60000;
    const badge = isSample ? '<span class="kbadge sample">● SAMPLE DATA</span>'
      : stale ? '<span class="kbadge stale">● DATA MAY BE STALE</span>'
        : UPDATED ? '<span class="kbadge live">● LIVE DATA</span>' : '<span class="kbadge stale">● NO DATA</span>';
    return `<div class="kdata">
        ${badge}
        <span class="kdata-txt">Last data pull <b>${esc(abs)}</b> · ${esc(age)}</span>
        <span class="kdata-tz">times in ${esc(TZNAME)}</span>
        <button id="krefresh" class="kbtn-sync${SYNCING ? ' busy' : ''}"${SYNCING ? ' disabled' : ''}>${SYNCING ? '<span class="spin"></span> Pulling…' : '↻ Refresh data'}</button>
      </div>`;
  }
  function warningBanner(v) {
    const parts = [];
    if (SOURCE === 'sample') parts.push('You’re viewing <b>sample data</b>, not a live feed — scores will not match real matches. Wire a feed (see BACKLOG) and this turns live.');
    if (v.issues.length) parts.push('⚠ <b>' + v.issues.length + ' data check' + (v.issues.length > 1 ? 's' : '') + ' failed:</b> ' + esc(v.issues.slice(0, 3).map(i => i.msg).join('; ')) + (v.issues.length > 3 ? ' …' : ''));
    return parts.length ? `<div class="kwarn">${parts.map(p => '<p>' + p + '</p>').join('')}</div>` : '';
  }

  function render() {
    memo = { part: {}, out: {}, thirdByMatch: {} };
    computeThirds();
    const v = validate();
    issueNums = new Set(v.issues.map(i => i.num));

    let body = '';
    if (activeTab === 'overview') body = overview();
    else { const s = stageByKey[activeTab.toUpperCase()]; body = s ? roundView(s) : overview(); }

    $('#kapp').innerHTML =
      `<header class="khero">
         <span class="status-chip"><span class="dot"></span><span>${esc(headerStatus())}</span></span>
         <h1 class="khead">The Road to the <span class="grad-text">Final</span></h1>
         ${dataStatusBar(v)}
         ${funnel()}
         ${warningBanner(v)}
       </header>
       ${tabbar()}
       <main class="ktabpane">${body}</main>`;

    // wire tabs + fresh-pull + team highlight
    $$('.ktab').forEach(b => b.addEventListener('click', () => { setTab(b.dataset.tab); }));
    const rb = $('#krefresh'); if (rb) rb.addEventListener('click', syncAll);
    $$('.kchip[data-team]').forEach(c => c.addEventListener('click', () => highlightTeam(c.dataset.team)));
  }

  function setTab(t) { activeTab = t; location.hash = t; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  function highlightTeam(code) {
    $$('.kcard').forEach(c => { const t = (c.dataset.teams || '').split(','); c.classList.toggle('hot', t.includes(code)); });
  }

  /* ====================================================================== */
  /*  DATA — fetch + poll results.json                                      */
  /* ====================================================================== */
  function applyData(data) {
    RESULTS = (data && data.results) || {};
    UPDATED = (data && Date.parse(data.updated)) || 0;
    SOURCE = (data && data.source) || '';
    NOW = UPDATED || Date.now();              // judge match windows against the pull time
  }
  /* Silent background refresh (the 30s interval / tab-focus). */
  function poll(force) {
    fetch('results.json' + (force ? '?t=' + Date.now() : ''), { cache: force ? 'no-store' : 'default' })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { applyData(d); render(); })
      .catch(() => { if (!UPDATED && !Object.keys(RESULTS).length) { RESULTS = {}; render(); } });
  }
  /* Manual FRESH PULL — hard, cache-busted re-fetch with a visible busy state
     and a toast. This is the "refresh all the data" action. */
  function syncAll() {
    if (SYNCING) return;
    SYNCING = true; render();
    fetch('results.json?t=' + Date.now(), { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { applyData(d); SYNCING = false; render(); toast('Data refreshed · ' + (SOURCE === 'sample' ? 'sample data (not live)' : 'live')); })
      .catch(() => { SYNCING = false; render(); toast('Refresh failed — keeping last good data', true); });
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
  poll(false);                 // then load live data
  setInterval(() => poll(true), 30000);   // and keep it live
  document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(true); });
})();
