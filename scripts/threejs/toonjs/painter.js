// painter.js - Canvas2D port of toon.py's Painter (the ONLY place that touches pixels while a character is drawn).
// Same API as Python: shape / blob / ell / stroke / line / dot, lw(), P(), mutable A, draw-order counter k, seeded
// wobble (numpy PCG64 stream reproduced in rng.js so every line wobbles exactly like the Python drawing).
// Differences from OpenCV that cannot be avoided: Canvas anti-aliases edges (OpenCV LINE_8 does not); both are drawn
// at SS x and area-downsampled, so the difference ends up sub-pixel.
import { crom, ellipse_pts, interp, arange, linspace, apply, det2, pyround } from './np.js';
import { npUniform } from './rng.js';

export const SS = 3;
export const INK = [30, 24, 26];
export const WHITE = [250, 250, 250];
export const LINE = 11.0;

export const css = (c, a = 1) => `rgba(${c[2] | 0},${c[1] | 0},${c[0] | 0},${a})`;      // BGR -> CSS
const sameColor = (a, b) => a != null && b != null && a.length === b.length && a.every((v, i) => v === b[i]);

export function newCanvas(w, h) {
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(Math.max(1, w), Math.max(1, h))
    : Object.assign(document.createElement('canvas'), { width: Math.max(1, w), height: Math.max(1, h) });
  return c;
}

// scratch canvases reused by every Painter: they only GROW (re-allocating a GPU canvas per shape was the main cost);
// callers work in the top-left w x h corner and clear a margin around it.
const scratch = [0, 1, 2].map(() => newCanvas(256, 256));
function grab(i, w, h) {
  const c = scratch[i];
  if (c.width < w + 64 || c.height < h + 64) { c.width = Math.max(c.width, w + 64); c.height = Math.max(c.height, h + 64); }
  const x = c.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over';
  x.globalAlpha = 1; x.filter = 'none'; x.clearRect(0, 0, w + 64, h + 64);
  return [c, x];
}

function pathOf(ctx, q, closed) {
  ctx.beginPath();
  ctx.moveTo(q[0][0], q[0][1]);
  for (let i = 1; i < q.length; i++) ctx.lineTo(q[i][0], q[i][1]);
  if (closed) ctx.closePath();
}

export class Painter {
  /** w, h: canvas px; A: 2x3 [[a,b,c],[d,e,f]] char units -> canvas px. Options as in Python. */
  constructor(w, h, A, { wobble = 1.6, shade = 0.17, shade_d = 30.0, min_shade = 55.0, ink = INK, seed = 0, canvas = null } = {}) {
    // canvas: reuse a canvas of exactly w x h (cleared here) instead of allocating one per frame
    // (a bigger canvas is fine: the drawing uses its top-left w x h; callers keep one grow-only canvas per layer)
    this.canvas = canvas && canvas.width >= w && canvas.height >= h ? canvas : newCanvas(w, h);
    this.w = w; this.h = h;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.setTransform(1, 0, 0, 1, 0, 0); this.ctx.globalCompositeOperation = 'source-over'; this.ctx.globalAlpha = 1;
    this.ctx.clearRect(0, 0, Math.min(this.canvas.width, w + 64), Math.min(this.canvas.height, h + 64));
    this.ctx.lineCap = 'round'; this.ctx.lineJoin = 'round';
    this.A = A.map((r) => r.slice());
    this.s = Math.sqrt(Math.abs(det2(this.A)));
    this.wob = wobble; this.sh = shade; this.sh_d = shade_d; this.min_sh = min_shade; this.ink = ink; this.seed = seed;
    this.k = 0;
  }

  get width() { return this.canvas.width; }
  get height() { return this.canvas.height; }

  /** char units -> canvas px, snapped to 1/4 px like OpenCV's shift=2 fixed point */
  P(pts) { return pts.map((p) => { const q = apply(this.A, p); return [pyround(q[0] * 4) / 4, pyround(q[1] * 4) / 4]; }); }

  lw(w) { return Math.max(1, Math.trunc(pyround(w * this.s))); }

  /** stable per-shape wobble, seeded by draw order (numpy default_rng(k * 7919 + seed).uniform(-1, 1, m)) */
  _wobble(pts) {
    this.k += 1;
    if (!this.wob || pts.length < 6) return pts;
    const n = pts.length, m = Math.max(4, Math.floor(n / 5));
    const noise = interp(arange(n), linspace(0, n - 1, m), npUniform(this.k * 7919 + this.seed, -1, 1, m));
    return pts.map((p, i) => {
      const a = pts[(i + 1) % n], b = pts[(i - 1 + n) % n];
      const dx = a[0] - b[0], dy = a[1] - b[1], l = Math.hypot(dx, dy) + 1e-6;
      return [p[0] + (-dy / l) * noise[i] * this.wob, p[1] + (dx / l) * noise[i] * this.wob];
    });
  }

  /** darken a soft band along the lower-right inside of the shape just drawn (light from the upper-left).
   *  q: its canvas px points; drawMask(ctx): fills the shape opaque in a ctx translated to the band box. */
  _shade(q, drawMask, sizeUnits) {
    if (globalThis.NO_SHADE || !this.sh || sizeUnits < this.min_sh) return;
    const pad = 4, W = this.canvas.width, H = this.canvas.height;
    const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
    const x0 = Math.max(Math.floor(Math.min(...xs)) - pad, 0), y0 = Math.max(Math.floor(Math.min(...ys)) - pad, 0);
    const x1 = Math.min(Math.floor(Math.max(...xs)) + pad, W), y1 = Math.min(Math.floor(Math.max(...ys)) + pad, H);
    if (x1 - x0 < 4 || y1 - y0 < 4) return;
    const w = x1 - x0, h = y1 - y0;
    const d = this.sh_d * this.s;
    const ox = Math.max(1, Math.trunc(d * 0.5)), oy = Math.max(1, Math.trunc(d * 0.85));
    const sigma = Math.max(d * 0.18, 1.0);
    const [mC, mX] = grab(0, w, h);
    mX.translate(-x0, -y0); mX.fillStyle = '#000'; mX.strokeStyle = '#000'; mX.lineCap = 'round'; mX.lineJoin = 'round';
    drawMask(mX); mX.setTransform(1, 0, 0, 1, 0, 0);
    // band = mask minus the mask shifted up-left by (ox, oy)
    const [bC, bX] = grab(1, w, h);
    bX.drawImage(mC, 0, 0, w, h, 0, 0, w, h);
    bX.globalCompositeOperation = 'destination-out';
    if (w > ox && h > oy) bX.drawImage(mC, ox, oy, w - ox, h - oy, 0, 0, w - ox, h - oy);
    // blur it, keep it inside the shape
    const [gC, gX] = grab(2, w, h);
    gX.filter = `blur(${sigma}px)`; gX.drawImage(bC, 0, 0, w, h, 0, 0, w, h); gX.filter = 'none';
    gX.globalCompositeOperation = 'destination-in'; gX.drawImage(mC, 0, 0, w, h, 0, 0, w, h);
    // rgb *= 1 - shade * band  (alpha untouched)
    const c = this.ctx; c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = this.sh; c.globalCompositeOperation = 'source-atop'; c.drawImage(gC, 0, 0, w, h, x0, y0, w, h); c.restore();
  }

  shape(pts, fill, line = LINE, closed = true, shade = true) {
    const q = this.P(this._wobble(pts));
    const c = this.ctx;
    if (fill != null) {
      pathOf(c, q, true); c.fillStyle = css(fill); c.fill('evenodd');
      if (shade && !sameColor(fill, this.ink)) {
        const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
        const span = Math.min(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / Math.max(this.s, 1e-6);
        this._shade(q, (m) => { pathOf(m, q, true); m.fill('evenodd'); }, span);
      }
    }
    if (line) { pathOf(c, q, closed); c.strokeStyle = css(this.ink); c.lineWidth = this.lw(line); c.stroke(); }
  }

  blob(pts, fill, line = LINE, n = 10, shade = true) { this.shape(crom(pts, true, n), fill, line, true, shade); }

  ell(cx, cy, rx, ry, fill, line = LINE, ang = 0.0, shade = true) { this.shape(ellipse_pts(cx, cy, rx, ry, ang), fill, line, true, shade); }

  /** thick round-capped stroke with an outline (sleeves, legs, ropes) */
  stroke(pts, color, width, line = LINE, smooth = false, shade = true) {
    pts = smooth && pts.length > 2 ? crom(pts, false, 8) : pts;
    const q = this.P(pts);
    this.k += 1;
    const c = this.ctx;
    if (line) { pathOf(c, q, false); c.strokeStyle = css(this.ink); c.lineWidth = this.lw(width + 2 * line); c.stroke(); }
    pathOf(c, q, false); c.strokeStyle = css(color); c.lineWidth = this.lw(width); c.stroke();
    if (shade) {
      const lw = this.lw(width);
      const xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
      const box = [[Math.min(...xs) - lw, Math.min(...ys) - lw], [Math.max(...xs) + lw, Math.max(...ys) + lw]];
      this._shade(box, (m) => { pathOf(m, q, false); m.lineWidth = lw; m.stroke(); }, width);
    }
  }

  line(pts, width = LINE * 0.8, color = null, smooth = false) {
    pts = smooth && pts.length > 2 ? crom(pts, false, 8) : pts;
    const q = this.P(pts.length >= 6 ? this._wobble(pts) : pts);
    const c = this.ctx;
    pathOf(c, q, false); c.strokeStyle = css(color || this.ink); c.lineWidth = this.lw(width); c.stroke();
  }

  dot(cx, cy, r, color = INK) { this.shape(ellipse_pts(cx, cy, r, r, 0.0, 24), color, 0); }

  // ---- pixel-region helpers for horse.py's rider (Python saved/restored pt.img slices) ----
  /** copy of the whole canvas (cheap GPU copy) */
  snapshot() { const s = newCanvas(this.canvas.width, this.canvas.height); s.getContext('2d').drawImage(this.canvas, 0, 0); return s; }
  /** put the snapshot's pixels back inside polygon `ptsUnits` (char units, mapped through the CURRENT A) */
  restoreInside(snap, ptsUnits) {
    const q = this.P(ptsUnits), c = this.ctx;
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); pathOf(c, q, true); c.clip();
    c.clearRect(0, 0, this.canvas.width, this.canvas.height); c.drawImage(snap, 0, 0); c.restore();
  }
}

/** toon.silhouette: the outer contour gets `extra` units more ink (alpha dilated by a disk, drawn under). */
export function silhouette(pt, extra) {
  const k = pt.lw(extra);
  if (k < 1) return;
  const W = pt.canvas.width, H = pt.canvas.height;
  const ink = newCanvas(W, H), ix = ink.getContext('2d');
  ix.drawImage(pt.canvas, 0, 0); ix.globalCompositeOperation = 'source-in'; ix.fillStyle = css(pt.ink); ix.fillRect(0, 0, W, H);
  const c = pt.ctx; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'destination-over';
  for (const r of [k, k * 2 / 3, k / 3]) {
    const n = Math.max(8, Math.ceil(2 * Math.PI * r));
    for (let i = 0; i < n; i++) { const a = 2 * Math.PI * i / n; c.drawImage(ink, Math.cos(a) * r, Math.sin(a) * r); }
  }
  c.restore();
}

/** area-downsample by SS (premultiplied average, like cv2.INTER_AREA on the Python canvas whose empty pixels are 0).
 *  Returns { data: Float32Array premultiplied RGBA 0..1, w, h }. */
export function downsample(canvas, f = SS) {
  const W = canvas.width, H = canvas.height, w = Math.floor(W / f), h = Math.floor(H / f);
  const src = canvas.getContext('2d').getImageData(0, 0, w * f, h * f).data;
  const out = new Float32Array(w * h * 4), inv = 1 / (f * f * 255), sw = w * f;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let j = 0; j < f; j++) for (let i = 0; i < f; i++) {
      const o = ((y * f + j) * sw + x * f + i) * 4, al = src[o + 3] / 255;
      r += src[o] * al; g += src[o + 1] * al; b += src[o + 2] * al; a += src[o + 3];
    }
    const o = (y * w + x) * 4; out[o] = r * inv; out[o + 1] = g * inv; out[o + 2] = b * inv; out[o + 3] = a * inv;
  }
  return { data: out, w, h };
}

/** premultiplied float RGBA -> canvas (straight alpha, what three.js / PNG want) */
export function toCanvas(img) {
  const c = newCanvas(img.w, img.h), x = c.getContext('2d'), id = x.createImageData(img.w, img.h), d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a > 1e-4) { id.data[i] = Math.round(Math.min(d[i] / a, 1) * 255); id.data[i + 1] = Math.round(Math.min(d[i + 1] / a, 1) * 255); id.data[i + 2] = Math.round(Math.min(d[i + 2] / a, 1) * 255); }
    id.data[i + 3] = Math.round(Math.min(a, 1) * 255);
  }
  x.putImageData(id, 0, 0);
  return c;
}

/** shared Python screen-space ropes (toon.render_strokes) are drawn by the stage, not ported here. */
