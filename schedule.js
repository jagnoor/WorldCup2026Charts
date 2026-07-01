/* ===================================================================
   2026 FIFA World Cup Wall Chart — SINGLE SOURCE OF TRUTH
   -------------------------------------------------------------------
   Loaded by index.html, poster.html and poster-vertical.html via
   <script src="schedule.js"></script>. Exposes window.WC_SCHEDULE.

   Match row schema (the `M` array):
     [num, "M/D", "time", home, away, group, venue, channel, feeder1?, feeder2?]
       - Group stage (1-72): home/away = 3-letter team codes, group = "A".."L".
       - Round of 32 (73-88): home/away = slot placeholders
         ("1A".."1L", "2A".."2L", or "3rd"); group = "R32".
       - R16 -> Final (89-104): home/away = ""; feeders (cols 8-9) hold
         "W##" (winner of match ##) or "L##" (loser of match ##).
     `time` is canonical US Eastern (ET, UTC-4 during the tournament);
     every poster converts from this baseline.

   Results (optional, for the live-score pipeline): pages may define
     window.WC_RESULTS = { "<matchNum>": { h:<homeGoals>, a:<awayGoals>,
                                            pen:[<h>,<a>]? }, ... }
   computeStandings() turns the group-stage subset into a live table.
   =================================================================== */
(function () {
  const V = [{id:'VAN',city:'Vancouver',stad:'BC Place',co:'ca'},{id:'TOR',city:'Toronto',stad:'BMO Field',co:'ca'},{id:'MEX',city:'Mexico City',stad:'Estadio Azteca',co:'mx'},{id:'MTY',city:'Monterrey',stad:'Estadio BBVA',co:'mx'},{id:'GDL',city:'Guadalajara',stad:'Estadio Akron',co:'mx'},{id:'SFO',city:'San Francisco',stad:"Levi's Stadium",co:'us'},{id:'HOU',city:'Houston',stad:'NRG Stadium',co:'us'},{id:'PHI',city:'Philadelphia',stad:'Lincoln Financial Field',co:'us'},{id:'SEA',city:'Seattle',stad:'Lumen Field',co:'us'},{id:'BOS',city:'Boston',stad:'Gillette Stadium',co:'us'},{id:'KCM',city:'Kansas City',stad:'Arrowhead Stadium',co:'us'},{id:'LAX',city:'Los Angeles',stad:'SoFi Stadium',co:'us'},{id:'DAL',city:'Dallas',stad:'AT&T Stadium',co:'us'},{id:'ATL',city:'Atlanta',stad:'Mercedes-Benz Stadium',co:'us'},{id:'MIA',city:'Miami',stad:'Hard Rock Stadium',co:'us'},{id:'NYC',city:'New York / NJ',stad:'MetLife Stadium',co:'us'}];

  const ISO = {MEX:'mx',RSA:'za',KOR:'kr',CZE:'cz',CAN:'ca',BIH:'ba',QAT:'qa',SUI:'ch',BRA:'br',MAR:'ma',HAI:'ht',SCO:'gb-sct',USA:'us',PAR:'py',AUS:'au',TUR:'tr',GER:'de',CUR:'cw',CIV:'ci',ECU:'ec',NED:'nl',JPN:'jp',SWE:'se',TUN:'tn',ESP:'es',CPV:'cv',KSA:'sa',URU:'uy',BEL:'be',EGY:'eg',IRN:'ir',NZL:'nz',FRA:'fr',SEN:'sn',IRQ:'iq',NOR:'no',ARG:'ar',ALG:'dz',AUT:'at',JOR:'jo',POR:'pt',COD:'cd',UZB:'uz',COL:'co',ENG:'gb-eng',CRO:'hr',GHA:'gh',PAN:'pa'};

  const M = [[1,'6/11','3p','MEX','RSA','A','MEX','FOX'],[2,'6/11','10p','KOR','CZE','A','GDL','FS1'],[3,'6/12','3p','CAN','BIH','B','TOR','FOX'],[4,'6/12','9p','USA','PAR','D','LAX','FOX'],[5,'6/13','3p','QAT','SUI','B','SFO','FOX'],[6,'6/13','6p','BRA','MAR','C','NYC','FS1'],[7,'6/13','9p','HAI','SCO','C','BOS','FS1'],[8,'6/14','12a','AUS','TUR','D','VAN','FS1'],[9,'6/14','1p','GER','CUR','E','HOU','FOX'],[10,'6/14','4p','NED','JPN','F','DAL','FOX'],[11,'6/14','7p','CIV','ECU','E','PHI','FS1'],[12,'6/14','10p','SWE','TUN','F','MTY','FS1'],[13,'6/15','12p','ESP','CPV','H','ATL','FOX'],[14,'6/15','3p','BEL','EGY','G','SEA','FOX'],[15,'6/15','6p','KSA','URU','H','MIA','FS1'],[16,'6/15','9p','IRN','NZL','G','LAX','FS1'],[17,'6/16','3p','FRA','SEN','I','NYC','FOX'],[18,'6/16','6p','IRQ','NOR','I','BOS','FOX'],[19,'6/16','9p','ARG','ALG','J','KCM','FOX'],[20,'6/17','12a','AUT','JOR','J','SFO','FS1'],[21,'6/17','1p','POR','COD','K','HOU','FOX'],[22,'6/17','4p','ENG','CRO','L','DAL','FOX'],[23,'6/17','7p','GHA','PAN','L','TOR','FS1'],[24,'6/17','10p','UZB','COL','K','MEX','FS1'],[25,'6/18','12p','CZE','RSA','A','ATL','FOX'],[26,'6/18','3p','SUI','BIH','B','LAX','FOX'],[27,'6/18','6p','CAN','QAT','B','VAN','FOX'],[28,'6/18','9p','MEX','KOR','A','GDL','FS1'],[29,'6/19','3p','USA','AUS','D','SEA','FOX'],[30,'6/19','6p','SCO','MAR','C','BOS','FS1'],[31,'6/19','8:30','BRA','HAI','C','PHI','FOX'],[32,'6/19','11p','TUR','PAR','D','SFO','FS1'],[33,'6/20','1p','NED','SWE','F','HOU','FOX'],[34,'6/20','4p','GER','CIV','E','TOR','FOX'],[35,'6/20','8p','ECU','CUR','E','KCM','FS1'],[36,'6/21','12a','TUN','JPN','F','MTY','FS1'],[37,'6/21','12p','ESP','KSA','H','ATL','FOX'],[38,'6/21','3p','BEL','IRN','G','LAX','FOX'],[39,'6/21','6p','URU','CPV','H','MIA','FS1'],[40,'6/21','9p','NZL','EGY','G','VAN','FS1'],[41,'6/22','1p','ARG','AUT','J','DAL','FOX'],[42,'6/22','5p','FRA','IRQ','I','PHI','FOX'],[43,'6/22','8p','NOR','SEN','I','NYC','FS1'],[44,'6/22','11p','JOR','ALG','J','SFO','FS1'],[45,'6/23','1p','POR','UZB','K','HOU','FOX'],[46,'6/23','4p','ENG','GHA','L','BOS','FOX'],[47,'6/23','7p','PAN','CRO','L','TOR','FS1'],[48,'6/23','10p','COL','COD','K','GDL','FS1'],[49,'6/24','3p','SUI','CAN','B','VAN','FOX'],[50,'6/24','3p','BIH','QAT','B','SEA','FS1'],[51,'6/24','6p','SCO','BRA','C','MIA','FOX'],[52,'6/24','6p','MAR','HAI','C','ATL','FS1'],[53,'6/24','9p','CZE','MEX','A','MEX','FOX'],[54,'6/24','9p','RSA','KOR','A','MTY','FS1'],[55,'6/25','4p','CUR','CIV','E','PHI','FS1'],[56,'6/25','4p','ECU','GER','E','NYC','FOX'],[57,'6/25','7p','JPN','SWE','F','DAL','FOX'],[58,'6/25','7p','TUN','NED','F','KCM','FS1'],[59,'6/25','10p','TUR','USA','D','LAX','FOX'],[60,'6/25','10p','PAR','AUS','D','SFO','FS1'],[61,'6/26','3p','NOR','FRA','I','BOS','FOX'],[62,'6/26','3p','SEN','IRQ','I','TOR','FS1'],[63,'6/26','8p','CPV','KSA','H','HOU','FS1'],[64,'6/26','8p','URU','ESP','H','GDL','FOX'],[65,'6/26','11p','EGY','IRN','G','SEA','FS1'],[66,'6/26','11p','NZL','BEL','G','VAN','FOX'],[67,'6/27','5p','PAN','ENG','L','NYC','FOX'],[68,'6/27','5p','CRO','GHA','L','PHI','FS1'],[69,'6/27','7:30','COL','POR','K','MIA','FOX'],[70,'6/27','7:30','COD','UZB','K','ATL','FS1'],[71,'6/27','10p','ALG','AUT','J','KCM','FS1'],[72,'6/27','10p','JOR','ARG','J','DAL','FOX'],[73,'6/28','3p','2A','2B','R32','LAX','FOX'],[74,'6/29','4:30p','1E','3rd','R32','BOS','FOX'],[75,'6/29','9p','1F','2C','R32','MTY','FS1'],[76,'6/29','1p','1C','2F','R32','HOU','FS1'],[77,'6/30','5p','1I','3rd','R32','NYC','FOX'],[78,'6/30','1p','2E','2I','R32','DAL','FOX'],[79,'6/30','9p','1A','3rd','R32','MEX','FS1'],[80,'7/1','12p','1L','3rd','R32','ATL','FOX'],[81,'7/1','8p','1D','3rd','R32','SFO','FS1'],[82,'7/1','4p','1G','3rd','R32','SEA','FOX'],[83,'7/2','7p','2K','2L','R32','TOR','FS1'],[84,'7/2','3p','1H','2J','R32','LAX','FOX'],[85,'7/2','11p','1B','3rd','R32','VAN','FS1'],[86,'7/3','6p','1J','2H','R32','MIA','FOX'],[87,'7/3','9:30','1K','3rd','R32','KCM','FS1'],[88,'7/3','2p','2D','2G','R32','DAL','FOX'],[89,'7/4','5p','','','R16','PHI','FOX','W74','W77'],[90,'7/4','1p','','','R16','HOU','FOX','W73','W75'],[91,'7/5','4p','','','R16','NYC','FOX','W76','W78'],[92,'7/5','8p','','','R16','MEX','FOX','W79','W80'],[93,'7/6','3p','','','R16','DAL','FOX','W83','W84'],[94,'7/6','8p','','','R16','SEA','FOX','W81','W82'],[95,'7/7','12p','','','R16','ATL','FOX','W86','W88'],[96,'7/7','4p','','','R16','VAN','FOX','W85','W87'],[97,'7/9','4p','','','QF','BOS','FOX','W89','W90'],[98,'7/10','3p','','','QF','LAX','FOX','W93','W94'],[99,'7/11','5p','','','QF','MIA','FOX','W91','W92'],[100,'7/11','9p','','','QF','KCM','FOX','W95','W96'],[101,'7/14','3p','','','SF','DAL','FOX','W97','W98'],[102,'7/15','3p','','','SF','ATL','FOX','W99','W100'],[103,'7/18','5p','','','3RD','MIA','FOX','L101','L102'],[104,'7/19','3p','','','FIN','NYC','FOX','W101','W102']];

  const GROUPS = {A:[['mx','MEX','Mexico'],['za','RSA','South Africa'],['kr','KOR','S. Korea'],['cz','CZE','Czechia']],B:[['ca','CAN','Canada'],['ba','BIH','Bosnia & Hz'],['qa','QAT','Qatar'],['ch','SUI','Switzerland']],C:[['br','BRA','Brazil'],['ma','MAR','Morocco'],['ht','HAI','Haiti'],['gb-sct','SCO','Scotland']],D:[['us','USA','United States'],['py','PAR','Paraguay'],['au','AUS','Australia'],['tr','TUR','Türkiye']],E:[['de','GER','Germany'],['cw','CUR','Curaçao'],['ci','CIV','Ivory Coast'],['ec','ECU','Ecuador']],F:[['nl','NED','Netherlands'],['jp','JPN','Japan'],['se','SWE','Sweden'],['tn','TUN','Tunisia']],G:[['be','BEL','Belgium'],['eg','EGY','Egypt'],['ir','IRN','Iran'],['nz','NZL','New Zealand']],H:[['es','ESP','Spain'],['cv','CPV','Cape Verde'],['sa','KSA','Saudi Arabia'],['uy','URU','Uruguay']],I:[['fr','FRA','France'],['sn','SEN','Senegal'],['iq','IRQ','Iraq'],['no','NOR','Norway']],J:[['ar','ARG','Argentina'],['dz','ALG','Algeria'],['at','AUT','Austria'],['jo','JOR','Jordan']],K:[['pt','POR','Portugal'],['cd','COD','DR Congo'],['uz','UZB','Uzbekistan'],['co','COL','Colombia']],L:[['gb-eng','ENG','England'],['hr','CRO','Croatia'],['gh','GHA','Ghana'],['pa','PAN','Panama']]};

  const GM = {A:['1 6/11 MEX RSA 3p FOX','2 6/11 KOR CZE 10p FS1','25 6/18 CZE RSA 12p FOX','28 6/18 MEX KOR 9p FS1','53 6/24 CZE MEX 9p FOX','54 6/24 RSA KOR 9p FS1'],B:['3 6/12 CAN BIH 3p FOX','5 6/13 QAT SUI 3p FOX','26 6/18 SUI BIH 3p FOX','27 6/18 CAN QAT 6p FOX','49 6/24 SUI CAN 3p FOX','50 6/24 BIH QAT 3p FS1'],C:['6 6/13 BRA MAR 6p FS1','7 6/13 HAI SCO 9p FS1','30 6/19 SCO MAR 6p FS1','31 6/19 BRA HAI 8:30 FOX','51 6/24 SCO BRA 6p FOX','52 6/24 MAR HAI 6p FS1'],D:['4 6/12 USA PAR 9p FOX','8 6/14 AUS TUR 12a FS1','29 6/19 USA AUS 3p FOX','32 6/19 TUR PAR 11p FS1','59 6/25 TUR USA 10p FOX','60 6/25 PAR AUS 10p FS1'],E:['9 6/14 GER CUR 1p FOX','11 6/14 CIV ECU 7p FS1','34 6/20 GER CIV 4p FOX','35 6/20 ECU CUR 8p FS1','55 6/25 CUR CIV 4p FS1','56 6/25 ECU GER 4p FOX'],F:['10 6/14 NED JPN 4p FOX','12 6/14 SWE TUN 10p FS1','33 6/20 NED SWE 1p FOX','36 6/21 TUN JPN 12a FS1','57 6/25 JPN SWE 7p FOX','58 6/25 TUN NED 7p FS1'],G:['14 6/15 BEL EGY 3p FOX','16 6/15 IRN NZL 9p FS1','38 6/21 BEL IRN 3p FOX','40 6/21 NZL EGY 9p FS1','65 6/26 EGY IRN 11p FS1','66 6/26 NZL BEL 11p FOX'],H:['13 6/15 ESP CPV 12p FOX','15 6/15 KSA URU 6p FS1','37 6/21 ESP KSA 12p FOX','39 6/21 URU CPV 6p FS1','63 6/26 CPV KSA 8p FS1','64 6/26 URU ESP 8p FOX'],I:['17 6/16 FRA SEN 3p FOX','18 6/16 IRQ NOR 6p FOX','42 6/22 FRA IRQ 5p FOX','43 6/22 NOR SEN 8p FS1','61 6/26 NOR FRA 3p FOX','62 6/26 SEN IRQ 3p FS1'],J:['19 6/16 ARG ALG 9p FOX','20 6/17 AUT JOR 12a FS1','41 6/22 ARG AUT 1p FOX','44 6/22 JOR ALG 11p FS1','71 6/27 ALG AUT 10p FS1','72 6/27 JOR ARG 10p FOX'],K:['21 6/17 POR COD 1p FOX','24 6/17 UZB COL 10p FS1','45 6/23 POR UZB 1p FOX','48 6/23 COL COD 10p FS1','69 6/27 COL POR 7:30 FOX','70 6/27 COD UZB 7:30 FS1'],L:['22 6/17 ENG CRO 4p FOX','23 6/17 GHA PAN 7p FS1','46 6/23 ENG GHA 4p FOX','47 6/23 PAN CRO 7p FS1','67 6/27 PAN ENG 5p FOX','68 6/27 CRO GHA 5p FS1']};

  /* Live group table from a results map {matchNum:{h,a}}.
     Applies the official FIFA ranking order:
       1) points, 2) goal difference, 3) goals for — across ALL group matches;
     then, ONLY among teams still equal on all three, a head-to-head mini-table:
       4) points, 5) goal difference, 6) goals for — in matches between those
       teams; then original seeded order stands in for fair-play / drawing of
       lots (which we can't compute). Teams that have not yet played carry P:0
       and zeroed stats, so callers can render blanks. */
  function computeStandings(g, results) {
    results = results || {};
    const T = {};
    GROUPS[g].forEach(function (row, i) {
      T[row[1]] = {iso:row[0], ab:row[1], nm:row[2], seed:i, P:0, W:0, D:0, L:0, GF:0, GA:0, GD:0, Pts:0};
    });
    const gm = M.filter(function (m) { return m[5] === g; });   // this group's matches
    gm.forEach(function (m) {
      const r = results[m[0]];
      if (!r || r.h == null || r.a == null) return;
      const h = T[m[3]], a = T[m[4]];
      if (!h || !a) return;
      h.P++; a.P++;
      h.GF += r.h; h.GA += r.a; a.GF += r.a; a.GA += r.h;
      if (r.h > r.a)      { h.W++; a.L++; h.Pts += 3; }
      else if (r.h < r.a) { a.W++; h.L++; a.Pts += 3; }
      else                { h.D++; a.D++; h.Pts++; a.Pts++; }
    });
    const arr = Object.keys(T).map(function (k) { return T[k]; });
    arr.forEach(function (t) { t.GD = t.GF - t.GA; });
    // Overall sort (criteria 1–3). Equal teams stay adjacent for the H2H pass.
    arr.sort(function (x, y) { return (y.Pts - x.Pts) || (y.GD - x.GD) || (y.GF - x.GF) || (x.seed - y.seed); });

    // Head-to-head mini-league among any block tied on Pts AND GD AND GF.
    const out = [];
    for (var i = 0; i < arr.length;) {
      var j = i + 1;
      while (j < arr.length && arr[j].Pts === arr[i].Pts && arr[j].GD === arr[i].GD && arr[j].GF === arr[i].GF) j++;
      var block = arr.slice(i, j);
      if (block.length > 1) {
        var codes = {}; block.forEach(function (t) { codes[t.ab] = {Pts:0, GD:0, GF:0}; });
        gm.forEach(function (m) {
          const r = results[m[0]];
          if (!r || r.h == null || r.a == null) return;
          if (!codes[m[3]] || !codes[m[4]]) return;            // both must be in the tied block
          var A = codes[m[3]], B = codes[m[4]];
          A.GF += r.h; A.GD += r.h - r.a; B.GF += r.a; B.GD += r.a - r.h;
          if (r.h > r.a) A.Pts += 3; else if (r.h < r.a) B.Pts += 3; else { A.Pts++; B.Pts++; }
        });
        block.sort(function (x, y) {
          return (codes[y.ab].Pts - codes[x.ab].Pts) || (codes[y.ab].GD - codes[x.ab].GD) || (codes[y.ab].GF - codes[x.ab].GF) || (x.seed - y.seed);
        });
      }
      block.forEach(function (t) { out.push(t); });
      i = j;
    }
    return out;
  }

  window.WC_SCHEDULE = {V:V, ISO:ISO, M:M, GROUPS:GROUPS, GM:GM, computeStandings:computeStandings};
})();
