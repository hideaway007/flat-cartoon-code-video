// Marble bust rig, translated from production/bust.py. Colours are BGR.
import * as TN from './toon.js';
import { get, add, sub, mul, hypot, lerp, rot, crom, linspace, radians } from './np.js';
import { LINE, WHITE, INK } from './painter.js';

export const MARBLE = [236, 238, 238];
export const MARBLE_DK = [196, 200, 204];
export const PLAQUE = [60, 150, 200];
export const LAUREL = [70, 136, 70];
export const BOX = [-430, -1330, 430, 40];

export function design(kw = {}) {
  return {
    name: 'bust', rig: 'bust', marble: MARBLE, marble_dk: MARBLE_DK, plinth: true, plaque: PLAQUE,
    wreath: 'laurel', wreath_col: LAUREL, curls: true, head_rx: 152, head_ry: 176,
    jacket: MARBLE, jacket_dk: MARBLE_DK, trousers: MARBLE, boots: MARBLE, hair: MARBLE, hair_dk: MARBLE_DK,
    rope: [32, 132, 240], leg_u: 135, leg_l: 130, torso: 270, style: 'none', ...kw,
  };
}

export const TEACHER = design({ name: 'teacher' });

export function _truncate(p, frac) {
  p = p.map((v) => v.map(Number));
  if (frac >= 1) return p;
  const d = [0];
  for (let i = 1; i < p.length; i++) d.push(d[i - 1] + hypot(sub(p[i], p[i - 1])));
  const L = d[d.length - 1] * Math.max(frac, 0);
  let k = 0;
  while (k < d.length && d[k] < L) k++;
  if (k <= 0) return p.slice(0, 1);
  const a = (L - d[k - 1]) / Math.max(d[k] - d[k - 1], 1e-9);
  return [...p.slice(0, k), lerp(p[k - 1], p[k], a)];
}

export function draw(pt, D, p, idle = [0, 0]) {
  const fac = p.facing, k = fac === 'r' ? 1 : 0, back = fac === 'b';
  const mar = get(D, 'marble', MARBLE), mdk = get(D, 'marble_dk', MARBLE_DK);
  const plinth = get(D, 'plinth', true), oy = plinth ? 0 : 440;
  const joints = { base: [0, 0] };
  const top = -440 + oy;
  // Plinth stays fixed while the bust rocks.
  if (plinth) {
    pt.shape([[-250, 0], [250, 0], [250, -70], [-250, -70]], mdk);
    pt.shape([[-175, -70], [175, -70], [165, -380], [-165, -380]], mar);
    for (const x of [-110, -40, 40, 110]) pt.line([[x, -95], [x * 0.97, -360]], LINE * 0.45, mdk);
    pt.shape([[-225, -380], [225, -380], [225, -440], [-225, -440]], mdk);
    if (get(D, 'plaque', null) != null && !back) {
      pt.shape([[-120, -250], [120, -250], [120, -180], [-120, -180]], D.plaque, LINE * 0.7, true, false);
      joints.plaque = [0, -215];
    }
  }
  joints.top = [0, top];
  const lean = radians(p.lean);
  const U = (pts) => rot(pts.map((v) => add(v, [0, oy])), lean, [0, top]);
  const hx = 14 * k, sx = 270;
  const body = [[-200, -450], [-sx + 20, -560], [-sx, -690], [-210, -760], [-80, -790], [hx, -800], [80, -790],
    [210, -760], [sx, -690], [sx - 20, -560], [200, -450], [0, -470]];
  pt.blob(U(body), mar, LINE, 10);
  if (!back) {
    pt.blob(U([[-sx + 10, -690], [-200, -770], [-120, -760], [40, -560], [10, -470], [-120, -480]]), mar, LINE * 0.8, 8);
    for (const f of [0, 0.33, 0.66]) {
      pt.line(U(crom([[-160 + 80 * f, -700 + 60 * f], [-40 + 120 * f, -600 + 40 * f], [60 + 90 * f, -480]], false, 8)), LINE * 0.5, mdk);
    }
  }
  pt.shape(U([[-74 + hx, -790], [74 + hx, -790], [68 + hx, -836], [-68 + hx, -836]]), mar);
  const rx = get(D, 'head_rx', 152), ry = get(D, 'head_ry', 176);
  const hd = radians(p.head + 0.6 * idle[1]);
  const hc_l = [hx, -836 - ry + 58 + p.head_dy], hc = U([hc_l])[0], ha = lean + hd;
  const H = (pts) => rot(pts, ha).map((v) => add(v, hc));
  const t = linspace(0, 2 * Math.PI, 72, false);
  const egg = t.map((v) => { const s = Math.sin(v); return [rx * Math.cos(v) * (1 + 0.06 * s), ry * s - 6 * s ** 2 * (s > 0 ? 1 : 0)]; });
  const curls = get(D, 'curls', true);
  if (curls) {
    const ring = [[-rx * 0.98, -ry * 0.25], [-rx * 0.9, -ry * 0.6], [-rx * 0.62, -ry * 0.88], [-rx * 0.25, -ry * 1.02],
      [rx * 0.15, -ry * 1.04], [rx * 0.52, -ry * 0.92], [rx * 0.84, -ry * 0.66], [rx * 0.98, -ry * 0.3]];
    for (const [i, [x, y]] of ring.entries()) pt.ell(...H([[x, y]])[0], 44, 40, mar, LINE * 0.8, 0.3 * i);
  }
  pt.shape(H(egg), WHITE);
  if (back) {
    if (curls) {
      for (const [j, yy] of linspace(-ry * 0.82, ry * 0.18, 5).entries()) {
        const half = rx * 0.9 * Math.sqrt(Math.max(0, 1 - (yy / ry) ** 2));
        const n = Math.max(2, Math.trunc(2 * half / 58) + 1);
        for (const xx of linspace(-half + 26, half - 26, n)) {
          const x = xx + (j % 2) * 12, c = H([[x, yy]])[0];
          pt.ell(...c, 38, 34, mar, LINE * 0.6, 0.4 * j);
          pt.line(H([[x - 14, yy + 6], [x - 4, yy - 10], [x + 12, yy - 4], [x + 6, yy + 8]]), LINE * 0.4, mdk, true);
        }
      }
    }
  } else {
    if (curls) {
      for (const x of linspace(-rx * 0.7, rx * 0.7, 6)) {
        const y = -ry * 0.78 + 0.25 * ry * (x / rx) ** 2;
        pt.ell(...H([[x + 10 * k, y]])[0], 30, 26, mar, LINE * 0.7);
        pt.line(H([[x + 10 * k - 10, y + 2], [x + 10 * k + 4, y - 8], [x + 10 * k + 14, y + 4]]), LINE * 0.45, mdk, true);
      }
    }
    TN.face(pt, H, p, 34 * k, rx, ry, null);
  }
  if (get(D, 'wreath', 'laurel') === 'laurel') {
    const leaf = [[0, 0], [28, -17], [62, 0], [28, 17]], col = get(D, 'wreath_col', LAUREL);
    for (const s of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        const u = i / 6, th = radians(-8 - 70 * u);
        const x = s * rx * Math.cos(th), y = ry * 0.98 * Math.sin(th) - 10;
        const tang = Math.atan2(-(ry * Math.cos(th)), -s * rx * Math.sin(th));
        const q = rot(leaf, tang + (i % 2 ? 0.5 : -0.5)).map((v) => add(v, [x, y]));
        pt.blob(H(q), col, LINE * 0.6, 4, false);
      }
    }
  }
  const cr = Number(get(p, 'crack', 0));
  if (cr > 0.02 && !back) {
    const path = crom([[rx * 0.62, -ry * 0.9], [rx * 0.42, -ry * 0.64], [rx * 0.6, -ry * 0.5], [rx * 0.36, -ry * 0.26],
      [rx * 0.52, -ry * 0.1], [rx * 0.38, ry * 0.02]], false, 4);
    const q = _truncate(path, cr);
    if (q.length > 1) pt.line(H(q), LINE * 0.75);
    if (cr > 0.55) {
      const b = _truncate([[rx * 0.6, -ry * 0.5], [rx * 0.78, -ry * 0.44], [rx * 0.86, -ry * 0.3]], (cr - 0.55) / 0.45);
      if (b.length > 1) pt.line(H(b), LINE * 0.6);
    }
  }
  if (p.sweat > 0.05 && !back) {
    const s = Math.min(p.sweat, 1);
    pt.blob(H([[rx * 0.95, -ry * 0.45], [rx * 0.95 + 22 * s, -ry * 0.1], [rx * 0.95, -ry * 0.0 + 10 * s],
      [rx * 0.95 - 22 * s, -ry * 0.1]]), [235, 190, 120], LINE * 0.7, 6);
  }
  if (!back) TN.head_marks(pt, H, p, rx, ry, 34 * k, null);
  joints.head = hc;
  for (const key of ['handL', 'handR', 'footL', 'footR', 'hip']) joints[key] = [0, top];
  return joints;
}
