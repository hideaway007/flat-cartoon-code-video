// lib.js — canvas, easing, palette, shape helpers, parallax camera
const W = 1920, H = 1080;
const cv = document.getElementById('c');
const g = cv.getContext('2d');

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const eio = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const eout = x => 1 - Math.pow(1 - x, 3);
const back = x => 1 + 2.7 * Math.pow(x - 1, 3) + 1.7 * Math.pow(x - 1, 2);
const tw = (t, a, b, e = eio) => e(prog(t, a, b));

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const hex = c => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
function mix(a, b, t) {
  const A = hex(a), B = hex(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join('');
}
// desaturate toward a paper grey (used for the "dead" beat)
function grey(c, k) {
  const [r, gg, b] = hex(c), l = Math.round(0.3 * r + 0.59 * gg + 0.11 * b);
  const lg = '#' + [l, l, l].map(v => Math.round(lerp(v, 196, 0.35)).toString(16).padStart(2, '0')).join('');
  return mix(c, lg, k);
}

// ---- shapes -------------------------------------------------------------
// smooth closed/open curve through points (Catmull-Rom -> bezier)
function curve(pts, closed = true, k = 0.5) {
  const n = pts.length, P = i => pts[closed ? (i + n) % n : clamp(i, 0, n - 1)];
  g.moveTo(pts[0][0], pts[0][1]);
  for (let i = 0; i < (closed ? n : n - 1); i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    g.bezierCurveTo(
      p1[0] + ((p2[0] - p0[0]) * k) / 3, p1[1] + ((p2[1] - p0[1]) * k) / 3,
      p2[0] - ((p3[0] - p1[0]) * k) / 3, p2[1] - ((p3[1] - p1[1]) * k) / 3,
      p2[0], p2[1]);
  }
  if (closed) g.closePath();
}
function blob(pts, fill, k) { g.beginPath(); curve(pts, true, k); g.fillStyle = fill; g.fill(); }
function poly(pts, fill) {
  g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.closePath(); g.fillStyle = fill; g.fill();
}
function ell(x, y, rx, ry, fill, rot = 0) {
  g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, 7); g.fillStyle = fill; g.fill();
}
function rr(x, y, w, h, r, fill) { g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = fill; g.fill(); }
// tapered capsule from A to B (limbs, necks, tails)
function limb(x1, y1, x2, y2, w1, w2, fill) {
  const a = Math.atan2(y2 - y1, x2 - x1), s = Math.sin(a), c = Math.cos(a);
  g.beginPath();
  g.moveTo(x1 + s * w1, y1 - c * w1); g.lineTo(x2 + s * w2, y2 - c * w2);
  g.arc(x2, y2, w2, a - Math.PI / 2, a + Math.PI / 2);
  g.lineTo(x1 - s * w1, y1 + c * w1);
  g.arc(x1, y1, w1, a + Math.PI / 2, a + Math.PI * 1.5);
  g.closePath(); g.fillStyle = fill; g.fill();
}
// two-tone form: fill the path, then paint shade() clipped inside it
function form(pathFn, base, shade) {
  g.save(); g.beginPath(); pathFn(); g.fillStyle = base; g.fill();
  if (shade) { g.clip(); shade(); }
  g.restore();
}
function at(x, y, s, fn, rot = 0, flip = false) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(flip ? -s : s, s); fn(); g.restore();
}

// ---- parallax camera -----------------------------------------------------
// cam = {x, y, z}. depth 0 = sky (fixed), 1 = subject plane, >1 = foreground.
function layer(cam, depth, fn) {
  const z = 1 + (cam.z - 1) * depth;
  g.save();
  g.translate(W / 2, H / 2); g.scale(z, z);
  g.translate(-W / 2 - cam.x * depth, -H / 2 - cam.y * depth);
  fn(); g.restore();
}
// camera path: keys [[t, x, y, z], ...] — eased move, then hold until next key's start
function camAt(keys, t, move = 1.1) {
  let c = keys[0];
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i], p = eio(prog(t, k[0], k[0] + (k[4] || move)));
    c = [0, lerp(c[1], k[1], p), lerp(c[2], k[2], p), lerp(c[3], k[3], p)];
  }
  return { x: c[1], y: c[2], z: c[3] };
}

function text(s, x, y, size, fill, font = 'Rockwell', align = 'center', weight = 700) {
  g.font = `${weight} ${size}px "${font}"`; g.textAlign = align; g.textBaseline = 'middle';
  g.fillStyle = fill; g.fillText(s, x, y);
}
