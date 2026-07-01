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
  let FEED_IDS = {};                // {matchNum: espnEventId} for the detail view
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
  let PREV = null;                   // last seen results signature, for goal detection
  let CHAMP_SEEN = false;            // have we already celebrated the champion?
  let activeTab = (location.hash || '#overview').slice(1);
  let didAutoTab = false;           // have we auto-opened the current round yet? (first load only)
  let memo;                         // per-render resolution cache
  const FORCE = new URLSearchParams(location.search).get('data'); // 'sample' | 'live' override

  /* ====================================================================== */
  /*  i18n — English by default, Spanish when ?lang=es (mirrors the builder) */
  /* ====================================================================== */
  const ES = new URLSearchParams(location.search).get('lang') === 'es';
  document.documentElement.lang = ES ? 'es' : 'en';
  const TX = {
    road: ES ? 'El camino a la' : 'The Road to the',
    groupStage: ES ? 'Fase de grupos en curso' : 'Group stage in progress',
    complete: ES ? 'Torneo finalizado' : 'Tournament complete',
    champions: nm => ES ? `🏆 ${nm}: ¡campeones del mundo!` : `🏆 ${nm} are World Champions`,
    status: (label, done, total, live, remain) => ES
      ? `${label} · ${done}/${total} jugados${live ? ' · ' + live + ' en vivo' : ''} · quedan ${remain} equipos`
      : `${label} · ${done}/${total} played${live ? ' · ' + live + ' live' : ''} · ${remain} teams still in`,
    tabOverview: ES ? 'Resumen' : 'Overview',
    tabGroups: ES ? 'Grupos' : 'Groups',
    stageTab: ES ? { R32: 'Dieciseisavos', R16: 'Octavos', QF: 'Cuartos', SF: 'Semis', FIN: 'Final' }
                 : { R32: 'Round of 32', R16: 'Round of 16', QF: 'Quarterfinals', SF: 'Semifinals', FIN: 'Final' },
    stageLabel: ES ? { R32: 'Dieciseisavos de final', R16: 'Octavos de final', QF: 'Cuartos de final', SF: 'Semifinales', FIN: 'La Final' } : null,
    stageSub: ES ? { R32: '32 equipos. 16 sobreviven. Sin segundas oportunidades.', R16: 'Los últimos 16. Ganar o volver a casa.', QF: 'Quedan ocho. Cada jugada es historia.', SF: 'Tan cerca que ya lo saborean.', FIN: 'Un partido. Un trofeo. Para siempre.' } : null,
    teamsArrow: (enter, out, isFinal) => ES
      ? `${enter} equipos → ${out} ${isFinal ? 'campeón' : 'avanzan'}`
      : `${enter} teams → ${out} ${isFinal ? 'champion' : 'advance'}`,
    played: (done, total, live) => ES
      ? `${done} de ${total} jugados${live ? ` · <b class="lv">${live} en vivo</b>` : ''}`
      : `${done} of ${total} played${live ? ` · <b class="lv">${live} live</b>` : ''}`,
    today: ES ? 'Hoy' : 'Today',
    nextUp: ES ? 'Próximos' : 'Next up',
    todayMeta: (n, live) => ES
      ? `${n} partido${n > 1 ? 's' : ''}${live ? ' · <b class="lv">' + live + ' en vivo</b>' : ''} · horas en tu zona`
      : `${n} match${n > 1 ? 'es' : ''}${live ? ' · <b class="lv">' + live + ' live</b>' : ''} · times in your zone`,
    pLive: ES ? 'EN VIVO' : 'LIVE', pInPlay: ES ? 'EN JUEGO' : 'IN PLAY', pAwaiting: ES ? 'PENDIENTE' : 'AWAITING',
    pUpcoming: ES ? 'Próximo' : 'Upcoming', inT: cd => (ES ? 'en ' : 'in ') + cd,
    fGroups: ES ? 'Grupos' : 'Groups', fFinal: 'Final', fChampion: ES ? 'Campeón' : 'Champion',
    bSample: ES ? '● DATOS DE MUESTRA' : '● SAMPLE DATA', bNear: ES ? '● CASI EN VIVO' : '● NEAR-LIVE',
    bStale: ES ? ' · ANTIGUO' : ' · STALE', bLiveData: ES ? '● DATOS EN VIVO' : '● LIVE DATA', bNoData: ES ? '● SIN DATOS' : '● NO DATA',
    refreshed: ES ? 'actualizado' : 'refreshed', srcUpdated: ES ? 'fuente actualizada' : 'source updated',
    refreshBtn: ES ? '↻ Actualizar' : '↻ Refresh data', pulling: ES ? 'Actualizando…' : 'Pulling…',
    stillStanding: ES ? 'Siguen en pie' : 'Still standing', ofWord: ES ? 'de' : 'of',
    resolvesGroups: ES ? 'Se define cuando termine la fase de grupos.' : 'Resolves when the group stage finishes.',
    eliminated: ES ? 'Eliminados' : 'Eliminated',
    liveUpNext: ES ? 'En vivo y próximos' : 'Live & up next', nothingSched: ES ? 'Nada programado.' : 'Nothing scheduled.',
    latestResults: ES ? 'Últimos resultados' : 'Latest results', noKoYet: ES ? 'Aún no hay partidos de eliminatorias.' : 'No knockout matches played yet.',
    theBracket: ES ? 'El cuadro' : 'The bracket', tapDetails: ES ? 'toca un partido para ver detalles' : 'tap a match for details',
    thirdPlace: ES ? '🥉 3.º puesto' : '🥉 3rd place', manual: ES ? '✎ manual' : '✎ manual',
    aboutData: ES ? 'Sobre estos datos' : 'About this data',
    timesIn: tz => ES ? `Horarios mostrados en ${tz}.` : `Match times shown in ${tz}.`,
    tzLabel: ES ? 'Zona horaria' : 'Time zone',
    tzAuto: ES ? 'Automática (tu dispositivo)' : 'Auto (your device)',
    addCal: ES ? 'Añadir al calendario' : 'Add to calendar',
    addRoundCal: ES ? 'Añadir la ronda al calendario' : 'Add round to calendar',
    close: ES ? 'Cerrar' : 'Close',
    mLoading: ES ? 'Cargando detalles del partido…' : 'Loading match details…',
    mGoals: ES ? 'Goles' : 'Goals',
    mTimeline: ES ? 'Cronología' : 'Timeline',
    mStats: ES ? 'Estadísticas del partido' : 'Match stats',
    mNone: ES ? 'Aún no hay cronología ni estadísticas de este partido.' : 'No timeline or stats posted for this match yet.',
    mNoTl: ES ? 'Aún no hay cronología detallada de este partido' : 'No detailed timeline for this match yet',
    mRicher: ES ? ' (hay más estadísticas cuando ESPN es la fuente en vivo)' : ' (richer stats appear when ESPN is the live source)',
    mEspnFail: ES ? '(No se pudieron cargar las estadísticas en vivo de ESPN.)' : '(Live stats from ESPN couldn’t be loaded.)',
    statLabels: ES ? { 'Possession': 'Posesión', 'Shots': 'Tiros', 'On target': 'A puerta', 'Corners': 'Córners', 'Fouls': 'Faltas', 'Yellow cards': 'Amarillas', 'Red cards': 'Rojas' } : null,
  };
  const stageTabTx = k => (TX.stageTab[k] || k);

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

  /* Which tab to open on first load: the group stage while it's still running,
     otherwise the current knockout round (e.g. Round of 32) — never a stale
     Overview. Runs once, and only when the visitor didn't request a #tab. */
  function defaultTab() {
    const groupsDone = Object.keys(S.GROUPS).every(groupComplete);
    return groupsDone ? currentStage().key.toLowerCase() : 'groups';
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
  /* Viewer-chosen timezone. Kickoff Dates are UTC-anchored, so we just format them
     with an explicit IANA `timeZone` (or the device default when 'auto'). */
  const TZONES = [
    { id: 'auto', label: TX.tzAuto },
    { id: 'America/Vancouver', label: 'Vancouver · PT' },
    { id: 'America/Los_Angeles', label: 'Los Angeles · PT' },
    { id: 'America/Denver', label: 'Denver · MT' },
    { id: 'America/Mexico_City', label: 'Mexico City · CT' },
    { id: 'America/Chicago', label: 'Chicago · CT' },
    { id: 'America/New_York', label: 'New York · ET' },
    { id: 'America/Toronto', label: 'Toronto · ET' },
    { id: 'America/Sao_Paulo', label: 'São Paulo' },
    { id: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires' },
    { id: 'Europe/London', label: 'London · UK' },
    { id: 'Europe/Madrid', label: 'Madrid' },
    { id: 'Europe/Paris', label: 'Paris' },
    { id: 'Europe/Berlin', label: 'Berlin' },
    { id: 'Africa/Casablanca', label: 'Casablanca' },
    { id: 'Africa/Lagos', label: 'Lagos' },
    { id: 'Asia/Riyadh', label: 'Riyadh' },
    { id: 'Asia/Tehran', label: 'Tehran' },
    { id: 'Asia/Seoul', label: 'Seoul' },
    { id: 'Asia/Tokyo', label: 'Tokyo · JST' },
    { id: 'Australia/Sydney', label: 'Sydney' },
    { id: 'Pacific/Auckland', label: 'Auckland' },
    { id: 'UTC', label: 'UTC' },
  ];
  let TZSEL = 'auto';
  try { const s = localStorage.getItem('wc_hub_tz'); if (s && TZONES.some(z => z.id === s)) TZSEL = s; } catch (e) { }
  function tzo() { return TZSEL === 'auto' ? {} : { timeZone: TZSEL }; }   // spread into toLocale* options
  function tzDisplay() { if (TZSEL === 'auto') return TZNAME; const z = TZONES.find(z => z.id === TZSEL); return z ? z.label : TZSEL; }
  function fmtLocal(d) { return d.toLocaleString([], { ...tzo(), weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
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
    if (state === 'live') {
      const r = resultOf(num);
      // A manually-entered minute wins; otherwise show ESPN's reliable period
      // (not its over-estimated minute). HT is its own status.
      const periodLbl = { '1st half': '1ST HALF', '2nd half': '2ND HALF', 'extra time': 'EXTRA TIME', 'penalties': 'PENALTIES', 'live': 'LIVE' };
      const mn = (r && r.minute) ? r.minute + "'" : (r && r.status === 'HT') ? 'HT' : (r && r.period && periodLbl[r.period]) || TX.pLive;
      return `<span class="kpill live" title="Live now — ESPN's exact match minute is an estimate, so we show the half"><span class="lvdot"></span>${mn}</span>`;
    }
    if (state === 'awaiting') {
      const mins = Math.floor((Date.now() - kickoff(byNum[num]).getTime()) / 60000);
      return mins <= 135
        ? `<span class="kpill awaiting" title="Kicked off per the schedule — the community feed hasn't posted a live score yet"><span class="lvdot"></span>${TX.pInPlay}</span>`
        : `<span class="kpill awaiting" title="This match has kicked off but the community feed hasn't posted the result yet — it updates roughly daily">${TX.pAwaiting}</span>`;
    }
    if (state === 'done') { const r = resultOf(num); const tag = r && r.status === 'PENS' ? 'PENS' : r && r.status === 'AET' ? 'AET' : 'FT'; return `<span class="kpill done">${tag}</span>`; }
    if (state === 'upcoming') { const cd = countdown(kickoff(byNum[num])); return `<span class="kpill soon">${cd ? TX.inT(cd) : TX.pUpcoming}</span>`; }
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
    const roundLbl = m[5] === 'FIN' ? '🏆 Final' : m[5] === '3RD' ? TX.thirdPlace : ((TX.stageLabel && TX.stageLabel[m[5]]) || (stageByKey[m[5]] ? stageByKey[m[5]].label : m[5]));
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
      { k: 'GS', n: 48, label: TX.fGroups },
      { k: 'R32', n: 32, label: 'R32' },
      { k: 'R16', n: 16, label: 'R16' },
      { k: 'QF', n: 8, label: 'QF' },
      { k: 'SF', n: 4, label: 'SF' },
      { k: 'FIN', n: 2, label: TX.fFinal },
      { k: 'CH', n: 1, label: TX.fChampion },
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
    const tabs = [{ key: 'overview', tab: TX.tabOverview }, { key: 'groups', tab: TX.tabGroups }]
      .concat(STAGES.map(s => ({ key: s.key.toLowerCase(), tab: stageTabTx(s.key) })));
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
    const ms = S.M.filter(m => s.codes.includes(m[5]));
    const pr = stageProgress(s);
    const label = (TX.stageLabel && TX.stageLabel[s.key]) || s.label;
    const sub = (TX.stageSub && TX.stageSub[s.key]) || s.sub;
    const head = `<div class="kround-head">
        <p class="eyebrow">${TX.teamsArrow(s.enter, s.enter / 2 < 1 ? 1 : s.enter / 2, s.key === 'FIN')}</p>
        <h2>${esc(label)}</h2>
        <p class="ksub">${esc(sub)}</p>
        <p class="kprog">${TX.played(pr.done, pr.total, pr.live)}</p>
        <button class="kcal-btn" data-cal-round="${s.key}" type="button">📅 ${esc(TX.addRoundCal)}</button>
      </div>`;
    // Final tab (Final + 3rd place) has no left/right sides → centre it.
    if (s.key === 'FIN') {
      return head + `<div class="kgrid kgrid--final">${ms.sort((a, b) => kickoff(a) - kickoff(b)).map(m => matchCard(m[0])).join('')}</div>`;
    }
    // Every other round splits into the two halves of the draw (left / right),
    // each stacked in bracket order so it mirrors the bracket.
    const ord = (a, b) => (BR_ORDER[a[0]] ?? 99) - (BR_ORDER[b[0]] ?? 99);
    const left = ms.filter(m => BR_LEFT.has(m[0])).sort(ord);
    const right = ms.filter(m => BR_RIGHT.has(m[0])).sort(ord);
    return head + `<div class="kround-cols">
        <div class="kround-col">${left.map(m => matchCard(m[0])).join('')}</div>
        <div class="kround-col">${right.map(m => matchCard(m[0])).join('')}</div>
      </div>`;
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
    else mid = `<span class="kfx-v">${kickoff(m).toLocaleString([], { ...tzo(), month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>`;
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

  /* ---- mini visual bracket (Overview) ----------------------------------- */
  // Bracket order (vertical adjacency) mirrors the printed poster's wiring.
  const BR = {
    L32: [74, 77, 73, 75, 83, 84, 81, 82], L16: [89, 90, 93, 94], LQF: [97, 98], LSF: [101],
    R32: [76, 78, 79, 80, 86, 88, 85, 87], R16: [91, 92, 95, 96], RQF: [99, 100], RSF: [102]
  };
  const BR_LEFT = new Set([].concat(BR.L32, BR.L16, BR.LQF, BR.LSF));
  const BR_RIGHT = new Set([].concat(BR.R32, BR.R16, BR.RQF, BR.RSF));
  const BR_ORDER = {};   // bracket vertical order, so round columns align with the bracket
  [].concat(BR.L32, BR.L16, BR.LQF, BR.LSF, BR.R32, BR.R16, BR.RQF, BR.RSF).forEach((n, i) => { BR_ORDER[n] = i; });
  const fmtShort = d => d.toLocaleString([], { ...tzo(), month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' });

  function bnode(num) {
    const p = participants(num), o = outcome(num), r = oriented(num);
    const row = (code, raw, win, score) => code
      ? `<span class="kbn-row${win ? ' w' : ''}"><span class="kbn-t">${esc(code)}</span>${score != null ? '<b>' + score + '</b>' : ''}</span>`
      : `<span class="kbn-row tbd"><span class="kbn-t">${esc(raw || '—')}</span></span>`;
    return `<div class="kbnode" data-num="${num}" data-teams="${(p.home || '') + ',' + (p.away || '')}" title="Match #${num} — tap for details">
        ${row(p.home, p.homeRaw, o.decided && o.winner === p.home, r && r.h != null ? r.h : null)}
        ${row(p.away, p.awayRaw, o.decided && o.winner === p.away, r && r.a != null ? r.a : null)}
        <span class="kbn-when">${esc(fmtShort(kickoff(byNum[num])))}</span>
      </div>`;
  }
  function miniBracket() {
    const col = arr => `<div class="kbcol">${arr.map(bnode).join('')}</div>`;
    const labels = ['R32', 'R16', 'QF', 'SF', 'FINAL', 'SF', 'QF', 'R16', 'R32'];
    return `<section class="kpanel kbracket-panel">
        <div class="kpanel-h"><h3>${esc(TX.theBracket)}</h3><span class="kmute">${esc(TX.tapDetails)}</span></div>
        <div class="kbracket-scroll">
          <div class="kbracket-labels">${labels.map(l => '<span>' + l + '</span>').join('')}</div>
          <div class="kbracket">
            ${col(BR.L32)}${col(BR.L16)}${col(BR.LQF)}${col(BR.LSF)}
            <div class="kbcol kbfinal">${bnode(104)}</div>
            ${col(BR.RSF)}${col(BR.RQF)}${col(BR.R16)}${col(BR.R32)}
          </div>
        </div>
      </section>`;
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
    html += miniBracket();
    html += `<section class="kpanel">
        <div class="kpanel-h"><h3>${esc(TX.stillStanding)}</h3><span class="kcount">${sv.remaining.length} ${TX.ofWord} ${sv.entrants.length || 32}</span></div>
        <div class="kchips">${remHtml || `<em class="kmute">${esc(TX.resolvesGroups)}</em>`}</div>
        ${elimHtml ? `<div class="kpanel-h sub"><h4>${esc(TX.eliminated)}</h4></div><div class="kchips dim">${elimHtml}</div>` : ''}
      </section>`;
    html += `<div class="kover-2col">`;
    html += `<section class="kpanel"><div class="kpanel-h"><h3>${esc(TX.liveUpNext)}</h3></div><div class="kgrid kgrid--mini">${upcoming.length ? upcoming.map(m => matchCard(m[0], { compact: true })).join('') : `<em class="kmute">${esc(TX.nothingSched)}</em>`}</div></section>`;
    html += `<section class="kpanel"><div class="kpanel-h"><h3>${esc(TX.latestResults)}</h3></div><div class="kgrid kgrid--mini">${latest.length ? latest.map(m => matchCard(m[0], { compact: true })).join('') : `<em class="kmute">${esc(TX.noKoYet)}</em>`}</div></section>`;
    html += `</div></div>`;
    return html;
  }

  /* ====================================================================== */
  /*  TOP-LEVEL RENDER                                                       */
  /* ====================================================================== */
  function headerStatus() {
    const cur = currentStage();
    const sv = survivors();
    if (cur.key === 'GS') return TX.groupStage;
    const pr = stageProgress(cur);
    const allDone = STAGES.every(s => S.M.filter(m => s.codes.includes(m[5])).every(m => isDecided(m[0])));
    if (allDone) { const champ = outcome(104).winner; return champ ? TX.champions(nameOf(champ)) : TX.complete; }
    const label = (TX.stageLabel && TX.stageLabel[cur.key]) || cur.label;
    return TX.status(label, pr.done, pr.total, pr.live, sv.remaining.length);
  }

  function fmtAbs(ms) { return ms ? new Date(ms).toLocaleString([], { ...tzo(), weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'; }

  /* Compact freshness strip for the TOP — badge + the two timestamps + Refresh.
     The verbose limitations live in dataCaveat() at the bottom of the page. */
  function dataStrip(v) {
    const isSample = SOURCE === 'sample', isOf = SOURCE === 'openfootball', isEspn = SOURCE === 'espn';
    const stale = isOf && UPDATED && v.ageMs > 36 * 3600000;
    const badge = isSample ? `<span class="kbadge sample">${TX.bSample}</span>`
      : isEspn ? '<span class="kbadge live">● LIVE · ESPN</span>'
        : isOf ? `<span class="kbadge near">${TX.bNear}${stale ? TX.bStale : ''}</span>`
          : UPDATED ? `<span class="kbadge live">${TX.bLiveData}</span>` : `<span class="kbadge stale">${TX.bNoData}</span>`;
    const pulledAge = PULLED ? fmtAge(Date.now() - PULLED) : '—';
    const ovr = OVR.size ? ` <span class="kdim">· +${OVR.size} manual</span>` : '';
    // ESPN is real-time, so the meaningful clock is "when you refreshed"; openfootball
    // also shows when the source itself last changed (it can be hours behind).
    const srcTxt = isEspn ? '' : ` · ${TX.srcUpdated} <b>${UPDATED ? `${fmtAbs(UPDATED)} <span class="kdim">(${fmtAge(v.ageMs)})</span>` : '—'}</b>`;
    return `<div class="kstrip">
        ${badge}
        <span class="kstrip-txt">${TX.refreshed} <b>${esc(pulledAge)}</b>${srcTxt}${ovr}</span>
        <button id="krefresh" class="kbtn-sync${SYNCING ? ' busy' : ''}"${SYNCING ? ' disabled' : ''}>${SYNCING ? '<span class="spin"></span> ' + TX.pulling : TX.refreshBtn}</button>
      </div>`;
  }

  /* The verbose "about this data" caveat — moved to the BOTTOM so it doesn't
     crowd the top. Explains the feed's limitations + any manual entries. */
  function dataCaveat() {
    const isOf = SOURCE === 'openfootball', isSample = SOURCE === 'sample', isEspn = SOURCE === 'espn';
    const lines = [];
    if (isEspn) lines.push(ES
      ? `Los resultados en vivo provienen del marcador público de <a href="${esc(SRCURL)}" target="_blank" rel="noopener">ESPN</a> — marcadores, goleadores y el tiempo actual, en tiempo real (esta página se actualiza cada minuto). Mostramos el <b>tiempo</b> (1.º / 2.º) en vez del minuto exacto, porque el reloj de ESPN es una estimación que puede adelantarse unos minutos. Es no oficial; para algo importante, confirma con la app oficial de la FIFA o tu canal. Los cruces de eliminatorias aún no definidos se muestran como <i>proyecciones</i>.`
      : `Live results come from <a href="${esc(SRCURL)}" target="_blank" rel="noopener">ESPN’s</a> public scoreboard — live scores, goal scorers and the current half, updated in real time (this page re-checks every minute). We show the <b>half</b> (1st / 2nd) rather than an exact minute, because ESPN’s clock is an estimate that can run a few minutes ahead. It’s unofficial; for anything critical, confirm with the official FIFA app or your broadcaster. Knockout matchups not yet decided are shown as <i>projections</i>.`);
    else if (isOf) lines.push(ES
      ? `Los resultados provienen de <a href="${esc(SRCURL)}" target="_blank" rel="noopener">openfootball</a>, un feed comunitario gratuito (el feed en vivo de ESPN no estaba disponible). <u>No</u> es un marcador minuto a minuto — los resultados los cargan voluntarios, normalmente en un día, así que pueden tardar horas. Los cruces que el feed aún no confirma se muestran como <i>proyecciones</i>. Para algo importante, revisa la app oficial de la FIFA o tu canal.`
      : `Live results come from <a href="${esc(SRCURL)}" target="_blank" rel="noopener">openfootball</a>, a free community feed (the ESPN live feed was unreachable). It is <u>not</u> an in-match live ticker — scores are entered by volunteers, usually within a day, so a result can lag by hours. Knockout matchups the feed hasn’t confirmed yet are shown as <i>projections</i>. For anything that matters, check the official FIFA app or your broadcaster.`);
    else if (isSample) lines.push(ES
      ? `<b>Datos de muestra:</b> el feed en vivo no estaba disponible, así que estos marcadores son de ejemplo — <b>no son resultados reales</b>. Usa “Actualizar” arriba para reintentar.`
      : `<b>Sample data:</b> the live feed was unreachable, so these are illustrative placeholder scores — <b>not real results</b>. Use “Refresh data” above to retry the live feed.`);
    if (OVR.size) lines.push(ES
      ? `<b>Añadido manualmente:</b> ${OVR.size} resultado${OVR.size > 1 ? 's' : ''} cargado${OVR.size > 1 ? 's' : ''} por el autor que el feed aún no registra <span class="kdim">(editado ${esc(fmtAbs(OVR_UPDATED))})</span>.`
      : `<b>Manually added:</b> ${OVR.size} owner-entered result${OVR.size > 1 ? 's' : ''} the feed hasn’t recorded yet <span class="kdim">(last edited ${esc(fmtAbs(OVR_UPDATED))})</span>.`);
    const inPlay = S.M.filter(m => stateOf(m[0]) === 'awaiting').length;
    if ((isOf || isEspn) && inPlay) lines.push(ES
      ? `<b>En juego ahora:</b> ${inPlay} partido${inPlay > 1 ? 's han' : ' ha'} comenzado (según el calendario) pero aún no tiene${inPlay > 1 ? 'n' : ''} marcador en el feed — se completará en breve. Puedes cargarlo a mano en <code>overrides.json</code> para mostrarlo al instante.`
      : `<b>In play now:</b> ${inPlay} match${inPlay > 1 ? 'es have' : ' has'} kicked off (per the schedule) but don’t have a score in the feed yet — they’ll fill in shortly. You can hand-enter one in <code>overrides.json</code> to show it instantly.`);
    if (!lines.length) return '';
    return `<aside class="kcaveat">
        <h4>${esc(TX.aboutData)}</h4>
        ${lines.map(l => '<p>' + l + '</p>').join('')}
        <p class="kcaveat-tz">${esc(TX.timesIn(tzDisplay()))}</p>
      </aside>`;
  }

  /* Accuracy guard: surfaces matches whose status contradicts the schedule. */
  function validationBanner(v) {
    if (!v.issues.length) return '';
    return `<div class="kwarn"><p>⚠ <b>${v.issues.length} data check${v.issues.length > 1 ? 's' : ''} flagged</b> (status vs. schedule): ${esc(v.issues.slice(0, 4).map(i => i.msg).join('; '))}${v.issues.length > 4 ? ' …' : ''}</p></div>`;
  }

  /* ---- "Today" strip ---------------------------------------------------- */
  /* A compact, always-visible row of the day's matches (score / live / countdown).
     If nothing is on today, it falls back to the next scheduled match-day. */
  function todayStrip() {
    const now = new Date();
    const sameDay = (a, b) => a.toLocaleDateString([], tzo()) === b.toLocaleDateString([], tzo());
    let list = S.M.filter(m => sameDay(kickoff(m), now)).sort((a, b) => kickoff(a) - kickoff(b));
    let label = TX.today, ico = '📅';
    if (!list.length) {
      const future = S.M.filter(m => kickoff(m).getTime() > Date.now()).sort((a, b) => kickoff(a) - kickoff(b));
      if (!future.length) return '';
      list = future.filter(m => sameDay(kickoff(m), kickoff(future[0])));
      label = TX.nextUp; ico = '⏭️';
    }
    const live = list.filter(m => { const s = stateOf(m[0]); return s === 'live' || s === 'awaiting'; }).length;
    return `<section class="ktoday" aria-label="${esc(label)}">
        <div class="ktoday-h"><span class="ktoday-lbl">${ico} ${esc(label)}</span>
          <span class="ktoday-meta">${TX.todayMeta(list.length, live)}</span></div>
        <div class="ktoday-row">${list.map(m => todayChip(m[0])).join('')}</div>
      </section>`;
  }
  function todayChip(num) {
    const m = byNum[num], p = participants(num), r = oriented(num), st = stateOf(num);
    const side = (code, raw) => code
      ? `<span class="ktc-team"><img class="ktc-flag" src="${flag(code)}" alt="" loading="lazy"><b>${esc(code)}</b></span>`
      : `<span class="ktc-team tbd">${esc(raw || '—')}</span>`;
    const hS = r && r.h != null ? r.h : null, aS = r && r.a != null ? r.a : null;
    const mid = (hS != null && aS != null) ? `<span class="ktc-score">${hS}–${aS}</span>` : `<span class="ktc-v">v</span>`;
    const when = kickoff(m).toLocaleTimeString([], { ...tzo(), hour: 'numeric', minute: '2-digit' });
    const lead = esc(when);   // kickoff time on top; the pill carries live/countdown/FT
    const teams = [p.home, p.away].filter(Boolean).join(',');
    return `<button class="ktc kcard" data-num="${num}" data-teams="${esc(teams)}" title="Match #${num} — tap for details">
        <span class="ktc-when">${lead}</span>
        <span class="ktc-mid">${side(p.home, p.homeRaw)}${mid}${side(p.away, p.awayRaw)}</span>
        ${pill(st, num)}
      </button>`;
  }

  /* ---- add-to-calendar (.ics) for knockout matches ---------------------- */
  const icsEsc = s => String(s).replace(/([\\,;])/g, '\\$1').replace(/\n/g, '\\n');
  const icsZ = d => { const p = n => String(n).padStart(2, '0'); return '' + d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + 'T' + p(d.getUTCHours()) + p(d.getUTCMinutes()) + '00Z'; };
  function downloadMatchesICS(nums, fname) {
    const ev = [];
    nums.forEach(num => {
      const m = byNum[num]; if (!m) return;
      const p = participants(num), start = kickoff(m), end = new Date(start.getTime() + 7200000);
      const v = VEN[m[6]] || { city: m[6], stad: '' };
      const h = p.home ? nameOf(p.home) : labelSlot(p.homeRaw);
      const a = p.away ? nameOf(p.away) : labelSlot(p.awayRaw);
      const lbl = (m[5] === 'FIN' ? 'Final' : m[5] === '3RD' ? '3rd place' : (stageByKey[m[5]] ? stageByKey[m[5]].label : m[5]));
      const r = oriented(num), sc = (r && r.h != null && r.a != null) ? ` (${r.h}–${r.a})` : '';
      ev.push('BEGIN:VEVENT', 'UID:wc2026-ko-m' + num + '@jagnoor.github.io', 'DTSTAMP:20260101T000000Z',
        'DTSTART:' + icsZ(start), 'DTEND:' + icsZ(end),
        'SUMMARY:' + icsEsc('WC26 ' + lbl + ': ' + h + ' vs ' + a + sc),
        'LOCATION:' + icsEsc((v.stad ? v.stad + ', ' : '') + v.city),
        'DESCRIPTION:' + icsEsc('2026 FIFA World Cup · ' + lbl + ' · Match #' + num),
        'END:VEVENT');
    });
    if (!ev.length) return;
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//jagnoor//WC2026//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...ev, 'END:VCALENDAR'].join('\r\n');
    const el = document.createElement('a');
    el.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    el.download = fname; document.body.appendChild(el); el.click(); el.remove(); URL.revokeObjectURL(el.href);
  }

  /* Timezone picker — kickoff Dates are UTC-anchored, so changing this just
     re-formats every time in the chosen zone (persisted to localStorage). */
  function tzControl() {
    const opts = TZONES.map(z => `<option value="${esc(z.id)}"${z.id === TZSEL ? ' selected' : ''}>${esc(z.label)}</option>`).join('');
    return `<label class="ktz" title="${esc(TX.tzLabel)}"><span class="ktz-ic" aria-hidden="true">🌐</span>
        <select id="ktz-select" aria-label="${esc(TX.tzLabel)}">${opts}</select></label>`;
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
         <h1 class="khead">${esc(TX.road)} <span class="grad-text">Final</span></h1>
         ${dataStrip(v)}
         ${tzControl()}
         ${funnel()}
         ${validationBanner(v)}
       </header>
       ${todayStrip()}
       ${tabbar()}
       <div id="khilite-bar" class="khilite"></div>
       <main class="ktabpane">${body}</main>
       ${dataCaveat()}`;

    // wire tabs + funnel jumps + fresh-pull + team tracking
    $$('.ktab').forEach(b => b.addEventListener('click', () => { setTab(b.dataset.tab); }));
    $$('.kfstep[data-jump]').forEach(b => b.addEventListener('click', () => { setTab(b.dataset.jump); }));
    const rb = $('#krefresh'); if (rb) rb.addEventListener('click', syncAll);
    const tz = $('#ktz-select'); if (tz) tz.addEventListener('change', () => { TZSEL = tz.value; try { localStorage.setItem('wc_hub_tz', TZSEL); } catch (e) { } render(); });
    $$('[data-cal-round]').forEach(b => b.addEventListener('click', () => { const s = stageByKey[b.dataset.calRound]; if (s) downloadMatchesICS(S.M.filter(m => s.codes.includes(m[5])).map(m => m[0]), 'WC26_' + s.key + '.ics'); }));
    $$('.kchip[data-team], .kteam[data-team]').forEach(c => c.addEventListener('click', e => { e.stopPropagation(); setHilite(c.dataset.team); }));
    $$('.kcard[data-num]').forEach(c => c.addEventListener('click', e => { if (e.target.closest('[data-team]') || e.target.closest('a')) return; openDetail(+c.dataset.num); }));
    $$('.kbnode[data-num]').forEach(c => c.addEventListener('click', () => openDetail(+c.dataset.num)));
    applyHilite();
  }

  function setTab(t) { activeTab = t; location.hash = t; render(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  /* "Path to glory": track one team's matches across every tab. Toggles without
     a full re-render so the scroll position and tab stay put. */
  function setHilite(code) { HILITE = (HILITE === code) ? '' : code; applyHilite(); }
  function applyHilite() {
    const kapp = $('#kapp'); if (kapp) kapp.classList.toggle('tracking', !!HILITE);
    $$('.kcard, .kbnode').forEach(c => { const t = (c.dataset.teams || '').split(','); c.classList.toggle('hot', !!HILITE && t.includes(HILITE)); });
    $$('.kchip[data-team], .kteam[data-team]').forEach(c => c.classList.toggle('tracked', !!HILITE && c.dataset.team === HILITE));
    const bar = $('#khilite-bar'); if (!bar) return;
    if (HILITE) {
      bar.innerHTML = `<img src="${flag(HILITE)}" alt=""><span>Tracking <b>${esc(nameOf(HILITE))}</b> across all rounds</span><button class="khilite-x" id="khilite-clear" type="button">clear ✕</button>`;
      bar.classList.add('on');
      const x = $('#khilite-clear'); if (x) x.addEventListener('click', () => setHilite(HILITE));
    } else { bar.classList.remove('on'); bar.innerHTML = ''; }
  }

  /* ====================================================================== */
  /*  MATCH DETAIL — tap a card → ESPN summary (timeline + team stats)       */
  /* ====================================================================== */
  function closeDetail() { const m = $('#kmodal'); if (m) m.remove(); document.removeEventListener('keydown', escClose); }
  function escClose(e) { if (e.key === 'Escape') closeDetail(); }
  function openDetail(num) {
    const m = byNum[num], p = participants(num), r = oriented(num), st = stateOf(num);
    const v = VEN[m[6]] || { city: m[6], stad: '' }, d = kickoff(m);
    const roundLbl = m[5] === 'FIN' ? '🏆 Final' : m[5] === '3RD' ? TX.thirdPlace : ((TX.stageLabel && TX.stageLabel[m[5]]) || (stageByKey[m[5]] ? stageByKey[m[5]].label : m[5]));
    const side = (code, raw, sc) => code
      ? `<div class="kmd-team"><img src="${flag(code)}" alt=""><div><b>${esc(code)}</b><span>${esc(nameOf(code))}</span></div><em>${sc != null ? sc : ''}</em></div>`
      : `<div class="kmd-team tbd"><span class="kflag ph"></span><div><b>—</b><span>${esc(labelSlot(raw))}</span></div><em></em></div>`;
    closeDetail();
    const wrap = document.createElement('div'); wrap.id = 'kmodal'; wrap.className = 'kmodal';
    wrap.innerHTML = `<div class="kmodal-card" role="dialog" aria-modal="true">
        <button class="kmodal-x" aria-label="${esc(TX.close)}">✕</button>
        <div class="kmodal-head">
          <span class="kround">${roundLbl}</span> ${pill(st, num)}
          ${side(p.home, p.homeRaw, r && r.h != null ? r.h : null)}
          ${side(p.away, p.awayRaw, r && r.a != null ? r.a : null)}
          <div class="kmd-meta">#${num} · ${esc(fmtLocal(d))} · ${esc(v.city)}${v.stad ? ', ' + esc(v.stad) : ''}</div>
          <button class="kcal-btn kmd-cal" id="kmd-cal" type="button">📅 ${esc(TX.addCal)}</button>
        </div>
        <div class="kmodal-body" id="kmd-body"><p class="kmute">${esc(TX.mLoading)}</p></div>
      </div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('.kmodal-x')) closeDetail(); });
    document.addEventListener('keydown', escClose);
    const calBtn = $('#kmd-cal'); if (calBtn) calBtn.addEventListener('click', () => downloadMatchesICS([num], 'WC26_m' + num + '.ics'));

    const id = FEED_IDS[num];
    const body = $('#kmd-body');
    if (!id || !window.WC_FEED || !window.WC_FEED.summary) { body.innerHTML = detailFallback(num); return; }
    window.WC_FEED.summary(id)
      .then(s => { body.innerHTML = renderSummary(s, p); })
      .catch(() => { body.innerHTML = detailFallback(num) + `<p class="kmute">${esc(TX.mEspnFail)}</p>`; });
  }
  function detailFallback(num) {
    const r = oriented(num), sc = r && r.sc;
    if (sc && (sc.h.length || sc.a.length)) {
      return `<h4>${esc(TX.mGoals)}</h4><div class="kmd-scorers"><div>${scorerList(sc.h) || '<span class="kmute">—</span>'}</div><div>${scorerList(sc.a) || '<span class="kmute">—</span>'}</div></div>`;
    }
    return `<p class="kmute">${esc(TX.mNoTl)}${SOURCE === 'espn' ? '' : TX.mRicher}.</p>`;
  }
  /* ESPN summary JSON → stat bars + a goals/cards timeline. */
  function renderSummary(s, p) {
    const teams = (s.boxscore && s.boxscore.teams) || [];
    const home = teams.find(t => t.homeAway === 'home') || teams[0];
    const away = teams.find(t => t.homeAway === 'away') || teams[1];
    const stat = (t, name) => { const x = t && (t.statistics || []).find(s => s.name === name); return x ? x.displayValue : null; };
    const rows = [['possessionPct', 'Possession', '%'], ['totalShots', 'Shots', ''], ['shotsOnTarget', 'On target', ''], ['wonCorners', 'Corners', ''], ['foulsCommitted', 'Fouls', ''], ['yellowCards', 'Yellow cards', ''], ['redCards', 'Red cards', '']];
    let statsHtml = '';
    if (home && away) {
      statsHtml = rows.map(([key, label, suf]) => {
        let hv = stat(home, key), av = stat(away, key);
        if (hv == null && av == null) return '';
        if (key === 'redCards' && hv === '0' && av === '0') return '';
        const hn = parseFloat(hv) || 0, an = parseFloat(av) || 0, tot = hn + an || 1;
        return `<div class="kmd-stat"><span class="kmd-sv">${esc(hv != null ? hv + suf : '—')}</span>
          <div class="kmd-bar"><i style="width:${(hn / tot * 100).toFixed(0)}%"></i><b style="width:${(an / tot * 100).toFixed(0)}%"></b></div>
          <span class="kmd-sv a">${esc(av != null ? av + suf : '—')}</span><span class="kmd-sl">${esc((TX.statLabels && TX.statLabels[label]) || label)}</span></div>`;
      }).join('');
    }
    // timeline of meaningful events
    const homeId = home && home.team && String(home.team.id);
    const keep = /goal|card|penalty|substitution/i;
    const evs = (s.keyEvents || []).filter(e => e.type && keep.test(e.type.text || '') && (e.clock && e.clock.displayValue))
      .map(e => {
        const tid = e.team && String(e.team.id);
        const icon = /own goal/i.test(e.type.text) ? '🥅' : /goal|penalty - scor/i.test(e.type.text) ? '⚽' : /yellow/i.test(e.type.text) ? '🟨' : /red/i.test(e.type.text) ? '🟥' : /sub/i.test(e.type.text) ? '🔁' : '•';
        return `<div class="kmd-ev ${tid && tid === homeId ? 'h' : 'a'}"><span class="kmd-min">${esc(e.clock.displayValue)}</span><span class="kmd-ic">${icon}</span><span class="kmd-tx">${esc(e.text || e.type.text)}</span></div>`;
      });
    const timeline = evs.length ? `<h4>${esc(TX.mTimeline)}</h4><div class="kmd-timeline">${evs.join('')}</div>` : '';
    const stats = statsHtml ? `<h4>${esc(TX.mStats)}</h4><div class="kmd-stats">${statsHtml}</div>` : '';
    return (stats + timeline) || `<p class="kmute">${esc(TX.mNone)}</p>`;
  }

  /* ====================================================================== */
  /*  DATA — fetch + poll results.json                                      */
  /* ====================================================================== */
  /* Apply a payload from the live feed (feed.js → openfootball). */
  function applyFeed(d) {
    RESULTS = d.results || {}; FEED_KO = d.koTeams || {}; FEED_IDS = d.ids || {};
    UPDATED = d.updated || 0; PULLED = d.pulled || Date.now(); SOURCE = d.source || 'live';
    NOTE = d.note || ''; SRCURL = d.url || ''; NOW = UPDATED || Date.now();
  }
  /* Apply the bundled sample file (offline / fallback). */
  function applyData(data) {
    RESULTS = (data && data.results) || {}; FEED_KO = {}; FEED_IDS = {};
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
        // On the first successful load, jump straight to the live round
        // (unless the visitor arrived with an explicit #tab in the URL).
        if (!didAutoTab) { didAutoTab = true; if (!location.hash) activeTab = defaultTab(); }
        const changes = detectChanges(PREV, RESULTS);   // goals/finals since last poll
        PREV = snapshotResults();
        const y = window.scrollY;            // keep the reader where they were
        SYNCING = false; render();
        window.scrollTo(0, y);
        applyHilite();
        if (!document.hidden) announce(changes);         // flash cards + toast goals (skip if backgrounded)
        celebrateChampion();
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
      ? { h: r.a, a: r.h, status: r.status, minute: r.minute, period: r.period, pen: r.pen ? [r.pen[1], r.pen[0]] : undefined, _t1: r._t1, _t2: r._t2 }
      : { h: r.h, a: r.a, status: r.status, minute: r.minute, period: r.period, pen: r.pen, _t1: r._t1, _t2: r._t2 };
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
  /*  LIVE MOMENTS — goal flashes, score toasts, champion confetti          */
  /* ====================================================================== */
  function snapshotResults() {
    const s = {};
    Object.keys(RESULTS).forEach(k => { const r = RESULTS[k]; s[k] = { h: r.h, a: r.a, status: r.status }; });
    return s;
  }
  /* Compare the previous results signature to the current one → goal / full-time
     events. Returns [] on the very first load (PREV null) so we don't fanfare a
     fresh page. */
  function detectChanges(prev, cur) {
    if (!prev) return [];
    const out = [];
    Object.keys(cur).forEach(k => {
      const c = cur[k], p = prev[k];
      if (c.h == null || c.a == null) return;
      const cTot = c.h + c.a, pTot = p ? ((p.h || 0) + (p.a || 0)) : 0;
      if (p && cTot > pTot) out.push({ num: +k, type: 'goal' });
      const wasDone = p && ['FT', 'AET', 'PENS'].includes(p.status);
      const isDone = ['FT', 'AET', 'PENS'].includes(c.status);
      if (p && !wasDone && isDone) out.push({ num: +k, type: 'ft' });
    });
    return out;
  }
  /* Stacked, auto-dismissing alert used for goals (separate from the status toast). */
  function alertStack(html, kind) {
    let box = document.getElementById('kalerts');
    if (!box) { box = document.createElement('div'); box.id = 'kalerts'; document.body.appendChild(box); }
    const el = document.createElement('div'); el.className = 'kalert ' + (kind || '');
    el.innerHTML = html; box.appendChild(el);
    requestAnimationFrame(() => el.classList.add('in'));
    setTimeout(() => { el.classList.remove('in'); setTimeout(() => el.remove(), 350); }, 4600);
  }
  function announce(changes) {
    changes.slice(0, 4).forEach(ev => {
      const p = participants(ev.num), r = oriented(ev.num);
      if (!p.home || !p.away || !r) return;
      const card = $(`.kcard[data-num="${ev.num}"]`);
      if (ev.type === 'goal') {
        if (card) { card.classList.add('goal-flash'); setTimeout(() => card.classList.remove('goal-flash'), 1600); }
        alertStack(`<span class="kalert-ball">⚽</span><span><b>GOAL!</b> ${esc(nameOf(p.home))} <b>${r.h}–${r.a}</b> ${esc(nameOf(p.away))}</span>`, 'goal');
      } else if (ev.type === 'ft') {
        const o = outcome(ev.num);
        const w = o.winner ? nameOf(o.winner) : null;
        alertStack(`<span class="kalert-ball">⏱</span><span><b>Full time.</b> ${esc(nameOf(p.home))} ${r.h}–${r.a} ${esc(nameOf(p.away))}${w ? ' · <b>' + esc(w) + '</b> advance' : ''}</span>`, 'ft');
      }
    });
  }
  /* When match #104 resolves, fire confetti + a champion banner (once). */
  function celebrateChampion() {
    const champ = outcome(104).winner;
    if (!champ || CHAMP_SEEN) return;
    CHAMP_SEEN = true;
    alertStack(`<span class="kalert-ball">🏆</span><span><b>${esc(nameOf(champ))} are World Champions!</b></span>`, 'champ');
    confetti();
  }
  function confetti() {
    const box = document.createElement('div'); box.className = 'kconfetti'; document.body.appendChild(box);
    const cols = ['var(--c-pink)', 'var(--c-orange)', 'var(--c-gold)', 'var(--c-cyan)', 'var(--c-green)', 'var(--c-violet)'];
    for (let i = 0; i < 120; i++) {
      const p = document.createElement('i');
      const left = (i * 53 % 100), delay = (i % 20) * 0.12, dur = 2.6 + (i % 7) * 0.35, size = 6 + (i % 5) * 2;
      p.style.cssText = `left:${left}%;width:${size}px;height:${size * 1.6}px;background:${cols[i % cols.length]};animation-delay:${delay}s;animation-duration:${dur}s;transform:rotate(${i * 33}deg)`;
      box.appendChild(p);
    }
    setTimeout(() => box.remove(), 6500);
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
    if (ES) {
      if (min < 1) return 'ahora mismo';
      if (min < 60) return 'hace ' + min + ' min';
      const h = Math.round(min / 60); if (h < 36) return 'hace ' + h + ' h';
      const d = Math.round(h / 24); if (d < 45) return 'hace ' + d + ' días';
      return 'hace ' + Math.round(d / 30) + ' meses';
    }
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
  setInterval(() => loadData(false), 60000);       // refresh every minute (ESPN is live)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadData(false); });
})();
