// Horse and mounted rider rig, translated from production/horse.py. Colours are BGR.
import * as TN from './toon.js';
import * as CO from './costumes.js';
import { get, add, sub, mul, div, hypot, mid, lerp, rot, linspace, radians, mod, compose, apply, copy } from './np.js';
import { LINE, WHITE, INK } from './painter.js';

export const SADDLE = [34, 48, 70];
export const BLANKET = [104, 52, 34];
export const BLANKET_TRIM = [40, 170, 226];
export const ROLL = [120, 80, 60];
export const BRIDLE = [30, 40, 58];
export const HOOF = [54, 56, 62];
export const METAL = [170, 176, 184];
export const HS = 1.2;
export const BOX = [-1050, -2450, 1150, 150];

export function design(rider = null, coat = [40, 72, 140], mane = [38, 34, 36], socks = [0, 0, 0, 0], blaze = false,
  saddle = true, blanket = BLANKET, name = 'horse', kw = {}) {
  const d = {
    name, rig: 'horse', coat: [...coat], coat_dk: coat.map((v) => Math.trunc(v * 0.74)), mane: [...mane],
    points: null, socks: [...socks], blaze, dorsal: null, hoof: HOOF, saddle,
    saddle_col: SADDLE, blanket: blanket && blanket.length ? [...blanket] : null, blanket_trim: BLANKET_TRIM, roll: true,
    bridle: BRIDLE, rider,
    jacket: coat, jacket_dk: coat, trousers: coat, boots: HOOF, hair: mane, hair_dk: mane, rope: [32, 132, 240],
    leg_u: 135, leg_l: 130, torso: 270, head_rx: 150, head_ry: 176, style: 'none', ...kw,
  };
  if (!Object.prototype.hasOwnProperty.call(kw, 'coat_dk')) d.coat_dk = d.coat.map((v) => Math.trunc(v * 0.74));
  return d;
}

export const BAY = design(null, [42, 74, 138], [36, 32, 34], undefined, undefined, undefined, undefined, 'bay', { points: [44, 40, 44] });
export const SORREL = design(null, [52, 104, 196], [44, 92, 178], [1, 1, 1, 1], true, undefined, undefined, 'sorrel');
export const BLACK = design(null, [66, 58, 56], [40, 34, 34], undefined, undefined, undefined, undefined, 'black', { coat_dk: [50, 44, 42] });
export const GREY = design(null, [198, 200, 200], [150, 152, 156], undefined, undefined, undefined, undefined, 'grey', { hoof: [90, 94, 100] });
export const DUN = design(null, [112, 170, 206], [40, 48, 60], undefined, undefined, undefined, undefined, 'dun', { points: [50, 58, 70], dorsal: [50, 60, 78] });
export const PRESETS = { bay: BAY, sorrel: SORREL, black: BLACK, grey: GREY, dun: DUN };

export function mounted(rider_design, horse_preset = BAY, kw = {}) {
  return { ...horse_preset, rider: rider_design,
    name: `${get(rider_design, 'name', 'rider')}_on_${get(horse_preset, 'name', 'horse')}`, ...kw };
}

export function _P(base, kw) { return TN.pose({ gait: 'stand', ...base, ...kw }); }
export const REINS_L = [175, 150], REINS_R = [150, 165];
export function ride(kw = {}) {
  return _P({ facing: 'r', hL: REINS_L, hR: REINS_R, handL: 'fist', handR: 'fist', mouth: 'flat' }, kw);
}
export function ride_point(kw = {}) {
  return _P({ facing: 'r', hL: [300, -40], handL: 'point', hR: REINS_R, handR: 'fist', mouth: 'talk', brows: [-8, 2] }, kw);
}
export function ride_salute(kw = {}) {
  return _P({ facing: 'r', hL: [72, -258], handL: 'open', hR: REINS_R, handR: 'fist', mouth: 'flat', brows: [-6, 0] }, kw);
}
export function ride_wave_hat(kw = {}) {
  return _P({ facing: 'r', hL: [-60, -300], handL: 'fist', hR: REINS_R, handR: 'fist', mouth: 'grin', eyes: 'closed', brows: [10, 10], hat_off: 1 }, kw);
}
export function ride_shade_eyes(kw = {}) {
  return _P({ facing: 'r', hL: [118, -150], handL: 'open', hR: REINS_R, handR: 'fist', look: [8, -4], mouth: 'flat', head_dy: -12 }, kw);
}
export function ride_charge(kw = {}) {
  return _P({ facing: 'r', lean: 16, hL: [-30, -268], handL: 'fist', heldL: 'sword', rotL: 70, hR: REINS_R, handR: 'fist',
    eyes: 'wide', mouth: 'shout', brows: [-18, 4], gait: 'gallop' }, kw);
}
export function ride_look_back(kw = {}) {
  return _P({ facing: 'f', hL: [60, 200], hR: [-40, 200], handL: 'fist', handR: 'fist', look: [-12, 0], head: -8, mouth: 'gulp', brows: [18, 6] }, kw);
}
export const RIDER_POSES = { ride, ride_point, ride_salute, ride_wave_hat, ride_shade_eyes, ride_charge, ride_look_back };

export const GAITS = {
  stand: { off: [0, 0, 0, 0], duty: 1, sweep: 0, lift: [0, 0], bob: 0, nb: 2, pitch: 0, nod: 0, stream: 0, reach: 0 },
  walk: { off: [0.75, 0.5, 0.25, 0], duty: 0.62, sweep: 190, lift: [70, 55], bob: 7, nb: 2, pitch: 0.8, nod: 4, stream: 0.12, reach: 0 },
  trot: { off: [0, 0.5, 0.5, 0], duty: 0.45, sweep: 230, lift: [105, 80], bob: 14, nb: 2, pitch: 1, nod: 3, stream: 0.35, reach: 20 },
  gallop: { off: [0.62, 0.10, 0.52, 0], duty: 0.36, sweep: 300, lift: [150, 120], bob: 26, nb: 1, pitch: 5, nod: 9, stream: 1, reach: 110 },
};
export const REST_X = [232, -206, 204, -236];
export const ROOTS = [[214, -478], [-208, -492], [188, -482], [-234, -498]];
export const BODY_C = [0, -560];
export function _smooth(v) { return v * v * (3 - 2 * v); }

export function hoof_path(u, g, fore) {
  const G = GAITS[g], duty = G.duty, sw = G.sweep, lift = G.lift[fore ? 0 : 1];
  u = mod(u, 1);
  if (duty >= 1) return [0, 0, 0];
  if (u < duty) { const s = u / duty; return [sw / 2 - sw * s, 0, 0]; }
  const v = (u - duty) / (1 - duty), reach = G.reach;
  let x, y, curl;
  if (fore) {
    x = -sw / 2 + (sw + reach) * _smooth(v) - reach * Math.max(0, (v - 0.8) / 0.2) ** 2 * 0;
    y = lift * Math.sin(Math.PI * v) ** 0.8;
    curl = Math.sin(Math.PI * Math.min(1, v * 1.25)) ** 1.2;
  } else {
    const kick = v < 0.35 ? reach * 0.5 * Math.sin(Math.PI * Math.min(1, v / 0.35)) : 0;
    x = -sw / 2 - kick + (sw + reach * 0.3) * _smooth(v);
    y = lift * Math.sin(Math.PI * v);
    curl = 0.7 * Math.sin(Math.PI * v);
  }
  if (v > 0.85) x += ((sw / 2) - x) * ((v - 0.85) / 0.15);
  return [x, y, curl];
}

export function body_motion(g, u, idle = [0, 0]) {
  const G = GAITS[g];
  if (g === 'stand') return [0, 0, 1.5 * idle[0] + 0.6 * idle[1]];
  const a = 2 * Math.PI * u;
  if (g === 'gallop') return [G.bob * Math.sin(a - 0.6), G.pitch * Math.sin(a + 0.9), G.nod * Math.sin(a + 1.6)];
  return [G.bob * Math.sin(G.nb * a), G.pitch * Math.sin(a), G.nod * Math.sin(G.nb * a + 1)];
}

export function _dk(c, f = 0.74) { return c.map((v) => Math.trunc(v * f)); }
export function _limb_poly(pts, ws) {
  const p = pts.map((v) => v.map(Number)), n = p.length, nr = [];
  for (let i = 0; i < n; i++) {
    let d = sub(p[Math.min(i + 1, n - 1)], p[Math.max(i - 1, 0)]);
    d = div(d, hypot(d) + 1e-9);
    nr.push([-d[1], d[0]]);
  }
  return [...p.map((v, i) => add(v, mul(nr[i], ws[i] / 2))), ...p.map((v, i) => sub(v, mul(nr[i], ws[i] / 2))).reverse()];
}
export function _seg_point(a, b, f) { return add(a, mul(sub(b, a), f)); }

export function draw_leg(pt, D, root, hx, lift, curl, fore, near) {
  const coat = near ? D.coat : D.coat_dk;
  let pts_col = get(D, 'points', null) || D.coat;
  if (!near) pts_col = get(D, 'points', null) ? _dk(pts_col, 0.8) : D.coat_dk;
  const idx = (fore ? 0 : 1) + (near ? 0 : 2), sock = Number(get(D, 'socks', [0, 0, 0, 0])[idx]);
  let [l1, l2] = fore ? [215, 205] : [232, 218];
  const fet_h = 80, w = Math.min(1, lift / 40);
  let fet = [hx - 20 + 20 * w, -fet_h - lift];
  const reach = hypot(sub(fet, root));
  if (reach > (l1 + l2) * 0.995) {
    const st = Math.min(reach / ((l1 + l2) * 0.995), 1.12);
    l1 *= st; l2 *= st;
  }
  const solved = TN.ik2(root, fet, l1, l2, fore ? -1 : 1), joint = solved[0];
  fet = solved[1];
  const cd = sub(fet, joint), tilt = Math.atan2(cd[0], cd[1]);
  const ang = w * (-tilt * 0.6) + curl * (fore ? 1.9 : 1);
  const loc_pas = [[0, 0], [18, 40]], hoof = [[2, 34], [44, 34], [56, 80], [-6, 80]];
  const R = (q) => rot(q, ang).map((v) => add(v, fet));
  const pas = R(loc_pas), top_w = fore ? 92 : 104;
  const centre = [add(root, [0, -30]), root, _seg_point(root, joint, 0.55), joint, _seg_point(joint, fet, 0.5), fet, pas[1]];
  const widths = [top_w + 10, top_w, top_w * 0.72, fore ? 56 : 62, 44, 54, 42];
  pt.blob(_limb_poly(centre, widths), coat, LINE, 4);
  if (get(D, 'points', null)) {
    const c2 = [_seg_point(joint, fet, -0.05), _seg_point(joint, fet, 0.5), fet, pas[1]];
    pt.blob(_limb_poly(c2, [fore ? 58 : 64, 44, 54, 42]), pts_col, LINE * 0.7, 4, false);
  }
  if (sock > 0.02) {
    const f0 = 1 - Math.min(sock, 1) * 0.95;
    const c3 = [_seg_point(joint, fet, f0), _seg_point(joint, fet, (1 + f0) / 2), fet, pas[1]];
    const wcol = near ? WHITE : [205, 205, 210];
    pt.blob(_limb_poly(c3, [47, 45, 54, 42]), wcol, LINE * 0.7, 4, false);
  }
  const hcol = get(D, 'hoof', HOOF);
  pt.shape(R(hoof), near ? hcol : _dk(hcol, 0.8), LINE * 0.9, true, false);
  return [joint, fet, R(hoof)];
}

export function tail_pts(stream, swish, flutter) {
  const hang = [[-336, -664], [-392, -628], [-418, -548], [-420, -460], [-408, -372], [-392, -306]];
  const fly = [[-336, -664], [-420, -680], [-506, -672], [-590, -650], [-668, -622], [-736, -600]];
  const c = hang.map((v, i) => add(mul(v, 1 - stream), mul(fly[i], stream)));
  return c.map((v, i) => {
    const k = i / (c.length - 1);
    return [v[0] + swish * 60 * k ** 1.5, v[1] + flutter * 26 * Math.sin(k * 4) * k];
  });
}
export function neck_pts() {
  return [[120, -712], [200, -762], [290, -842], [372, -926], [426, -934], [456, -876], [430, -806],
    [390, -720], [352, -630], [320, -560], [220, -600]];
}
export function head_pts() {
  return [[388, -952], [452, -950], [520, -900], [584, -836], [636, -790], [650, -752], [618, -722],
    [566, -726], [500, -760], [448, -790], [412, -830], [384, -890]];
}
export const BODY = [[318, -612], [310, -520], [250, -458], [120, -436], [-20, -430], [-160, -446], [-262, -486], [-330, -548],
  [-366, -622], [-340, -686], [-260, -716], [-150, -700], [-40, -684], [60, -700], [150, -728]];
export const NECK_PIVOT = [250, -640];
export const SEAT = [-30, -738];

export function draw(pt, D, p, idle = [0, 0]) {
  let g = get(p, 'gait', 'stand');
  if (!Object.prototype.hasOwnProperty.call(GAITS, g)) g = 'stand';
  const u = mod(Number(get(p, 'stride', 0)), 1), G = GAITS[g];
  const A0 = copy(pt.A);
  pt.A = A0.map((r) => [r[0] * HS, r[1] * HS, r[2]]);
  const [bob, pitch, nod] = body_motion(g, u, idle), pr = radians(pitch);
  const BT = (pts) => rot(pts, pr, BODY_C).map((v) => add(v, [0, bob]));
  const na = radians(nod - get(p, 'hneck', 0));
  const NT = (pts) => BT(rot(pts, na, NECK_PIVOT));
  const joints = {}, coat = D.coat, cdk = D.coat_dk, mane = D.mane;
  const t_swish = g === 'stand' ? 0.35 * idle[0] + 0.25 * Math.sin(idle[1]) : 0.15 * Math.sin(2 * Math.PI * u);
  const flut = g !== 'stand' ? Math.sin(2 * Math.PI * u * (g === 'gallop' ? 2 : 1) + 0.5) : 0.3 * idle[0];
  const tc = tail_pts(G.stream, t_swish, flut);
  const k = linspace(0, 1, tc.length);
  const tw = k.map((v) => 52 + 70 * Math.sin(Math.PI * Math.min(Math.max(v * 0.9, 0), 1)) ** 0.7);
  tw[tw.length - 1] = 34;
  pt.blob(BT(_limb_poly(tc, tw)), mane, LINE, 5);
  for (const o of [-0.22, 0.18]) {
    const sp = tc.slice(1, -1).map((v) => add(add(v, [0, o * 40 * (1 - G.stream)]),
      mul([o * 40 * G.stream * 0 + o * 50 * (1 - G.stream), 0], 0)));
    pt.line(BT(sp.map((v) => add(v, [o * 30, o * 22]))), LINE * 0.45, _dk(mane, 0.7), true);
  }
  const hooves = {};
  for (const idx of [2, 3, 0, 1]) {
    const fore = idx === 0 || idx === 2, near = idx < 2;
    const [dx, lift, curl] = hoof_path(u + G.off[idx], g, fore);
    const root = BT([ROOTS[idx]])[0], hx = REST_X[idx] + dx;
    const [, , hpoly] = draw_leg(pt, D, root, hx, lift, curl, fore, near);
    hooves[idx] = hpoly;
  }
  pt.blob(BT(BODY), coat, LINE, 8);
  pt.line(BT([[-250, -640], [-290, -560], [-268, -500]]), LINE * 0.5, cdk, true);
  pt.line(BT([[250, -560], [232, -500]]), LINE * 0.5, cdk);
  if (get(D, 'dorsal', null)) pt.line(BT([[130, -722], [-40, -688], [-150, -704], [-260, -712]]), LINE * 1.3, D.dorsal, true);
  pt.blob(NT(neck_pts()), coat, LINE, 6);
  _mane(pt, NT, mane, G.stream, u, g, idle);
  pt.blob(NT(head_pts()), coat, LINE, 6);
  _head_details(pt, NT, D, p);
  joints.horse_head = NT([[470, -880]])[0];
  joints.muzzle = NT([[600, -752]])[0];
  const bit = NT([[586, -748]])[0];
  if (get(D, 'saddle', true)) _saddle(pt, BT, D, get(D, 'rider', null) != null);
  joints.saddle = BT([SEAT])[0];
  let rein_hand = null;
  if (get(D, 'rider', null) != null) rein_hand = _rider(pt, D, p, pr, bob, g, idle, bit, joints);
  if (rein_hand == null && get(D, 'saddle', true)) {
    pt.line([bit, NT([[380, -800]])[0], BT([[120, -760]])[0]], LINE * 0.6, D.bridle, true);
  }
  if (!Object.prototype.hasOwnProperty.call(joints, 'head')) joints.head = joints.horse_head;
  if (!Object.prototype.hasOwnProperty.call(joints, 'hip')) joints.hip = BT([SEAT])[0];
  if (!Object.prototype.hasOwnProperty.call(joints, 'handL')) joints.handL = BT([[120, -760]])[0];
  if (!Object.prototype.hasOwnProperty.call(joints, 'handR')) joints.handR = BT([[120, -760]])[0];
  joints.footL = [hooves[0].reduce((s, v) => s + v[0], 0) / hooves[0].length, 0];
  joints.footR = [hooves[1].reduce((s, v) => s + v[0], 0) / hooves[1].length, 0];
  pt.A = A0;
  return Object.fromEntries(Object.entries(joints).map(([key, v]) => [key, mul(v, HS)]));
}

export function _mane(pt, NT, col, stream, u, g, idle) {
  const crest = [[400, -940], [372, -918], [330, -872], [284, -826], [236, -782], [186, -746], [140, -722]];
  const n = crest.length, outer = [];
  for (const [i, c] of crest.entries()) {
    const ph = 2 * Math.PI * (u * (g === 'gallop' ? 2 : 1)) - i * 0.9;
    const fl = g !== 'stand' ? Math.sin(ph) * (8 + 22 * stream) : 4 * idle[0];
    outer.push(add(c, [-30 - 52 * stream + fl * 0.6, -22 + 12 * stream + fl * 0.4]));
  }
  const poly = [add(crest[0], [14, 4])];
  for (let i = 0; i < n; i++) {
    poly.push(outer[i]);
    if (i < n - 1) poly.push(add(mid(crest[i], crest[i + 1]), [-14 - 30 * stream, -8 + 6 * stream]));
  }
  poly.push(add(crest[n - 1], [10, 14]), ...crest.slice().reverse().slice(1, -1).map((v) => add(v, [16, 18])));
  pt.blob(NT(poly), col, LINE * 0.9, 4);
  pt.blob(NT([[398, -948], [430, -934], [446, -900], [420, -906], [404, -922]]), col, LINE * 0.8, 4, false);
}

export function _head_details(pt, NT, D, p) {
  const coat = D.coat, cdk = D.coat_dk;
  pt.blob(NT([[388, -950], [398, -1030], [420, -1000], [418, -946]]), cdk, LINE * 0.9, 4, false);
  pt.blob(NT([[406, -946], [430, -1040], [450, -1006], [444, -944]]), coat, LINE * 0.9, 4, false);
  pt.line(NT([[426, -956], [434, -1006]]), LINE * 0.5, cdk);
  if (get(D, 'blaze', null)) {
    pt.blob(NT([[452, -946], [474, -938], [560, -846], [622, -786], [630, -758], [606, -760], [546, -826],
      [470, -910]]), WHITE, LINE * 0.6, 4, false);
  }
  pt.dot(...NT([[478, -880]])[0], 15);
  pt.line(NT([[462, -900], [480, -906], [496, -898]]), LINE * 0.6, null, true);
  pt.ell(...NT([[618, -778]])[0], 13, 9, _dk(coat, 0.45), LINE * 0.45, 0.6, false);
  pt.line(NT([[648, -746], [604, -738]]), LINE * 0.6);
  pt.line(NT([[454, -790], [480, -812], [520, -812]]), LINE * 0.5, cdk, true);
  const br = get(D, 'bridle', BRIDLE);
  pt.line(NT([[420, -944], [430, -880], [446, -820], [470, -786]]), LINE * 0.9, br);
  pt.line(NT([[436, -926], [468, -930]]), LINE * 0.8, br);
  pt.line(NT([[534, -846], [566, -770], [520, -756]]), LINE * 0.8, br);
  pt.line(NT([[446, -820], [586, -748]]), LINE * 0.7, br);
  pt.ell(...NT([[588, -748]])[0], 14, 14, null, LINE * 0.7, 0, false);
}

export function _saddle(pt, BT, D, rider) {
  const bl = get(D, 'blanket', null);
  if (bl != null) {
    pt.blob(BT([[-170, -720], [90, -730], [110, -620], [96, -520], [-150, -516], [-176, -620]]), bl, LINE, 4);
    pt.line(BT([[-150, -700], [-158, -620], [-136, -540], [76, -540], [90, -620], [74, -706]]), LINE * 1, get(D, 'blanket_trim', BLANKET_TRIM));
  }
  const sc = get(D, 'saddle_col', SADDLE);
  if (get(D, 'roll', true)) {
    pt.blob(BT([[-190, -780], [-120, -790], [-108, -748], [-122, -712], [-196, -706], [-210, -744]]), ROLL, LINE * 0.9, 5);
    pt.line(BT([[-160, -790], [-160, -708]]), LINE * 0.6, sc);
  }
  pt.blob(BT([[-118, -800], [-92, -806], [-70, -744], [20, -728], [64, -748], [74, -790], [100, -790],
    [100, -716], [60, -690], [-60, -690], [-112, -716]]), sc, LINE, 5);
  pt.blob(BT([[-110, -716], [90, -716], [84, -610], [-96, -606]]), _dk(sc, 1.25), LINE * 0.9, 4);
  pt.line(BT([[-80, -690], [60, -690]]), LINE * 0.5, _dk(sc, 0.6));
  pt.shape(BT([[40, -610], [78, -610], [92, -436], [58, -436]]), _dk(sc, 1.25), LINE * 0.8, true, false);
  if (!rider) {
    pt.line(BT([[-6, -700], [-4, -480]]), LINE * 1.3, sc);
    pt.blob(BT([[-46, -500], [36, -500], [44, -446], [-50, -446]]), sc, LINE * 0.9, 4, false);
  }
}

export function _affine(pr, bob, origin, rs = 1) {
  const c = Math.cos(pr), s = Math.sin(pr), Rm = [[c * rs, -s * rs], [s * rs, c * rs]];
  const v = sub(origin, BODY_C);
  const t = add(add([Rm[0][0] * v[0] + Rm[0][1] * v[1], Rm[1][0] * v[0] + Rm[1][1] * v[1]], BODY_C), [0, bob]);
  return [[...Rm[0], t[0]], [...Rm[1], t[1]]];
}

export function _rider(pt, D, p, pr, bob, g, idle, bit, joints) {
  const R = { ...D.rider }, hat_off = get(p, 'hat_off', 0) >= 0.5, hat_col = get(R, 'hat', null);
  if (hat_off) R.headwear = 'none';
  const rp = { ...p, feet: [0, 0], lift: [0, 0], hip: [0, 0] };
  if (g === 'gallop') rp.lean = p.lean + 6;
  const leg_rest = R.leg_u + R.leg_l, hip_y = -(72 + leg_rest * 0.96);
  const rise = g === 'gallop' ? -0.45 * bob : -0.3 * bob;
  const origin = add(sub(SEAT, [0, hip_y / HS]), [0, rise]);
  const M = _affine(pr, bob, origin, 1 / HS), A0 = copy(pt.A);
  pt.A = compose(A0, M);
  const cut = [[-420, hip_y + 26], [460, hip_y + 26], [460, 120], [-420, 120]];
  const snap = pt.snapshot();
  const rj = TN.draw_character(pt, R, rp, idle);
  pt.restoreInside(snap, cut);
  const hj = [14, hip_y + 6], ank_t = [hj[0] + 34, hj[1] + 0.8 * leg_rest];
  const [knee, ank] = TN.ik2(hj, ank_t, R.leg_u, R.leg_l, -1);
  const sc = get(D, 'saddle_col', SADDLE);
  if (get(D, 'saddle', true)) pt.line([[hj[0] - 30, hj[1] + 40], [ank[0] - 6, ank[1] + 40]], LINE * 1.3, sc);
  if (TN.uses_costumes(R, rp)) {
    const C = new CO.Ctx(pt, R, rp, 1, 'r', R.torso, [0, hip_y], 0, (v) => [...v], 118, {});
    C.legs[-1] = [hj, knee, ank];
    CO.leg(C, -1, hj, knee, ank);
  } else {
    pt.stroke([hj, knee, ank], R.trousers, 96, LINE);
    const bx = ank[0], by = ank[1] + 28;
    pt.blob([[bx - 52, by - 42], [bx + 70, by - 34], [bx + 124, by + 4], [bx + 118, by + 36], [bx - 58, by + 36],
      [bx - 62, by - 4]], R.boots, LINE, 6);
  }
  if (get(D, 'saddle', true)) {
    const bx = ank[0], by = ank[1] + 28;
    pt.shape([[bx + 2, by + 34], [bx + 78, by + 34], [bx + 72, by + 52], [bx + 8, by + 52]], METAL, LINE * 0.7, true, false);
  }
  if (hat_off && hat_col != null) {
    const hc = add(rj.handL, [0, -50]), brim = get(R, 'brim', 100) * 1.2;
    pt.ell(hc[0], hc[1] + 10, brim, 30, hat_col, LINE * 0.9, -0.25);
    pt.blob([add(hc, [-70, 6]), add(hc, [-60, -70]), add(hc, [0, -96]), add(hc, [60, -70]), add(hc, [70, 4])], hat_col, LINE, 5);
    pt.line([add(hc, [-66, -4]), add(hc, [66, -18])], LINE * 1.4, get(R, 'hat2', INK));
  }
  pt.A = A0;
  const toC = (v) => apply(M, v);
  for (const k of ['head', 'handL', 'handR']) if (Object.prototype.hasOwnProperty.call(rj, k)) joints[k] = toC(rj[k]);
  joints.hip = toC([0, hip_y]);
  let rein = null;
  const br = get(D, 'bridle', BRIDLE);
  for (const [hk, tk] of [['handR', 'hR'], ['handL', 'hL']]) {
    const tgt = p[tk];
    if (tgt[1] > 60 && tgt[0] > 40 && p.facing === 'r') {
      const h = joints[hk], m = add(mid(h, bit), [0, 40 + (g === 'stand' ? 0 : 10)]);
      pt.line([h, m, bit], LINE * 0.6, br, true);
      rein = h;
    }
  }
  if (rein == null && p.facing !== 'r') {
    for (const hk of ['handL', 'handR']) {
      const h = joints[hk];
      pt.line([h, add(mid(h, bit), [0, 50]), bit], LINE * 0.6, br, true);
      rein = h;
    }
  }
  return rein != null ? rein : bit;
}
