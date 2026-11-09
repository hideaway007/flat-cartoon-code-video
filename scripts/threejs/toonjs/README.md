# toonjs - browser port of the flat-cartoon character painter

Python originals: this skill's `scripts/` (copied into each project's `production/`)
`toon.py`, `costumes.py`, `poses.py`, `cast.py`, `horse.py`, `bust.py`. Goal: the JS draws pixel-for-pixel the same
characters (same geometry, same draw order, same wobble seeds), in the browser (Canvas2D), so three.js can draw
characters live.

## Files and owners
| file | from | status |
|---|---|---|
| `np.js` | numpy/python helpers + toon `crom` `ellipse_pts` `rot` `ik2` + `intersectConvex` (cv2.intersectConvexConvex) | done (main session) |
| `painter.js` | toon `Painter`, `silhouette`, `SS` `INK` `WHITE` `LINE` | done (main session) |
| `render.js` | toon `render_char` (returns a sprite) | done (main session) |
| `rng.js` | numpy `default_rng(seed).uniform(lo, hi, n)` (PCG64 + SeedSequence, bit exact) | batch A |
| `toon.js` | rest of `toon.py` | batch A |
| `poses.js`, `cast.js` | `poses.py`, `cast.py` | batch A |
| `costumes_a.js` | `costumes.py` lines 1-1393 | batch B |
| `costumes_b.js` + `costumes.js` | `costumes.py` lines 1394-end (skip the `if __name__ == "__main__"` block) | batch C |
| `horse.js`, `bust.js` | `horse.py`, `bust.py` (skip sheet / `__main__` code) | batch D |

costumes.py split - top-level names in each half:
- A: STEEL, STEEL_DK, IRON, GOLD, GOLD_DK, BRONZE, WOOD, WOOD_DK, LEATHER, PAPER, LINEN, RED, RED_DK, BLUE, GREEN, BLACK,
  FLAME, FLAME_IN, SKIN, GARMENT, HEADWEAR, HAIR, MOUSTACHE, BEARD, HELD, UPRIGHT, SHIELDS, BOWS, _n, _perp, dk, Ctx,
  device, behind_body, _ermine_spot, _quiver, leg, _mail_rows, foot, _leg_point, skirt, tor_poly, belt, torso,
  _fringe_band, _buckskin, _work_shirt, _print_dots, _trade_shirt, ELK_TOOTH, _dress, _breechcloth, _blanket,
  _blanket_back, _apron, _tweed, _blazer, _hoodie, neckwear, glasses, _hem_band, _neckline, _lace_ticks, arm, deferred, sleeve
- B: _R, _rect, prop, DETECTOR_SHAFT, DETECTOR_COIL, detector_coil_pos, _detector, _flame, shield, head_back, head_front,
  hair2, _curly, _braid_cap, _braids, _feather, _ponytail, _age_lines, beard, moustache, headwear, design, KNIGHT ...
  SOLDIER_1800, PRESETS, _bugle, _exam

## Module rules (cycles!)
- `costumes.js` is exactly: `export * from './costumes_b.js'; export * from './costumes_a.js';` (b first: b imports a,
  so a finishes loading before b's top level runs). Every other module imports costumes through `./costumes.js`.
- `costumes_a.js` may import from `./costumes_b.js` but must use those names ONLY inside functions (call time).
- `toon.js`, `horse.js`, `bust.js` may import each other and `./costumes.js`, but use imported names ONLY inside
  functions. Top-level code (constants, presets like `BAY = design(...)`) may only use the file's own names, `np.js`,
  `painter.js`, `rng.js`. (`cast.js` is the exception: it calls costumes `design` at top level - that is fine.)
- Import `crom, ellipse_pts, rot, ik2` from `./np.js` and `SS, INK, WHITE, LINE` from `./painter.js`
  (toon.js re-exports them too, so `TN.crom` style code works: `import * as TN from './toon.js'`).
- Export every top-level name with the SAME name as in Python (including `_private` ones).

## Translation rules
- Colours stay BGR arrays `[b, g, r]`; never convert in translated code (painter.js does it).
- tuples / 2-vectors -> `[x, y]`; point lists -> `[[x, y], ...]`; use np.js helpers (`add sub mul div hypot rot crom
  linspace interp arange ...`). numpy broadcasting must be written out (`pts.map(...)`). Never mutate a point that
  may be shared (pose fields, design fields, constants) - copy first.
- `d.get(k, default)` -> `get(d, 'k', default)` (np.js; keeps a stored null/0/false like Python). `d[k]` -> `d.k`.
  `dict(base); d.update(kw)` -> `{...base, ...kw}`.
- `**kw` -> one trailing plain object: `def rest(**kw)` -> `export function rest(kw = {})`; `design(base=None, **kw)` ->
  `design(base = null, kw = {})`; `mounted(rider, preset=BAY, **kw)` -> `mounted(rider, preset = BAY, kw = {})`.
- Keyword arguments to normal parameters -> positional, `undefined` for skipped ones:
  `pt.stroke(pts, col, 18, LINE * 0.7, shade=False)` -> `pt.stroke(pts, col, 18, LINE * 0.7, undefined, false)`.
- Python truthiness: `if x:` where x may be `[]`, `()`, `{}`, `""`, `0`, `None` -> write the explicit test
  (`x != null && x.length`). `a or b` with tuples/None -> `a || b` only when a is never 0/"".
- `round()`/`np.round` -> `pyround` (half-to-even); `int(x)` -> `Math.trunc`; `//` -> `floordiv`; `%` -> `mod`
  (when either side can be negative); `math.radians` -> `radians`.
- `isinstance(v, tuple)` -> `Array.isArray(v)`; number check -> `typeof v === 'number'` (bools are not numbers in JS).
- Painter API (painter.js), positional like Python:
  `shape(pts, fill, line=LINE, closed=true, shade=true)`, `blob(pts, fill, line=LINE, n=10, shade=true)`,
  `ell(cx, cy, rx, ry, fill, line=LINE, ang=0, shade=true)`, `stroke(pts, color, width, line=LINE, smooth=false, shade=true)`,
  `line(pts, width=LINE*0.8, color=null, smooth=false)`, `dot(cx, cy, r, color=INK)`, `lw(w)`, `pt.A` (2x3, mutable,
  `[[a,b,c],[d,e,f]]`), `pt.s`, `pt.k`. Draw ORDER and the number of `_wobble`-consuming calls must match Python
  exactly (the wobble seed is the draw counter).
- Raw pixel access (`pt.img[...]`) does not exist. horse.py `_rider` saves pixels below the seat and restores them:
  use `const snap = pt.snapshot(); ...draw...; pt.restoreInside(snap, cut)` (cut = the same polygon in char units,
  mapped through the CURRENT `pt.A`).
- `cv2.intersectConvexConvex(q, cp)` -> `intersectConvex(q, cp)` from np.js (returns `[area, pts|null]`).

## Test
- `$PY toonjs/test/make_refs.py` -> 67 Python reference sprites (already generated) + `test/cases.json`.
- `node toonjs/test/run_cases.mjs [id-prefix]` -> renders the same cases with the JS port in headless Chrome.
- `$PY toonjs/test/compare.py [id-prefix]` -> `test/out_<prefixes>/report.json` + `sheet_*.jpg` (per prefix, safe to run in parallel) (ref | js | diff).
- `$PY` = Python with numpy + opencv (path in the skill's LOCAL.md). Run commands from `<project>/threejs/`.
- Expected residual difference: anti-aliased edges (Canvas) vs hard edges (OpenCV) - IoU ~0.97+ and bad px a few %.
  Anything structural (missing part, wrong colour, wrong side, wrong angle) is a translation bug.
