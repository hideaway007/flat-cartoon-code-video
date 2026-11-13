// ELEVEN MILES · style 4 "LOW SUN" · 15 s, eight shots, cut on the stride (one ski goes down every 0.75 s).
// 1 skis and sticks 0-1.5 · 2 the Barrier, three specks + title 1.5-3.75 · 3 the three men, who is who 3.75-6 · 4 Scott, close 6-7.5
// 5 the journal: the sketch map 7.5-9.75 · 6 the tent, eight days of blizzard 9.75-11.25 · 7 the hand that writes 11.25-12.75 · 8 the last line 12.75-15
// Every handwritten line is from Scott's journal (Scott's Last Expedition, vol. I): the entries of March 18, 19, 21 and 29, 1912.
// The dates on the slip are the journal's headings as he wrote them. He had "lost track of dates" on the 16th or 17th, and his
// weekdays run a day behind the calendar (March 18, 1912 was a Monday): the film shows the page, it does not correct it.

const HZ4 = 566, SUN4 = [1392, 462];
const sc4 = y => Math.max(0.08, 0.66 + (y - 742) * 0.00299);                 // the scale of a man standing at depth y, in the three-shot
const MEN4 = [[1236, 742, { an: '#77738f', lean: 0.62, hand: [84, -52], face: { goggles: 'on' } }, 0.35, 'Bowers'],
              [950, 818, { an: '#6f7896', lean: 0.5, hand: [92, -66], face: { goggles: 'on' } }, 0.7, 'Wilson'],
              [548, 936, { an: '#7c7590', lean: 0.44, hand: [98, -76], face: {} }, 0, 'Scott']];
// the party, tracked by the camera: they stay where they are and the snow slides under them. men = [[x, y, look, phase offset]], sc = scale at depth y,
// SL = the sledge [x, y, scale]. returns the heads [x, y, scale].
function team4(t, men, sc, SL, rim = true) {
  const sx = SL[0] + 3 * wig(t, 1 / CYC4, 1), S = SL[2], heads = [], ties = [], light = (fn, r) => (rim ? lit(fn, r) : fn());
  g.save(); g.translate(sx, SL[1]); g.transform(1, 0, 1.75, -0.36, 0, 0); ell(0, -48 * S, 178 * S, 55 * S, A('#6c84bc', 0.55)); g.restore();
  men.forEach(([x, y, , off]) => shadow4(x, y, sc(y), 1 + 0.03 * Math.sin((t / CYC4 + off) * 2 * TAU)));
  light(() => at(sx, SL[1], S, sledge4, 0.012 * wig(t, 0.8), true), [[-8 * S, 5 * S, C4.rim, 1]]);
  men.forEach(([x, y, m, off]) => { const s = sc(y); let q;
    light(() => at(x, y, s, () => { q = man4({ ...m, ph: t / CYC4 + off }); }, 0, true), [[-8 * s, 4 * s, C4.rim, 1], [0, -5 * s, '#dfe8fa', 0.4]]);
    ties.push([x - q.tie[0] * s, y + q.tie[1] * s]); heads.push([x - q.head[0] * s, y + q.head[1] * s, s]); breath4(t, x - q.mouth[0] * s, y + q.mouth[1] * s, s, off * CYC4); });
  ties.forEach(([x, y], i) => { const ex = sx - 171 * S, ey = SL[1] - 39 * S; stroke([[x, y], [(x + ex) / 2, (y + ey) / 2 + 8 + i * 4 + 3 * wig(t, 2 / CYC4, i)], [ex, ey]], Math.max(2, 5.2 * S), '#2a2842', 0.5); });
  return heads;
}

// ---- 1 · insert, at the level of the snow: skis and sticks. The stride is the beat of the whole film.
function sh_ski(t) {
  const HZ = 470, S = 3.3, X = 900, Y = 902, sc = y => S * (y - HZ) / (Y - HZ), scr = y => V4 * sc(y) * t;
  camSet(960 - 10 * t, 548 + 5 * Math.cos(t / STEP4 * TAU), 1.04 + 0.02 * t);
  land4(t, { hz: HZ, sun: [1500, 318], k: 1.25, scr, mh: 0.8 });
  team4(t, [[1790, 600, MEN4[0][2], 0.35], [1470, 648, MEN4[1][2], 0.7]], sc, [2260, 574, 0.7], false);
  blurBack(9, 0.1, '#e6ebf3');
  const r = rng(31);                                                                    // the snow he is crossing, sharp
  for (let i = 0; i < 9; i++) { const y = 800 + r() * 300, x = wrap4(r() * 2400 + scr(y), -500, 2400), w = 180 + r() * 260, h = 14 + r() * 16;
    blob([[x - w, y], [x - w * 0.3, y - h * 0.5], [x + w * 0.7, y - h], [x + w, y - h * 0.2], [x + w * 0.4, y + h * 0.5], [x - w * 0.6, y + h * 0.7]], '#93a8d6', 0.5);
    blob([[x - w * 0.2, y - h * 0.55], [x + w * 0.7, y - h * 1.05], [x + w, y - h * 0.3], [x + w * 0.5, y - h * 0.45]], '#ffe6c6', 0.5); }
  shadow4(X, Y, S, 1, 64, 0.5);
  let q; lit(() => at(X, Y, S, () => { q = man4({ ...MEN4[2][2], ph: t / CYC4 }); }, 0, true), [[-22, 10, C4.rim, 1], [0, -12, '#dfe8fa', 0.35]]);
  const tie = [X - q.tie[0] * S, Y + q.tie[1] * S]; stroke([tie, [(tie[0] + 2100) / 2, tie[1] + 70], [2100, 420]], 9, '#2a2842', 0.5);         // his trace, back to the sledge
  [[q.tipN, 0.55], [q.tipF, 0.05]].forEach(([tip, p0], j) => { const age = (((t / CYC4 - p0) % 1) + 1) % 1 * CYC4; if (age > 0.5) return;              // each stick throws up snow as it goes in
    const bx = X - tip[0] * S, by = Y + tip[1] * S, b = rng(40 + j);
    for (let i = 0; i < 14; i++) { const a = -Math.PI * (0.15 + 0.7 * b()), v = 150 + 330 * b(), rr0 = 5 + 9 * b(); ell(bx + Math.cos(a) * v * age + 160 * age, by + Math.sin(a) * v * age + 900 * age * age, rr0 * (1 - age), rr0 * (1 - age), A('#ffffff', 0.9 * (1 - age / 0.5))); } });
  drift4(t, { y0: 760, y1: 1080, wo: 0.25, n: 22, seed: 5 });
}

// ---- 2 · the Barrier. Three men and a sledge, very small, and the title.
function sh_wide(t) {
  const u = t - 1.5, HZ = 650, s = 0.25, x0 = 1120 - V4 * s * u, sc = () => s;
  camSet(960 - 12 * u, 560 - 5 * u, lerp(1.0, 1.07, u / 2.25));
  land4(t, { hz: HZ, sun: [1250, 500], k: 1.14, mh: 0.6 });
  { const sx = x0 + 392, sy = 788; [0, 9].forEach(d => pline([[sx, sy + d], [2100, sy + 54 + d * 5]], 2.5, A('#7f95c8', 0.5))); [[x0, 806], [x0 + 10, 812]].forEach(([x, y]) => pline([[x + 20, y], [2100, y + 78]], 2, A('#7f95c8', 0.35))); }   // the tracks they leave
  team4(t, [[x0 + 262, 792, MEN4[0][2], 0.35], [x0 + 132, 799, MEN4[1][2], 0.7], [x0, 806, MEN4[2][2], 0]], sc, [x0 + 404, 788, 0.2]);
  drift4(t, { y0: 700, y1: 1080, wo: 0.1, n: 24, seed: 3 });
  camOff();
  const s0 = 'ELEVEN MILES', n = Math.round(s0.length * clamp((t - 1.9) / 0.7)), a = tw(t, 1.9, 2.5, eout);
  g.globalAlpha = a; tx(s0.slice(0, n), 104, 962 + 10 * (1 - a), 132, C4.ink, 'im-fell-english', 'left', 400, 16); g.globalAlpha = 1;
  g.globalAlpha = tw(t, 2.5, 2.9, eout); rect(110, 1005, 62, 3, C4.red); caps4('THE LAST MARCH OF CAPTAIN SCOTT', 188, 1018, 34, C4.ink, 'left', 5); g.globalAlpha = 1;
}

// ---- 3 · the three of them, in harness. A name is inked in on each stride.
function sh_three(t) {
  const u = (t - 3.75) / 2.25;
  camSet(lerp(960, 925, u), lerp(545, 562, u), lerp(1.0, 1.07, eout(u)));
  land4(t, { hz: HZ4, sun: SUN4, scr: y => V4 * sc4(y) * t, mo: -30 });
  const heads = team4(t, MEN4, sc4, [1560, 706, 0.62]);
  drift4(t, { wo: 0.15 }); ridge4(t, V4 * 1.56);
  [[2, 3.9], [1, 4.275], [0, 4.65]].forEach(([i, t0]) => { const [hx, hy, s] = heads[i], p = (t - t0) / 0.3; if (p <= 0) return;
    const size = 50 + 14 * s, lx = hx - 96 - 20 * s, ly = hy - 92 * s - 36, [w] = ink4(MEN4[i][4], lx, ly, size, p);
    const a = [lx + w * 0.55, ly + 14], b = [hx - 8 * s, hy - 70 * s]; pencil4([a, [(a[0] + b[0]) / 2 - 10, (a[1] + b[1]) / 2], b], (t - t0 - 0.15) / 0.2, 3.5, C4.ink);
    if (t > t0 + 0.35) { pline([[b[0] - 13, b[1] - 7], b], 3.5, C4.ink); pline([[b[0] + 4, b[1] - 15], b], 3.5, C4.ink); } });
  camOff(); ink4('“Sledge dreadfully heavy.”', 96, 1034, 78, (t - 5.0) / 0.45);
}

// ---- 4 · close: Scott. The others are out of focus behind him; the wind gets up.
function face4(o) {                                                              // the head in its hood, large. origin = the middle of the hood; he faces +x
  const AN = '#7c7590', AN2 = mix(AN, '#1e1c38', 0.34), sk = '#b98792', sk2 = '#8a5f70', r = rng(12), lid = o.lid ?? 0.5;
  form(() => curve([[-260, 330], [-232, 150], [-150, 70], [-40, 44], [70, 62], [128, 130], [150, 330]], true, 0.45), AN, () => { blob([[-300, 20], [-150, 20], [-110, 160], [-70, 360], [-300, 360]], AN2, 0.4); stroke([[-20, 80], [10, 190], [-10, 330]], 5, A('#1e1c38', 0.25)); });
  poly([[-150, 90], [-116, 70], [110, 300], [96, 340], [40, 340]], '#2a2842'); ell(-126, 92, 9, 9, '#8a8296');                       // the harness
  form(() => g.ellipse(0, 0, 66, 64, 0, 0, TAU), '#3d3856', () => { ell(-40, 10, 50, 70, '#2f2b47'); stroke([[-30, -58], [-52, -10], [-40, 44]], 2.5, A('#17152a', 0.5)); });
  for (let i = 0; i < 30; i++) { const a = (i / 30) * TAU + 0.1, q = 12 + 6 * r(), c = Math.cos(a), x = 14 + c * 52, y = Math.sin(a) * 56;
    ell(x, y, q, q, ['#5b5474', '#4a4464', '#665e80'][i % 3]); if (c > -0.2 && r() > 0.25) ell(x + 3 + 4 * r(), y - 3 + 5 * r(), 3 + 3 * r(), 2 + 2 * r(), '#eef2fb'); }           // the ruff, rimed with frost
  ell(16, 0, 44, 49, '#272440');
  form(() => g.ellipse(24, 2, 33, 39, 0, 0, TAU), sk, () => { blob([[-20, 4], [30, 12], [64, 2], [64, 50], [-20, 50]], '#4d4050', 0.5); ell(-4, -6, 16, 44, A(sk2, 0.6)); ell(36, 8, 10, 7, A('#a4526a', 0.55)); });
  rr(-8, -43, 66, 17, 8, '#17152a'); [[10, -35], [38, -35]].forEach(([x, y]) => { rr(x - 11, y - 6, 22, 12, 5, '#2c3350'); rect(x - 7, y - 3, 8, 2, A('#bcd0ff', 0.6)); });              // goggles, pushed up
  [[16, 7.5], [38, 6.5]].forEach(([x, e]) => { form(() => g.ellipse(x, -6, e, e * 0.82, 0, 0, TAU), '#ece8f0', () => { ell(x + e * (0.3 + 0.3 * (o.look || 0)), -5.4, e * 0.52, e * 0.52, '#17152a'); ell(x + e * 0.2, -7, e * 0.16, e * 0.16, '#ffffff'); rect(x - e - 1, -6 - e, e * 2 + 2, e * 1.64 * lid, sk); });
    stroke([[x - e, -6 + e * 0.5], [x, -6 + e * 0.86], [x + e, -6 + e * 0.5]], 1.2, A('#4d4050', 0.7)); [-0.6, 0, 0.6].forEach(d => ell(x + d * e, -6 - e * 0.82 + e * 1.64 * lid - 1, 1.3, 1, '#eef2fb')); });
  limb(6, -15 + 2 * lid, 24, -21 + 3 * lid, 2.8, 2.4, '#3a3040'); limb(31, -21 + 3 * lid, 47, -15 + 2 * lid, 2.4, 2.1, '#3a3040'); [[12, -19], [20, -22], [40, -20]].forEach(([x, y]) => ell(x, y + 2.5 * lid, 1.8, 1.2, '#eef2fb'));
  ell(52, 4, 11, 8.5, '#c86e72'); ell(57, 5, 5, 4.4, '#b0506a');                                                                    // the nose, nipped
  ell(40, 25, 5 + 2 * (o.mouth || 0), 1.6 + 3.4 * (o.mouth || 0), '#2a1c2c');
  [[20, 19, 10, 5], [38, 17, 9, 4.4], [50, 19, 6, 3.6], [30, 33, 13, 5.5], [12, 34, 8, 4.4], [46, 31, 7, 4], [24, 42, 9, 4]].forEach(([x, y, a, b]) => ell(x, y, a, b, '#eef2fb'));       // frost in the beard
  [[16, 22, 7], [28, 21, 5], [36, 20, 8], [46, 21, 5], [24, 37, 6], [40, 34, 5]].forEach(([x, y, L]) => limb(x, y, x + 0.6, y + L, 1.5, 0.3, '#dfe8fa'));                               // and ice hanging from it
}
function sh_face(t) {
  const u = t - 6, wo = eio(prog(t, 6.9, 7.5)), ph = t / CYC4, bob = 9 * Math.cos(ph * 2 * TAU);
  camSet(520 - 16 * u, 478, 2.2);
  land4(t, { hz: HZ4, sun: SUN4, scr: y => V4 * sc4(y) * t, mo: -30, dim: 0.55 * wo });
  team4(t, MEN4.slice(0, 2), sc4, [1560, 706, 0.62]); drift4(t, { wo: 0.2 + 0.6 * wo });
  camOff(); blurBack(13, 0.1, '#e6ebf3');
  glow(1960, 380, 1000, '#ffe2b4', 0.75 * (1 - 0.8 * wo)); glow(1900, 400, 420, '#fff4dc', 0.6 * (1 - 0.8 * wo));                    // the sun, just out of frame behind him
  const lid = Math.max(0.46 + 0.26 * wo, 0.95 * blink(t, 3.2, 2.4)), mouth = 0.5 + 0.5 * Math.sin((ph * 2 + 0.2) * TAU);
  const X = 1196 - 14 * u, Y = 560 + bob + 16 * wo, S = lerp(4.5, 4.75, u / 1.5), rot = -0.03 + 0.02 * Math.sin(ph * 2 * TAU + 1) - 0.05 * wo;
  lit(() => at(X, Y, S, () => face4({ lid, mouth, look: -0.4 * wo }), rot, true), [[-26, 8, C4.rim, 1 - 0.7 * wo], [0, -14, '#dfe8fa', 0.4]]);
  breath4(t, X - 64 * S, Y + 24 * S, 4.2, 0.3);
  const q = rng(77); g.beginPath();                                                // snow in the air, in front of the lens
  for (let i = 0; i < 70; i++) { const x = wrap4(q() * 2200 + (900 + 900 * q()) * (1 + wo) * t, -200, 2000), y = q() * H + 30 * wig(t, 0.6, i), L = 20 + 60 * q(); g.moveTo(x, y); g.lineTo(x + L, y - L * 0.08); }
  g.lineWidth = 3; g.lineCap = 'round'; g.strokeStyle = A('#ffffff', 0.5 + 0.3 * wo); g.stroke();
  storm4(t, 0.15 + 0.75 * wo);
  ink4('“…and -40° temp, to-day.”', 104, 1010, 84, (t - 6.2) / 0.5);
}

// ---- 5 · the journal. The sketch map says what the pictures cannot: where the food is, and what is in between.
function page4() {
  rect(-60, -60, W + 120, H + 120, C4.parch); rect(-60, -60, W + 120, H + 120, LG(0, 0, W, H, [[0, A('#fff7e2', 0.55)], [1, A('#c9b388', 0.4)]]));
  const r = rng(52); for (let i = 0; i < 90; i++) { const x = r() * W, y = r() * H, L = 14 + r() * 40, a = r() * TAU; pline([[x, y], [x + Math.cos(a) * L, y + Math.sin(a) * L]], 1, A(C4.sep, 0.07)); }
  [[300, 880, 240, 120], [1500, 200, 200, 150], [1120, 760, 160, 90]].forEach(([x, y, a, b]) => ell(x, y, a, b, A('#b89868', 0.09)));
  for (let y = 80; y < H + 60; y += 88) rect(1036, y, 900, 2, A('#6f86ad', 0.24));                                                                                              // the right-hand page is ruled
  rect(930, -60, 90, H + 120, LG(930, 0, 1020, 0, [[0, A('#6a4c2c', 0)], [0.5, A('#6a4c2c', 0.26)], [1, A('#6a4c2c', 0)]])); rect(974, -60, 2, H + 120, A('#4a3420', 0.35));        // the gutter between the two pages
}
function pencilObj(x, y, a = -0.95) {                                             // a pencil with its point at (x, y)
  g.save(); g.translate(x, y); g.rotate(a); shadowed(() => { rect(26, -9, 300, 18, '#8a3a2c'); }, 14, 12, 0.3, 10, '#3a2a18');
  rect(26, -9, 300, 6, '#b3402e'); rect(26, 3, 300, 6, '#6e2c22'); poly([[0, 0], [26, -9], [26, 9]], '#e2c9a0'); poly([[0, 0], [9, -3], [9, 3]], C4.ink); rect(300, -9, 26, 18, '#c9a064'); g.restore();
}
function sh_map(t) {
  const u = (t - 7.5) / 2.25;
  camSet(lerp(990, 950, u), lerp(560, 536, u), lerp(1.07, 1.0, eout(u)));
  page4();
  const route = [[420, 1050], [436, 950], [452, 850], [468, 750], [480, 650], [490, 560], [498, 460], [504, 360], [508, 262]], camp = [490, 560], depot = [508, 250];
  stroke(route, 3, A(C4.sep, 0.55), 0.5); [[452, 850], [480, 650], [498, 460]].forEach(([x, y]) => { poly([[x + 18, y], [x + 30, y - 20], [x + 42, y]], A(C4.sep, 0.7)); });        // the way north, and the old cairns along it
  pline([[200, 830], [200, 730]], 3, C4.sep); poly([[200, 714], [189, 740], [211, 740]], C4.sep); caps4('N', 200, 872, 34, C4.sep, 'center', 0);
  pline([[depot[0] - 18, depot[1] - 18], [depot[0] + 18, depot[1] + 18]], 6, C4.red); pline([[depot[0] + 18, depot[1] - 18], [depot[0] - 18, depot[1] + 18]], 6, C4.red);
  caps4('ONE TON DEPOT', 552, 248, 42, C4.ink, 'left', 4); tx('food and fuel', 554, 296, 40, C4.sep, 'im-fell-english', 'left', 400, 0, 'italic');
  const dots = 18, dp = prog(t, 7.6, 8.4), nd = Math.round(dots * dp); let pen = null;
  for (let i = 0; i < nd; i++) { const f = i / (dots - 1) * 5, k = Math.floor(f), p = L2(route[Math.min(k, 4)], route[Math.min(k + 1, 5)], f - k); ell(p[0], p[1], 5.5, 5.5, C4.ink); if (i === nd - 1 && dp < 1) pen = p; }
  const kc = pop((t - 8.4) / 0.25); if (kc > 0) { at(camp[0], camp[1], kc, () => { poly([[-22, 10], [0, -26], [22, 10]], C4.ink); poly([[-5, 10], [0, -4], [5, 10]], C4.parch); }); ink4('Monday night', 548, 578, 58, (t - 8.42) / 0.3, C4.ink, null); }
  const bp = prog(t, 8.6, 8.85); if (bp > 0) { const y1 = lerp(camp[1], depot[1], bp); pline([[330, camp[1]], [330, y1]], 3.5, C4.ink); pline([[312, camp[1]], [348, camp[1]]], 3.5, C4.ink); if (bp >= 1) pline([[312, depot[1]], [348, depot[1]]], 3.5, C4.ink); if (bp < 1) pen = [330, y1]; }
  ink4('11 miles', 96, 432, 84, (t - 8.7) / 0.3, C4.ink, null);
  const zz = []; for (let j = 0; j < 17; j++) zz.push([372 + j * 20 + 8 * Math.sin(j * 2.3), (j % 2 ? 496 : 318) + 14 * Math.sin(j * 1.7)]);
  const sp = prog(t, 9.05, 9.42); if (sp > 0) { const p = pencil4(zz, sp, 8, A(C4.red, 0.8), 0.25); if (sp < 1) pen = p; ink4('blizzard', 716, 428, 70, (t - 9.22) / 0.25, C4.red, null); }
  ink4('“Got within 11 miles of depôt', 1052, 420, 64, (t - 7.75) / 0.7, C4.ink, null); ink4('Monday night;', 1076, 508, 64, (t - 8.4) / 0.3, C4.ink, null);
  ink4('had to lay up all yesterday', 1076, 596, 64, (t - 8.72) / 0.36, C4.ink, null); ink4('in severe blizzard.”', 1076, 684, 64, (t - 9.08) / 0.32, C4.ink, null);
  if (pen) pencilObj(pen[0], pen[1]);
}

// ---- 6 · the tent. March 21 to March 28 in a second and a half: the drift piles up, the lamp goes down, the miles do not change.
function sh_tent(t) {
  const u = t - 9.75, p = u / 1.5, cam = [960 + 6 * wig(t, 1.3) + 3 * wig(t, 3.1, 1), 610 + 5 * wig(t, 1.7, 2), lerp(1.0, 1.1, p)];
  const lv = (1 - 0.85 * p) * (0.86 + 0.14 * wig(t, 5.3) * wig(t, 1.9, 1));                                 // the lamp inside: it is going down
  camSet(...cam);
  rect(-60, -60, W + 120, H + 120, LG(0, 0, 0, H, [[0, '#6f7c9c'], [0.45, '#a3afc8'], [0.62, '#c3ccdd'], [1, '#9fadcb']]));
  drift4(t, { y0: 560, y1: 760, wo: 0.8, n: 22, seed: 14 });
  const bank = 0.15 + 0.85 * p, bury = (x, w, h) => blob([[x - w, 812], [x - w * 0.6, 800 - h * 0.5], [x - w * 0.1, 800 - h], [x + w * 0.5, 800 - h * 0.6], [x + w, 812]], '#eef1f6', 0.5);
  [[1500, -0.06], [1526, 0.05]].forEach(([x, a]) => at(x, 806, 1, () => { rr(-7, -330, 14, 330, 6, '#5a4038'); stroke([[0, -326], [4, -350], [14, -366]], 12, '#5a4038'); }, a));                 // skis, stood on end
  at(1260, 806, 0.95, sledge4, 0.02); bury(1260, 220, 60 + 70 * bank);
  [[1016, 0.2, -0.24], [1040, -0.2, 0.2], [1100, 0.16, -0.2], [1126, -0.22, 0.24]].forEach(([x, a]) => at(x, 806, 1, () => { limb(0, 0, 0, -196, 3.5, 3.5, '#3a2c34'); ell(0, -36, 15, 5, '#3a2c34'); rr(-5, -212, 10, 30, 4, '#5a4038'); }, a));   // two pairs of ski sticks
  bury(1070, 110, 26 + 50 * bank); bury(1512, 70, 20 + 46 * bank);
  glow(815, 640, 620, '#ffb866', 0.5 * lv);
  at(770, 806, 1.5, () => tent4({ lamp: lv, bank }));
  rect(-60, 800, W + 120, 400, LG(0, 800, 0, 1080, [[0, A('#e9edf4', 0)], [0.25, A('#e9edf4', 0.95)], [1, '#b4c1dc']]));
  drift4(t, { y0: 760, y1: 1080, wo: 1, n: 40, seed: 15 });
  camOff(); storm4(t, 0.62 + 0.3 * p, 0.3 + 0.3 * p); rect(0, 0, W, H, A('#141c38', 0.06 + 0.26 * p));
  camSet(...cam); glow(815, 680, 380, '#ffc880', 0.5 * lv); camOff();                                        // the light still comes through the drift
  ink4('“…a scene of whirling drift.”', 96, 1034, 78, (t - 9.95) / 0.5);
}

// ---- 7 · inside. A tin lamp, the page, the pencil. The line is written, and the hand stops.
function sh_write(t) {
  const u = t - 11.25, out = prog(t, 12.5, 12.75), fl = (1 - out) * (0.9 + 0.1 * wig(t, 7.3) * wig(t, 2.9, 1)) * (out > 0 ? 0.6 + 0.4 * wig(t, 13) : 1);
  camSet(960 + 3 * wig(t, 0.9), 540 + 2 * wig(t, 1.1, 1), lerp(1.08, 1.0, eout(u / 1.5)));
  rect(-60, -60, W + 120, H + 120, LG(0, 0, 0, H, [[0, '#33443c'], [1, '#18221f']]));                                                        // the green canvas, from inside
  [[-100, 300, 900, -80], [700, -60, 2000, 420]].forEach(([x0, y0, x1, y1]) => pline([[x0, y0], [x1, y1]], 5, A('#101815', 0.6)));
  limb(1640, -40, 1250, 1140, 15, 15, '#7a5c40'); limb(1632, -40, 1242, 1140, 5, 5, '#a8845c'); [200, 520, 840].forEach(y => rect(1640 - (y + 40) * 0.33 - 18, y, 36, 5, '#4a3626'));           // a bamboo of the tent
  { const q = rng(61); for (let i = 0; i < 12; i++) { const y = q() * 620, x = wrap4(q() * 2400 + 1300 * t, -500, 2200); stroke([[x, y], [x + 300, y - 20], [x + 600, y + 10]], 26 + 30 * q(), A('#6f8a78', 0.1), 0.6); } }   // the drift going past outside
  blob([[-80, 1140], [-60, 930], [260, 880], [700, 940], [1100, 900], [1500, 960], [2000, 900], [2000, 1140]], '#5a4634', 0.5);                // the sleeping bag: reindeer, fur outward
  { const q = rng(62); for (let i = 0; i < 160; i++) { const x = q() * W, y = 900 + q() * 190, L = 10 + 14 * q(); pline([[x, y], [x + L * 0.5, y + L]], 3, A(q() > 0.5 ? '#7a6248' : '#40301f', 0.8)); } }
  g.save(); g.translate(800, 560); g.rotate(-0.09);
  shadowed(() => rect(-660, -360, 1300, 720, C4.parch), 18, 30, 0.5, 6, '#05080a'); rect(-660, -360, 1300, 720, LG(-660, -360, 640, 360, [[0, A('#fff7e2', 0.5)], [1, A('#c9b388', 0.4)]]));
  rect(-676, -360, 22, 720, '#3c4a3a'); rect(-660, -360, 5, 720, A('#4a3420', 0.3));                                                          // the spine of the book
  ['We shall stick it out to the end,', 'but we are getting weaker, of course,', 'and the end cannot be far.'].forEach((s, i) => ink4(s, -580, -236 + i * 92, 66, 1, A(C4.ink, 0.78), null));    // already on the page
  const y4 = 66, y5 = 158, t4 = 11.42, d4 = 0.66, t5 = 12.2, d5 = 0.32, slip = eio(prog(t, 12.55, 12.75));
  const [, x4] = ink4('It seems a pity, but I do not think', -580, y4, 66, (t - t4) / d4, C4.ink, null), [, x5] = ink4('I can write more.', -580, y5, 66, (t - t5) / d5, C4.ink, null);
  const pen = t < t4 + d4 ? [x4, y4] : t < t5 ? L2([x4, y4], [-580, y5], eio(prog(t, t4 + d4, t5))) : [x5 + 44 * slip, y5 + 46 * slip];                    // at the end the pencil slides off the line
  const [px, py] = pen, jit = t > t4 && t < t5 + d5 && !(t > t4 + d4 && t < t5) ? 2.5 * wig(t, 9) : 0;
  g.save(); g.translate(px + jit, py - 8);                                                                                                   // the hand. origin = the point of the pencil
  limb(660, 640, 222, 176, 124, 86, '#565070'); limb(672, 600, 246, 146, 46, 30, '#6f6888');                                                 // the sleeve
  form(() => curve([[58, 34], [100, -16], [180, -22], [256, 30], [276, 128], [210, 198], [108, 162]], true, 0.5), '#494463', () => ell(244, 164, 100, 76, '#35314c'));    // a woollen mitt
  [[112, 0], [146, -12], [184, -10]].forEach(([x, y]) => stroke([[x, y], [x + 22, y + 36], [x + 20, y + 74]], 4, A('#2a2640', 0.5)));
  g.save(); g.rotate(0.66); rect(22, -8, 250, 16, '#6e2c22'); rect(22, -8, 250, 6, '#b3402e'); poly([[0, 0], [22, -8], [22, 8]], '#e2c9a0'); poly([[0, 0], [8, -3], [8, 3]], C4.ink); g.restore();
  blob([[46, 60], [80, 30], [128, 62], [134, 112], [88, 126], [52, 100]], '#565070', 0.5); stroke([[70, 52], [102, 76], [112, 108]], 4, A('#2a2640', 0.4));       // the mitt closes over the pencil
  g.restore();
  g.restore();
  at(1560, 420, 1, () => { ell(0, 96, 110, 22, A('#05080a', 0.45)); rr(-62, 0, 124, 92, 8, '#6a7480'); rect(-62, 0, 40, 92, '#4a525c'); ell(0, 0, 62, 15, '#8d98a6'); ell(0, 0, 48, 10, '#3a2c20'); rect(-4, -18, 8, 22, '#d9cdb0');           // the lamp: a tin and a wick
    if (fl > 0.02) { const h = 62 * fl + 6 * wig(t, 6.1); blob([[-13, -14], [-9, -14 - h * 0.6], [2 + 5 * wig(t, 4.7), -14 - h], [11, -14 - h * 0.5], [13, -14]], '#ffb347', 0.5); blob([[-6, -14], [0, -14 - h * 0.55], [6, -14]], '#fff1c4', 0.5); } });
  camOff();
  glow(1560, 380, 900, '#ffb866', 0.5 * fl); glow(1560, 396, 150, '#fff1c4', 0.9 * fl);
  g.save(); g.globalCompositeOperation = 'multiply'; rect(0, 0, W, H, RG(1240, 520, 260, 1250, [[0, '#ffffff'], [0.5, mix('#5a5266', '#ffffff', 0.25)], [1, '#151a2c']])); rect(0, 0, W, H, mix('#ffffff', '#0a0e1a', 0.86 * (1 - fl))); g.restore();
}

// ---- 8 · the last line. The wind goes on.
function sh_last(t) {
  const u = t - 12.75; rect(0, 0, W, H, '#080c18'); glow(960, 480, 1100, '#27345c', 0.5);
  const q = rng(81); g.beginPath(); for (let i = 0; i < 90; i++) { const x = wrap4(q() * 2200 + (500 + 600 * q()) * t, -200, 2100), y = q() * H + 20 * wig(t, 0.5, i), L = 30 + 90 * q(); g.moveTo(x, y); g.lineTo(x + L, y - L * 0.06); }
  g.lineWidth = 3; g.lineCap = 'round'; g.strokeStyle = A('#cfd9f2', 0.16); g.stroke();
  const a = tw(t, 12.8, 13.1, eout);
  g.save(); g.globalAlpha = a; g.translate(960, 452 + 14 * (1 - a)); g.rotate(-0.018);
  shadowed(() => rect(-600, -250, 1200, 500, C4.parch), 20, 44, 0.6, 0, '#000000'); rect(-600, -250, 1200, 500, LG(-600, -250, 600, 250, [[0, A('#fff7e2', 0.5)], [1, A('#c9b388', 0.4)]]));
  g.lineWidth = 2; g.strokeStyle = A(C4.sep, 0.4); g.strokeRect(-582, -232, 1164, 464);
  ink4('“For God’s sake', -520, -52, 124, (t - 13.05) / 0.45, C4.ink, null); ink4('look after our people.”', -520, 78, 124, (t - 13.5) / 0.6, C4.ink, null);
  g.globalAlpha = a * tw(t, 14.0, 14.3, eout); rect(-520, 136, 60, 3, C4.red); caps4('R. SCOTT · LAST ENTRY, MARCH 29, 1912', -444, 150, 30, C4.sep, 'left', 4);
  g.restore();
  g.globalAlpha = tw(t, 14.1, 14.5, eout); caps4('THE TENT WAS FOUND ON 12 NOVEMBER 1912', 960, 838, 38, '#e9dfc6', 'center', 6); g.globalAlpha = 1;
}

// ---- the cut. The journal runs on every shot: the date, and the miles still to go. The miles stop at 11.
film([0, 1.5, 3.75, 6.0, 7.5, 9.75, 11.25, 12.75], [sh_ski, sh_wide, sh_three, sh_face, sh_map, sh_tent, sh_write, sh_last], (t, i) => {
  if (i !== 4) vignette(i === 7 ? 0.5 : 0.3, i > 5 ? '#04060c' : '#1a2848', 0.6);
  const day = 21 + Math.min(7, Math.floor((t - 9.75) / (STEP4 / 4) + 1e-6));                                 // the blizzard: a day goes by every quarter of a stride
  const [date, dp] = t < 3.75 ? ['Sunday, March 18.', (t - 0.15) / 0.6] : t < 7.5 ? ['Monday, March 19.', (t - 3.8) / 0.5] : t < 9.75 ? ['Wednesday, March 21.', (t - 7.55) / 0.5]
    : t < 11.25 ? ['March ' + day + '.', 1] : ['Thursday, March 29.', (t - 11.3) / 0.5];
  hud4(t, { place: 'ROSS ICE SHELF · 1912', date, dp, label: 'TO THE DEPOT', unit: 'miles', bare: i === 4, ring: (t - 14.35) / 0.45,
    tally: [['21', (t - 0.5) / 0.5, (t - 3.9) / 0.2], ['15½', (t - 4.12) / 0.4, (t - 8.7) / 0.2], ['11', (t - 8.9) / 0.3, 0]] });
  grain(0.07, 'overlay');
});
