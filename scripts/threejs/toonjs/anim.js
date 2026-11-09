// anim.js - stage.py / engine.py timing maths for the browser: pose_at (keys, talk flaps, walk / horse gaits), idle,
// motion_offset, ease, cam_affine, shake_offset. Line-by-line ports; 2x3 affines are [[a,b,c],[d,e,f]].
import { blend } from './toon.js';

export function ease_back(u, s = 1.4) {
  u = Math.min(Math.max(u, 0.0), 1.0) - 1;
  return 1 + u * u * ((s + 1) * u + s);
}

/** stage.pose_at. L: { keys: [[t, pose, opts], ...], talk?: [[a, b], ...], walk?: {period, ph}, D } */
export function pose_at(L, t) {
  const keys = L.keys;
  let cur = { ...keys[0][1] };
  for (const [tk, pk, o] of keys.slice(1)) {
    if (t >= tk) cur = blend(cur, pk, ease_back((t - tk) / ((o && o.dur) || 0.18)));
  }
  if (L.talk && cur.mouth === 'talk') {
    const on = L.talk.filter(([a, b]) => a <= t && t < b);
    cur.mopen = on.length ? 0.15 + 0.85 * Math.abs(Math.sin(Math.PI * (t - on[0][0]) / Math.max(on[0][1] - on[0][0], 0.08))) : 0.1;
  }
  if (L.walk && L.D && L.D.rig === 'horse') {
    const w = L.walk;
    const st = t / (w.period ?? 1.0) + (w.ph ?? 0) / (2 * Math.PI);
    cur.stride = ((st % 1.0) + 1.0) % 1.0;
    if ((cur.gait ?? 'stand') === 'stand') cur.gait = 'walk';
  } else if (L.walk) {
    const w = L.walk;
    const s = Math.sin(2 * Math.PI * t / (w.period ?? 0.56) + (w.ph ?? 0));
    cur.lift = [Math.max(0, s) * 46, Math.max(0, -s) * 46];
    cur.hL = [-30, 230 + 30 * s];
    cur.hR = [30, 230 - 30 * s];
    cur.head = 2.5 * s;
  }
  return cur;
}

/** stage.draw_toon idle: [breathe, head sway] */
export function idle_at(L, t) {
  if (L.idle_off) return [0.0, 0.0];
  const ph = L.phase || 0.0;
  return [Math.sin(2 * Math.PI * t / 2.6 + ph), 2.0 * Math.sin(2 * Math.PI * t / 2.2 + ph)];
}

export function ease(t, kind = 'inout') {
  t = Math.min(Math.max(t, 0.0), 1.0);
  if (kind === 'linear') return t;
  if (kind === 'out') return 1 - (1 - t) ** 3;
  return 0.5 - 0.5 * Math.cos(Math.PI * t);
}
const lerp = (a, b, t) => a + (b - a) * t;

/** engine.motion_offset -> [dx, dy, extra_scale, rotation_rad]; swaps = [[t, opts], ...] */
export function motion_offset(motions, t, swaps) {
  let dx = 0, dy = 0, sc = 1, rot = 0;
  for (const m of motions || []) {
    const k = m.type;
    if (k === 'tremble') {
      const a = m.amp;
      dx += a * (Math.sin(t * 37.0) * 0.6 + Math.sin(t * 23.3 + 1) * 0.4);
      dy += a * (Math.sin(t * 31.0 + 2) * 0.6 + Math.sin(t * 19.7) * 0.4);
    } else if (k === 'bob') {
      dy -= m.amp * Math.abs(Math.sin(Math.PI * t / m.period));
    } else if (k === 'jolt' && t >= m.t) {
      const u = t - m.t;
      const env = Math.exp(-u / (m.decay ?? 0.18)) * Math.cos(u * 2 * Math.PI * (m.freq ?? 3.0));
      dx += (m.dx ?? 0) * env; dy += (m.dy ?? 0) * env;
    } else if (k === 'punch' && m.t <= t && t <= m.t + (m.dur ?? 0.25)) {
      const u = (t - m.t) / (m.dur ?? 0.25);
      sc *= 1 + m.amp * Math.sin(Math.PI * u);
    } else if (k === 'drift') {
      const u = ease(t / m.dur, m.ease ?? 'inout');
      dx += lerp(0, m.dx ?? 0, u); dy += lerp(0, m.dy ?? 0, u);
      sc *= lerp(1, m.scale ?? 1, u);
    } else if (k === 'enter') {
      const u = Math.min(Math.max((t - (m.t ?? 0)) / (m.dur ?? 0.45), 0), 1);
      const e = 1 - (1 - u) ** 3 + 0.06 * Math.sin(Math.PI * u);
      dx += (m.dx ?? 0) * (1 - e); dy += (m.dy ?? 0) * (1 - e);
    }
  }
  for (const [ts, kw] of swaps || []) {
    const u = t - ts, amp = kw.amp ?? 1.0;
    if (u >= -0.07 && u < 0) sc *= 1 - 0.03 * amp * (u + 0.07) / 0.07;
    else if (u >= 0 && u < 0.6) {
      const env = Math.exp(-u / 0.11);
      sc *= 1 + 0.035 * amp * env * Math.cos(u * 2 * Math.PI * 3.2);
      rot += (kw.deg ?? 2.5) * Math.PI / 180 * amp * env * Math.sin(u * 2 * Math.PI * 2.6);
    }
  }
  return [dx, dy, sc, rot];
}

/** engine.cam_affine: screen = focus + z (p - focus) - pan, scaled by layer depth */
export function cam_affine(cam, depth, tn, W = 1920, H = 1080) {
  const e = ease(tn, cam.ease ?? 'inout');
  const z = 1 + (lerp(cam.z0 ?? 1, cam.z1 ?? 1, e) - 1) * depth;
  const px = lerp(cam.x0 ?? 0, cam.x1 ?? 0, e) * depth, py = lerp(cam.y0 ?? 0, cam.y1 ?? 0, e) * depth;
  const [fx, fy] = cam.focus ?? [W / 2, H / 2];
  return [[z, 0, fx - z * fx - px], [0, z, fy - z * fy - py]];
}

export function shake_offset(shakes, t) {
  let dx = 0, dy = 0;
  for (const s of shakes || []) {
    if (t >= s.t) {
      const u = t - s.t, env = Math.exp(-u / (s.decay ?? 0.25));
      dx += s.amp * env * Math.sin(u * 61); dy += s.amp * env * Math.cos(u * 53);
    }
  }
  return [dx, dy];
}
