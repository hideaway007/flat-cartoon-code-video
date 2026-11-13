// cutaway.js — STYLE 3 "CUTAWAY": engineering, maritime and aviation disasters. Loaded after lib.js and kit.js.
// Shape language: blocky people (3.4 heads), square heads, thick limbs. Set device: the ship or building is sliced open like a
// technical drawing, hatched amber where it is cut, and the people stay upright while the room tilts.
// Marks: numbered amber callouts, name tags, a lower third that types a quote from the record, a recorder read-out with a countdown.
const C3 = { amb: '#ffb000', red: '#ee4630', cream: '#f2ecdc', slab: '#0c141d', wall: '#27394b' };
const D15 = 15 * Math.PI / 180;
let TH3 = -D15;                                  // how far the set is rolled; a shot sets it before it draws the set
const RP = (x, y) => { const dx = x - 960, dy = y - 600, c = Math.cos(TH3), s = Math.sin(TH3); return [960 + dx * c - dy * s, 600 + dx * s + dy * c]; };   // a point of the rolled set, on the screen
function hatch(x, y, w, h, step, col, lw = 3) {
  clipIn(() => g.rect(x, y, w, h), () => { g.beginPath(); for (let i = -h; i < w + h; i += step) { g.moveTo(x + i, y + h); g.lineTo(x + i + h, y); } g.lineWidth = lw; g.strokeStyle = col; g.stroke(); });
}
// ---- the beat. Cut on a half-second grid; the alarm lamp (and its beep) keep it.
const alarm3 = t => t % 0.5 < 0.25;
const shake3 = (t, k = 1) => [k * (5 * wig(t, 0.9) + 2.5 * wig(t, 2.3, 1)), k * (4 * wig(t, 1.1, 2) + 2 * wig(t, 2.9))];
// lightning: flashes3([1.5, 2.8])(t) -> 0..1, a double flash at each time. Put the flashes on cuts.
const flashes3 = times => t => Math.max(0, ...times.map(f => { const u = t - f; return u < 0 || u > 0.5 ? 0 : u < 0.07 ? 1 : u < 0.14 ? 0.2 : u < 0.22 ? 0.85 : 0.85 * (1 - (u - 0.22) / 0.28); }));

// ---- figures
// square head. origin = bottom centre of the head. o: skin, dir (which way the face is turned), look [x, y], lid 0..1, brow (colour),
// browTilt, browUp, mouth 'frown' | 'open' | 'grit', beard (colour), top(d) draws the hair or the hat
function head3(o) {
  const sk = o.skin, sk2 = mix(sk, '#4a2418', 0.24), d = o.dir || 1, fx = d * 13;
  rr(-d * 70 - 9, -76, 18, 30, 8, sk2);
  form(() => g.roundRect(-62, -120, 124, 120, 38), sk, () => rect(d > 0 ? -70 : 26, -130, 44, 140, sk2));
  if (o.beard) blob([[fx - 50, -50], [fx - 10, -40], [fx + 40, -48], [fx + 44, -14], [fx + 20, 6], [fx - 30, 6], [fx - 52, -16]], o.beard, 0.5);
  const lk = o.look || [d * 0.5, 0], er = 13;
  [fx - 23, fx + 23].forEach(x => {
    form(() => g.ellipse(x, -68, er, er * 1.12, 0, 0, TAU), '#fbf7ee', () => { ell(x + lk[0] * 6, -68 + lk[1] * 6, 6.6, 6.6, '#10151c'); if (o.lid) rect(x - 16, -86, 32, 34 * o.lid, sk); });
  });
  const bt = o.browTilt || 0, by = -90 - (o.browUp || 0);
  limb(fx - 38, by - bt * 9, fx - 10, by + bt * 9, 4.6, 4.6, o.brow); limb(fx + 10, by + bt * 9, fx + 38, by - bt * 9, 4.6, 4.6, o.brow);
  rr(fx + d * 3 - 9, -62, 18, 24, 8, sk2);
  if (o.mouth === 'frown') stroke([[fx - 16, -22], [fx, -28], [fx + 16, -22]], 5, '#4a2020');
  else if (o.mouth === 'open') { rr(fx - 15, -36, 30, 24, 9, '#4a1c1c'); rect(fx - 10, -36, 20, 6, '#fbf7ee'); }
  else if (o.mouth === 'grit') { rr(fx - 20, -36, 40, 18, 6, '#fbf7ee'); g.lineWidth = 3; g.strokeStyle = '#4a2020'; g.strokeRect(fx - 20, -36, 40, 18); [-10, 0, 10].forEach(x => rect(fx + x - 1.5, -36, 3, 18, '#4a2020')); }
  if (o.top) o.top(d);
}
// blocky figure, upright, about 430 tall. origin = between the feet. o: skin, coat, pants, body (1 | -1: which way the chest is turned),
// fl / fr (foot positions, so the feet can stand on a sloping deck), armF / armN (hand targets of the far and near arm), bendF / bendN,
// tilt + hx (head), cuff (colour), trim(d) (drawn inside the coat), head (see head3). returns [farArm, nearArm], each [jointX, jointY, handX, handY].
function blk(o) {
  const sk = o.skin, T = o.coat, T2 = mix(T, '#0a1018', 0.32), PN = o.pants, d = o.body || 1;
  const arm = (t, sx, col, bend) => { if (!t) return; const a = limb2(sx, -278, t[0], t[1], 76, 72, bend, 26, 23, 20, col); if (o.cuff) rr(a[2] - 14, a[3] - 26, 28, 16, 5, o.cuff); ell(a[2], a[3], 21, 20, sk); return a; };
  [[-27, o.fl, mix(PN, '#000000', 0.28)], [27, o.fr, PN]].forEach(([hx, f, c]) => { limb2(hx, -124, f[0], f[1] - 18, 62, 60, d, 25, 22, 20, c); rr(f[0] - 26 + d * 7, f[1] - 28, 60, 28, 10, '#0c1116'); });
  const fa = arm(o.armF, -d * 60, T2, o.bendF || d);
  form(() => g.roundRect(-78, -308, 156, 200, 32), T, () => { rect(d > 0 ? -90 : 24, -320, 66, 230, T2); if (o.trim) o.trim(d); });
  g.save(); g.translate(o.hx || 0, -300); g.rotate(o.tilt || 0); head3(o.head); g.restore();
  const na = arm(o.armN, d * 60, T, o.bendN || d);
  return [fa, na];
}

// ---- marks (all in screen space: call camOff() first if the shot has a camera)
function dot3(x, y, n, s, pulse = 0) {                                   // numbered amber callout dot; s = pop scale, pulse 0..1 = the ring that runs outward
  if (s <= 0) return; g.save(); g.translate(x, y); g.scale(s, s); ell(0, 0, 27, 27, C3.amb);
  g.lineWidth = 3; g.strokeStyle = C3.amb; g.beginPath(); g.arc(0, 0, 34, 0, TAU); g.stroke(); g.strokeStyle = A(C3.amb, 0.7 * (1 - pulse)); g.beginPath(); g.arc(0, 0, 34 + 34 * pulse, 0, TAU); g.stroke();
  tx(n, 0, 14, 40, '#10161f', 'barlow-condensed', 'center', 700); g.restore();
}
function tag3(x, y, s, k) {                                              // amber name tag pointing down at (x, y); k = pop scale
  if (k <= 0) return; g.save(); g.translate(x, y); g.scale(k, k); g.font = '700 30px "barlow-condensed"'; g.letterSpacing = '3px'; const w = g.measureText(s).width + 30; g.letterSpacing = '0px';
  rr(-w / 2, -64, w, 46, 6, C3.amb); poly([[-10, -20], [10, -20], [0, -4]], C3.amb); tx(s, 1.5, -30, 30, '#10161f', 'barlow-condensed', 'center', 700, 3); g.restore();
}
function cap3(time, s, p, a = 1) {                                       // lower third: a time and a line that types itself (p 0..1), a = fade
  g.save(); rect(0, 800, W, 280, LG(0, 800, 0, 1080, [[0, A('#03070b', 0)], [1, A('#03070b', 0.82 * a)]])); g.globalAlpha = a;
  rect(84, 912, 8, 112, C3.amb); tx(time, 112, 954, 40, C3.amb, 'b612-mono', 'left', 700, 0); tx(typed(s, p), 112, 1020, 62, C3.cream, 'barlow-condensed', 'left', 700, 2); g.restore();
}
// the recorder's read-out, on every shot. o: src ('BRIDGE AUDIO · 07:06'), label ('TIME LEFT'), left (seconds), end (true on the last card: the meter is flat)
function hud3(t, o) {
  camOff(); g.globalAlpha = 1; const end = o.end, p2 = n => String(Math.floor(n)).padStart(2, '0');
  if (end) { g.lineWidth = 4; g.strokeStyle = A(C3.cream, 0.75); g.strokeRect(74, 68, 20, 20); } else ell(84, 78, 11, 11, t % 1 < 0.6 ? C3.red : '#5a1c16');
  tx(end ? 'END' : 'REC', 110, 90, 32, C3.cream, 'b612-mono', 'left', 700, 2); tx(o.src, 204, 89, 30, A(C3.cream, 0.75), 'barlow-condensed', 'left', 500, 3);
  for (let i = 0; i < 22; i++) { const v = end ? 0.04 : 0.12 + 0.88 * Math.abs(wig(t, 2.1 + i * 0.37, i * 1.7)) * (0.55 + 0.45 * wig(t, 0.7, i)); rect(76 + i * 9, 136 - 24 * v, 5, 24 * v + 2, A(C3.amb, end ? 0.45 : 0.9)); }
  tx(o.label, 1404, 930, 30, A(C3.cream, end ? 0.5 : 1), 'barlow-condensed', 'left', 500, 5);
  tx('T-' + p2(o.left / 3600) + ':' + p2(o.left % 3600 / 60) + ':' + p2(o.left % 60), 1400, 1000, 62, A(C3.amb, end ? 0.55 : 1), 'b612-mono', 'left', 700, -1);
}
