// EL FARO, 07:06 · the sets of this film: the storm sea, the ship from astern, the bridge cut open.
// Loaded after src/lib.js, src/kit.js and src/cutaway.js (C3, TH3, RP, hatch, blk, alarm3, shake3, flashes3, the marks).
const flash3 = flashes3([1.5, 2.8, 4.25, 7.1, 11.0, 11.95]);          // lightning: on the cuts at 1.5 and 11, and inside the long shots
// ---- the sea outside: one layer of swell, moving to the left with the wind. returns its height function.
function swell3(t, y0, amp, wl, sp, c1, c2, foam, seed) {
  const f = x => y0 + amp * (0.62 * Math.sin((x + t * sp) / wl + seed) + 0.38 * Math.sin((x + t * sp * 1.7) / (wl * 0.41) + seed * 2.3));
  g.beginPath(); g.moveTo(-80, H + 80); for (let x = -80; x <= W + 80; x += 20) g.lineTo(x, f(x)); g.lineTo(W + 80, H + 80); g.closePath();
  g.fillStyle = LG(0, y0 - amp, 0, y0 + amp + 260, [[0, c1], [1, c2]]); g.fill();
  for (let k = 1; k <= 3; k++) { g.beginPath(); for (let x = -80; x <= W + 80; x += 20) g.lineTo(x, f(x - k * 34) + k * (amp * 0.3 + 8)); g.lineWidth = 2.5; g.strokeStyle = A('#d9ecea', foam * 0.14 / k); g.stroke(); }    // streaks down the face
  for (let x = -60, a = f(-80), b = f(-60); x <= W + 60; x += 20) { const c = f(x + 20);
    if (b < a && b <= c) { const cx = x + 10 * (a - c) / (a - 2 * b + c || 1), cy = f(cx), d = wl * 0.46;        // a crest
      const r = rng(seed * 131 + 5000 + 17 * Math.round(((cx + t * sp) / wl + seed) / TAU));                    // the same crest keeps the same spray
      stroke([[cx - d, f(cx - d) + 2], [cx - d * 0.5, f(cx - d * 0.5)], [cx, cy - 2], [cx + d * 0.7, f(cx + d * 0.7) + 2]], amp * 0.14 + 3, A('#d9ecea', foam * 0.75), 0.5);
      for (let i = 0; i < 7; i++) { const ph = (t * 1.2 + r()) % 1, q = (2 + r() * 4) * (0.5 + amp / 90); ell(cx - d * 0.3 + r() * d * 0.6 - (60 + amp) * ph, cy - 4 - (20 + amp * 0.5) * Math.sin(ph * Math.PI) * r(), q, q, A('#e6f3f1', foam * (1 - ph))); } }
    a = b; b = c; }
  return f;
}
// ---- SS El Faro from astern. origin = the waterline amidships, y up is negative. port is on the left.
const BOX3 = (c, r) => [-144 + c * 48, -150 - (r + 1) * 30];           // a deck container, 46 x 28
const BOXC = ['#8a3b32', '#2f5d7a', '#7f858c', '#a8742f', '#3f6e5a', '#59687a'];
function box3(col) { rr(0, 0, 46, 28, 3, col); for (let i = 0; i < 5; i++) rect(5 + i * 8, 3, 2, 22, A('#000000', 0.22)); rect(0, 0, 46, 3, A('#ffffff', 0.14)); }
function ship3x(o = {}) {
  const on = !o.dark, hull = '#1c3550', hull2 = '#122438', wht = '#e4e9ea', wht2 = '#aebbc2', win = on ? '#f2c078' : '#22303e';
  rr(30, -492, 64, 100, 8, '#243647'); rect(30, -470, 64, 14, '#3d566c');                       // funnel
  rect(-5, -566, 10, 176, '#48627a'); rr(-48, -524, 96, 10, 4, '#5d7b96'); rect(-32, -552, 64, 6, '#48627a');     // mast, radar
  form(() => g.roundRect(-108, -404, 216, 200, 8), wht, () => rect(34, -410, 90, 220, wht2));         // the house
  for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) rect(-92 + c * 28, -360 + r * 34, 14, 12, (r * 7 + c * 3) % 5 ? win : '#3a4f63');
  rr(-158, -424, 316, 32, 6, wht); rect(-158, -398, 316, 6, wht2);                               // bridge deck and its wings
  for (let c = 0; c < 9; c++) rect(-99 + c * 23, -418, 17, 14, win);
  if (on) { glow(0, -410, 150, '#f2c078', 0.5); glow(0, -300, 190, '#f2c078', 0.22); }
  ell(-154, -430, 6, 6, on ? '#ff5a4a' : '#5a1c16'); ell(154, -430, 6, 6, on ? '#5dff9a' : '#1c4a30');
  if (on) { glow(-154, -430, 46, '#ff5a4a', 0.8); glow(154, -430, 46, '#5dff9a', 0.7); }
  for (let c = 0; c < 6; c++) for (let r = 0; r < 3; r++) if (!(o.gone && o.gone(c, r))) { const [x, y] = BOX3(c, r); g.save(); g.translate(x, y); box3(BOXC[(c * 2 + r * 3) % 6]); g.restore(); }
  form(() => { g.moveTo(-152, -150); g.lineTo(152, -150); g.lineTo(138, 70); g.lineTo(-138, 70); g.closePath(); }, hull, () => { rect(44, -160, 130, 250, hull2); rect(-160, -10, 320, 90, A('#5a2a20', 0.5)); });
  rect(-152, -150, 304, 7, '#2e4a66'); rect(-152, -170, 304, 3, '#48627a'); for (let i = 0; i < 13; i++) rect(-151 + i * 25, -170, 3, 20, '#48627a');
  tx('EL FARO', 2, -118, 27, C3.cream, 'barlow-condensed', 'center', 700, 4); tx('SAN JUAN, P.R.', 1, -101, 13, A(C3.cream, 0.8), 'barlow-condensed', 'center', 500, 2);
  rr(-66, -90, 132, 86, 6, '#10213a'); for (let i = 1; i < 5; i++) rect(-66, -90 + i * 17, 132, 2, '#1f3a57');       // stern ramp
  [-118, 118].forEach(x => { rr(x - 12, -66, 24, 14, 5, '#0b1727'); rect(x - 2, -52, 3, 60, A('#5a2a20', 0.5)); });
  ell(0, -180, 5, 5, on ? '#fff3d6' : '#5a5a50'); if (on) glow(0, -180, 60, '#fff3d6', 0.7);
}
// ---- the whole exterior. o: fl (lightning 0..1), list (rad), sink (px), dark, gone(c,r), after(P, rot, S, f3) for things that fall off her
function ext3(t, o = {}) {
  const fl = o.fl || 0, sx = 860, S = 1;
  rect(-60, -60, W + 120, H + 120, LG(0, 0, 0, H, [[0, '#070d14'], [0.36, '#14222f'], [0.6, '#274352'], [1, '#10222d']]));
  [[300, 120, 520, 150, '#0f1924'], [1000, 60, 700, 130, '#0d1620'], [1600, 190, 520, 140, '#132231'], [620, 300, 460, 110, '#172a3b'], [1380, 340, 520, 100, '#172a3b'], [2100, 250, 480, 120, '#132231']]
    .forEach(([x, y, a, b, c], i) => ell(((x - t * (16 + i * 7)) % 2700 + 2700) % 2700 - 400, y, a, b, c));
  glow(1420, 240, 560, '#bcd8ff', 0.07 + 0.6 * fl);
  if (fl > 0.5) { pline([[1436, 60], [1402, 170], [1448, 190], [1390, 320], [1420, 334], [1378, 440], [1396, 452], [1362, 548]], 6, '#eaf3ff'); pline([[1390, 320], [1330, 372], [1342, 384], [1300, 436]], 3.5, '#eaf3ff'); glow(1400, 300, 220, '#dbe9ff', 0.7 * fl); }
  rect(-60, 500, W + 120, 150, LG(0, 500, 0, 650, [[0, A('#3a6470', 0)], [1, A('#3a6470', 0.45)]]));
  swell3(t, 612, 24, 190, 90, mix('#1f4a56', '#9fc4d0', 0.25 * fl), '#12303b', 0.35, 1);
  swell3(t, 676, 42, 280, 140, mix('#24525e', '#9fc4d0', 0.2 * fl), '#12303b', 0.5, 2);
  // she rides the third swell
  const h3 = x => 750 + 72 * (0.62 * Math.sin((x + t * 220) / 400 + 3) + 0.38 * Math.sin((x + t * 374) / 164 + 6.9));
  const rot = (o.list ?? -D15) + Math.atan((h3(sx + 70) - h3(sx - 70)) / 140) * 0.45, P = [sx, h3(sx) + 10 + (o.sink || 0)];
  at(P[0], P[1], S, () => ship3x(o), rot);
  if (o.after) o.after(P, rot, S, h3);
  const f3 = swell3(t, 750, 72, 400, 220, mix('#2c6670', '#a9d2d6', 0.2 * fl), '#143541', 0.7, 3);
  for (let x = sx - 150; x <= sx + 150; x += 22) { const k = wig(t, 0.9, x * 0.05); ell(x, f3(x) + 1, 20 + 6 * k, 6 + 2 * k, A('#e6f3f1', 0.55)); }          // wash along the hull
  swell3(t, 872, 104, 540, 290, mix('#1f4f5a', '#8fb8c0', 0.15 * fl), '#0c2029', 0.8, 4);
  swell3(t, 1016, 112, 700, 380, '#163a45', '#081820', 0.6, 5);
  { const q = rng(23); g.beginPath();                                                                                                   // spindrift, torn off the tops
    for (let i = 0; i < 80; i++) { const x0 = q() * 2700, y = 590 + q() * 460, L = 60 + q() * 200, x = ((x0 - t * (520 + q() * 520)) % 2700 + 2700) % 2700 - 380; g.moveTo(x, y); g.lineTo(x + L, y - L * 0.07); }
    g.lineWidth = 3; g.strokeStyle = A('#e6f3f1', 0.12); g.stroke(); }
  const r = rng(11); g.beginPath();
  for (let i = 0; i < 480; i++) { const x0 = r() * 2700, y0 = r() * H, L = 40 + r() * 90, y = (y0 + t * 1800) % (H + 160) - 80, x = ((x0 - t * 1000) % 2700 + 2700) % 2700 - 380; g.moveTo(x, y); g.lineTo(x + L * 0.55, y - L); }
  g.lineWidth = 2.2; g.strokeStyle = A('#cfe6ee', 0.2); g.stroke();
  if (fl > 0) { g.save(); g.globalCompositeOperation = 'screen'; rect(-60, -60, W + 120, H + 120, A('#b9d2ff', 0.2 * fl)); g.restore(); }
}
// ---- the bridge, cut open (the channel's signature set). Set TH3 first. o: fl, bump (0..1 lurch), hide {cap, mate, helm}, mug (-1 = gone, else 0..1 slide)
function bridge3(t, o = {}) {
  const fl = o.fl || 0, al = alarm3(t), bump = o.bump || 0, hide = o.hide || {};
  g.save(); g.translate(W, 0); g.scale(-1, 1);
  rect(-80, -80, W + 160, H + 160, LG(0, 0, 0, H, [[0, '#0a121b'], [0.4, '#18293a'], [0.68, '#2c4a5c'], [1, '#10222d']]));
  [[300, 120, 520, 150, '#111d2a'], [1000, 60, 700, 130, '#0f1a26'], [1600, 190, 520, 140, '#16273a'], [620, 300, 460, 110, '#1b3044']].forEach(([x, y, a, b, c], i) => ell(x + t * (7 + i * 4), y, a, b, c));
  glow(470, 250, 420, '#bcd8ff', 0.1 + 0.55 * fl);
  if (fl > 0.15) { pline([[486, 120], [452, 214], [498, 232], [440, 352], [470, 366], [428, 452]], 6, '#eaf3ff'); glow(456, 300, 180, '#dbe9ff', 0.7 * fl); }
  rect(-80, 700, W + 160, 500, LG(0, 700, 0, H, [[0, '#1c4250'], [1, '#0d222c']]));
  const sea = (pts, c, c2, sp, k = 1) => { const q = pts.map(([x, y], i) => [x + 16 * wig(t, sp * 0.7, i * 1.3), y + 13 * k * wig(t, sp, i * 1.9)]);
    blob(q.concat([[2100, 1200], [-200, 1200]]), LG(0, pts[0][1] - 80, 0, 1080, [[0, c], [1, c2]]), 0.5); return q; };
  sea([[-100, 720], [160, 676], [420, 716], [700, 690], [960, 728], [1240, 700]], '#24525e', '#12303b', 0.22);
  const grow = 0.9 + 0.08 * wig(t, 0.13), big = sea([[1080, 800], [1300, 680], [1500, 520], [1700, 420], [1840, 392], [2000, 430]].map(([x, y]) => [x, 800 - (800 - y) * grow]), '#34767a', '#143541', 0.16, 0.6);
  stroke(big.slice(1), 16, '#d9ecea', 0.5);
  const r = rng(11);
  for (let i = 0; i < 70; i++) { const x = 1480 + r() * 460, y = 300 + r() * 200 - (x - 1480) * 0.16, q = 3 + r() * 7, a0 = 0.5 + r() * 0.4, ph = (t * 0.55 + i * 0.173) % 1;
    ell(x - 50 * ph, 800 - (800 - y) * grow - 70 * Math.sin(ph * Math.PI), q, q, A('#e6f3f1', a0 * (1 - 0.7 * ph))); }
  sea([[-100, 800], [140, 760], [380, 800], [620, 770], [900, 810]], '#1b4450', '#0c2029', 0.27);
  [[90, 768], [560, 778], [300, 804]].forEach(([x, y], i) => { const d = 30 * wig(t, 0.2, i * 2), e = 10 * wig(t, 0.27, i); stroke([[x + d, y + e], [x + 60 + d, y - 12 + e], [x + 130 + d, y - 2 + e]], 7, A('#d9ecea', 0.7), 0.5); });
  g.beginPath(); for (let i = 0; i < 520; i++) { const x0 = r() * 2400 - 200, y0 = r() * H, L = 36 + r() * 80, y = (y0 + t * 1700) % (H + 120) - 60, x = ((x0 - t * 935) % 2600 + 2600) % 2600 - 200; g.moveTo(x, y); g.lineTo(x - L * 0.55, y + L); }
  g.lineWidth = 2.2; g.strokeStyle = A('#cfe6ee', 0.2); g.stroke();
  g.restore();
  // ---- the ship. Only the bridge deck is cut open.
  g.save(); g.translate(960, 600); g.rotate(TH3); g.translate(-960, -600);
  rect(330, 846, 1260, 600, '#121d2a'); rect(330, 846, 1260, 10, '#1d2e40');
  for (let i = 0; i < 7; i++) { ell(450 + i * 170, 930, 22, 22, i % 3 ? '#f2c078' : '#1d2e40'); if (i % 3) glow(450 + i * 170, 930, 70, '#f2c078', 0.4); }
  rect(40, 800, 210, 14, '#1d2e40'); rect(1706, 800, 210, 14, '#1d2e40');
  for (let i = 0; i < 6; i++) { rect(50 + i * 38, 722, 4, 78, '#2a3f54'); rect(1716 + i * 38, 722, 4, 78, '#2a3f54'); } rect(40, 720, 210, 5, '#2a3f54'); rect(1706, 720, 210, 5, '#2a3f54');
  ell(46, 716, 9, 9, '#ff5a4a'); ell(1910, 716, 9, 9, '#5dff9a');
  rect(951, 40, 18, 214, '#48627a'); rr(868, 128, 184, 18, 6, '#5d7b96'); rect(930, 146, 60, 14, '#48627a');
  form(() => g.ellipse(700, 232, 64, 58, 0, Math.PI, TAU), '#d6dde0', () => rect(700, 160, 80, 90, '#aab6bc'));
  pline([[1180, 254], [1180, 96]], 4, '#2e4459'); pline([[1262, 254], [1262, 140]], 4, '#2e4459'); rr(1380, 214, 70, 40, 8, '#2e4459'); rect(214, 226, 1492, 5, '#2e4459');
  for (let x = 240; x < 1700; x += 60) rect(x, 228, 3, 26, '#2e4459');
  const WN = [300, 524, 748, 972, 1196, 1420];
  g.beginPath(); g.rect(250, 300, 1420, 500); WN.forEach(x => g.roundRect(x, 362, 196, 208, 10)); g.fillStyle = C3.wall; g.fill('evenodd');
  WN.forEach((x, i) => { rr(x, 362, 196, 208, 10, A('#8fc0d8', 0.1 + 0.3 * fl)); poly([[x + 30, 362], [x + 80, 362], [x + 10, 570], [x, 570], [x, 470]], A('#ffffff', 0.07));
    if (i === 2 || i === 4) { const wa = 0.5 * wig(t, 0.8, i); pline([[x + 98, 566], [x + 98 - 150 * Math.sin(0.36 + wa), 566 - 150 * Math.cos(0.36 + wa)]], 5, '#0d151e'); } });
  rect(250, 300, 1420, 40, '#1b2a39'); for (let i = 0; i < 5; i++) rr(380 + i * 290, 316, 120, 10, 4, '#f2c078');
  poly([[262, 596], [1658, 596], [1670, 620], [250, 620]], '#31485e'); rect(250, 620, 1420, 106, '#172431'); rect(250, 726, 1420, 74, '#101a25');
  ell(470, 672, 44, 44, '#0c2a1e'); form(() => g.ellipse(470, 672, 38, 38, 0, 0, TAU), '#123a28', () => { const a = t * 2.4;
    poly([[470, 672], [470 + 60 * Math.cos(a), 672 + 60 * Math.sin(a)], [470 + 60 * Math.cos(a - 0.7), 672 + 60 * Math.sin(a - 0.7)]], A('#5dff9a', 0.35)); ell(486, 660, 22, 15, '#5dff9a'); ell(462, 688, 10, 7, '#5dff9a'); });
  rr(706, 630, 188, 88, 8, '#0a141d'); rr(714, 638, 172, 72, 5, '#16344a');
  { const sp = []; for (let i = 0; i <= 22; i++) { const a = i * 0.55 - t * 0.7, q = 2 + i * 1.3; sp.push([842 + Math.cos(a) * q, 672 + Math.sin(a) * q * 0.9]); } stroke(sp, 5, '#f2ecdc', 0.5);
    g.setLineDash([8, 7]); pline([[728, 700], [770, 690], [806, 682], [836, 674]], 3.5, C3.amb); g.setLineDash([]); }
  for (let i = 0; i < 9; i++) rr(940 + i * 26, 646, 16, 10, 3, ['#f2c078', '#5dff9a', '#ee4630'][(i + (i % 4 === 1 ? Math.floor(t * 4) : 0)) % 3]); for (let i = 0; i < 6; i++) rr(560 + i * 22, 690, 14, 14, 3, '#3d566c');
  ell(1392, 672, 46, 46, '#0a141d'); ell(1392, 672, 38, 38, C3.cream);
  for (let i = 0; i < 9; i++) { const a = Math.PI * (0.8 + i * 0.175); pline([[1392 + Math.cos(a) * 28, 672 + Math.sin(a) * 28], [1392 + Math.cos(a) * 35, 672 + Math.sin(a) * 35]], 3, '#27394b'); }
  pline([[1392, 672], [1392 + Math.cos(Math.PI * 0.82) * 28, 672 + Math.sin(Math.PI * 0.82) * 28]], 5, C3.red); ell(1392, 672, 6, 6, '#27394b'); ell(1470, 644, 13, 13, al ? C3.red : '#5a1c16');
  const wa = 0.3 + 0.2 * wig(t, 0.5) - 0.5 * bump;
  rr(1232, 664, 40, 136, 8, '#22364a'); g.beginPath(); g.arc(1252, 652, 46, 0, TAU); g.lineWidth = 9; g.strokeStyle = '#8a6a44'; g.stroke();
  for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + wa; pline([[1252, 652], [1252 + Math.cos(a) * 54, 652 + Math.sin(a) * 54]], 6, '#8a6a44'); } ell(1252, 652, 9, 9, '#c9a064');
  rect(288, 700, 230, 14, '#6a5038'); rect(300, 714, 14, 86, '#4a3626'); rect(492, 714, 14, 86, '#4a3626');
  const cs = 30 + 50 * bump;
  poly([[420 - cs, 690], [560 - cs, 690], [574 - cs, 700], [434 - cs, 700]], C3.cream); poly([[610 - cs * 2, 786], [730 - cs * 2, 786], [742 - cs * 2, 800], [622 - cs * 2, 800]], C3.cream); poly([[820 - cs * 3, 790], [900 - cs * 3, 790], [908 - cs * 3, 800], [828 - cs * 3, 800]], '#dcd3be');
  if ((o.mug ?? 0) >= 0) { const mx = 1180 - 300 * (o.mug || 0) + 3 * wig(t, 0.15); g.save(); g.translate(mx, 596); g.rotate(0.3); rr(-16, -34, 32, 34, 6, C3.cream); g.beginPath(); g.arc(-18, -18, 10, Math.PI - 1.3, Math.PI + 1.3); g.lineWidth = 6; g.strokeStyle = C3.cream; g.stroke(); g.restore(); }
  g.save(); g.translate(1500 - 260 * bump + 12 * wig(t, 0.15, 1), 800); rr(-40, -150, 16, 86, 6, '#3d566c'); rr(-44, -74, 96, 20, 8, '#3d566c'); rect(-2, -56, 10, 36, '#22364a');
  pline([[-36, -10], [4, -22], [44, -10]], 8, '#22364a'); ell(-36, -8, 9, 9, '#0c1116'); ell(44, -8, 9, 9, '#0c1116'); if (bump > 0.1) [0, 1, 2].forEach(i => pline([[86 + i * 30, -120 + i * 34], [136 + i * 30, -120 + i * 34]], 4, A('#f2ecdc', 0.4 * bump))); g.restore();
  [[214, 254, 1492, 46], [214, 800, 1492, 46], [214, 300, 36, 500], [1670, 300, 36, 500]].forEach(([x, y, w, h]) => { rect(x, y, w, h, C3.slab); hatch(x, y, w, h, 15, A(C3.amb, 0.6), 3); });
  g.lineWidth = 3; g.strokeStyle = A(C3.amb, 0.9); g.strokeRect(250, 300, 1420, 500);
  g.restore();
  // ---- light inside
  const G = (x, y, r0, c, a) => { const p = RP(x, y); glow(p[0], p[1], r0, c, a); };
  G(470, 672, 200, '#5dff9a', 0.4); G(800, 672, 220, '#bfe3ff', 0.35); G(1470, 644, 230, C3.red, al ? 0.8 : 0.15); G(960, 330, 700, '#f2c078', 0.16);
  { const p = RP(1110, 340), sw = 14 * wig(t, 0.15, 0.6) - 40 * bump; pline([[p[0], p[1]], [p[0] + sw, p[1] + 96]], 4, '#0c1116'); rr(p[0] + sw - 30, p[1] + 96, 26, 50, 8, '#0c1116'); rr(p[0] + sw + 4, p[1] + 96, 26, 50, 8, '#0c1116'); rect(p[0] + sw - 8, p[1] + 108, 16, 12, '#0c1116'); ell(p[0], p[1], 6, 6, C3.amb); }
  // ---- the crew stay upright, the deck does not
  const S = 0.84, sl = Math.tan(TH3), sway = -(TH3 + D15) * 0.9, rims = [[-5, 0, '#ffd9a0', 0.55], [5, 3, al ? '#ff7a5a' : '#8fc0d8', 0.5]], top = {};
  const stand = (id, rx, bo, ph, extra) => { const p = RP(rx, 800), rot = sway + 0.012 * wig(t, 0.4, ph); top[id] = [p[0] + 380 * Math.sin(rot), p[1] - 380 * Math.cos(rot)]; if (hide[id]) return;
    bo.fl = [-36, -36 * sl]; bo.fr = [38, 38 * sl]; ell(p[0] + 4, p[1] + 2, 78, 10, A('#05090d', 0.5)); lit(() => at(p[0], p[1], S, () => { const h = blk(bo); if (extra) extra(h); }, rot), rims); };
  stand('cap', 560 - 46 * bump, { skin: '#e2a47e', coat: '#eef0ee', pants: '#1c2836', body: 1, armF: [-88, -350], bendF: 1, armN: [104 + 9 * wig(t, 0.5) + 30 * bump, -206 - 24 * bump], bendN: 1, tilt: -0.04 + 0.02 * wig(t, 0.3) + 0.08 * bump,
    trim: d => { rect(-78, -308, 156, 14, '#1c2836'); [0, 1, 2].forEach(i => rect(-74, -304 + i * 4, 36, 2, C3.amb)); rect(28, -280, 30, 30, '#d6dbd8'); },
    head: { skin: '#e2a47e', dir: 1, look: [0.9, 0.1], lid: Math.max(0.42 - 0.3 * bump, blink(t, 1, 3.4)), brow: '#cfd3d0', browTilt: 0.08, mouth: 'frown', beard: '#d9dcd8',
      top: d => { rr(-68, -146, 136, 44, 14, '#f4f5f2'); rect(-66, -112, 132, 12, '#1c2836'); poly([[14, -106], [92, -100], [86, -88], [14, -94]], '#10161f'); ell(26, -126, 9, 9, C3.amb); } } }, 0,
    h => { const mx = h[0][2], my = h[0][3]; g.save(); g.translate(mx + 10, my - 5); g.rotate(0.2); rr(-11, -43, 22, 84, 8, '#0c1116'); g.restore();
      stroke([[mx + 2, my + 36], [mx - 14, my + 62], [mx + 5, my + 88], [mx - 14, my + 114], [mx + 2, my + 140], [mx - 12, my + 166]], 3.6, '#0c1116', 0.6); });
  stand('mate', 1010 - 70 * bump, { skin: '#f0b995', coat: '#f26a1b', pants: '#22303e', body: -1, armN: [-112 - 14 * Math.max(0, wig(t, 1.05)) - 26 * bump, -206 + 6 * wig(t, 1.05, 1) - 60 * bump], bendN: 1, armF: [116 + 24 * bump, -226 + 12 * wig(t, 0.6) - 50 * bump], bendF: -1, tilt: 0.05 + 0.035 * wig(t, 0.45) - 0.1 * bump, cuff: '#f2ecdc',
    trim: d => { rect(-80, -200, 160, 12, '#f2ecdc'); rect(-6, -310, 12, 200, '#c9530f'); },
    head: { skin: '#f0b995', dir: -1, look: [-0.9, -0.1 + 0.6 * bump], lid: blink(t, 2, 2.6), brow: '#5a2a1c', browTilt: -0.3, browUp: 6 + 6 * bump, mouth: bump > 0.2 || wig(t, 3.1, 2) > 0.2 ? 'open' : 'frown',
      top: d => { blob([[-66, -70], [-66, -112], [-30, -134], [30, -134], [66, -112], [66, -84], [30, -102], [-30, -100], [-50, -66]], '#6a2f1c', 0.5); blob([[56, -104], [98, -110], [112, -70 + 8 * wig(t, 0.4) - 20 * bump], [96, -30], [78, -62]], '#6a2f1c', 0.5); } } }, 1);
  { const wh = RP(1252, 652), hp = RP(1196, 800), rot = sway + 0.012 * wig(t, 0.4, 2), lx = (wh[0] - hp[0]) / S, ly = (wh[1] - hp[1]) / S, c = Math.cos(rot), s = Math.sin(rot), hx = lx * c + ly * s, hy = -lx * s + ly * c, dw = wa - 0.3;
    stand('helm', 1196, { skin: '#b9825e', coat: '#3a556e', pants: '#182330', body: 1, armF: [hx - 30 * Math.cos(dw) - 26 * Math.sin(dw), hy + 26 * Math.cos(dw) - 30 * Math.sin(dw)], bendF: 1, armN: [hx + 34 * Math.cos(dw) + 22 * Math.sin(dw), hy - 22 * Math.cos(dw) + 34 * Math.sin(dw)], bendN: 1,
      tilt: -0.06 + 0.03 * wig(t, 0.7), hx: 4,
      head: { skin: '#b9825e', dir: -1, look: [-0.95, 0.1], lid: blink(t, 3, 2.2), brow: '#1c1410', browTilt: -0.35, browUp: 4, mouth: 'grit',
        top: d => { form(() => g.roundRect(-66, -140, 132, 60, 26), '#c9302a', () => rect(-70, -100, 140, 30, '#9f2420')); } } }, 2,
      () => [[-62, -424], [-92, -396], [70, -430]].forEach(([x, y], i) => { const ph = (t * 0.9 + i * 0.37) % 1, yy = y + ph * 46; blob([[x, yy - 12], [x + 7, yy + 4], [x, yy + 10], [x - 7, yy + 4]], A('#bfe3ff', 1 - ph), 0.6); })); }
  return top;
}
