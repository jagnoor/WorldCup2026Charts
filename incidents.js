/* ============================================================================
   incidents.js — THE DECISION LEDGER · 2026 World Cup officiating retrospective
   ----------------------------------------------------------------------------
   The tournament-wide record of contested officiating decisions, compiled
   2026-07-21 from published match coverage and referee-analysis outlets, with
   every match context CROSS-VERIFIED against this site's frozen results
   archive (results.json, ESPN snapshot 2026-07-20). Several outlets mislabeled
   rounds (e.g. Balogun's red was R32, not the group stage); the match numbers
   below are authoritative per our schedule.

   HONESTY CONTRACT (same as the rest of this site):
   - `counted` data (fouls/cards/pens) is objective, from ESPN boxscores.
   - `verdicts` are the OPINIONS of the named analysts/outlets — attributed,
     never presented as findings of fact. Where experts disagree, ALL reads
     are listed and the incident is tagged verdict:"split".
   - `beneficiary`/`victim` describe the decision's direction in effect,
     independent of whether the call was correct.

   Weights (Whistle Ledger convention): red or goal-value decision = 3,
   penalty = 2, yellow-card threshold = 1.

   Schema:
     window.WC_INCIDENTS = {
       compiled, sources: {id: label},
       incidents: [{ id, match (num|null), stage, when, score, title, detail,
                     minute, type, beneficiary, victim, weight,
                     verdict: 'correct'|'incorrect'|'split'|'factual'|'unresolved',
                     verdicts: [{src, read}], institutional?, sources: [srcId] }],
       teamDiscipline: { ABB: {m, fouls, y, r, pensFor, pensAgainst} },
       baselines: { fouls, yellows, reds, foulsPerBooking, inPlayPens }
     }
   ========================================================================== */
window.WC_INCIDENTS = {
  compiled: '2026-07-21',

  sources: {
    si: 'Sports Illustrated — "13 Most Controversial Refereeing Decisions, Ranked"',
    varv: 'The VAR Verdict — "10 Biggest 2026 World Cup Refereeing Decisions"',
    ajz: 'Al Jazeera — controversies coverage (Jul 13) & group-stage VAR review (Jun 28)',
    espnvar: "ESPN — World Cup VAR review column",
    fox: 'Fox Sports — officiating analysis (Dr. Joe Machnik; Rob Green)',
    ap: 'AP (via 1News) — Embolo / mistaken-identity rule analysis',
    espn_news: 'ESPN news — Almirón first mouth-covering red (Jun 20)',
    wapo: 'Washington Post — mouth-covering rule explainer (Jul 1)',
    uefa: 'UEFA statement via press — Balogun ban suspension ("crossed a red line")',
    fifa: 'FIFA statements — sensor data (cable-gate); refereeing chief on bias claims',
    archive: "This site's frozen results archive (ESPN snapshot 2026-07-20)"
  },

  incidents: [
    /* ---- group stage ---------------------------------------------------- */
    { id: 'messi-nonred', match: 19, stage: 'Group J', when: 'Jun 16', score: 'ARG 3–0 ALG',
      title: 'Messi non-red for challenge on Mandi', minute: '1st half',
      type: 'red-not-given', beneficiary: 'ARG', victim: 'ALG', weight: 3,
      verdict: 'incorrect',
      verdicts: [
        { src: 'espnvar', read: 'Red-card offense — should have been a sending-off' },
        { src: 'si', read: '"Very fortunate indeed"; replays suggest clear infringement (ranked #3)' }],
      detail: 'Messi caught Aïssa Mandi from behind at 1–0; no foul given, VAR checked and cleared. Messi went on to score a hat-trick. Compared unfavorably to the Balogun red for a similar challenge.',
      sources: ['espnvar', 'si', 'archive'] },

    { id: 'mbappe-pen-denied', match: 17, stage: 'Group I', when: 'Jun 16', score: 'FRA 3–1 SEN',
      title: 'Mbappé penalty appeal denied', minute: null,
      type: 'pen-denied', beneficiary: 'SEN', victim: 'FRA', weight: 2,
      verdict: 'incorrect',
      verdicts: [{ src: 'si', read: 'Referee kept his on-field call after a VAR-suggested review; "few people will have reached" his conclusion (ranked #6)' }],
      detail: 'Mbappé went down under a mistimed Mané challenge; the referee ruled the attacker initiated contact and kept his decision at the monitor. France won anyway.',
      sources: ['si', 'archive'] },

    { id: 'almiron-mouthcover', match: 32, stage: 'Group D', when: 'Jun 20 (UTC)', score: 'TUR 1–1 PAR',
      title: 'Almirón — first-ever mouth-covering red', minute: "45'+",
      type: 'red-given', beneficiary: 'TUR', victim: 'PAR', weight: 3,
      verdict: 'correct',
      verdicts: [
        { src: 'espn_news', read: 'First player sent off under the new IFAB rule — straight red, as written' },
        { src: 'wapo', read: 'Rule (approved Apr 2026, anti-concealment/racism measure) applied as designed; widely criticized as disproportionate' }],
      detail: 'Miguel Almirón covered his mouth while exchanging words with Mert Müldür after a midfield foul; referee Iván Barton issued a straight red under the new rule. UEFA later said it will not adopt the rule.',
      sources: ['espn_news', 'wapo', 'archive'] },

    { id: 'ghana-pen-denied', match: 46, stage: 'Group L', when: 'Jun 23', score: 'ENG 0–0 GHA',
      title: 'Ghana penalty denied (Konsa on Adu)', minute: null,
      type: 'pen-denied', beneficiary: 'ENG', victim: 'GHA', weight: 2,
      verdict: 'incorrect',
      verdicts: [
        { src: 'varv', read: 'INCORRECT — strong penalty claim missed' },
        { src: 'si', read: '"Hard to view as anything other than a clear oversight" (ranked #7)' }],
      detail: 'Ezri Konsa caught Prince Adu in the box; referee and VAR both waved it away. The match ended 0–0 — a converted penalty would likely have flipped the group table.',
      sources: ['varv', 'si', 'archive'] },

    { id: 'vinicius-goal-disallowed', match: 51, stage: 'Group C', when: 'Jun 24', score: 'SCO 0–3 BRA',
      title: 'Vinícius Júnior goal disallowed', minute: "22'",
      type: 'goal-disallowed', beneficiary: 'SCO', victim: 'BRA', weight: 3,
      verdict: 'incorrect',
      verdicts: [
        { src: 'varv', read: 'INCORRECT — questionable intervention' },
        { src: 'si', read: 'Contact "slight at best"; BBC\'s Darren Cann: Scotland "a little bit fortunate" (ranked #10)' }],
      detail: 'Vinícius stole possession from Jack Hendry and finished; a VAR review ruled he fouled Hendry first. Brazil still won 3–0, so the decision cost nothing — a key control case for outcome-weighting.',
      sources: ['varv', 'si', 'archive'] },

    { id: 'pavlovic-highboot', match: 56, stage: 'Group E', when: 'Jun 25', score: 'ECU 2–1 GER',
      title: "Pavlović high boot before Sané's 2' goal — goal stood", minute: "2'",
      type: 'goal-allowed', beneficiary: 'GER', victim: 'ECU', weight: 3,
      verdict: 'correct',
      verdicts: [{ src: 'varv', read: 'CORRECT — legally supportable, though contested' }],
      detail: "Ecuador protested a perceived high boot in the buildup to Sané's 2nd-minute goal; the goal survived review. Ecuador came back to win 2–1 anyway (Angulo 9', Plata 77') — another decision that ultimately cost nothing.",
      sources: ['varv', 'archive'] },

    { id: 'khalilzadeh-offside', match: 65, stage: 'Group G', when: 'Jun 26', score: 'EGY 1–1 IRN',
      title: "Iran's 93rd-minute winner ruled offside by a toe", minute: "90'+3",
      type: 'goal-disallowed', beneficiary: 'EGY', victim: 'IRN', weight: 3,
      verdict: 'factual',
      verdicts: [
        { src: 'varv', read: 'CORRECT — marginal, by millimeters' },
        { src: 'si', read: '"Correct decision according to the rules"; "total heartbreaker" (ranked #12)' }],
      detail: 'Shoja Khalilzadeh poked home in a goalmouth melee; semi-automated offside showed a toe offside in the buildup. Iran were eliminated at the group stage.',
      sources: ['varv', 'si', 'archive'] },

    /* ---- Round of 32 ---------------------------------------------------- */
    { id: 'tah-goal-disallowed', match: 74, stage: 'R32', when: 'Jun 29', score: 'GER 1–1 PAR (pens 3–4)',
      title: "Tah's extra-time goal disallowed — Germany out on pens", minute: 'ET',
      type: 'goal-disallowed', beneficiary: 'PAR', victim: 'GER', weight: 3,
      verdict: 'incorrect',
      verdicts: [{ src: 'si', read: 'Ranked the tournament\'s #1 decision: keeper went down from "the lightest of contact"; the call looked overly strict' }],
      detail: "Jonathan Tah headed in a corner for 2–1 in extra time; VAR ruled Waldemar Anton blocked keeper Orlando Gill with minimal contact. Germany lost the shootout 3–4 — Tah missed the decisive kick.",
      sources: ['si', 'archive'] },

    { id: 'kane-pen-denied', match: 80, stage: 'R32', when: 'Jul 1', score: 'ENG 2–1 COD',
      title: 'Kane penalty appeal waved away (keeper contact)', minute: null,
      type: 'pen-denied', beneficiary: 'COD', victim: 'ENG', weight: 2,
      verdict: 'incorrect',
      verdicts: [
        { src: 'varv', read: 'INCORRECT — penalty should have been awarded' },
        { src: 'si', read: 'Contact was clear "to the bewilderment of anyone watching" (ranked #5)' }],
      detail: 'Through on goal, Kane went down after contact from keeper Lionel Mpasi; the referee implied a dive (no booking) and VAR upheld. England won regardless. NOTE: widely misreported as a Round-of-16 match — the archive confirms R32, match #80.',
      sources: ['varv', 'si', 'archive'] },

    { id: 'balogun-red', match: 81, stage: 'R32', when: 'Jul 1', score: 'USA 2–0 BIH',
      title: 'Balogun straight red (studs on Muharemović)', minute: null,
      type: 'red-given', beneficiary: 'BIH', victim: 'USA', weight: 3,
      verdict: 'split',
      verdicts: [
        { src: 'varv', read: 'INCORRECT — yellow card was appropriate' },
        { src: 'si', read: 'Looked innocuous live, far worse in slow motion; classic intention-vs-outcome debate (ranked #4)' }],
      detail: 'Referee Raphael Claus (BRA) upgraded to red after VAR showed slow-motion close-ups. Ten-man USA still won 2–0. The aftermath became its own incident (see balogun-ban).',
      sources: ['varv', 'si', 'archive'] },

    { id: 'balogun-ban', match: null, stage: 'Off-field', when: 'Jul (pre-R16)', score: 'USA 1–4 BEL followed',
      title: "Balogun's ban suspended after presidential pressure", minute: null,
      type: 'institutional', beneficiary: 'USA', victim: 'process', weight: 3, institutional: true,
      verdict: 'unresolved',
      verdicts: [
        { src: 'uefa', read: 'UEFA: FIFA "crossed a red line" — disciplinary integrity undermined' },
        { src: 'ajz', read: 'Trump publicly questioned referee Claus\'s integrity; Brazilian FA rejected the attack; FIFA claimed its judicial bodies act "independently and autonomously"' }],
      detail: "The US president intervened publicly; FIFA's judicial body suspended the red-card ban so Balogun could play the R16 v Belgium (USA lost 1–4). Multiple federations and coaches condemned the precedent. The single largest governance controversy of the tournament.",
      sources: ['uefa', 'ajz', 'si', 'archive'] },

    { id: 'tielemans-pen', match: 82, stage: 'R32', when: 'Jul 1', score: 'BEL 3–2 SEN (aet)',
      title: 'Belgium awarded deep-stoppage penalty (Camara on Tielemans)', minute: '90+/ET',
      type: 'pen-awarded', beneficiary: 'BEL', victim: 'SEN', weight: 2,
      verdict: 'split',
      verdicts: [{ src: 'si', read: 'Marginal: referee initially uninterested; lengthy VAR review found "very light" contact (ranked #8)' }],
      detail: 'Trailing 2–0 earlier, Belgium got a late lifeline when a long review judged Lamine Camara\'s light contact a foul. Tielemans converted; Belgium completed the comeback 3–2 in extra time.',
      sources: ['si', 'archive'] },

    { id: 'gvardiol-offside', match: 83, stage: 'R32', when: 'Jul 2', score: 'POR 2–1 CRO',
      title: "Croatia's last-gasp equalizer disallowed by connected-ball offside", minute: '90+',
      type: 'goal-disallowed', beneficiary: 'POR', victim: 'CRO', weight: 3,
      verdict: 'factual',
      verdicts: [
        { src: 'varv', read: 'CORRECT technically — but harsh' },
        { src: 'si', read: '"Correct, if gut-wrenching" — the faintest touch by Matanović put Gvardiol offside (ranked #11)' }],
      detail: "Connected Ball Technology detected the faintest headed touch in the buildup, voiding Gvardiol's bundled equalizer in the dying moments. Modrić's last World Cup match.",
      sources: ['varv', 'si', 'archive'] },

    /* ---- Round of 16 ---------------------------------------------------- */
    { id: 'zico-goal-disallowed', match: 95, stage: 'R16', when: 'Jul 7', score: 'ARG 3–2 EGY',
      title: "Egypt's 2–0 breakaway goal disallowed from a full pitch away", minute: "58'",
      type: 'goal-disallowed', beneficiary: 'ARG', victim: 'EGY', weight: 3,
      verdict: 'split',
      verdicts: [
        { src: 'fox', read: 'Machnik: protocol-correct (foul in the attacking phase can void the goal). Green: not within VAR\'s realm' },
        { src: 'varv', read: 'CORRECT — harsh but legitimate' },
        { src: 'ajz', read: 'The tournament\'s loudest VAR controversy; Egypt FA filed a formal complaint; Salah and Hassan publicly condemned it' }],
      detail: 'Letexier\'s monitor review found a foul by Attia on L. Martínez at the very start of the sequence. Egypt led 2–0 with 11 minutes left and lost 3–2. Egypt\'s coach: "We have suffered injustice." FIFA\'s refereeing chief rejected bias claims.',
      sources: ['fox', 'varv', 'ajz', 'archive'] },

    { id: 'fathy-pen-denied', match: 95, stage: 'R16', when: 'Jul 7', score: 'ARG 3–2 EGY',
      title: "Egypt's late penalty appeal denied; Argentina score the winner", minute: '90+',
      type: 'pen-denied', beneficiary: 'ARG', victim: 'EGY', weight: 2,
      verdict: 'split',
      verdicts: [{ src: 'varv', read: 'CORRECT — defensible judgment call' }],
      detail: 'Hamdy Fathy went down under a challenge; appeals waved away; Argentina scored the 90\'+2 winner on the counter. Paired with the Zico call, it made Egypt the match\'s double victim.',
      sources: ['varv', 'si', 'archive'] },

    /* ---- Quarterfinals -------------------------------------------------- */
    { id: 'cable-gate', match: 99, stage: 'QF', when: 'Jul 11', score: 'NOR 1–2 ENG (aet)',
      title: 'Cable-gate: goal-kick allegedly deflected by camera wire before England equalizer', minute: "45'+2",
      type: 'external', beneficiary: 'ENG', victim: 'NOR', weight: 3,
      verdict: 'unresolved',
      verdicts: [
        { src: 'fifa', read: 'FIFA released ball-sensor data claiming no contact with the wire' },
        { src: 'si', read: 'Norway\'s Berge called it "ridiculous"; publicly unresolved (ranked #9)' }],
      detail: "Norway claimed Nyland's goal-kick clipped the overhead camera cable, altering its path in the buildup to Bellingham's equalizer. FIFA's sensor data said otherwise; Norway went out in extra time.",
      sources: ['fifa', 'si', 'archive'] },

    { id: 'embolo-red', match: 100, stage: 'QF', when: 'Jul 11', score: 'ARG 3–1 SUI (aet)',
      title: 'Embolo second-yellow red via the new mistaken-identity protocol', minute: "72'",
      type: 'red-given', beneficiary: 'ARG', victim: 'SUI', weight: 3,
      verdict: 'split',
      verdicts: [
        { src: 'ap', read: 'Applied as the new rule is written' },
        { src: 'varv', read: 'INCORRECT — protocol misapplied' },
        { src: 'si', read: 'Simulation "quite clear," but why was Paredes booked for an innocuous foul in the first place? (ranked #13)' }],
      detail: "VAR flagged that Pinheiro's on-field yellow to Paredes punished the wrong act: Embolo had simulated. The correction rescinded Paredes' card and dismissed Embolo (second yellow) five minutes after Switzerland equalized. Yakin: \"this rule destroyed our game.\"",
      sources: ['ap', 'varv', 'si', 'archive'] },

    { id: 'argentine-crew', match: 97, stage: 'QF', when: 'Jul 11', score: 'FRA 2–0 MAR',
      title: 'All-Argentine officiating crew appointed for France–Morocco', minute: null,
      type: 'institutional', beneficiary: null, victim: 'perception', weight: 0, institutional: true,
      verdict: 'unresolved',
      verdicts: [{ src: 'ajz', read: 'The appointment (a QF on Argentina\'s potential final path) drew 32M+ views of reaction; no in-match decision was formally protested' }],
      detail: 'FIFA appointed all five on-field officials from Argentina for a quarterfinal whose winner could meet Argentina in the final. France won 2–0 without a flashpoint — the controversy was the optics of the appointment itself.',
      sources: ['ajz', 'archive'] },

    /* ---- Final ----------------------------------------------------------- */
    { id: 'williams-goal-disallowed', match: 104, stage: 'Final', when: 'Jul 19', score: 'ESP 1–0 ARG (aet)',
      title: "Nico Williams' goal disallowed for a buildup foul", minute: "93'",
      type: 'goal-disallowed', beneficiary: 'ARG', victim: 'ESP', weight: 3,
      verdict: 'incorrect',
      verdicts: [{ src: 'varv', read: 'INCORRECT — a normal football challenge; the goal should have stood' }],
      detail: 'On-field call, VAR check-and-clear. Independent analysis scored it wrong. Spain won anyway — the decision is the strongest single counterpoint to the "arranged for Argentina" thesis.',
      sources: ['varv', 'archive'] },

    { id: 'fernandez-red', match: 104, stage: 'Final', when: 'Jul 19', score: 'ESP 1–0 ARG (aet)',
      title: "Enzo Fernández's second-yellow red at 90'+3", minute: "90'+3",
      type: 'red-given', beneficiary: 'ESP', victim: 'ARG', weight: 3,
      verdict: 'correct',
      verdicts: [{ src: 'varv', read: 'CORRECT — reckless second caution; outside VAR\'s remit, and the Laws don\'t soften for a final' }],
      detail: 'Argentina played the entirety of extra time a man down and conceded Ferran Torres\' winner at 106\'. The tournament\'s decisive officiating moment went against the team the narrative said was protected.',
      sources: ['varv', 'archive'] }
  ],

  /* Objective counted layer — ESPN boxscores, ALL 48 teams, 104 matches
     (snapshot 2026-07-20). Field average: 8.6 fouls per booking (y+r).
     CUR = Curaçao (ESPN code CUW mapped to this site's code). */
  teamDiscipline: {
    ALG: { m: 4, fouls: 29, y: 3, r: 0, pensFor: 0, pensAgainst: 0 },
    ARG: { m: 8, fouls: 113, y: 13, r: 1, pensFor: 3, pensAgainst: 0 },
    AUS: { m: 4, fouls: 46, y: 5, r: 0, pensFor: 0, pensAgainst: 0 },
    AUT: { m: 4, fouls: 47, y: 5, r: 0, pensFor: 1, pensAgainst: 1 },
    BEL: { m: 6, fouls: 78, y: 6, r: 1, pensFor: 1, pensAgainst: 0 },
    BIH: { m: 4, fouls: 60, y: 7, r: 1, pensFor: 0, pensAgainst: 1 },
    BRA: { m: 5, fouls: 51, y: 8, r: 0, pensFor: 2, pensAgainst: 0 },
    CAN: { m: 5, fouls: 72, y: 11, r: 0, pensFor: 0, pensAgainst: 0 },
    CIV: { m: 4, fouls: 29, y: 4, r: 0, pensFor: 0, pensAgainst: 0 },
    COD: { m: 4, fouls: 44, y: 6, r: 0, pensFor: 1, pensAgainst: 0 },
    COL: { m: 5, fouls: 70, y: 8, r: 0, pensFor: 0, pensAgainst: 0 },
    CPV: { m: 4, fouls: 27, y: 5, r: 0, pensFor: 0, pensAgainst: 0 },
    CRO: { m: 4, fouls: 45, y: 4, r: 0, pensFor: 0, pensAgainst: 2 },
    CUR: { m: 3, fouls: 32, y: 7, r: 0, pensFor: 0, pensAgainst: 1 },
    CZE: { m: 3, fouls: 37, y: 1, r: 0, pensFor: 0, pensAgainst: 1 },
    ECU: { m: 4, fouls: 49, y: 8, r: 1, pensFor: 0, pensAgainst: 0 },
    EGY: { m: 5, fouls: 59, y: 12, r: 0, pensFor: 0, pensAgainst: 2 },
    ENG: { m: 8, fouls: 81, y: 8, r: 1, pensFor: 3, pensAgainst: 1 },
    ESP: { m: 8, fouls: 101, y: 6, r: 0, pensFor: 1, pensAgainst: 0 },
    FRA: { m: 8, fouls: 84, y: 6, r: 0, pensFor: 2, pensAgainst: 3 },
    GER: { m: 4, fouls: 51, y: 3, r: 0, pensFor: 1, pensAgainst: 0 },
    GHA: { m: 4, fouls: 56, y: 6, r: 0, pensFor: 0, pensAgainst: 0 },
    HAI: { m: 3, fouls: 55, y: 7, r: 0, pensFor: 0, pensAgainst: 0 },
    IRN: { m: 3, fouls: 35, y: 6, r: 0, pensFor: 1, pensAgainst: 0 },
    IRQ: { m: 3, fouls: 27, y: 4, r: 1, pensFor: 0, pensAgainst: 0 },
    JOR: { m: 3, fouls: 31, y: 4, r: 0, pensFor: 0, pensAgainst: 2 },
    JPN: { m: 4, fouls: 55, y: 4, r: 0, pensFor: 0, pensAgainst: 0 },
    KOR: { m: 3, fouls: 25, y: 4, r: 0, pensFor: 0, pensAgainst: 0 },
    KSA: { m: 3, fouls: 29, y: 6, r: 0, pensFor: 0, pensAgainst: 0 },
    MAR: { m: 6, fouls: 74, y: 7, r: 0, pensFor: 0, pensAgainst: 1 },
    MEX: { m: 5, fouls: 58, y: 4, r: 1, pensFor: 1, pensAgainst: 1 },
    NED: { m: 4, fouls: 44, y: 3, r: 0, pensFor: 0, pensAgainst: 0 },
    NOR: { m: 6, fouls: 58, y: 3, r: 0, pensFor: 1, pensAgainst: 2 },
    NZL: { m: 3, fouls: 32, y: 4, r: 0, pensFor: 0, pensAgainst: 0 },
    PAN: { m: 3, fouls: 46, y: 5, r: 0, pensFor: 0, pensAgainst: 0 },
    PAR: { m: 5, fouls: 66, y: 9, r: 1, pensFor: 0, pensAgainst: 1 },
    POR: { m: 5, fouls: 44, y: 7, r: 0, pensFor: 1, pensAgainst: 0 },
    QAT: { m: 3, fouls: 36, y: 4, r: 2, pensFor: 0, pensAgainst: 1 },
    RSA: { m: 4, fouls: 38, y: 5, r: 2, pensFor: 1, pensAgainst: 0 },
    SCO: { m: 3, fouls: 42, y: 5, r: 0, pensFor: 0, pensAgainst: 0 },
    SEN: { m: 4, fouls: 36, y: 3, r: 0, pensFor: 0, pensAgainst: 1 },
    SUI: { m: 6, fouls: 87, y: 7, r: 1, pensFor: 2, pensAgainst: 0 },
    SWE: { m: 4, fouls: 43, y: 5, r: 0, pensFor: 0, pensAgainst: 0 },
    TUN: { m: 3, fouls: 27, y: 1, r: 0, pensFor: 0, pensAgainst: 0 },
    TUR: { m: 3, fouls: 31, y: 2, r: 0, pensFor: 0, pensAgainst: 0 },
    URU: { m: 3, fouls: 31, y: 5, r: 1, pensFor: 0, pensAgainst: 0 },
    USA: { m: 5, fouls: 56, y: 7, r: 1, pensFor: 0, pensAgainst: 0 },
    UZB: { m: 3, fouls: 45, y: 4, r: 0, pensFor: 0, pensAgainst: 1 }
  },

  baselines: { fouls: 2412, yellows: 267, reds: 15, foulsPerBooking: 8.6, inPlayPens: 22 }
};
