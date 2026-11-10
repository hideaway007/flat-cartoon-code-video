// figures.js — colour plumbing (C, TINT, DEAD), horse coats, costume kits, two-bone IK.
let DEAD = 0; // 0..1 global desaturation for the "will be dead" beat
const _cc = new Map();
let TINT = null; // [colour, amount] — scene light folded into the palette, not a post filter
function C(c) {
  const q = Math.round(DEAD * 20);
  if (!q && !TINT) return c;
  const k = c + q + (TINT ? TINT[0] + TINT[1] : ''); let v = _cc.get(k);
  if (!v) { v = TINT ? mix(c, TINT[0], TINT[1]) : c; if (q) v = grey(v, q / 20); _cc.set(k, v); }
  return v;
}
const INK = '#2a2230';
const COAT = {
  chestnut: { b: '#b9592c', s: '#8e3f22', m: '#4f2618', h: '#33201c' },
  bay:      { b: '#6b3f2c', s: '#4c2b21', m: '#241718', h: '#1c1416' },
  buck:     { b: '#cfa160', s: '#a67a44', m: '#4a3324', h: '#33241c' },
  grey:     { b: '#8d8a92', s: '#6a6772', m: '#3d3a45', h: '#2a2830' },
};
const KIT = {
  custer:  { trim: 'fringe', coat: '#d9b377', coatSh: '#b48a52', pants: '#5f7fa6', hat: '#ead9b0', hatSh: '#c9b384', band: '#7a5a3a',
             skin: '#f0b98f', skinSh: '#d4946c', hair: '#e2a93b', scarf: '#d8352a', boot: '#2e2328' },
  trooper: { trim: 'buttons', coat: '#34507e', coatSh: '#243a60', pants: '#6f8fb5', hat: '#2b2a35', hatSh: '#1d1c26', band: '#c9a23f',
             skin: '#e8ad84', skinSh: '#c98a64', hair: '#4a3324', scarf: '#c9a23f', boot: '#231c22' },
  // civilian: no trim, no scarf. Copy and recolour for new characters: KIT.name = { ...KIT.plain, coat: ... }
  plain:   { coat: '#8a6b52', coatSh: '#6a4f3c', pants: '#4a4652', hat: '#5a4636', hatSh: '#40301f', band: '#2e2328',
             skin: '#f0b98f', skinSh: '#d4946c', hair: '#4a3324', boot: '#2e2328' },
};

function ik(sx, sy, hx, hy, l1, l2, dir = 1) {
  const dx = hx - sx, dy = hy - sy, d = Math.min(Math.hypot(dx, dy), l1 + l2 - 1);
  const a = Math.atan2(dy, dx), b = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  return [sx + Math.cos(a + dir * b) * l1, sy + Math.sin(a + dir * b) * l1, sx + Math.cos(a) * d, sy + Math.sin(a) * d];
}

