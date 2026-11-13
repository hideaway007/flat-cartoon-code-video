// kit.js — the film kit for styles 3 and 4. Sits on top of lib.js (W, H, g, cv, easing, rng, mix, two-tone shapes).
// Holds what every film shot needs: gradients and glows, IK limbs, a camera with hard cuts, rim light for a whole figure,
// depth of field, grain, text, and film(): the shot dispatcher.
[['barlow-condensed', 500], ['barlow-condensed', 700], ['b612-mono', 400], ['b612-mono', 700], ['im-fell-english', 400], ['caveat', 600]]
  .forEach(([f, w]) => document.fonts.load(`${w} 40px "${f}"`));
document.fonts.load('italic 400 40px "im-fell-english"');

const LG = (x0, y0, x1, y1, stops) => { const q = g.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, c]) => q.addColorStop(o, c)); return q; };
const RG = (x, y, r0, r1, stops) => { const q = g.createRadialGradient(x, y, r0, x, y, r1); stops.forEach(([o, c]) => q.addColorStop(o, c)); return q; };
const A = (c, a) => { const [r, gg, b] = hex(c); return `rgba(${r},${gg},${b},${a})`; };
const rect = (x, y, w, h, fill) => { g.fillStyle = fill; g.fillRect(x, y, w, h); };
const TAU = Math.PI * 2;

// soft light: a radial falloff added with a blend mode
function glow(x, y, r, col, a = 1, mode = 'screen', sx = 1, sy = 1) {
  g.save(); g.globalCompositeOperation = mode; g.translate(x, y); g.scale(sx, sy);
  g.fillStyle = RG(0, 0, 0, r, [[0, A(col, a)], [0.5, A(col, a * 0.32)], [1, A(col, 0)]]); g.fillRect(-r, -r, 2 * r, 2 * r); g.restore();
}
function clipIn(pathFn, fn) { g.save(); g.beginPath(); pathFn(); g.clip(); fn(); g.restore(); }
// smooth stroke through points
function stroke(pts, w, col, k = 0.5, closed = false, cap = 'round') {
  g.beginPath(); curve(pts, closed, k); g.lineWidth = w; g.strokeStyle = col; g.lineCap = cap; g.lineJoin = 'round'; g.stroke();
}
// straight polyline stroke
function pline(pts, w, col, cap = 'round') {
  g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.lineWidth = w; g.strokeStyle = col; g.lineCap = cap; g.lineJoin = 'round'; g.stroke();
}
// two-bone IK: joint position for a limb from (ax,ay) to (bx,by)
function ik2(ax, ay, bx, by, l1, l2, dir = 1) {
  let dx = bx - ax, dy = by - ay, d = Math.hypot(dx, dy);
  const m = l1 + l2 - 0.5;
  if (d > m) { bx = ax + (dx / d) * m; by = ay + (dy / d) * m; dx = bx - ax; dy = by - ay; d = m; }
  d = Math.max(d, Math.abs(l1 - l2) + 0.5);
  const a = Math.atan2(dy, dx), c = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  return [ax + Math.cos(a + dir * c) * l1, ay + Math.sin(a + dir * c) * l1, bx, by];
}
// tapered two-segment limb, returns [jointX, jointY, endX, endY]
function limb2(ax, ay, bx, by, l1, l2, dir, w0, w1, w2, fill, fill2 = fill) {
  const j = ik2(ax, ay, bx, by, l1, l2, dir);
  limb(ax, ay, j[0], j[1], w0, w1, fill); limb(j[0], j[1], j[2], j[3], w1, w2, fill2);
  return j;
}
// ---- camera: one move inside a shot, a hard cut between shots
let CAMZ = 1;
function camSet(cx, cy, z) {                       // world point (cx,cy) at the centre of the screen; never leaves the 1920x1080 world
  z = Math.max(1, z); cx = clamp(cx, W / (2 * z), W - W / (2 * z)); cy = clamp(cy, H / (2 * z), H - H / (2 * z));
  CAMZ = z; g.setTransform(z, 0, 0, z, W / 2 - cx * z, H / 2 - cy * z); return [cx, cy, z];
}
function camOff() { CAMZ = 1; g.setTransform(1, 0, 0, 1, 0, 0); }
// shots = [[t0, [cx,cy,z], [cx,cy,z], ease?], ...]: a cut at every t0, one move inside each shot. returns the shot index.
function shotCam(shots, t, T = 15) {
  let i = 0; while (i + 1 < shots.length && t >= shots[i + 1][0]) i++;
  const s = shots[i], t1 = i + 1 < shots.length ? shots[i + 1][0] : T, p = (s[3] || (x => x))(prog(t, s[0], t1));
  camSet(lerp(s[1][0], s[2][0], p), lerp(s[1][1], s[2][1], p), lerp(s[1][2], s[2][2], p)); return i;
}
// ---- timing helpers
const blink = (t, seed = 0, every = 3.1) => { const u = (t + seed * 1.37 + 10) % every; return u < 0.15 ? Math.sin(u / 0.15 * Math.PI) : 0; };
const typed = (s, p) => s.slice(0, Math.round(s.length * clamp(p)));
const pop = p => (p <= 0 ? 0 : back(clamp(p)));
const wig = (t, f, ph = 0) => Math.sin(t * f * TAU + ph);
const stepT = (t, fps = 12) => Math.floor(t * fps + 1e-6) / fps;
const L2 = (a, b, p) => [lerp(a[0], b[0], p), lerp(a[1], b[1], p)];

let _grain = null, GRAIN_T = -1;                   // GRAIN_T >= 0: the grain is re-seeded 12 times a second (film); -1: fixed (paper)
function grain(alpha = 0.07, mode = 'overlay', scale = 1) {
  if (!_grain) {
    _grain = document.createElement('canvas'); _grain.width = _grain.height = 512;
    const q = _grain.getContext('2d'), im = q.createImageData(512, 512), r = rng(7);
    for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (r() - 0.5) * 230; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    q.putImageData(im, 0, 0);
  }
  const k = GRAIN_T < 0 ? 0 : Math.floor(GRAIN_T * 12), ox = (k * 193) % 512, oy = (k * 71) % 512;
  g.save(); g.globalAlpha = alpha; g.globalCompositeOperation = mode; g.fillStyle = g.createPattern(_grain, 'repeat');
  g.scale(scale, scale); g.translate(-ox, -oy); g.fillRect(ox, oy, W / scale, H / scale); g.restore();
}
function vignette(a = 0.4, col = '#000000', inner = 0.5) {
  g.save(); g.fillStyle = RG(W / 2, H / 2, H * inner, H * 1.08, [[0, A(col, 0)], [1, A(col, a)]]); g.fillRect(0, 0, W, H); g.restore();
}
// text with letter spacing; baseline = alphabetic. returns the width.
function tx(s, x, y, size, fill, font, align = 'left', weight = 400, ls = 0, style = '') {
  g.font = `${style} ${weight} ${size}px "${font}"`; g.letterSpacing = ls + 'px'; g.textAlign = align; g.textBaseline = 'alphabetic';
  g.fillStyle = fill; g.fillText(s, x, y); const w = g.measureText(s).width; g.letterSpacing = '0px'; return w;
}
// Edge light for a whole cut-out figure. fn() draws the figure; each rim = [dx, dy, colour, alpha]:
// the band of the silhouette left uncovered when the silhouette is shifted by (dx,dy) is tinted, i.e. light arriving from (-dx,-dy).
const _buf = [0, 1, 2].map(() => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; });
function lit(fn, rims) {
  const [B, L, M] = _buf, b = B.getContext('2d'), l = L.getContext('2d'), m = M.getContext('2d');
  const wipe = () => { g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H); g.restore(); };
  b.clearRect(0, 0, W, H); b.drawImage(cv, 0, 0); wipe();
  fn();
  l.globalCompositeOperation = 'source-over'; l.globalAlpha = 1; l.clearRect(0, 0, W, H); l.drawImage(cv, 0, 0);
  m.clearRect(0, 0, W, H); m.drawImage(L, 0, 0);                       // M keeps the untouched silhouette
  const t = _buf[3] || (_buf[3] = Object.assign(document.createElement('canvas'), { width: W, height: H })), q = t.getContext('2d');
  for (const [dx, dy, col, a = 1] of rims) {
    q.globalCompositeOperation = 'source-over'; q.clearRect(0, 0, W, H); q.fillStyle = col; q.fillRect(0, 0, W, H);
    q.globalCompositeOperation = 'destination-in'; q.drawImage(M, 0, 0);
    q.globalCompositeOperation = 'destination-out'; q.drawImage(M, dx * CAMZ, dy * CAMZ);
    l.save(); l.globalAlpha = a; l.globalCompositeOperation = 'source-atop'; l.drawImage(t, 0, 0); l.restore();
  }
  wipe(); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(B, 0, 0); g.drawImage(L, 0, 0); g.restore();
}
// shadow wrapper: everything drawn in fn casts one soft drop shadow (paper layers, instruments)
function shadowed(fn, dy = 8, blur = 14, a = 0.28, dx = 0, col = '#000000') {
  g.save(); g.shadowColor = A(col, a); g.shadowBlur = blur * CAMZ; g.shadowOffsetX = dx * CAMZ; g.shadowOffsetY = dy * CAMZ; fn(); g.restore();
}
// depth of field: whatever is on the canvas so far goes out of focus (and darker by dim); draw the sharp subject after it
function blurBack(px, dim = 0, col = '#05090d') {
  const b = _buf[0].getContext('2d'); b.globalCompositeOperation = 'source-over'; b.globalAlpha = 1; b.clearRect(0, 0, W, H); b.drawImage(cv, 0, 0);
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); rect(0, 0, W, H, col); g.filter = `blur(${px}px)`; g.drawImage(_buf[0], -48, -27, W + 96, H + 54); g.filter = 'none';
  if (dim) rect(0, 0, W, H, A(col, dim)); g.restore();
}
// ---- a film is a list of shots with hard cuts. cuts[i] = the time shots[i] starts; shots[i](t) draws the whole frame;
// post(t, i) draws what sits on top of every shot (the channel's read-out, vignette, grain).
// Every frame starts from the same canvas state, so a still rendered alone is the frame the video will have.
function film(cuts, shots, post) {
  const fresh = () => { camOff(); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.filter = 'none'; g.setLineDash([]); g.lineCap = g.lineJoin = 'round'; };
  window.renderFrame = (t = 0) => {
    fresh(); GRAIN_T = t;
    let i = 0; while (i + 1 < cuts.length && t >= cuts[i + 1] - 1e-6) i++;
    shots[i](t); fresh();
    if (post) post(t, i);
  };
}
