// body.js — what every figure shares: skin and hair sets, the face, and the upper body (torso + head + arms).
const SKINS = [['#f0b98f', '#d4946c'], ['#e6a982', '#c58762'], ['#cf9670', '#ab7450'], ['#f3c6a2', '#d9a17c']];
const HAIRS = ['#4a3324', '#2a2024', '#8a5a2e', '#a9a29a'];
const GOLD = '#c9a23f';

function eye(x, y, rx, ry, lk, lid, skin) {
  form(() => g.ellipse(x, y, rx, ry, 0, 0, 7), C('#fffaf0'), () => {
    ell(x + 3 + lk * 3.5, y + 1, rx * 0.5, ry * 0.52, C(INK));
    if (lid) { g.fillStyle = skin; g.fillRect(x - rx - 2, y - ry - 2, rx * 2 + 4, (ry * 2 + 2) * lid); }
  });
}
// row of small triangles hanging off a line (buckskin fringe)
function fringe(x1, y1, x2, y2, n, len, col) {
  const L = Math.hypot(x2 - x1, y2 - y1) || 1, ux = (x2 - x1) / L, uy = (y2 - y1) / L;
  let nx = -uy, ny = ux; if (ny < 0) { nx = -nx; ny = -ny; }
  for (let i = 0; i < n; i++) {
    const f = (i + 0.5) / n, px = lerp(x1, x2, f), py = lerp(y1, y2, f);
    poly([[px - ux * 6, py - uy * 6], [px + ux * 6, py + uy * 6], [px + nx * len, py + ny * len]], col);
  }
}
// kit colours with per-figure skin / hair overrides
function kitOf(o) {
  const k = { ...KIT[o.kit || 'trooper'] };
  if (o.skin != null) [k.skin, k.skinSh] = SKINS[o.skin % 4];
  if (o.hair != null) k.hair = HAIRS[o.hair % 4];
  return k;
}
// torso + head + arms; origin = hips. hx,hy = near-hand target in hip space; o.hand2 = optional far hand (hip space).
// o: {tilt, eyes:'open'|'shut'|'wide', look, lid, brow, mouth:'smile'|'frown'|'open', stache, beard, curls, hat:'slouch'|'kepi'|'none'}
function upper(o, k, ph, hx, hy) {
  const c = n => C(k[n]), cus = k.trim === 'fringe', btn = k.trim === 'buttons';
  if (o.hand2) { const [ax, ay, bx, by] = ik(-14, -116, o.hand2[0], o.hand2[1], 64, 62, 1); limb(-14, -116, ax, ay, 20, 16, c('coatSh')); limb(ax, ay, bx, by, 16, 13, c('coatSh')); ell(bx, by, 14, 14, c('skinSh')); }
  form(() => g.roundRect(-52, -152, 106, 164, [46, 46, 18, 18]), c('coat'), () => { g.fillStyle = c('coatSh'); g.fillRect(-60, -160, 44, 190); });
  if (cus) fringe(-50, 8, 52, 8, 9, 14, c('coatSh'));
  else if (btn) { for (let i = 0; i < 4; i++) ell(34, -122 + i * 30, 4.5, 4.5, C(GOLD)); rr(-10, -150, 40, 9, 4, C(GOLD)); }
  rr(-52, -14, 106, 15, 4, C(INK)); rr(24, -17, 17, 21, 3, C(GOLD));
  // ---- head
  g.save(); g.translate(8, -146); g.rotate(o.tilt || 0); g.scale(1.44, 1.44);
  if (o.curls) [[-44, -30, 26], [-52, -8, 22], [-40, 12, 20]].forEach(q => ell(q[0], q[1], q[2], q[2], c('hair')));
  else ell(-38, -48, 17, 28, c('hair'));
  form(() => { g.roundRect(-48, -106, 104, 112, [52, 52, 46, 46]); g.ellipse(58, -42, 12, 10, 0, 0, 7); }, c('skin'), () => ell(-46, -40, 42, 76, c('skinSh')));
  ell(-8, -44, 9, 13, c('skinSh'));
  g.globalAlpha = 0.3; ell(28, -30, 13, 7, C('#e0604a')); g.globalAlpha = 1;
  const ey = -56, br = o.brow || 0, lk = o.look || 0;
  if (o.eyes === 'shut') { limb(10, ey, 28, ey + 3, 3, 3, C(INK)); limb(36, ey + 3, 52, ey, 3, 3, C(INK)); }
  else { const r = o.eyes === 'wide' ? 1.25 : 1; eye(19, ey, 10 * r, 12.5 * r, lk, o.lid || 0, c('skin')); eye(44, ey, 9 * r, 12.5 * r, lk, o.lid || 0, c('skin')); }
  limb(6, ey - 23 - br * 8, 28, ey - 19 + br * 5, 4.5, 4, c('hair')); limb(36, ey - 19 + br * 5, 56, ey - 23 - br * 8, 4, 4.5, c('hair'));
  if (o.beard) blob([[-12, -34], [22, -24], [62, -32], [58, -2], [30, 12], [-2, 4]], c('hair'));
  const mc = C('#6e2a2a');
  if (o.mouth === 'open') ell(38, -10, 9, 11, mc);
  else if (o.mouth) { const d = o.mouth === 'smile' ? 9 : -7; g.beginPath(); g.moveTo(22, -13 - d * 0.3); g.quadraticCurveTo(38, -13 + d, 54, -15 - d * 0.3); g.strokeStyle = mc; g.lineWidth = 4; g.lineCap = 'round'; g.stroke(); }
  if (o.stache) { limb(36, -28, 6, -12, 10, 4, c('hair')); limb(36, -28, 66, -14, 10, 4, c('hair')); }
  if (o.hat === 'none') { g.beginPath(); g.roundRect(-50, -110, 108, 44, [52, 52, 6, 6]); g.fillStyle = c('hair'); g.fill(); }
  else if (o.hat === 'kepi') {
    form(() => g.roundRect(-40, -128, 84, 50, [10, 16, 4, 4]), c('hat'), () => { g.fillStyle = c('hatSh'); g.fillRect(-42, -130, 28, 60); });
    rr(-40, -88, 84, 9, 2, c('band')); ell(52, -80, 30, 8, c('hatSh'), 0.12);
  } else {
    ell(6, -82, 104, 17, c('hatSh'), -0.05); ell(6, -86, 100, 15, c('hat'), -0.05);
    form(() => g.roundRect(-38, -148, 88, 64, [28, 28, 4, 4]), c('hat'), () => { g.fillStyle = c('hatSh'); g.fillRect(-40, -150, 30, 70); });
    rr(-38, -98, 88, 10, 2, c('band'));
  }
  g.restore();
  if (k.scarf) { poly([[-30, -150], [44, -150], [10, -104]], c('scarf')); limb(8, -120, -8 - Math.sin(ph * 2) * 7, -84, 8, 4, c('scarf')); }
  const [ex, ey2, fx, fy] = ik(12, -116, hx, hy, 64, 62, 1);
  limb(12, -116, ex, ey2, 21, 17, c('coatSh'));
  if (cus) fringe(ex, ey2, fx, fy, 5, 13, c('coatSh'));
  limb(ex, ey2, fx, fy, 17, 14, c('coat'));
  if (k.trim) limb(lerp(ex, fx, 0.62), lerp(ey2, fy, 0.62), fx, fy, 16, 15, C('#ead9b0'));
  ell(fx, fy, 15, 15, C(cus ? '#ead9b0' : k.skin));
  return [fx, fy];
}
