// render.js - toon.render_char for the browser: draw one character into its own sprite (no frame compositing).
import { Painter, silhouette, downsample, toCanvas, SS, LINE } from './painter.js';
import { draw_character, char_box } from './toon.js';
import { apply } from './np.js';

/**
 * D: design, p: full pose, M: 2x3 char units -> screen px, flip: face left, idle: [breathe, sway].
 * Returns { img: {data premultiplied Float32 RGBA, w, h}, x0, y0, joints (screen px) } like Python's render_char,
 * except the sprite is returned instead of composited (x0, y0 = its top-left in screen px).
 * opts.clip = [W, H] clamps the drawing box to the frame +-50 px like Python (omit for an unclipped sprite).
 */
export function renderChar(D, p, M, { flip = false, idle = [0.0, 0.0], box = null, clip = null, region = null, raw = false, sil = true, canvas = null } = {}) {
  box = box || char_box(D, p);
  const A = M.map((r) => r.slice());
  if (flip) { A[0][0] *= -1; A[1][0] *= -1; }
  const [x0, y0, x1, y1] = box;
  const cs = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].map((q) => apply(A, q));
  let sx0 = Math.floor(Math.min(...cs.map((c) => c[0]))), sy0 = Math.floor(Math.min(...cs.map((c) => c[1])));
  let sx1 = Math.ceil(Math.max(...cs.map((c) => c[0]))), sy1 = Math.ceil(Math.max(...cs.map((c) => c[1])));
  if (clip) { sx0 = Math.max(sx0, -50); sy0 = Math.max(sy0, -50); sx1 = Math.min(sx1, clip[0] + 50); sy1 = Math.min(sy1, clip[1] + 50); }
  // region = [x0, y0, x1, y1] (screen px): draw only there (a sprite canvas of known size: far smaller SS canvas)
  if (region) { sx0 = Math.max(sx0, region[0]); sy0 = Math.max(sy0, region[1]); sx1 = Math.min(sx1, region[2]); sy1 = Math.min(sy1, region[3]); }
  if (sx1 <= sx0 || sy1 <= sy0) return null;
  const C = A.map((r) => r.slice()); C[0][2] -= sx0; C[1][2] -= sy0;
  for (const r of C) for (let i = 0; i < 3; i++) r[i] *= SS;
  const cw = (sx1 - sx0) * SS, chh = (sy1 - sy0) * SS, key = `${cw}x${chh}`;
  let pt;
  if (canvas) pt = new Painter(cw, chh, C, { canvas: canvas(cw, chh) });   // canvas(w, h): the caller's grow-only canvas
  else {
    const pool = (globalThis.toonCanvasPool ||= new Map());         // one reusable SS canvas per size
    pt = new Painter(cw, chh, C, { canvas: pool.get(key) });
    pool.set(key, pt.canvas);
  }
  const T = (globalThis.toonProf ||= { draw: 0, sil: 0, down: 0, n: 0 }), t0 = performance.now();
  const j = draw_character(pt, D, p, idle);
  const t1 = performance.now();
  if (sil) silhouette(pt, LINE * 0.55);   // sil=false: the caller does the outer contour (scene.js: GPU pass)
  const t2 = performance.now();
  // raw: hand back the SS x canvas itself (no CPU readback) - a GPU consumer (three.js mipmaps) does the downsampling
  const img = raw ? null : downsample(pt.canvas);
  T.draw += t1 - t0; T.sil += t2 - t1; T.down += performance.now() - t2; T.n += 1;
  const joints = {};
  for (const [k, v] of Object.entries(j || {})) joints[k] = apply(A, v);
  return { img, x0: sx0, y0: sy0, x1: sx1, y1: sy1, w: cw, h: chh, joints, painter: pt, canvas: pt.canvas, ss: SS };
}

export { toCanvas };
