// lowsun.js — STYLE 4 "LOW SUN": expeditions, polar journeys, voyages that go wrong slowly. Loaded after lib.js and kit.js.
// Shape language: bundled, heavy people (4 heads), faces small inside fur hoods. The landscape is the lead actor: huge soft layers,
// a low sun with its halo, figures backlit (warm rim, cold shadow side), long shadows thrown toward the camera.
// Marks: the expedition's own journal. Slips of the page carry the date and a tally; quotes write themselves in ink over the snow;
// the explaining shot is the sketch map on the page.
const C4 = { rim: '#ffd6a2', ink: '#2a2b44', parch: '#efe3c6', sep: '#7b5a3c', red: '#b3402e' };
// ---- the beat is the stride: a ski goes down every STEP4 seconds. Cut on that grid.
const STEP4 = 0.75, CYC4 = 2 * STEP4, STR4 = 150, V4 = STR4 / (0.6 * CYC4);     // V4 = how fast the snow passes a man of scale 1 (px/s), so a planted ski never slips
const wrap4 = (x, a, b) => ((x - a) % (b - a) + (b - a)) % (b - a) + a;
// where a ski is, under a man: planted and sliding back for 0.6 of the cycle, then gliding forward on the snow
const foot4 = ph => { ph = ((ph % 1) + 1) % 1; return ph < 0.6 ? [lerp(66, -84, ph / 0.6), 0] : [lerp(-84, 66, eio((ph - 0.6) / 0.4)), 0]; };
// where the tip of a stick is: in the snow for 0.4 of the cycle, then swung forward. [x, y, planted]
const pole4 = (ps, x0 = 176) => { ps = ((ps % 1) + 1) % 1; if (ps < 0.4) return [x0 - 100 * ps / 0.4, 0, 1]; const u = (ps - 0.4) / 0.6; return [x0 - 100 + 100 * eio(u), -30 * Math.sin(u * Math.PI), 0]; };

// ---- figures
function boot4(x, y, c, c2 = mix(c, '#ffffff', 0.22)) {                       // finnesko: a soft fur boot
  blob([[x - 28, y - 30], [x + 8, y - 34], [x + 40, y - 14], [x + 42, y], [x - 30, y]], c, 0.5);
  [-24, -12, 0, 12].forEach((d, i) => ell(x + d, y - 33 + (i % 2) * 2, 9, 7, c2)); limb(x + 6, y - 24, x + 30, y - 3, 2.6, 2.6, '#2a2238');
}
function ski4(x, y, col) { stroke([[x - 118, y - 1], [x + 112, y - 1], [x + 144, y - 9], [x + 158, y - 25]], 7, col, 0.5); }
// a man hauling in harness, on ski. origin = the snow under his hips; he faces right (flip him to face left); about 290 tall.
// o: an (anorak colour), tr (trousers), ph (stride phase 0..1: the near ski goes down at 0, the far one at 0.5), lean (rad),
// hand ([x, y] of the near hand on the trunk), face { goggles: 'on', lid 0..1 }. returns { tie, head, tipN, tipF } in his own frame.
function man4(o) {
  const ph = o.ph || 0, AN = o.an, AN2 = mix(AN, '#1e1c38', 0.34), TR = o.tr || '#4c4e70', TR2 = mix(TR, '#16142c', 0.3), MT = '#322e4a', BT = '#5a5070', BT2 = mix(BT, '#16142c', 0.3);
  const ff = foot4(ph), fb = foot4(ph + 0.5), hipY = -166 + 5 * Math.cos(ph * 2 * TAU), ln = o.lean + 0.03 * Math.sin(ph * 2 * TAU + 1), c = Math.cos(ln), s = Math.sin(ln);
  const T = (x, y) => [x * c - y * s, hipY + x * s + y * c];                   // a point of the leaning trunk, in his own frame
  const pn = pole4(ph - 0.55), pf = pole4(ph - 0.05, 150), h0 = o.hand || [96, -70];
  const hn = [h0[0] + (pn[0] - 126) * 0.22, h0[1] + pn[1] * 0.3], hf = [h0[0] - 38 + (pf[0] - 100) * 0.22, h0[1] + 8 + pf[1] * 0.3];   // the hands follow their sticks
  const stick = (h, tip, col) => { const p = T(h[0], h[1]), dl = Math.hypot(p[0] - tip[0], p[1] - tip[1]) || 1, ux = (p[0] - tip[0]) / dl, uy = (p[1] - tip[1]) / dl;
    limb(p[0] + ux * 34, p[1] + uy * 34, tip[0], tip[1], 4, 3.2, col); ell(tip[0] + ux * 17, tip[1] + uy * 17, 14, 5, col); };
  // far side: ski, stick, leg, arm
  ski4(fb[0], fb[1], '#33262e'); stick(hf, pf, '#2e2430');
  limb2(-12, hipY, fb[0], fb[1] - 20, 98, 94, -1, 31, 27, 23, TR2); boot4(fb[0], fb[1], BT2);
  g.save(); g.translate(0, hipY); g.rotate(ln);
  const fa = limb2(-14, -146, hf[0], hf[1], 72, 68, 1, 27, 25, 23, AN2); ell(fa[2] - 2, fa[3] + 4, 23, 21, '#2a2640');
  g.restore();
  // near leg
  ski4(ff[0], ff[1], '#4a3840'); limb2(12, hipY, ff[0], ff[1] - 20, 98, 94, -1, 32, 28, 24, TR); boot4(ff[0], ff[1], BT);
  // trunk, harness, hood
  g.save(); g.translate(0, hipY); g.rotate(ln);
  form(() => curve([[-64, 26], [-72, -90], [-56, -160], [-10, -188], [44, -178], [68, -120], [66, 26], [0, 38]], true, 0.45), AN,
    () => blob([[-120, -220], [-6, -220], [-24, -90], [-4, 60], [-120, 60]], AN2, 0.4));
  poly([[-70, -22], [70, -14], [70, 6], [-70, -2]], '#2a2842'); poly([[-58, -150], [-38, -160], [62, -30], [58, -10]], '#2a2842'); ell(-60, -10, 9, 9, '#8a8296');
  const hx = 12, hy = -214;
  ell(hx, hy, 66, 64, '#3d3856');
  for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU; ell(hx + 14 + Math.cos(a) * 52, hy + Math.sin(a) * 56, 15, 15, i % 2 ? '#5b5474' : '#4a4464'); }
  ell(hx + 16, hy, 44, 49, '#272440');
  const sk = '#b98792', F = o.face || {};
  form(() => g.ellipse(hx + 24, hy + 2, 33, 39, 0, 0, TAU), sk, () => { blob([[hx - 20, hy + 6], [hx + 30, hy + 14], [hx + 64, hy + 4], [hx + 64, hy + 50], [hx - 20, hy + 50]], '#4d4050', 0.5); });
  if (F.goggles === 'on') { rr(hx - 4, hy - 22, 62, 22, 8, '#17152a'); rect(hx + 8, hy - 12, 42, 3, '#8a8296'); }
  else {
    rr(hx - 6, hy - 40, 60, 15, 7, '#17152a');
    [[hx + 16, 7.5], [hx + 38, 6.5]].forEach(([x, r]) => { form(() => g.ellipse(x, hy - 6, r, r * 0.8, 0, 0, TAU), '#ece8f0', () => { ell(x + r * 0.35, hy - 5, r * 0.52, r * 0.52, '#17152a'); rect(x - r - 1, hy - 6 - r, r * 2 + 2, r * (F.lid || 0.6), sk); }); });
    limb(hx + 6, hy - 14, hx + 24, hy - 21, 2.6, 2.2, '#3a3040'); limb(hx + 32, hy - 21, hx + 46, hy - 15, 2.2, 2, '#3a3040');
  }
  blob([[hx + 44, hy - 6], [hx + 62, hy + 8], [hx + 44, hy + 12]], '#c86e72', 0.4);
  [[hx + 20, hy + 20, 9, 5], [hx + 38, hy + 18, 8, 4], [hx + 30, hy + 32, 12, 5], [hx + 12, hy + 34, 7, 4], [hx + 46, hy + 30, 6, 4]].forEach(([x, y, a, b]) => ell(x, y, a, b, '#eef2fb'));     // frost in the beard
  [[hx + 60, hy - 34], [hx + 70, hy - 8], [hx + 64, hy + 26], [hx + 44, hy - 52], [hx + 20, hy - 60]].forEach(([x, y]) => ell(x, y, 5, 4, '#eef2fb'));                                       // and on the fur
  const na = limb2(22, -144, hn[0], hn[1], 72, 68, 1, 28, 26, 24, AN); ell(na[2] + 2, na[3] + 2, 24, 22, MT);
  g.restore();
  stick(hn, pn, '#3a2c34');
  return { tie: T(-64, 6), head: T(hx + 10, hy), mouth: T(hx + 62, hy + 22), tipN: pn, tipF: pf };
}
// the sledge, loaded, with its bamboo mast (the sail is furled). origin = the snow under its middle; the front is +x.
function sledge4() {
  stroke([[-176, -6], [120, -6], [158, -22], [174, -48]], 8, '#3a2c34', 0.5); [-120, -30, 60].forEach(x => rect(x, -22, 7, 18, '#3a2c34')); rect(-170, -26, 300, 6, '#4a3a40');
  limb(-6, -96, -2, -330, 5, 3.5, '#8a6a4c'); [-150, -210, -270].forEach(y => rect(-8, y, 11, 3, '#5a4030'));                                 // the mast
  pline([[-2, -322], [-150, -40]], 2, A('#2a2842', 0.8)); pline([[-2, -322], [116, -40]], 2, A('#2a2842', 0.8));
  form(() => curve([[-160, -26], [-150, -78], [-84, -104], [30, -98], [112, -68], [122, -26]], true, 0.4), '#56607a', () => blob([[-200, -130], [-40, -130], [-66, -70], [-40, 0], [-200, 0]], '#3e4460', 0.4));
  rr(-160, -76, 52, 50, 5, '#5e4e5a'); [-70, -8, 54].forEach(x => pline([[x, -100 + Math.abs(x) * 0.2], [x + 8, -26]], 3, '#2a2842'));
  limb(-176, -104, 168, -122, 4.5, 4.5, '#6a5048'); limb(-160, -112, 150, -110, 3.5, 3.5, '#4a3a40');
  g.save(); g.translate(-2, -200); g.rotate(0.05); rr(-9, -64, 18, 128, 8, '#c9b89a'); [-40, -8, 26].forEach(y => rect(-10, y, 20, 4, '#5a4030')); g.restore();   // the furled sail
}
// the long shadow a figure throws toward the camera. (x, y) = where it stands, s = its scale
function shadow4(x, y, s, len = 1, w = 64, a = 0.55) { g.save(); g.translate(x, y); g.transform(1, 0, 1.75, -0.36, 0, 0); g.scale(s, s); ell(-20, -190 * len, w, 200 * len, A('#6c84bc', a)); g.restore(); }
// one cloud of breath a stride, taken by the wind. (mx, my) = the mouth on the screen
function breath4(t, mx, my, sc, off = 0) {
  for (let j = 0; j < 2; j++) { const age = ((t + off) % STEP4) + j * STEP4; if (age < 1.5) glow(mx - 44 * sc * age + 70 * sc * age * age, my - 22 * sc * age, (16 + 34 * age) * sc, '#ffffff', 0.8 * (1 - age / 1.5), 'source-over', 1, 0.8); }
}
// the pyramid tent. origin = the middle of its base. o: lamp 0..1 (the light inside), bank 0..1 (drift piled against the windward side)
function tent4(o = {}) {
  const lamp = o.lamp || 0, bank = o.bank || 0, CV = '#5d7262', CV2 = '#3b4c48', shape = () => curve([[-176, 0], [-150, -70], [-64, -236], [-6, -322], [8, -322], [70, -232], [158, -66], [182, 0]], true, 0.25);
  [[-16, -372], [-2, -380], [14, -378], [28, -366]].forEach(([x, y], i) => limb(i * 3 - 3, -316, x, y, 3.5, 2.5, '#8a6a4c'));               // the tips of the bamboos
  form(shape, CV, () => { poly([[-200, 20], [-190, -100], [-20, -340], [20, -340], [-34, 20]], CV2);
    if (lamp > 0) { g.fillStyle = RG(30, -80, 0, 330, [[0, A('#ffd98a', 0.95 * lamp)], [0.45, A('#f0a850', 0.7 * lamp)], [1, A('#d98a3c', 0)]]); g.fillRect(-220, -360, 440, 380); }             // the lamp inside, through the canvas
    [[-64, -236, -92, 0], [70, -232, 104, 0]].forEach(([x0, y0, x1, y1]) => pline([[x0, y0], [x1, y1]], 2.5, A('#22302e', 0.5))); });
  poly([[-10, -322], [14, -322], [22, -296], [-16, -296]], '#3b4c48'); blob([[44, 0], [50, -74], [78, -98], [108, -76], [116, 0]], '#33423f', 0.5); pline([[80, -92], [80, -6]], 3, '#22302e');   // the cap, the door sleeve
  blob([[-214, 8], [-190, -18], [-120, -26], [-40, -14], [40, -22], [130, -16], [200, -22], [226, 8]], '#eef1f6', 0.5);                    // snow on the skirt
  if (bank > 0) { const b = bank; blob([[-330, 10], [-250, -28 - 40 * b], [-168, -60 - 150 * b], [-96, -44 - 190 * b], [-20, -20 - 120 * b], [70, -12 - 40 * b], [160, 10]], '#f4f6fa', 0.5);
    blob([[-330, 10], [-250, -18 - 26 * b], [-150, -34 - 90 * b], [-60, -20 - 70 * b], [40, -6 - 20 * b], [160, 10]], '#c9d5ea', 0.5); }
}

// ---- the land
// sky, the low sun with its halo and sun dogs, far mountains, the Barrier. o: hz (horizon y), sun [x, y], k (size of the halo; 1 = radius 262),
// dim 0..1 (the weather closing in), scr(y) -> how far the snow at depth y has slid to the right (px), mo (the mountains' own slide), mh (their height)
function land4(t, o) {
  const HZ = o.hz, [SX, SY] = o.sun, k = o.k || 1, dim = o.dim || 0, scr = o.scr || (() => 0), sa = 1 - 0.9 * dim, D = c => mix(c, '#a3aec2', dim * 0.8);
  rect(-60, -60, W + 120, HZ + 100, LG(0, 0, 0, HZ + 20, [[0, D('#55749f')], [0.45, D('#93aac9')], [0.78, D('#e8cdb9')], [1, D('#ffe9cc')]]));
  if (sa > 0.02) {
    glow(SX, SY, 760 * k, '#ffeccc', 0.9 * sa); glow(SX, SY, 300 * k, '#fff6e2', sa, 'screen', 0.13, 1.5);
    const sh = 0.05 * wig(t, 0.27);
    g.beginPath(); g.arc(SX, SY, 262 * k, 0, TAU); g.lineWidth = 16 * k; g.strokeStyle = A('#fff8ea', (0.34 + sh) * sa); g.stroke();
    g.beginPath(); g.arc(SX, SY, 252 * k, 0, TAU); g.lineWidth = 6 * k; g.strokeStyle = A('#ffb98a', (0.3 + sh) * sa); g.stroke();
    [-1, 1].forEach(d => { glow(SX + d * 262 * k, SY, 80 * k, '#fff4dc', 0.95 * sa, 'screen', 0.8, 1.5); glow(SX + d * 316 * k, SY, 110 * k, '#bfe2ff', 0.4 * sa, 'screen', 1.6, 0.26); glow(SX + d * 246 * k, SY, 50 * k, '#ffb080', 0.5 * sa, 'screen', 0.5, 1.3); });
    ell(SX, SY, 30 * k, 30 * k, A('#fffaf0', sa));
  }
  const r = rng(4), mo = o.mo || 0, mh = o.mh ?? 1;
  { const far = [[-90, HZ + 4]]; for (let i = 0; i <= 27; i++) far.push([-90 + i * 80 + mo * 0.5, HZ - (16 + 40 * r() + (i % 3 ? 0 : 34 * r())) * mh]); far.push([2080, HZ + 4]); poly(far, D('#b4c1da')); }     // a far range, pale
  for (let i = 0; i < 11; i++) {                                                                                                          // the near range: every peak has a face to the sun; the range is low where the sun stands
    const x = -40 + i * 190 + r() * 120 + mo, h = (56 + r() * 130) * mh * (0.5 + 0.5 * Math.abs(Math.sin(i * 1.9 + 0.6))) * (0.3 + 0.7 * clamp(Math.abs(x - SX) / 520));
    const w = h * (1 + 0.7 * r()) + 44, a = 0.4 + 0.2 * r(), b = 0.5 + 0.2 * r(), sh = 0.18 + 0.25 * r(), d = x < SX ? 1 : -1, top = [x, HZ - h];
    const lf = [[x - w * 0.28, HZ - h * 0.52], [x - w * 0.5, HZ - h * a], [x - w, HZ + 4]], rt = [[x + w * 0.3, HZ - h * b], [x + w * 0.55, HZ - h * 0.42], [x + w, HZ + 4]];
    poly([...lf.slice().reverse(), top, ...rt], D('#8fa2c6')); poly([top, ...(d > 0 ? rt : lf), [x + d * w * sh, HZ + 4], [x + d * w * 0.1, HZ - h * 0.45]], D('#f3dccb'));
  }
  rect(-60, HZ - 150, W + 120, 160, LG(0, HZ - 150, 0, HZ + 10, [[0, A(D('#e8cdb9'), 0)], [1, A(D('#ffe9cc'), 0.75 + 0.25 * dim)]]));
  rect(-60, HZ, W + 120, H - HZ + 60, LG(0, HZ, 0, H, [[0, D('#fbeedb')], [0.2, D('#dfe6f1')], [0.6, D('#b9c9e6')], [1, D('#93a9d4')]]));
  glow(SX, HZ + 30, 620 * k, '#fff2d8', 0.75 * sa, 'screen', 1.6, 0.22);
  const span = H - HZ - 14;
  for (let i = 0; i < 46; i++) {                                                                                                          // sastrugi: a cold side and a lit edge
    const y = HZ + 16 + Math.pow(r(), 1.5) * span, q = (y - HZ) / span, x = wrap4(r() * 2100 - 100 + scr(y), -460, 2380), w = (60 + r() * 160) * (0.35 + q * 1.5), h = (5 + r() * 9) * (0.4 + q * 1.6);
    blob([[x - w, y], [x - w * 0.3, y - h * 0.5], [x + w * 0.7, y - h], [x + w, y - h * 0.2], [x + w * 0.4, y + h * 0.5], [x - w * 0.6, y + h * 0.7]], D(mix('#c3d0e8', '#8499c8', q)), 0.5);
    blob([[x - w * 0.2, y - h * 0.55], [x + w * 0.7, y - h * 1.05], [x + w, y - h * 0.3], [x + w * 0.5, y - h * 0.45]], D(mix('#fff3e0', '#ffe2c0', q)), 0.5);
  }
}
// drift blowing over the surface toward +x (from ahead of men who face left). o: y0, y1 (the band), wo 0..1 (how hard), n
function drift4(t, o = {}) {
  const y0 = o.y0 ?? 640, y1 = o.y1 ?? 1060, wo = o.wo || 0, r = rng(o.seed || 9);
  for (let i = 0; i < (o.n || 34); i++) { const y = y0 + r() * (y1 - y0), x0 = r() * 2200 - 200, L = 220 + r() * 420, q = (y - y0) / (y1 - y0), dy = r() * 14, al = 0.2 + r() * 0.25, x = wrap4(x0 + (360 + 520 * q) * (1 + 0.8 * wo) * t, -700, 2000);
    stroke([[x, y], [x + L * 0.35, y - 10 - dy], [x + L * 0.7, y + 4], [x + L, y - 6]], (3 + q * 9) * (1 + 0.5 * wo), A('#ffffff', Math.min(0.85, al * (1 + 1.2 * wo))), 0.6); }
  for (let i = 0; i < 150; i++) { const x0 = r() * W, y = y0 - 80 + r() * (y1 - y0 + 100), q = 1.5 + r() * 3.5; ell(wrap4(x0 + (240 + 0.6 * (y - y0)) * t, -20, W + 20), y + 5 * wig(t, 0.5, i), q * 2.4, q * 0.7, A('#ffffff', 0.5)); }
}
// the near ridge of snow that slides past the lens (parallax): v = px/s
function ridge4(t, v) {
  const fo = (v * t) % 2040;
  [fo - 2040, fo].forEach(dx => { g.save(); g.translate(dx, 0);
    blob([[-480, 1040], [-60, 1010], [220, 968], [520, 1004], [860, 1040], [1200, 1006], [1560, 1040], [1980, 1010], [2260, 968], [2260, 1140], [-480, 1140]], '#7e95c6', 0.5);
    blob([[-60, 1010], [220, 968], [520, 1004], [860, 1040], [600, 1018], [300, 992], [80, 1016]], '#ffe7c8', 0.5); blob([[1200, 1006], [1560, 1040], [1980, 1010], [1700, 1022], [1460, 1028]], '#ffe7c8', 0.5); g.restore(); });
}
// the blizzard, over everything (screen space). wo 0..1 = how hard it blows, veil 0..1 = how much it whites the picture out
function storm4(t, wo, veil = wo) {
  if (wo <= 0) return; rect(0, 0, W, H, A('#eef0f3', 0.42 * veil)); const q = rng(21);
  for (let i = 0; i < 30; i++) { const y = 200 + q() * 880, x0 = q() * 2600, L = 500 + q() * 700, x = wrap4(x0 + (1100 + 700 * q()) * t, -1300, 2000); stroke([[x, y], [x + L * 0.5, y - 14 - 30 * q()], [x + L, y + 6]], 10 + q() * 26, A('#ffffff', 0.34 * wo), 0.6); }
}

// ---- the journal
// handwriting that writes itself from left to right. p 0..1. On a picture it gets a pale halo so the ink stays readable. returns [width, penX]
function ink4(s, x, y, size, p, col = C4.ink, halo = A('#fff7e6', 0.5)) {
  g.font = `600 ${size}px "caveat"`; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; const w = g.measureText(s).width; p = clamp(p);
  if (p > 0) { g.save(); if (p < 1) { g.beginPath(); g.rect(x - size, y - size * 1.2, size + (w + size * 0.4) * p, size * 2); g.clip(); }      // the hand slants: the ink overhangs its box
    if (halo) { g.lineWidth = size * 0.2; g.lineJoin = 'round'; g.strokeStyle = halo; g.strokeText(s, x, y); }
    g.fillStyle = col; g.fillText(s, x, y); g.restore(); }
  return [w, x + w * p];
}
// small capitals, the printed voice of the page (place names, labels)
const caps4 = (s, x, y, size, col = C4.sep, align = 'left', ls = 3) => tx(s, x, y, size, col, 'im-fell-english', align, 400, ls);
// a pencil line that draws itself through pts. p 0..1. returns the point the pencil is at
function pencil4(pts, p, w, col, k = 0.5) {
  p = clamp(p); if (p <= 0) return pts[0]; const f = p * (pts.length - 1), n = Math.floor(f), q = pts.slice(0, n + 1); if (n < pts.length - 1) q.push(L2(pts[n], pts[n + 1], f - n));
  if (q.length > 1) stroke(q, w, col, k); return q[q.length - 1];
}
// a slip of the page, in screen space; fn() draws on it with (0, 0) at its top left corner
function slip4(x, y, w, h, fn, rot = -0.012) {
  g.save(); g.translate(x, y); g.rotate(rot); shadowed(() => rect(0, 0, w, h, C4.parch), 8, 18, 0.34, 3, '#1a2848');
  rect(0, 0, w, h, LG(0, 0, w, h, [[0, A('#fff7e2', 0.5)], [1, A('#c9b388', 0.35)]])); g.lineWidth = 2; g.strokeStyle = A(C4.sep, 0.45); g.strokeRect(8, 8, w - 16, h - 16); fn(); g.restore();
}
// the journal on every shot: the date, top left, and the tally of what is left to go, bottom right.
// o: place ('ROSS ICE SHELF · 1912'), date, dp (0..1 written), label ('TO THE DEPOT'), unit ('miles'),
//    tally [[number, written 0..1, struck 0..1], ...], ring 0..1 (a red pencil ring round the last number), bare (no paper: the shot is a page already)
function hud4(t, o) {
  camOff(); g.globalAlpha = 1;
  const top = () => { caps4(o.place, 24, 43, 30); ink4(o.date, 24, 98, 56, o.dp, C4.ink, null); };
  const bot = () => { caps4(o.label, 24, 43, 30); let x = 26;
    o.tally.forEach(([s, wp, sp], i) => { if (wp <= 0) return; const last = i === o.tally.length - 1 || o.tally[i + 1][1] <= 0, [w] = ink4(s, x, 104, 62, wp, C4.ink, null);
      if (sp > 0) pline([[x - 6, 92], [x - 6 + (w + 12) * clamp(sp), 80]], 5, A(C4.red, 0.9));
      if (last && wp >= 1) { ink4(o.unit, x + w + 14, 104, 62, 1, C4.ink, null);
        if (o.ring > 0) { const n = Math.round(40 * clamp(o.ring)), cx = x + w / 2, pts = []; for (let j = 0; j <= n; j++) { const a = -2.4 + j / 40 * 6.9; pts.push([cx + Math.cos(a) * (w * 0.5 + 22 + j * 0.18), 84 + Math.sin(a) * 36]); } if (n > 1) stroke(pts, 5, A(C4.red, 0.92), 0.5); } }
      x += w + 26; }); };
  if (o.bare) { g.save(); g.translate(60, 48); g.rotate(-0.012); top(); g.restore(); g.save(); g.translate(1384, 904); g.rotate(-0.012); bot(); g.restore(); }
  else { slip4(60, 48, 478, 122, top); slip4(1384, 904, 478, 128, bot); }
}
