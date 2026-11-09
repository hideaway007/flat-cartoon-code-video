// np.js - the small numpy / Python subset the character code needs, plus the shared geometry helpers of toon.py
// (crom, ellipse_pts, rot, ik2) ported line by line. Points are [x, y] arrays; point lists are arrays of points.
// CONVENTIONS for every translated module (see README.md):
//   - Python tuples / np arrays of 2 -> [x, y];  lists of points -> [[x, y], ...]
//   - colours stay BGR arrays [b, g, r] (painter.js converts) - never reorder them in translated code
//   - dict.get(k, d) -> get(D, 'k', d)   (NOT `D.k ?? d`: a stored null/0/false must be kept like Python does)
//   - round() / np.round -> pyround (half to even);  int(x) -> Math.trunc;  a // b -> Math.floor(a / b)
//   - point maths: add(a, b), sub(a, b), mul(a, s), or the V(...) helpers below; never mutate shared points
export const PI = Math.PI;

// ------------------------------------------------------------------------------------------------ python bits
export function get(d, k, def) { return d != null && Object.prototype.hasOwnProperty.call(d, k) ? d[k] : def; }
export function pyround(x, nd = 0) {
  const m = 10 ** nd, v = x * m, f = Math.floor(v), r = v - f;
  let o;
  if (Math.abs(r - 0.5) < 1e-9) o = f % 2 === 0 ? f : f + 1; else o = Math.round(v);
  return o / m;
}
export const clamp = (x, a, b) => Math.min(Math.max(x, a), b);
export const radians = (d) => d * PI / 180;
export const degrees = (r) => r * 180 / PI;
export function range(a, b, step = 1) {
  if (b === undefined) { b = a; a = 0; }
  const o = []; for (let i = a; step > 0 ? i < b : i > b; i += step) o.push(i); return o;
}
export const copy = (d) => (Array.isArray(d) ? d.map((v) => (Array.isArray(v) ? copy(v) : v)) : { ...d });

// ------------------------------------------------------------------------------------------------ vectors
export const P2 = (p) => [Number(p[0]), Number(p[1])];
export const add = (a, b) => (typeof b === 'number' ? [a[0] + b, a[1] + b] : [a[0] + b[0], a[1] + b[1]]);
export const sub = (a, b) => (typeof b === 'number' ? [a[0] - b, a[1] - b] : [a[0] - b[0], a[1] - b[1]]);
export const mul = (a, s) => (typeof s === 'number' ? [a[0] * s, a[1] * s] : [a[0] * s[0], a[1] * s[1]]);
export const div = (a, s) => (typeof s === 'number' ? [a[0] / s, a[1] / s] : [a[0] / s[0], a[1] / s[1]]);
export const neg = (a) => [-a[0], -a[1]];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
export const hypot = (a, b) => (b === undefined ? Math.hypot(a[0], a[1]) : Math.hypot(a, b));
export const norm = hypot;
export const lerp = (a, b, t) => (typeof a === 'number' ? a + (b - a) * t : [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
export const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
// apply a function to every point of a list (np broadcasting of "pts + (dx, dy)" etc.)
export const addAll = (pts, v) => pts.map((p) => add(p, v));
export const mulAll = (pts, s) => pts.map((p) => mul(p, s));
export const mapPts = (pts, f) => pts.map(f);
export const minXY = (pts) => [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1]))];
export const maxXY = (pts) => [Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];

// ------------------------------------------------------------------------------------------------ numpy 1-D
export function linspace(a, b, n, endpoint = true) {
  if (n <= 0) return [];
  if (n === 1) return [a];
  const d = endpoint ? (b - a) / (n - 1) : (b - a) / n;
  const o = []; for (let i = 0; i < n; i++) o.push(a + d * i);
  if (endpoint) o[n - 1] = b;
  return o;
}
export function arange(a, b, step = 1) {
  if (b === undefined) { b = a; a = 0; }
  const n = Math.max(Math.ceil((b - a) / step), 0), o = [];
  for (let i = 0; i < n; i++) o.push(a + i * step);
  return o;
}
// np.interp(x, xp, fp) for a scalar or an array x (xp increasing)
export function interp(x, xp, fp) {
  const one = (v) => {
    if (v <= xp[0]) return fp[0];
    if (v >= xp[xp.length - 1]) return fp[fp.length - 1];
    let i = 1; while (xp[i] < v) i++;
    const t = (v - xp[i - 1]) / (xp[i] - xp[i - 1]);
    return fp[i - 1] + (fp[i] - fp[i - 1]) * t;
  };
  return Array.isArray(x) ? x.map(one) : one(x);
}
export function cumsum(a) { let s = 0; return a.map((v) => (s += v)); }
export function diff(a) { const o = []; for (let i = 1; i < a.length; i++) o.push(a[i] - a[i - 1]); return o; }
export function roll(a, k) { const n = a.length; return a.map((_, i) => a[(((i - k) % n) + n) % n]); }

// ------------------------------------------------------------------------------------------------ 2x3 affine
// A = [[a, b, c], [d, e, f]] maps p -> [a x + b y + c, d x + e y + f]
export const apply = (A, p) => [A[0][0] * p[0] + A[0][1] * p[1] + A[0][2], A[1][0] * p[0] + A[1][1] * p[1] + A[1][2]];
export const applyAll = (A, pts) => pts.map((p) => apply(A, p));
export const det2 = (A) => A[0][0] * A[1][1] - A[0][1] * A[1][0];
// compose: (A after B) as 2x3
export const compose = (A, B) => [
  [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1], A[0][0] * B[0][2] + A[0][1] * B[1][2] + A[0][2]],
  [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1], A[1][0] * B[0][2] + A[1][1] * B[1][2] + A[1][2]],
];

// ------------------------------------------------------------------------------------------------ toon.py geometry
// Catmull-Rom spline through pts -> dense polyline (toon.crom)
export function crom(pts, closed = true, n = 10) {
  const p = pts.map(P2), m = p.length, out = [];
  const nrange = closed ? m : m - 1;
  for (let i = 0; i < nrange; i++) {
    const p0 = closed || i > 0 ? p[((i - 1) % m + m) % m] : p[0], p1 = p[i];
    const p2 = p[(i + 1) % m];
    const p3 = closed || i + 2 < m ? p[(i + 2) % m] : p[m - 1];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2
        + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  if (!closed) out.push(p[m - 1]);
  return out;
}

// toon.ellipse_pts
export function ellipse_pts(cx, cy, rx, ry, ang = 0.0, n = 48, a0 = 0.0, a1 = 2 * PI) {
  const t = linspace(a0, a1, n, (a1 - a0) < 2 * PI - 1e-6);
  const c = Math.cos(ang), s = Math.sin(ang);
  return t.map((u) => { const x = rx * Math.cos(u), y = ry * Math.sin(u); return [cx + c * x - s * y, cy + s * x + c * y]; });
}

// toon.rot: a point or a list of points, rotated by ang about `about`
export function rot(p, ang, about = [0, 0]) {
  const c = Math.cos(ang), s = Math.sin(ang);
  const one = (q) => { const x = q[0] - about[0], y = q[1] - about[1]; return [c * x - s * y + about[0], s * x + c * y + about[1]]; };
  return Array.isArray(p[0]) ? p.map(one) : one(p);
}

// toon.ik2: 2-bone IK -> [joint, end]
export function ik2(root, target, l1, l2, bend) {
  const d = sub(target, root);
  let dist = hypot(d);
  dist = Math.min(Math.max(dist, Math.abs(l1 - l2) + 1e-3), (l1 + l2) * 0.999);
  const a = Math.atan2(d[1], d[0]);
  const cosA = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist);
  const al = Math.acos(Math.max(-1, Math.min(1, cosA)));
  const joint = add(root, [l1 * Math.cos(a + bend * al), l1 * Math.sin(a + bend * al)]);
  const end = add(root, [dist * Math.cos(a), dist * Math.sin(a)]);
  return [joint, end];
}

// cv2.intersectConvexConvex replacement: Sutherland-Hodgman clip of convex polygon `subj` by convex `clip`.
// Returns [area, pts] (pts null when empty), like OpenCV's (area, inter).
export function intersectConvex(subj, clip) {
  const area = (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  const sgn = area(clip) >= 0 ? 1 : -1;
  let out = subj.map(P2);
  for (let i = 0; i < clip.length && out.length; i++) {
    const A = clip[i], B = clip[(i + 1) % clip.length];
    const inside = (p) => sgn * ((B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0])) >= 0;
    const X = (p, q) => {
      const a1 = B[1] - A[1], b1 = A[0] - B[0], c1 = a1 * A[0] + b1 * A[1];
      const a2 = q[1] - p[1], b2 = p[0] - q[0], c2 = a2 * p[0] + b2 * p[1];
      const dd = a1 * b2 - a2 * b1;
      return [(b2 * c1 - b1 * c2) / dd, (a1 * c2 - a2 * c1) / dd];
    };
    const inp = out; out = [];
    for (let j = 0; j < inp.length; j++) {
      const cur = inp[j], prev = inp[(j + inp.length - 1) % inp.length];
      if (inside(cur)) { if (!inside(prev)) out.push(X(prev, cur)); out.push(cur); } else if (inside(prev)) out.push(X(prev, cur));
    }
  }
  if (out.length < 3) return [0, null];
  return [Math.abs(area(out)), out];
}

// Python's % and // on negatives (JS % keeps the sign of the dividend)
export const mod = (a, b) => ((a % b) + b) % b;
export const floordiv = (a, b) => Math.floor(a / b);
