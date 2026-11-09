// Faithful Canvas2D port of production/toon.py. Painter calls and draw order
// match Python: each shape/stroke affects the deterministic wobble counter.
import { crom, ellipse_pts, rot, ik2, get, add, sub, mul, div, hypot, linspace, radians, range, pyround } from './np.js';
import { Painter, SS, INK, WHITE, LINE } from './painter.js';
import * as BU from './bust.js';
import * as HO from './horse.js';
import * as CO from './costumes.js';
export { crom, ellipse_pts, rot, ik2, Painter, SS, INK, WHITE, LINE };
export { silhouette } from './painter.js';

export const MOUTH = [48, 34, 110];
export const TONGUE = [95, 95, 215];
export const COSTUME_KEYS = ['garment', 'headwear', 'cape', 'legwear', 'footwear', 'moustache', 'beard', 'quiver', 'sleeves',
  'heraldry', 'badge', 'lashes', 'glasses', 'lanyard', 'headphones'];

export function uses_costumes(D, p = null) {
  if (COSTUME_KEYS.some(k => get(D, k, null) != null && D[k] !== 'none') || !['messy', 'beanie'].includes(D.style)) return true;
  return p != null && (get(p, 'heldL', 'none') !== 'none' || get(p, 'heldR', 'none') !== 'none');
}

export const DEFAULT_POSE = {
  facing: 'f', hip: [0.0, 0.0], lean: 0.0, head: 0.0, head_dy: 0.0,
  feet: [-62.0, 62.0], lift: [0.0, 0.0], hL: [-40.0, 250.0], hR: [40.0, 250.0], handL: 'mitt', handR: 'mitt',
  eyes: 'dot', look: [0.0, 0.0], brows: [0.0, 0.0], mouth: 'smile', mopen: 0.5,
  sweat: 0.0, tears: 0.0, blush: 0.0, pale: 0.0, vein: 0.0, prop: 'none', coil: [0.0, 0.0, 1.0],
  heldL: 'none', heldR: 'none', rotL: 0.0, rotR: 0.0, fixL: 0.0, fixR: 0.0, crack: 0.0, specs: 0.0, sweep: 0.0,
  gait: 'stand', stride: 0.0, hneck: 0.0, hat_off: 0.0,
};
export const NUMERIC = Object.keys(DEFAULT_POSE).filter(k => typeof DEFAULT_POSE[k] === 'number' || Array.isArray(DEFAULT_POSE[k]));

export function blend(a, b, u) {
  const out = {};
  for (const k of Object.keys(DEFAULT_POSE)) {
    const va = get(a, k, DEFAULT_POSE[k]), vb = get(b, k, DEFAULT_POSE[k]);
    if (Array.isArray(va)) out[k] = va.slice(0, Math.min(va.length, vb.length)).map((x, i) => x + (vb[i] - x) * u);
    else if (typeof va === 'number') out[k] = va + (vb - va) * u;
    else out[k] = u >= 0.5 ? vb : va;
  }
  return out;
}
export function pose(kw = {}) { return {...DEFAULT_POSE, ...kw}; }

export function draw_character(pt, D, p, idle = [0.0, 0.0]) {
  if (D.rig === 'bust') return BU.draw(pt, D, p, idle);
  if (D.rig === 'horse') return HO.draw(pt, D, p, idle);
  const fac = p.facing, k = fac === 'r' ? 1 : 0, back = fac === 'b';
  const boot_h = 72, leg_rest = D.leg_u + D.leg_l;
  const hip = [0.0 + p.hip[0], -(boot_h + leg_rest * 0.96) + p.hip[1]];
  const lean = radians(p.lean), breathe = 1 + 0.012 * idle[0], T = D.torso * breathe;
  function up(v) {
    return rot(Array.isArray(v[0]) ? v.map(q => add(q, hip)) : add(v, hip), lean, hip);
  }
  const puffy = get(D, 'puffy', false), sh_w = puffy ? 132 : 118;
  const shoulderL = up([-sh_w + 18 * k, -T + 40]), shoulderR = up([sh_w - 26 * k, -T + 40]);
  const neck = up([10 * k, -T - 4]);
  const joints = {};
  let C = null;
  if (uses_costumes(D, p)) C = new CO.Ctx(pt, D, p, k, fac, T, hip, lean, up, sh_w, joints);
  const newg = C != null && !['puffy', 'zip'].includes(C.garment);
  if (C != null && !back) CO.behind_body(C);

  function leg(side) {
    const fx = p.feet[side < 0 ? 0 : 1], lift = p.lift[side < 0 ? 0 : 1];
    const hj = add(hip, [side * 52, 0.0]), ankle = [fx, -boot_h + 8 - lift];
    let bend = fac === 'r' ? 1 : (fac === 'f' ? -side : side);
    if (fac === 'r') bend = -1;
    const [knee, ank] = ik2(hj, ankle, D.leg_u, D.leg_l, bend);
    if (C != null) {
      C.legs[side] = [hj, knee, ank];
      CO.leg(C, side, hj, knee, ank);
      return [hj, knee];
    }
    pt.stroke([hj, knee, ank], D.trousers, 96, LINE);
    const toe = fac === 'r' ? 1 : (fac === 'f' ? side * 0.35 : side * 0.15);
    const bx = ank[0], by = ank[1] + 28;
    let boot = [[bx - 52 + 20 * Math.min(toe, 0), by - 42], [bx + 40 + 50 * Math.max(toe, 0) * 0.6, by - 34],
      [bx + 62 + 62 * Math.max(toe, 0), by + 4], [bx + 58 + 60 * Math.max(toe, 0), by + 36],
      [bx - 58 + 60 * Math.min(toe, 0), by + 36], [bx - 62 + 30 * Math.min(toe, 0), by - 4]];
    if (back) boot = [[bx - 56, by - 40], [bx + 56, by - 40], [bx + 60, by + 36], [bx - 60, by + 36]];
    pt.blob(boot, D.boots, undefined, 6);
    pt.line([[bx - 56 + 50 * Math.min(toe, 0), by + 18], [bx + 56 + 58 * Math.max(toe, 0), by + 18]], LINE * 0.7);
    joints['foot' + (side < 0 ? 'L' : 'R')] = [bx, 0.0];
    return [hj, knee];
  }
  const legs = [leg(-1), leg(1)];
  if (get(D, 'harness', null) != null && !newg) {
    for (const [hj, knee] of legs) {
      const d = sub(knee, hj), c = add(hj, mul(d, 0.32)), ang = Math.atan2(d[1], d[0]) + Math.PI / 2;
      pt.ell(c[0], c[1], 58, 15, D.harness, LINE * 0.8, ang);
    }
  }

  function arm(side, draw = true) {
    const sh = side < 0 ? shoulderL : shoulderR, tgt = side < 0 ? p.hL : p.hR;
    const target = up(add(tgt, side < 0 ? [-sh_w + 18 * k, -T + 40] : [sh_w - 26 * k, -T + 40]));
    const out = fac !== 'r' ? 0.3 * side : 0.0;
    const cands = [1, -1].map(b => ik2(sh, target, 150, 140, b));
    const score = c => (c[0][1] - sh[1]) + 0.8 * out * (c[0][0] - sh[0]);
    const [elbow, wrist] = score(cands[1]) > score(cands[0]) ? cands[1] : cands[0];
    joints['hand' + (side < 0 ? 'L' : 'R')] = wrist;
    if (!draw) return [sh, elbow, wrist];
    let kind = p[side < 0 ? 'handL' : 'handR'];
    if (C != null) {
      kind = CO.arm(C, side, sh, elbow, wrist, kind, (a, kd) => hand(wrist, a, kd, side));
      return;
    }
    pt.stroke([sh, elbow, wrist], D.jacket, D.puffy ? 84 : 74, LINE);
    if (D.puffy) {
      for (const f of [0.45, 1.4]) {
        const [a0, a1] = f < 1 ? [sh, elbow] : [elbow, wrist];
        const c = add(a0, mul(sub(a1, a0), f < 1 ? f : f - 1)), d = sub(a1, a0);
        const n = div([-d[1], d[0]], hypot(d) + 1e-6);
        pt.line([sub(c, mul(n, 30)), add(c, mul(n, 30))], LINE * 0.6);
      }
    }
    const d = sub(wrist, elbow);
    hand(wrist, Math.atan2(d[1], d[0]), kind, side);
  }
  function hand(c, ang, kind, side) {
    const R = pts => rot(pts, ang).map(q => add(q, c));
    if (kind === 'fist') pt.ell(c[0], c[1], 36, 34, WHITE, LINE, ang);
    else if (kind === 'two') {
      for (const da of [-0.32, 0.12]) {
        const tip = add(c, mul([Math.cos(ang + da - side * 0.0), Math.sin(ang + da)], 80));
        pt.stroke([c, tip], WHITE, 26, LINE);
      }
      pt.ell(...add(c, mul([Math.cos(ang), Math.sin(ang)], 6)), 34, 32, WHITE, LINE, ang);
    } else if (kind === 'open') {
      pt.blob(R([[-10, -38], [34, -40], [52, -10], [48, 26], [16, 40], [-18, 30]]), WHITE, undefined, 6);
      pt.blob(R([[-6, -30], [14, -62], [32, -58], [24, -26]]), WHITE, undefined, 5);
    } else if (kind === 'point') {
      pt.stroke([c, add(c, mul([Math.cos(ang), Math.sin(ang)], 82))], WHITE, 26, LINE);
      pt.ell(c[0], c[1], 36, 33, WHITE, LINE, ang);
    } else {
      pt.ell(...add(c, mul([Math.cos(ang), Math.sin(ang)], 8)), 40, 34, WHITE, LINE, ang);
      const th = add(c, mul([Math.cos(ang - side * 1.1), Math.sin(ang - side * 1.1)], 28));
      pt.ell(th[0], th[1], 18, 13, WHITE, LINE, ang - side * 1.1);
    }
  }
  if (C != null) for (const s of [-1, 1]) C.set_arm(s, ...arm(s, false));
  if (fac === 'r') arm(1);
  if (p.prop === 'coil_shoulder') {
    const side = fac !== 'b' ? -1 : 1, c = up([side * -10 + 10, -T * 0.5]);
    coil(pt, c, 116, 168, radians(-38 * side), D.rope, 40);
  }

  if (newg) CO.torso(C);
  else {
    const [w0, w1] = D.puffy ? [158, 150] : [128, 132];
    let tor;
    if (D.puffy) {
      const L_ = [[-w0 + 16 * k, 18], [-w0 - 6, -T * 0.14], [-w1 + 2, -T * 0.28], [-w1 - 12, -T * 0.42],
        [-w1 + 4, -T * 0.55], [-w1 - 8, -T * 0.68], [-w1 + 6, -T * 0.8], [-sh_w + 8 + 18 * k, -T + 24]];
      const R_ = [[sh_w - 8 - 26 * k, -T + 24], [w1 + 2 - 20 * k, -T * 0.8], [w1 + 12 - 20 * k, -T * 0.68],
        [w1 - 2 - 20 * k, -T * 0.55], [w1 + 14 - 20 * k, -T * 0.42], [w1 - 2 - 20 * k, -T * 0.28],
        [w0 + 6 - 22 * k, -T * 0.14], [w0 - 22 * k, 18]];
      tor = [...L_, [-60, -T - 2], [60, -T - 2], ...R_, [0, 30]];
    } else {
      tor = [[-w0 + 16 * k, 18], [-w1 - 8, -T * 0.35], [-w1 + 4, -T * 0.75], [-sh_w + 8 + 18 * k, -T + 24],
        [-60, -T - 2], [60, -T - 2], [sh_w - 8 - 26 * k, -T + 24], [w1 + 2 - 20 * k, -T * 0.75],
        [w1 + 4 - 20 * k, -T * 0.35], [w0 - 22 * k, 18], [0, 30]];
    }
    pt.blob(up(tor), D.jacket, undefined, 8);
    if (D.puffy) {
      for (const f of [0.28, 0.55, 0.8]) {
        const y = -T * f + 6, hw = f > 0.4 ? w1 - 22 : w0 - 26;
        pt.line(up([[-hw + 16 * k, y + 4], [0 + 20 * k, y + 14], [hw - 20 * k, y + 4]]), LINE * 0.6, undefined, true);
      }
    }
    let zx;
    if (!back) {
      zx = 12 + 34 * k;
      pt.line(up([[zx, -T + 6], [zx - 4, 22]]), LINE * 0.6);
    }
    if (get(D, 'harness', null) != null) {
      pt.shape(up([[-w0 + 2 + 16 * k, -18], [w0 - 2 - 22 * k, -18], [w0 - 22 * k, 16], [-w0 + 16 * k, 16]]), D.harness, LINE * 0.8);
      if (!back) pt.ell(...up([zx, 0]), 22, 20, [90, 120, 150], LINE * 0.7);
    }
  }
  if ((back && (C == null || get(D, 'pack_back', false))) || p.prop === 'pack') {
    pt.blob(up([[-84, -T + 50], [84, -T + 50], [98, -T * 0.45], [84, -T * 0.16], [-84, -T * 0.16], [-98, -T * 0.45]]), D.pack, undefined, 6);
    pt.shape(up([[-60, -T * 0.42], [60, -T * 0.42], [60, -T * 0.24], [-60, -T * 0.24]]), D.pack, LINE * 0.7);
  }
  if (C != null && back) CO.behind_body(C);
  if (!newg) {
    pt.blob(up([[-78 + 18 * k, -T + 22], [-70 + 16 * k, -T - 38], [80 + 10 * k, -T - 38], [86 + 8 * k, -T + 22],
      [8 * k, -T + 36]]), !D.puffy ? D.jacket_dk : D.jacket, undefined, 6);
  }

  const hd = radians(p.head + idle[1]), hc = add(neck, rot([0.0, -D.head_ry + 18 + p.head_dy], lean + hd)), ha = lean + hd;
  const H = pts => {
    const q = rot(pts, ha);
    return Array.isArray(q[0]) ? q.map(v => add(v, hc)) : add(q, hc);
  };
  const rx = D.head_rx, ry = D.head_ry, fsx = 34 * k;
  if (C != null) {
    C.set_head(H, hc, ha, rx, ry, fsx);
    CO.head_back(C);
  }
  const t = linspace(0, 2 * Math.PI, 72, false);
  const egg = t.map(v => [rx * Math.cos(v) * (1 + 0.06 * Math.sin(v)), ry * Math.sin(v) - 6 * Math.sin(v) ** 2 * (Math.sin(v) > 0)]);
  pt.shape(H(egg), WHITE);
  if (!back && (C == null || C.face_visible())) face(pt, H, p, fsx, rx, ry, C);
  if (C == null || ['messy', 'beanie'].includes(D.style)) {
    if (C == null || C.hair_visible()) hair(pt, H, D, k, back, rx, ry);
  }
  if (C != null) CO.head_front(C);
  if (p.sweat > 0.05 && !back) {
    const s = Math.min(p.sweat, 1.0);
    pt.blob(H([[rx * 0.95, -ry * 0.45], [rx * 0.95 + 22 * s, -ry * 0.1], [rx * 0.95, -ry * 0.0 + 10 * s],
      [rx * 0.95 - 22 * s, -ry * 0.1]]), [235, 190, 120], LINE * 0.7, 6);
  }
  if (!back) head_marks(pt, H, p, rx, ry, fsx, C);
  if (p.prop === 'coil_chest') {
    const [dx, dy, sc] = p.coil, c = up([10 * k + dx, -T * 0.42 + dy]);
    coil(pt, c, 104 * sc, 120 * sc, 0.25, D.rope, 58 * sc);
  }
  if (C != null) CO.deferred(C);
  if (fac === 'r') arm(-1);
  else { arm(-1); arm(1); }
  joints.head = hc;
  joints.hip = hip;
  return joints;
}

export function coil(pt, c, rx, ry, ang, color, width) {
  const q = ellipse_pts(c[0], c[1], rx, ry, ang, 72);
  pt.stroke([...q, ...q.slice(0, 3)], color, width, LINE * 0.9, undefined, false);
  for (const f of [-0.28, 0.0, 0.28]) {
    const r = ellipse_pts(c[0], c[1], rx + f * width, ry + f * width, ang, 72);
    pt.line([...r, ...r.slice(0, 2)], LINE * 0.35, color.map(v => Math.trunc(v * 0.72)));
  }
  for (const a of linspace(0.3, 2 * Math.PI + 0.3, 9, false)) {
    const u = [Math.cos(a), Math.sin(a)], ca = Math.cos(ang), sa = Math.sin(ang);
    const d = [ca * rx * u[0] - sa * ry * u[1], sa * rx * u[0] + ca * ry * u[1]];
    const n = div(d, hypot(d) + 1e-6), p0 = add(c, d);
    pt.line([sub(p0, mul(n, width * 0.45)), add(p0, mul(n, width * 0.45))], LINE * 0.45);
  }
}

export const XEYES = ['side', 'roll', 'mismatch', 'squeeze', 'spiral', 'stars', 'teary'];
export const STAR = [60, 205, 250], TEAR = [240, 205, 150];
export const BRIM_Y = {slouch: -50, boonie: -54, cap: -40, tophat: -56, tricorn: -44};
export function _mm_side(lx) { return lx < 0 ? -1 : 1; }
export function _clip_ell(cx, cy, rx, ry, ytop, n = 40) {
  let q = ellipse_pts(cx, cy, rx, ry, 0, n).filter(v => v[1] >= ytop);
  if (q.length < 3) return ellipse_pts(cx, cy, rx, ry, 0, n);
  q.sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
  return q;
}
export function _xeye(pt, H, eyes, s, cx, cy, lx, ly) {
  if (eyes === 'side') {
    const d = lx >= 0 ? 1 : -1, top = cy - 6;
    pt.shape(H(_clip_ell(cx, cy, 25, 19, top)), WHITE, LINE * 0.7, undefined, false);
    pt.dot(...H([[cx + d * 12, cy + 5]])[0], 10.5);
    pt.line(H([[cx - 30, top - 1 + 2 * s * d], [cx + 30, top - 1 - 2 * s * d]]), LINE * 1.1);
  } else if (eyes === 'roll') {
    const top = cy - 10;
    pt.shape(H(_clip_ell(cx, cy, 24, 20, top)), WHITE, LINE * 0.7, undefined, false);
    pt.shape(H(ellipse_pts(cx + lx * 0.3, top, 11, 11, 0, 16, 0, Math.PI)), INK, 0);
    pt.line(H([[cx - 26, top], [cx + 26, top]]), LINE * 1.0);
  } else if (eyes === 'mismatch') {
    if (s === _mm_side(lx)) {
      cy -= 10;
      pt.ell(...H([[cx + s * 4, cy]])[0], 29, 31, WHITE, LINE * 0.75, undefined, false);
      pt.dot(...H([[cx + s * 4 + lx * 0.3, cy + 2 + ly * 0.3]])[0], 9);
    } else {
      cy += 4;
      pt.dot(...H([[cx, cy + 3]])[0], 8);
      pt.line(H([[cx - 20, cy - 6], [cx + 20, cy - 4]]), LINE * 1.0);
    }
  } else if (eyes === 'squeeze') {
    pt.line(H([[cx + s * 20, cy - 17], [cx - s * 16, cy], [cx + s * 20, cy + 17]]), LINE * 1.15);
  } else if (eyes === 'spiral') {
    cy -= 2;
    const t = linspace(0, 2.15 * 2 * Math.PI, 64);
    pt.line(H(t.map(v => {
      const r = 2 + 28 * v / t[t.length - 1], a = v * s + (s > 0 ? 0.6 : 2.4);
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    })), LINE * 0.85);
  } else if (eyes === 'stars') {
    const q = range(10).map(i => {
      const a = -Math.PI / 2 + i * Math.PI / 5 + s * 0.12, rr = i % 2 === 0 ? 30 : 13;
      return [cx + rr * Math.cos(a), cy - 3 + rr * Math.sin(a)];
    });
    pt.shape(H(q), STAR, LINE * 0.7, undefined, false);
  } else if (eyes === 'teary') {
    cy -= 4;
    pt.ell(...H([[cx, cy]])[0], 24, 26, INK, 0, undefined, false);
    pt.ell(...H([[cx - 8 + lx * 0.2, cy - 9]])[0], 8.5, 9.5, WHITE, 0, undefined, false);
    pt.dot(...H([[cx + 9, cy + 9]])[0], 4.5, WHITE);
    pt.shape(H(ellipse_pts(cx, cy + 18, 28, 12, 0, 24, 0, Math.PI)), TEAR, LINE * 0.55, undefined, false);
  }
  return cy;
}

export const XMOUTHS = ['frown', 'twitch', 'jawdrop', 'teeth', 'pout'];
export const MUS_DROP = {walrus: 34, droop: 30, thin: 18, handlebar: 12};
export function _xmouth(pt, H, m, mx, my, o, lx, ry = 176) {
  if (m === 'frown') {
    const w = 44;
    const q = [[mx - w, my + 22], [mx - w * 0.62, my + 2], [mx - w * 0.22, my - 6], [mx + w * 0.2, my - 3],
      [mx + w * 0.6, my + 4], [mx + w, my + 24]];
    pt.line(H(q), LINE * 1.0, undefined, true);
  } else if (m === 'twitch') {
    const d = lx < 0 ? -1 : 1;
    pt.line(H([[mx - d * 30, my + 6], [mx - d * 4, my + 5], [mx + d * 16, my + 1], [mx + d * 30, my - 14]]), LINE * 0.95, undefined, true);
    pt.line(H([[mx + d * 40, my - 22], [mx + d * 46, my - 8]]), LINE * 0.5);
  } else if (m === 'jawdrop') {
    const h = Math.min(40 + 30 * o, (ry - 6 - my) / 1.55);
    pt.shape(H(ellipse_pts(mx, my + h * 0.55, 30, h, 0, 40)), MOUTH, LINE * 0.95);
    pt.shape(H(ellipse_pts(mx, my + h * 1.15, 19, h * 0.32, 0, 24, 0, Math.PI)), TONGUE, 0, undefined, false);
    pt.shape(H(ellipse_pts(mx, my + h * 0.55, 30, h, 0, 40)), null, LINE * 0.95);
  } else if (m === 'teeth') {
    const top = [[mx - 52, my + 6], [mx - 26, my - 12], [mx, my - 14], [mx + 26, my - 12], [mx + 52, my + 6]];
    const bot = [[mx + 52, my + 6], [mx + 26, my + 26], [mx, my + 30], [mx - 26, my + 26]];
    const q = crom([...top, ...bot], true, 8);
    pt.shape(H(q), WHITE, LINE * 0.95, undefined, false);
    pt.line(H(crom([[mx - 50, my + 7], [mx - 20, my + 9], [mx + 20, my + 9], [mx + 50, my + 7]], false, 6)), LINE * 0.55);
    for (const [x, h1, h2] of [[-34, -8, 22], [-12, -13, 28], [12, -13, 28], [34, -8, 22]]) {
      pt.line(H([[mx + x, my + h1], [mx + x, my + h2]]), LINE * 0.5);
    }
  } else if (m === 'pout') {
    pt.blob(H([[mx - 20, my + 8], [mx - 12, my - 6], [mx, my - 2], [mx + 12, my - 6], [mx + 20, my + 8],
      [mx, my + 16]]), [110, 110, 200], LINE * 0.85, 6, false);
    pt.line(H([[mx - 13, my + 5], [mx, my + 7], [mx + 13, my + 5]]), LINE * 0.5, undefined, true);
  }
}

export const PALE = [212, 190, 172], PALE_LN = [160, 128, 104], BLUSH = [150, 140, 245], VEIN = [40, 40, 210], SWEAT = [235, 190, 120];
export function _mix(a, b, u) {
  u = Math.min(Math.max(u, 0.0), 1.0);
  return a.slice(0, Math.min(a.length, b.length)).map((x, i) => Math.trunc(pyround(x + (b[i] - x) * u)));
}
export function _egg(rx, ry, n = 72) {
  return linspace(0, 2 * Math.PI, n, false).map(t => [rx * Math.cos(t) * (1 + 0.06 * Math.sin(t)),
    ry * Math.sin(t) - 6 * Math.sin(t) ** 2 * (Math.sin(t) > 0)]);
}
export function _brim(p, C) {
  if (C == null) return null;
  const lim = get(BRIM_Y, get(C, 'hw', 'none'), null);
  return lim == null ? null : lim + get(C.D, 'hat_dy', 0);
}
export function _xunder(pt, H, p, fsx, rx, ry, C) {
  const pa = Number(get(p, 'pale', 0.0));
  if (pa > 0.02) {
    const b = _brim(p, C);
    let top = b == null ? -ry * 0.82 : b - 6;
    if (C == null) top = -ry * 0.5;
    const cut = 4.0;
    let q = _egg(rx * 0.965, ry * 0.965, 96).filter(v => v[1] <= cut && v[1] >= top);
    const sortAngle = (a, b) => Math.atan2(a[1] - (top + cut) / 2, a[0]) - Math.atan2(b[1] - (top + cut) / 2, b[0]);
    q.sort(sortAngle);
    q = [...q.filter(v => v[0] > 0), [rx * 0.9, cut], [-rx * 0.9, cut], ...q.filter(v => v[0] <= 0)];
    q.sort(sortAngle);
    pt.shape(H(q), _mix(WHITE, PALE, pa), 0, undefined, false);
    const bot = top + (cut - 4 - top) * pa;
    for (const x of [-0.66, -0.4, -0.14, 0.12, 0.38, 0.64]) {
      const xx = fsx * 0.6 + x * rx;
      const lim = Math.sqrt(Math.max(0.0, 1 - (xx / (rx * 0.95)) ** 2)) * ry * 0.95;
      const t0 = Math.max(top + 4, -lim + 10);
      if (bot > t0 + 6) pt.line(H([[xx, t0], [xx, bot]]), LINE * 0.6, _mix(WHITE, PALE_LN, pa));
    }
  }
  const bl = Number(get(p, 'blush', 0.0));
  if (bl > 0.02) {
    for (const s of [-1, 1]) {
      const cx = fsx + s * 58 * (fsx && s < 0 ? 0.86 : 1.0);
      pt.ell(...H([[cx, 52]])[0], 30 * (0.6 + 0.4 * bl), 15 * (0.6 + 0.4 * bl), _mix(WHITE, BLUSH, bl), 0, undefined, false);
      for (const d of [-12, 0, 12]) pt.line(H([[cx + d - 5, 59], [cx + d + 5, 45]]), LINE * 0.35, _mix(WHITE, [90, 80, 200], bl));
    }
  }
}
export function _xmarks(pt, H, p, fsx, rx, ry) {
  const te = Number(get(p, 'tears', 0.0));
  if (te > 0.02) {
    for (const s of [-1, 1]) {
      const cx = fsx + s * 46 * (fsx && s < 0 ? 0.82 : 1.0), y0 = 30, y1 = 30 + (ry * 0.95 - 30) * te;
      const path = [[cx + s * 6, y0], [cx + s * 14, y0 + (y1 - y0) * 0.35], [cx + s * 8, y0 + (y1 - y0) * 0.7],
        [cx + s * 16, y1]];
      pt.stroke(H(path), TEAR, 10 + 8 * te, LINE * 0.5, true, false);
      if (te > 0.6) {
        pt.blob(H([[cx + s * 16, y1 + 14], [cx + s * 25, y1 + 34], [cx + s * 16, y1 + 44], [cx + s * 7, y1 + 34]]), TEAR, LINE * 0.5, 5, false);
      }
    }
  }
}
export function head_marks(pt, H, p, rx, ry, fsx, C = null) {
  const sw = Number(get(p, 'sweat', 0.0));
  for (let [side, y, u] of [[-1, -ry * 0.18, sw - 1.0], [1, ry * 0.2, sw - 2.0]]) {
    u = Math.min(u, 1.0);
    if (u > 0.05) {
      const x = side * rx * 0.98;
      pt.blob(H([[x, y - 30 * u], [x + 20 * u, y + 2], [x, y + 12 * u], [x - 20 * u, y + 2]]), SWEAT, LINE * 0.7, 6);
    }
  }
  const v = Number(get(p, 'vein', 0.0));
  if (v > 0.02) {
    let side = fsx > 0 ? -1 : 1;
    if (fsx === 0) side = 1;
    const b = _brim(p, C), cy = b == null ? -ry * 0.5 : Math.max(-ry * 0.5, b + 34);
    const cx = side * rx * 0.62 + fsx * 0.5, r = 30 * (0.5 + 0.5 * v);
    for (const a of range(4)) {
      const ang = a * Math.PI / 2 + Math.PI / 4, c = [cx + Math.cos(ang) * r * 0.75, cy + Math.sin(ang) * r * 0.75];
      const q = ellipse_pts(c[0], c[1], r * 0.62, r * 0.62, 0, 12, ang + Math.PI * 0.62, ang + Math.PI * 1.38);
      pt.stroke(H(q), VEIN, 7 + 5 * v, LINE * 0.45, false, false);
    }
  }
}

export function face(pt, H, p, fsx, rx, ry, C = null) {
  _xunder(pt, H, p, fsx, rx, ry, C);
  const [lx, ly] = p.look, ex = 46, ey = 10, [br_t, br_up] = p.brows, eyes = p.eyes;
  for (const s of [-1, 1]) {
    const cx = fsx + s * ex * (fsx && s < 0 ? 0.82 : 1.0);
    let cy = ey;
    if (['dot', 'wide', 'up'].includes(eyes)) {
      const r = eyes === 'dot' ? 15 : 19, oy = eyes === 'up' ? -14 : 0;
      pt.dot(...H([[cx + lx, cy + ly + oy]])[0], r * pt_scale(pt, H));
    } else if (eyes === 'half') {
      pt.shape(H(ellipse_pts(cx + lx, cy + 2, 14, 14, 0, 16, 0, Math.PI)), INK, 0);
      pt.line(H([[cx - 20, cy - 2], [cx + 20, cy - 2]]), LINE * 0.8);
    } else if (eyes === 'closed') {
      pt.line(H([[cx - 18, cy + 6], [cx, cy - 10], [cx + 18, cy + 6]]), LINE * 0.9, undefined, true);
    } else if (eyes === 'squint') {
      pt.line(H([[cx - 18 * s, cy - 10], [cx + 14 * s, cy], [cx - 18 * s, cy + 10]]), LINE * 0.9);
    } else if (XEYES.includes(eyes)) cy = _xeye(pt, H, eyes, s, cx, cy, lx, ly);
    let by = cy - 44 - br_up, tn = Math.tan(radians(br_t));
    if (eyes === 'mismatch') {
      const big = s === _mm_side(lx);
      by += big ? -22 : 10;
      tn = Math.tan(radians(br_t + (big ? 12 : -22)));
    }
    let inner = [cx - s * 20, by - tn * 20], outer = [cx + s * 26, by + tn * 26 + 4];
    let mid = [(inner[0] + outer[0]) / 2, (inner[1] + outer[1]) / 2 - 5];
    const bw = C != null ? get(C.D, 'brow_w', 1.0) : 1.0;
    if (XEYES.includes(eyes) && C != null) {
      const lim = get(BRIM_Y, get(C, 'hw', 'none'), null);
      if (lim != null) {
        const top = Math.min(inner[1], mid[1], outer[1]) - LINE * 0.6 * bw;
        const dy = Math.max(0.0, lim + get(C.D, 'hat_dy', 0) + 6 - top);
        [inner, mid, outer] = [inner, mid, outer].map(([x, y]) => [x, y + dy]);
      }
    }
    pt.line(H([inner, mid, outer]), LINE * 1.15 * bw, undefined, true);
    if (C != null && get(C.D, 'lashes', false) && ['dot', 'wide', 'up', 'half'].includes(eyes)) {
      const ox = cx + s * 17;
      pt.line(H([[ox, cy - 6], [ox + s * 16, cy - 18]]), LINE * 0.6);
      pt.line(H([[ox - s * 2, cy - 14], [ox + s * 8, cy - 30]]), LINE * 0.6);
    }
  }
  if (C != null) C.beard();
  const m = p.mouth, mx = fsx + 4, my = 80, o = p.mopen;
  if (m === 'smile') {
    pt.line(H([[mx - 34, my - 6], [mx, my + 12], [mx + 34, my - 6]]), LINE * 0.9, undefined, true);
  } else if (m === 'grin') {
    pt.blob(H([[mx - 46, my - 14], [mx + 46, my - 14], [mx + 30, my + 22], [mx, my + 34], [mx - 30, my + 22]]), MOUTH, LINE * 0.9, 6);
    pt.shape(H([[mx - 38, my - 13], [mx + 38, my - 13], [mx + 32, my - 1], [mx - 32, my - 1]]), WHITE, 0);
  } else if (['open', 'talk'].includes(m)) {
    pt.shape(H(ellipse_pts(mx, my + 4, 24 + 6 * o, 4 + 24 * o, 0, 32)), MOUTH, LINE * 0.9);
  } else if (m === 'shout') {
    pt.blob(H([[mx - 44, my - 18], [mx + 44, my - 18], [mx + 34, my + 30], [mx, my + 46], [mx - 34, my + 30]]), MOUTH, LINE * 0.9, 6);
    pt.shape(H(ellipse_pts(mx, my + 28, 22, 10, 0, 20)), TONGUE, 0);
  } else if (m === 'flat') {
    pt.line(H([[mx - 26, my + 4], [mx + 26, my + 4]]), LINE * 0.9);
  } else if (m === 'grit') {
    pt.shape(H([[mx - 40, my - 12], [mx + 40, my - 12], [mx + 40, my + 18], [mx - 40, my + 18]]), WHITE, LINE * 0.9);
    pt.line(H([[mx - 40, my + 3], [mx + 40, my + 3]]), LINE * 0.6);
    for (const x of [-20, 0, 20]) pt.line(H([[mx + x, my - 12], [mx + x, my + 18]]), LINE * 0.6);
  } else if (m === 'gulp') {
    pt.line(H([[mx - 26, my + 4], [mx - 13, my - 4], [mx, my + 4], [mx + 13, my - 4], [mx + 26, my + 4]]), LINE * 0.85, undefined, true);
  } else if (XMOUTHS.includes(m)) {
    const mus = C != null ? get(C.D, 'moustache', 'none') : 'none';
    _xmouth(pt, H, m, mx, my + (m === 'jawdrop' ? 0 : get(MUS_DROP, mus, 0)), o, p.look[0], ry);
  }
  if (C != null) { C.moustache(); C.glasses(); }
  _xmarks(pt, H, p, fsx, rx, ry);
}
export function pt_scale(pt, H) { return 1.0; }

export function hair(pt, H, D, k, back, rx, ry) {
  if (D.style === 'messy') {
    const sh = 22 * k;
    const outer = [[-rx - 2, 52], [-rx - 26, 18], [-rx - 26, -22], [-rx - 44, -62], [-rx - 22, -96], [-rx - 30, -146],
      [-rx + 12, -160], [-rx + 16, -214], [-52, -202], [-26, -238], [24, -214], [78, -236], [98, -196],
      [rx + 18, -190], [rx + 12, -140], [rx + 40, -110], [rx + 22, -64], [rx + 32, -22], [rx + 10, 30]];
    const inner = back ? [[rx - 4, 110], [80, 168], [20, 150], [-40, 172], [-rx + 4, 110]] :
      [[rx - 22, -6], [rx - 24, -54], [rx - 62 + sh, -74], [70 + sh, -52], [52 + sh, -96],
        [16 + sh, -64], [-14 + sh, -108], [-52 + sh, -70], [-90 + sh, -92], [-rx + 36, -56], [-rx + 24, -12], [-rx + 14, 30]];
    pt.blob(H([...outer, ...inner]), D.hair, undefined, 6);
    for (const strand of [[[-90, -186], [-74, -146], [-82, -112]], [[-12, -214], [0, -170], [-8, -130]],
      [[64, -206], [78, -166], [70, -128]], [[rx - 10, -150], [rx - 2, -112]]]) {
      if (back || strand[0][0] < 100) pt.line(H(strand.map(([x, y]) => [x + (back ? 0 : sh * 0.5), y])), LINE * 0.6, undefined, true);
    }
  } else {
    const sh = 16 * k, tuft_y = back ? 30 : -10;
    for (const s of [-1, 1]) {
      pt.blob(H([[s * (rx - 30), -70], [s * (rx + 22), -40], [s * (rx + 12), tuft_y],
        [s * (rx + 24), tuft_y + 30], [s * (rx - 10), tuft_y + 20]]), D.hair, LINE, 6);
    }
    if (back) pt.blob(H([[-rx - 4, -40], [rx + 4, -40], [rx - 6, 100], [0, 140], [-rx + 6, 100]]), D.hair, undefined, 6);
    pt.blob(H([[-rx - 14, -38], [-rx - 4, -120], [-60, -178], [40, -182], [rx + 2, -128], [rx + 14, -38], [0, -28]]), D.hat, undefined, 8);
    pt.shape(H([[-rx - 18, -62], [rx + 18, -62], [rx + 18, -24], [-rx - 18, -24]]), D.hat, LINE);
    for (const x of range(-110, 120, 30)) pt.line(H([[x, -58], [x, -28]]), LINE * 0.5);
    if (!back) {
      pt.blob(H([[-rx + 26 + sh, -22], [-40 + sh, -46], [20 + sh, -20], [rx - 30 + sh, -40], [rx - 20, -10],
        [sh, 0], [-rx + 40, -4]]), D.hair, LINE * 0.9, 5);
    }
  }
}

export const BOX = [-560, -1500, 560, 120];
export const BOX_COSTUME = [-720, -1640, 720, 140];
export const BOX_PROPS = [-1320, -2150, 1320, 170];
export const BOX_BUST = [-430, -1330, 430, 40];
export const BOX_HORSE = [-1050, -2450, 1150, 150];
export function char_box(D, p) {
  if (D.rig === 'bust') return BOX_BUST;
  if (D.rig === 'horse') return BOX_HORSE;
  if (!uses_costumes(D, p)) return BOX;
  return get(p, 'heldL', 'none') !== 'none' || get(p, 'heldR', 'none') !== 'none' ? BOX_PROPS : BOX_COSTUME;
}
