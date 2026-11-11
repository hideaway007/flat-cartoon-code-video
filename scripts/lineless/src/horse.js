// horse.js — side-view horse, lineless two-tone. Origin = ground under the barrel, facing right.
const SOCK = '#f1e6d2';
function horseLeg(hx, hy, ph, col, hoof, front, sock) {
  const sw = Math.sin(ph), lift = Math.max(0, Math.cos(ph));
  const a1 = sw * 0.36 + (front ? 0.04 : -0.06);
  const kx = hx + Math.sin(a1) * 95, ky = hy + Math.cos(a1) * 95;
  const a2 = a1 - lift * (front ? 0.85 : 0.6) + (front ? 0 : 0.16);
  const fx = kx + Math.sin(a2) * 100, fy = ky + Math.cos(a2) * 100;
  limb(hx, hy, kx, ky, 25, 15, col); limb(kx, ky, fx, fy, 14, 11, col);
  if (sock) limb(lerp(kx, fx, 0.55), lerp(ky, fy, 0.55), fx, fy, 12, 11, sock);
  limb(fx, fy, fx + 5, fy + 13, 12, 14, hoof);
}
// hoof dust: three flat puffs that grow and fade behind the horse
function dust(ph, col) {
  for (let k = 0; k < 3; k++) {
    const p = (Math.abs(ph) / 6.283 + k / 3) % 1;
    g.globalAlpha = (1 - p) * 0.55; ell(-150 - p * 150, -12 - p * 34, 16 + p * 30, 12 + p * 22, col); g.globalAlpha = 1;
  }
}
// o: {coat, ph, nod, blanket, blaze, socks, dust, rear, tired}
function horse(o) {
  const p = COAT[o.coat || 'chestnut'] || COAT.chestnut, ph = o.ph || 0, trd = o.tired || 0, rrAmt = o.rear || 0;
  const nod = (o.nod || 0) + trd * 34 + Math.sin(ph * 2) * 5;
  const b = C(p.b), s = C(p.s), m = C(p.m), h = C(p.h), sk = o.socks ? C(SOCK) : null;
  g.globalAlpha = 0.2; ell(10, 6, 200, 15, C('#1d1226')); g.globalAlpha = 1;      // contact shadow, not a cast one
  if (o.dust) dust(ph, C(o.dust));
  g.save();
  if (rrAmt) { g.translate(-95, 0); g.rotate(-0.34 * rrAmt); g.translate(95, 0); }
  g.translate(trd ? Math.sin(ph * 18) * 2.5 * trd : 0, Math.sin(ph * 2 + 1) * 4);
  const sway = Math.sin(ph) * 12;
  limb(-140, -262, -190 - sway, -150, 19, 9, m); limb(-150, -250, -208 - sway * 1.4, -118, 12, 3, m); // tail
  horseLeg(-98, -212, ph + Math.PI, s, h, false, null); horseLeg(104, -212, ph + Math.PI * 1.5, s, h, true, null);
  form(() => curve([[-150, -250], [-110, -300], [20, -302], [120, -292], [150, -240], [110, -178], [-20, -166], [-120, -178]]),
    b, () => { ell(-10, -150, 190, 52, s); ell(-150, -200, 46, 70, s); });
  if (o.blanket) {
    form(() => g.roundRect(-80, -306, 122, 78, 12), C(o.blanket), () => { g.fillStyle = C('#c9a23f'); g.fillRect(-80, -240, 122, 7); });
    form(() => g.roundRect(-58, -318, 86, 30, [16, 16, 8, 8]), C('#6b3f26'), () => { g.fillStyle = C('#4f2c1b'); g.fillRect(-58, -300, 86, 14); });
    limb(-4, -292, 2, -214, 4, 4, C('#4f2c1b'));                                  // girth strap
  }
  horseLeg(-112, -212, ph, b, h, false, sk); horseLeg(92, -212, ph + Math.PI * 0.5, b, h, true, sk);
  const px = 196, py = -392 + nod, mx = 286, my = -322 + nod * 1.4;
  limb(112, -258, px - 6, py + 10, 60, 34, b);                                   // neck
  for (let i = 0; i < 5; i++) { const f = i / 4; ell(lerp(90, px - 26, f), lerp(-296, py - 4, f) + Math.sin(ph * 2 + i) * 2, 21 - f * 4, 15, m, -0.9); } // mane tufts
  poly([[px - 18, py - 20], [px - 6, py - 64], [px + 10, py - 22]], m); poly([[px - 2, py - 22], [px + 12, py - 58], [px + 22, py - 18]], b);
  limb(px, py, mx, my, 34, 21, b); ell(mx + 4, my + 2, 22, 19, s);               // head + muzzle
  if (o.blaze) limb(px + 22, py + 2, mx - 4, my - 10, 8, 6, C(SOCK));
  ell(px + 4, py - 20, 15, 11, m, -0.5);                                          // forelock
  ell(px + 30, py + 14, 6.5, 7.5, C(INK)); ell(px + 32, py + 12, 2, 2, C('#fffaf0'));
  ell(mx + 14, my, 3, 4, C(p.h));                                                 // nostril
  const tk = C('#3a2218');                                                        // bridle
  limb(px + 2, py + 10, mx - 16, my + 12, 2.6, 2.6, tk); limb(mx - 22, my - 16, mx - 12, my + 16, 2.8, 2.8, tk); limb(px + 14, py - 14, px + 30, py + 30, 2.4, 2.4, tk);
  g.restore();
  return { mouth: [mx - 10, my + 14 + Math.sin(ph * 2 + 1) * 4] };
}
