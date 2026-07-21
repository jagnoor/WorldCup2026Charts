/* ============================================================================
   app.js — landing-page behaviour for the 2026 World Cup Wall Chart
   ----------------------------------------------------------------------------
   Responsibilities:
     • Read the user's choices (theme / timezone / paper / language / favorites)
     • Keep a live <iframe> preview of the poster in sync with those choices
     • Hand off to the poster for Open / Print / PDF / PNG
     • Export selected teams' fixtures as an .ics calendar
     • Light cosmetic touches: scroll-reveal, animated counters, a live
       "what stage are we in" status chip, and the favorites picker — all of
       which are GENERATED from window.WC_SCHEDULE so there is one source of
       truth for the data.
   The poster pages read these query params, so the contract must stay stable:
     tz, theme, size, clock, lang, datefmt, fav   (+ pdf=1 / png=1 / nozoom=1)
   ========================================================================== */
'use strict';

/* ---- tiny DOM helpers (keep the rest of the file readable) -------------- */
const $  = (sel, root = document) => root.querySelector(sel);     // first match
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)]; // all matches

/* The language is decided entirely by the URL (?lang=es). Default English. */
const LANG = new URLSearchParams(location.search).get('lang') === 'es' ? 'es' : 'en';

/* ============================================================================
   1) INTERNATIONALISATION (English default lives in the HTML; Spanish here)
   Any element with data-i18n="key" gets its text replaced when LANG==='es'.
   Missing keys simply fall back to the English already in the markup.
   ========================================================================== */
const I18N = {
  es: {
    'nav.tag': 'Calendario imprimible gratis',
    'nav.knockout': '🏆 Cuadro en vivo', 'cta.knockout': 'Cuadro eliminatorio en vivo',
    'hero.eyebrow': 'Canadá · México · EE.UU.',
    'hero.lede': 'Un póster imprimible de los 104 partidos — el cuadro de eliminatorias, las tablas de grupos y los canales de TV — en tu zona horaria y tu idioma. Ahora que llegan las eliminatorias, es el recuerdo perfecto.',
    'chart.demoted': '🏁 La fase de grupos terminó — las eliminatorias están en vivo. Este póster imprimible es ahora un recuerdo; para marcadores en tiempo real y quién avanza, abre el cuadro en vivo →',
    'cta.build': 'Crea tu calendario',
    'cta.download': 'Descargar PDF',
    'stat.teams': 'Equipos', 'stat.matches': 'Partidos', 'stat.cities': 'Sedes', 'stat.nations': 'Anfitriones',
    'build.title': 'Crea tu póster', 'build.sub': 'Elige zona horaria, idioma y tamaño de papel. La vista previa se actualiza al instante; descarga un PDF o PNG listo para imprimir.',
    'panel.customize': 'Personaliza',
    'f.theme': 'Esquema de color', 'f.tz': 'Zona horaria', 'f.size': 'Tamaño de papel',
    'f.fav': 'Equipos favoritos', 'f.lang': 'Idioma', 'f.clock': 'Formato de hora', 'f.datefmt': 'Formato de fecha',
    'opt.dark': 'Oscuro (pantalla / póster)', 'opt.light': 'Claro (impresora)',
    'opt.letter': 'Carta horizontal (11×8.5″)', 'opt.a3': 'A3 horizontal (420×297mm)',
    'opt.2416': '24 × 16″ (póster 3:2)', 'opt.2436': '24 × 36″ (póster vertical)',
    'opt.12h': '12 horas (3p)', 'opt.24h': '24 horas (15:00)',
    'opt.auto': 'Auto (por zona)', 'opt.us': 'MM/DD (6/11)', 'opt.uk': 'DD/MM (11/6)',
    'fav.placeholder': 'Selecciona equipos...',
    'btn.open': 'Abrir póster', 'btn.print': 'Imprimir', 'btn.pdf': 'Descargar PDF', 'btn.png': 'Descargar PNG', 'btn.ics': 'Añadir al calendario',
    'preview.live': 'Vista previa', 'tips.title': 'Consejos de impresión',
    'feat.title': 'Hecho para hinchas', 'feat.sub': 'Pequeños detalles que lo hacen especial.',
    'feat.tz.t': 'Tu zona horaria', 'feat.tz.d': 'Los 104 partidos convertidos a tu hora local, con canales de TV para EE.UU. y Reino Unido.',
    'feat.live.t': 'Tabla y marcadores en vivo', 'feat.live.d': 'La fase de grupos se actualiza con posiciones y resultados a medida que se juega.',
    'feat.bracket.t': 'Cuadro de eliminatorias', 'feat.bracket.d': 'Del dieciseisavos a la final, con sedes y horarios claros.',
    'feat.print.t': 'Listo para imprimir', 'feat.print.d': 'Imprime en casa en tamaño carta o lleva el PDF a una imprenta para un póster grande.',
    'feat.cal.t': 'A tu calendario', 'feat.cal.d': 'Exporta los partidos de tus equipos favoritos como archivo .ics.',
    'feat.free.t': 'Gratis y bilingüe', 'feat.free.d': 'Sin registros ni anuncios. Disponible en inglés y español.',
    'cities.title': '16 sedes, 3 países', 'cities.sub': 'De Vancouver a Ciudad de México y Nueva York.',
    'footer.made': 'Hecho con ☕ y 🏆 para el Mundial 2026', 'footer.note': 'Datos de FIFA, FOX Sports, BBC e ITV · gratis para uso personal'
  }
};
/* Replace text/HTML/attribute content of all [data-i18n*] nodes for Spanish. */
function applyI18n() {
  if (LANG !== 'es') return;                                  // English: nothing to do
  const dict = I18N.es;
  $$('[data-i18n]').forEach(el => { const v = dict[el.dataset.i18n]; if (v != null) el.textContent = v; });
  $$('[data-i18n-html]').forEach(el => { const v = dict[el.dataset.i18nHtml]; if (v != null) el.innerHTML = v; });
  document.documentElement.lang = 'es';                       // accessibility / SEO
}

/* Spanish display names for the favorites list (codes come from the schedule) */
const ES_TEAM = {
  Algeria: 'Argelia', Argentina: 'Argentina', Australia: 'Australia', Austria: 'Austria', Belgium: 'Bélgica',
  'Bosnia & Hz': 'Bosnia y Hz', Brazil: 'Brasil', Canada: 'Canadá', 'Cape Verde': 'Cabo Verde', Colombia: 'Colombia',
  Croatia: 'Croacia', 'Curaçao': 'Curazao', Czechia: 'Chequia', 'DR Congo': 'RD Congo', Ecuador: 'Ecuador',
  Egypt: 'Egipto', England: 'Inglaterra', France: 'Francia', Germany: 'Alemania', Ghana: 'Ghana', Haiti: 'Haití',
  Iran: 'Irán', Iraq: 'Irak', 'Ivory Coast': 'Costa de Marfil', Japan: 'Japón', Jordan: 'Jordania', Mexico: 'México',
  Morocco: 'Marruecos', Netherlands: 'Países Bajos', 'New Zealand': 'Nueva Zelanda', Norway: 'Noruega', Panama: 'Panamá',
  Paraguay: 'Paraguay', Portugal: 'Portugal', Qatar: 'Catar', 'S. Korea': 'Corea del Sur', 'Saudi Arabia': 'Arabia Saudita',
  Scotland: 'Escocia', Senegal: 'Senegal', 'South Africa': 'Sudáfrica', Spain: 'España', Sweden: 'Suecia',
  Switzerland: 'Suiza', Tunisia: 'Túnez', 'Türkiye': 'Turquía', 'United States': 'Estados Unidos', Uruguay: 'Uruguay', Uzbekistan: 'Uzbekistán'
};
const teamName = nm => (LANG === 'es' && ES_TEAM[nm]) ? ES_TEAM[nm] : nm;  // localise a team name

/* ============================================================================
   2) BUILD THE FAVORITES PICKER from the 48 teams in WC_SCHEDULE.GROUPS
   (was a hand-written 48-row list; now generated so the data lives in one place)
   ========================================================================== */
function buildFavorites() {
  const S = window.WC_SCHEDULE; if (!S) return;
  // Flatten all groups into [iso, code, name] and sort by (localised) name.
  const teams = Object.values(S.GROUPS).flat()
    .map(([iso, code, nm]) => ({ iso, code, nm }))
    .sort((a, b) => teamName(a.nm).localeCompare(teamName(b.nm), LANG));
  // Render one checkbox row per team.
  $('#fav-panel').innerHTML = teams.map(t => `
    <label class="fav-item">
      <input type="checkbox" value="${t.code}">
      <img src="https://flagcdn.com/w40/${t.iso}.png" alt="" loading="lazy">
      <span>${teamName(t.nm)}</span>
    </label>`).join('');
}

/* ============================================================================
   3) READ CHOICES  →  BUILD POSTER URL  →  UPDATE PREVIEW
   ========================================================================== */
/* Collect the current control values into a plain object. */
function getParams() {
  return {
    theme:   $('#sel-theme').value,
    tz:      $('#sel-tz').value,
    size:    $('#sel-size').value,
    clock:   $('#sel-clock').value,
    datefmt: $('#sel-datefmt').value,
    lang:    LANG,
    // comma-joined list of checked team codes, e.g. "ARG,BRA"
    fav: $$('#fav-panel input:checked').map(i => i.value).join(',')
  };
}

/* Compose the poster URL the iframe/buttons point at. The 24×36 size uses the
   dedicated vertical poster; everything else uses the landscape poster. Only
   non-default params are appended to keep links tidy and shareable. */
/* Live scores + confirmed Round-of-32 teams, packed as URL params for the poster.
   Filled in asynchronously by initPosterLiveData() once the feed loads; empty
   until then (the poster simply shows the schedule with no scores). */
let LIVE_PARAMS = '';

function buildURL(p) {
  const base = p.size === '24x36' ? 'poster-vertical.html' : 'poster.html';
  const clockShown = $('#clock-toggle').style.display !== 'none';   // only send clock if user can set it
  return base + '?tz=' + encodeURIComponent(p.tz) + '&theme=' + p.theme + '&size=' + p.size
    + (clockShown ? '&clock=' + p.clock : '')
    + (p.lang !== 'en' ? '&lang=' + p.lang : '')
    + (p.datefmt !== 'auto' ? '&datefmt=' + p.datefmt : '')
    + (p.fav ? '&fav=' + p.fav : '')
    + LIVE_PARAMS;
}

/* Pull the live feed (+ owner overrides) and pack the scores and confirmed
   Round-of-32 pairings into LIVE_PARAMS, so the printable chart shows real
   results and team names — not just slot placeholders. */
function initPosterLiveData() {
  if (!window.WC_FEED) return;
  const pack = (d, ovr) => {
    const slim = {};                                     // {num:{h,a,pen?}} — keep the URL small
    const add = src => Object.keys(src).forEach(k => { const r = src[k]; if (r && r.h != null && r.a != null) slim[k] = r.pen ? { h: r.h, a: r.a, pen: r.pen } : { h: r.h, a: r.a }; });
    add(d.results || {});
    if (ovr) add(ovr.results);                            // overrides win
    LIVE_PARAMS = '&results=' + encodeURIComponent(JSON.stringify(slim))
      + '&koteams=' + encodeURIComponent(JSON.stringify(d.koTeams || {}));
    update();                                             // re-render the preview with live data
  };
  window.WC_FEED.load().then(d => {
    const ovrP = window.WC_FEED.overrides ? window.WC_FEED.overrides() : Promise.resolve(null);
    return ovrP.then(ovr => pack(d, ovr));
  }).catch(() =>
    // Remote feeds unreachable → the bundled results.json. Post-tournament this
    // is the REAL final archive (source:"archive"), safe to print; the old
    // fictional sample carried source:"sample" and is still refused.
    fetch('results.json?t=' + Date.now(), { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(d => { if (d && d.source === 'archive') pack(d, null); })
      .catch(() => { /* no data at all → poster stays schedule-only */ })
  );
}

let _prevTZ = '';        // remembers the last timezone so we only auto-flip clock format on change
let _ready = false;      // becomes true after first paint (suppresses some auto-defaults)

/* The central "something changed" handler: re-theme the page, decide which
   sub-toggles are visible, rebuild the URL, and reload the preview iframe. */
function update() {
  const p = getParams();
  // NOTE: the page's own theme (the fun "Fiesta" look) is independent of the
  // poster's colour scheme now — the nav ◑ toggle controls the page; this only
  // affects the poster preview via the URL param below.
  const url = buildURL(p);
  $('#btn-open').href = url;                                       // keep the "Open" link current

  // Clock/date toggles: US zones & UK ship with fixed TV-broadcast formats, so
  // we hide those toggles; every other zone exposes them. Spanish always shows
  // both and defaults to 24h + DD/MM.
  const usZones = ['ET', 'CT', 'MT', 'PT'];
  const clk = $('#clock-toggle'), dfmt = $('#datefmt-toggle');
  if (LANG === 'es') {
    clk.style.display = dfmt.style.display = 'block';
    if (p.tz !== _prevTZ && !_ready) { $('#sel-clock').value = '24'; $('#sel-datefmt').value = 'uk'; }
  } else if (usZones.includes(p.tz) || p.tz === 'BST') {
    clk.style.display = dfmt.style.display = 'none';
    $('#sel-clock').value = '12';                                  // North-American / UK broadcast default
  } else {
    clk.style.display = dfmt.style.display = 'block';
    if (p.tz !== _prevTZ) $('#sel-clock').value = '24';            // rest of world defaults to 24h
  }

  // Swap the preview iframe and show the loading overlay until it paints.
  const iframe = $('#preview'), overlay = $('#overlay');
  overlay.classList.remove('hidden');
  iframe.src = url;
  iframe.onload = () => overlay.classList.add('hidden');
  scalePreview();
  updateTips();
  _prevTZ = p.tz;
}

/* The poster renders at a fixed pixel size; scale it down to fit the preview
   box and set the box's height so there is no empty space or clipping. */
const POSTER_DIMS = { '22x17': [3300, 2512], 'A3': [3552, 2512], '24x16': [3768, 2512], '24x36': [3768, 5652] };
function scalePreview() {
  const box = $('.preview-box'), iframe = $('#preview');
  if (!box || !iframe) return;
  const [w, h] = POSTER_DIMS[$('#sel-size').value] || POSTER_DIMS['22x17'];
  const scale = box.offsetWidth / w;                              // shrink-to-fit factor
  iframe.style.width = w + 'px';
  iframe.style.height = h + 'px';
  iframe.style.transform = 'scale(' + scale + ')';                // GPU-cheap downscale
  box.style.height = Math.round(h * scale) + 'px';                // box hugs the scaled poster
}
window.addEventListener('resize', scalePreview);                  // keep it fitted on window resize

/* Printing guidance changes with the chosen paper size and theme. */
function updateTips() {
  const sz = $('#sel-size').value, dark = $('#sel-theme').value === 'dark';
  const el = $('#tips'); if (!el) return;
  const inkTip = dark ? ' <strong>Tip:</strong> switch to the Light theme above to use less ink.' : '';
  const home = '<strong>Home printer:</strong> Open the poster, then ⌘P / Ctrl+P — landscape, “Fit”, and enable <strong>Background graphics</strong>.';
  const shop = '<strong>Poster shop:</strong> download the PDF and print it at native size (or scaled) for a big wall poster.';
  el.innerHTML = '<p>' + (sz === '22x17' ? home + inkTip : shop) + '</p><p>' + (sz === '22x17' ? shop : home + inkTip) + '</p>';
}

/* ---- Open / Print / PDF / PNG handoffs to the poster --------------------- */
function openPoster()  { window.open(buildURL(getParams()), '_blank'); }
function printPoster() { const w = window.open(buildURL(getParams()), '_blank'); w && w.addEventListener('load', () => setTimeout(() => w.print(), 1500)); }
function downloadPDF() { window.open(buildURL(getParams()) + '&pdf=1&nozoom=1', '_blank'); }   // poster self-generates the PDF
function downloadPNG() { window.open(buildURL(getParams()) + '&png=1&nozoom=1', '_blank'); }   // …or PNG

/* ============================================================================
   4) ADD TO CALENDAR (.ics)
   Build a calendar from the selected favorites' GROUP-STAGE matches. Times in
   the schedule are canonical US Eastern (UTC−4 during the tournament); we add
   4h to emit absolute UTC, so each viewer's calendar shows their own local
   time. Knockout matches are skipped (opponents unknown until the bracket
   resolves). RFC-5545 compliant: CRLF lines, escaped commas/semicolons.
   ========================================================================== */
function downloadICS() {
  const fav = $$('#fav-panel input:checked').map(i => i.value);
  if (!fav.length) { alert(LANG === 'es' ? 'Selecciona uno o más equipos favoritos primero.' : 'Select one or more favorite teams first.'); return; }
  const S = window.WC_SCHEDULE; if (!S) return;
  const favSet = new Set(fav);
  const venueById = Object.fromEntries(S.V.map(v => [v.id, v]));                 // id → {city, stad}
  const nameByCode = Object.fromEntries(Object.values(S.GROUPS).flat().map(t => [t[1], t[2]])); // code → name
  const esc = s => String(s).replace(/([\\,;])/g, '\\$1').replace(/\n/g, '\\n'); // escape text values
  const pad = n => String(n).padStart(2, '0');

  // Parse a schedule time ("3p", "10p", "12a", "8:30", "4:30p") as US Eastern,
  // then convert to a UTC Date by adding 4 hours (Date.UTC normalises rollover).
  function etToUTC(date, time) {
    const [mo, dy] = date.split('/').map(Number); let h, mi = 0;
    if (time === '12a') h = 0;
    else if (time === '12p') h = 12;
    else if (time.endsWith('a')) { const x = time.slice(0, -1); [h, mi] = x.includes(':') ? x.split(':').map(Number) : [+x, 0]; if (h === 12) h = 0; }
    else if (time.endsWith('p')) { const x = time.slice(0, -1); [h, mi] = x.includes(':') ? x.split(':').map(Number) : [+x, 0]; if (h !== 12) h += 12; }
    else if (time.includes(':')) { [h, mi] = time.split(':').map(Number); if (h !== 12) h += 12; }  // bare "8:30" = evening
    else h = +time;
    return new Date(Date.UTC(2026, mo - 1, dy, h + 4, mi));
  }
  const z = d => '' + d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + '00Z';

  const ev = [];
  S.M.forEach(m => {
    const [num, date, time, t1, t2, grp, ven, chan] = m;
    if (!/^[A-L]$/.test(grp)) return;                       // group-stage matches only
    if (!favSet.has(t1) && !favSet.has(t2)) return;         // only matches involving a favorite
    const start = etToUTC(date, time), end = new Date(start.getTime() + 7200000); // 2-hour event
    const v = venueById[ven] || { city: '', stad: '' };
    ev.push('BEGIN:VEVENT', 'UID:wc2026-m' + num + '@jagnoor.github.io', 'DTSTAMP:20260101T000000Z',
      'DTSTART:' + z(start), 'DTEND:' + z(end),
      'SUMMARY:' + esc((nameByCode[t1] || t1) + ' vs ' + (nameByCode[t2] || t2) + ' (Group ' + grp + ')'),
      'LOCATION:' + esc(v.stad + ', ' + v.city),
      'DESCRIPTION:' + esc('2026 FIFA World Cup · Match #' + num + (chan ? ' · ' + chan : '')),
      'END:VEVENT');
  });
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//jagnoor//WC2026//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', ...ev, 'END:VCALENDAR'].join('\r\n');
  const a = document.createElement('a');                    // trigger a client-side download
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  a.download = 'WC2026_' + fav.join('-') + '.ics';
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href);
}

/* ============================================================================
   5) FAVORITES dropdown open/close + trigger label
   ========================================================================== */
function refreshFavLabel() {
  const checked = $$('#fav-panel input:checked');
  const disp = $('#fav-display');
  if (!checked.length) disp.textContent = LANG === 'es' ? 'Selecciona equipos...' : 'Select teams...';
  else if (checked.length <= 3) disp.textContent = checked.map(i => i.value).join(', ');
  else disp.textContent = checked.length + (LANG === 'es' ? ' equipos' : ' teams');
}

/* ============================================================================
   6) TIMEZONE AUTODETECT — preselect the dropdown to the visitor's zone
   ========================================================================== */
function autoDetectTZ() {
  const offMin = -new Date().getTimezoneOffset();              // minutes east of UTC
  const featured = { '-240': 'ET', '-300': 'CT', '-360': 'MT', '-420': 'PT', '60': 'BST' };
  let val = featured[String(offMin)];
  if (!val) {                                                  // map to the nearest UTC±N option
    const h = Math.round(offMin / 30) * 0.5;
    val = 'UTC' + (h >= 0 ? '+' : '') + (Number.isInteger(h) ? h : Math.floor(h) + ':30');
  }
  const sel = $('#sel-tz'), opt = [...sel.options].find(o => o.value === val);
  if (opt) sel.value = val;
}

/* ============================================================================
   7) AMBIENCE — live status chip, animated counters, scroll reveal, cities
   ========================================================================== */
/* Work out which stage of the tournament "today" falls in, from the schedule's
   own dates, and write a friendly status into the hero chip. Pure calendar
   logic — no live data needed. */
function liveStatus() {
  const S = window.WC_SCHEDULE; if (!S) return;
  const today = new Date(); const md = (today.getMonth() + 1) * 100 + today.getDate(); // e.g. 629 = Jun 29
  const yr = today.getFullYear();
  const num = d => { const [a, b] = d.split('/').map(Number); return a * 100 + b; };
  // First & last match dates, and per-stage windows scanned from the data.
  const dates = S.M.map(m => num(m[1]));
  const first = Math.min(...dates), last = Math.max(...dates);
  const stageOf = code => { const ds = S.M.filter(m => m[5] === code).map(m => num(m[1])); return [Math.min(...ds), Math.max(...ds)]; };
  const groupEnd = Math.max(...S.M.filter(m => /^[A-L]$/.test(m[5])).map(m => num(m[1])));
  const stages = [['R32', 'Round of 32', '32avos'], ['R16', 'Round of 16', 'Octavos'], ['QF', 'Quarterfinals', 'Cuartos'], ['SF', 'Semifinals', 'Semis'], ['FIN', 'The Final', 'La Final']];
  let label;
  if (yr < 2026 || (yr === 2026 && md < first)) {
    const d = Math.max(0, Math.round((new Date(2026, 5, 11) - today) / 86400000));
    label = LANG === 'es' ? 'Arranca el 11 de junio · faltan ' + d + ' días' : 'Kicks off June 11 · ' + d + ' days to go';
  } else if (yr > 2026 || (yr === 2026 && md > last)) {
    label = LANG === 'es' ? 'Revive el Mundial 2026' : 'Relive the 2026 World Cup';
  } else if (md <= groupEnd) {
    label = LANG === 'es' ? 'Fase de grupos · en vivo' : 'Group stage · live now';
  } else {
    label = (LANG === 'es' ? 'Mundial en vivo' : 'Tournament live');             // fallback
    for (const [code, en, es] of stages) { const [s, e] = stageOf(code); if (md >= s && md <= e) { label = (LANG === 'es' ? es : en) + (LANG === 'es' ? ' · en vivo' : ' · live now'); break; } }
  }
  $('#status-label').textContent = label;
}

/* Count a number up from 0 when its stat scrolls into view. */
function animateCount(el) {
  const target = +el.dataset.count; const dur = 1100; const t0 = performance.now();
  (function step(t) {
    const k = Math.min(1, (t - t0) / dur);                      // 0→1 progress
    el.textContent = Math.round(target * (1 - Math.pow(1 - k, 3))); // ease-out cubic
    if (k < 1) requestAnimationFrame(step);
  })(t0);
}

/* IntersectionObserver: reveal .reveal elements and fire counters once. */
function initObservers() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('in');                             // play the reveal
      $$('[data-count]', e.target).forEach(animateCount);       // and any counters inside
      io.unobserve(e.target);                                   // run once
    });
  }, { threshold: 0.18 });
  $$('.reveal').forEach(el => io.observe(el));
}

/* Render the 16 host-city chips, colour-coded by country, from the schedule. */
function buildCities() {
  const S = window.WC_SCHEDULE; if (!S) return;
  $('#cities').innerHTML = S.V.map(v => `<span class="city ${v.co}"><span class="pin"></span>${v.city}</span>`).join('');
}

/* ============================================================================
   7b) LIVE-DATA FRESHNESS — show when scores were last pulled, so visitors know
   whether they're looking at live data or a stale/sample snapshot. Reads the
   same results.json the knockout hub uses; offers a one-click fresh pull.
   ========================================================================== */
function fmtDataAge(ms) {
  const m = Math.round(ms / 60000);
  if (m < 1) return LANG === 'es' ? 'ahora mismo' : 'just now';
  if (m < 60) return m + (LANG === 'es' ? ' min' : ' min ago');
  const h = Math.round(m / 60); if (h < 36) return h + (LANG === 'es' ? ' h' : 'h ago');
  const d = Math.round(h / 24); if (d < 45) return d + (LANG === 'es' ? ' días' : ' days ago');
  return Math.round(d / 30) + (LANG === 'es' ? ' meses' : ' months ago');
}
function initDataStatus() {
  const el = $('#data-status'); if (!el) return;
  const T = LANG === 'es'
    ? { pulled: 'Marcadores actualizados', updatedLbl: 'Datos actualizados', refresh: 'Actualizar', open: 'Abrir la retrospectiva →', none: 'Marcadores en vivo no disponibles.', sample: 'DATOS DE MUESTRA', stale: 'DESACTUALIZADO', live: 'DATOS EN VIVO', near: 'CASI EN VIVO', nodata: 'SIN DATOS', archive: 'RESULTADOS FINALES · ARCHIVO' }
    : { pulled: 'Live scores last pulled', updatedLbl: 'Data updated', refresh: 'Refresh', open: 'Open the retrospective →', none: 'Live scores unavailable.', sample: 'SAMPLE DATA', stale: 'STALE', live: 'LIVE DATA', near: 'NEAR-LIVE', nodata: 'NO DATA', archive: 'FINAL RESULTS · ARCHIVE' };

  function paint(info) {
    const updated = info.updated || 0;
    const source = info.source || '';
    const isSample = source === 'sample', isOf = source === 'openfootball', isEspn = source === 'espn', isArchive = source === 'archive';
    const abs = updated ? new Date(updated).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';
    const ageMs = updated ? Date.now() - updated : 0;
    const stale = isOf && updated && ageMs > 36 * 3600000;
    const badge = isArchive ? `<span class="ds-badge live">🏁 ${T.archive}</span>`
      : isSample ? `<span class="ds-badge sample">● ${T.sample}</span>`
        : isEspn ? `<span class="ds-badge live">● ${T.live} · ESPN</span>`
          : isOf ? `<span class="ds-badge near">● ${T.near}${stale ? ' · ' + T.stale : ''}</span>`
            : updated ? `<span class="ds-badge live">● ${T.live}</span>` : `<span class="ds-badge stale">● ${T.nodata}</span>`;
    el.innerHTML = badge +
      `<span class="ds-txt">${isEspn ? 'Live scores · refreshed' : isOf ? T.updatedLbl : T.pulled} <b>${abs}</b> · ${updated ? fmtDataAge(ageMs) : '—'}${isOf ? ' · openfootball' : ''}</span>` +
      `<button class="ds-refresh" id="ds-refresh" type="button">↻ ${T.refresh}</button>` +
      `<a class="ds-link" href="index.html">${T.open}</a>`;
    el.hidden = false;
    $('#ds-refresh').addEventListener('click', load);
  }
  function load() {
    el.classList.add('loading');
    const tryFeed = window.WC_FEED && new URLSearchParams(location.search).get('data') !== 'sample';
    const p = tryFeed
      ? window.WC_FEED.load().then(d => ({ updated: d.updated, source: d.source }))
      : Promise.reject('sample');
    p.then(info => { el.classList.remove('loading'); paint(info); })
      .catch(() => fetch('results.json?t=' + Date.now(), { cache: 'no-store' })
        .then(r => r.ok ? r.json() : Promise.reject(r.status))
        .then(d => { el.classList.remove('loading'); paint({ updated: Date.parse(d.updated), source: d.source || 'sample' }); })
        .catch(() => { el.classList.remove('loading'); el.innerHTML = `<span class="ds-badge stale">● ${T.nodata}</span><span class="ds-txt">${T.none}</span>`; el.hidden = false; }));
  }
  load();
}

/* ============================================================================
   8) WIRING — connect controls, then do the first render
   ========================================================================== */
function init() {
  buildFavorites();                                              // generate team checkboxes
  buildCities();                                                 // generate venue chips

  // Re-render the preview whenever a core control changes.
  ['#sel-theme', '#sel-tz', '#sel-size', '#sel-clock', '#sel-datefmt'].forEach(s => $(s).addEventListener('change', update));

  // Favorites: toggle the panel, update label + preview on each change.
  $('#fav-trigger').addEventListener('click', () => $('#fav').classList.toggle('open'));
  $('#fav-panel').addEventListener('change', () => { refreshFavLabel(); update(); });
  document.addEventListener('click', e => { if (!e.target.closest('#fav')) $('#fav').classList.remove('open'); }); // close on outside click

  // Action buttons.
  $('#btn-open').addEventListener('click', e => { e.preventDefault(); openPoster(); });
  $('#btn-print').addEventListener('click', printPoster);
  $('#btn-pdf').addEventListener('click', downloadPDF);
  $('#btn-png').addEventListener('click', downloadPNG);
  $('#btn-ics').addEventListener('click', downloadICS);

  // Language toggle (navigates, because the poster needs ?lang too).
  $$('[data-lang]').forEach(b => b.addEventListener('click', () => {
    const to = b.dataset.lang;
    location.href = to === 'es' ? '?lang=es' : location.pathname;
  }));
  // Theme quick-toggle in the nav flips the builder's theme select.
  $('#theme-toggle').addEventListener('click', () => { const h = document.documentElement; h.setAttribute('data-theme', h.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); });

  // Pre-fill favorites from a shared ?fav= link, if present.
  const favParam = new URLSearchParams(location.search).get('fav');
  if (favParam) favParam.split(',').forEach(code => { const cb = $(`#fav-panel input[value="${code}"]`); if (cb) cb.checked = true; });

  applyI18n();          // translate to Spanish if needed
  autoDetectTZ();       // guess the visitor's timezone
  refreshFavLabel();    // set the favorites label
  liveStatus();         // fill the live status chip
  initDataStatus();     // show when live scores were last pulled
  initPosterLiveData(); // feed live scores + R32 names into the poster preview
  initObservers();      // arm scroll-reveal + counters
  update();             // first preview render
  _ready = true;        // mark init complete
}

/* Run once the schedule + DOM are ready. */
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
