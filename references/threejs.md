# three.js renderer (browser / GPU) - added 2026-11-09/10

The same segments (`production/segments/segNN.py`) rendered on the GPU in headless Chrome instead of OpenCV on the CPU.
Python stays the source of truth for the film: shots, timing, designs, poses, sets are still written in Python; the
browser draws them. The character painter is a line-by-line JS port (`scripts/threejs/toonjs/`), checked against the
Python drawings (67 cases, median IoU 0.996, the rest is anti-aliasing only).

## Setup (once per project, again after the skill changes)

    $PY $K/threejs/setup_threejs.py <project>        # -> <project>/threejs/ + npm install (three, puppeteer-core, ws)

Needs Node 18+ and Google Chrome (`CHROME=/path` if it is not in /Applications). The per-project direction files
`threejs/stagejs/shots3d.js` and `threejs/stagejs/onetake_dir.js` are never overwritten by an update.

## Render

    cd <project>
    $PY threejs/export_stage.py seg01 0 15            # shots overlapping 0-15 s -> threejs/stage_assets/seg01_0-15.json + .wav
    cd threejs
    node stage.mjs stage_assets/seg01_0-15.json --stills 30,150,330        # review stills -> out/
    node stage.mjs stage_assets/seg01_0-15.json --jobs 2 --out out/x.mp4   # full render, narration muxed in
    node stage.mjs stage_assets/seg01_0-15.json --onetake ...              # one-take version (see below)

Always `ffmpeg -nostdin` when you script ffmpeg in the background (without it a backgrounded ffmpeg waited on stdin
for 20 min). For the final audio, mux the loudness-normalised narration (-14 LUFS) the Python route produced.

Speed (M4, 2026-11-09): 15 s / 450 frames in ~80 s for the 2D stage, ~110 s for the one-take 3D version, with
`--jobs 2` (two Chromes). 4 jobs is not faster (the GPU is full). The Python route needs ~3.3 min for the same 15 s.

## Three ways to use it

1. **2D stage (default)**: same look as the Python render (< 1 % of pixels differ), only faster. Plates, crowd strips,
   live toons, contact shadows, DOF, overlays, grade, vignette, fade / whip transitions, paper grain.
2. **Cut-based 3D** (`stagejs/shots3d.js`): chosen shots are lifted into real 3D by camera projection (a reference
   camera is fitted to the 2D frame; the ground plate lands on a real ground plane, sky/hills on far cards,
   characters stand as camera-facing cards at their feet) and get a real camera move. Example:
   `examples/ep02_ch1_0-15/shots3d.js`.
3. **One take** (`--onetake`, `stagejs/onetake_dir.js`): the whole range as one continuous camera through several
   "worlds" (one per location, built from a base shot), joined by dark / window-sky / fog passes. Every crowd member
   on its own card, the main character keeps one body through the take. Example (ep02 ch1 0-15 s, accepted by the
   user): `examples/ep02_ch1_0-15/onetake_dir.js` - copy it to `stagejs/` and rewrite worlds, camera keys, cuts.

## Direction rules the user set (2026-11-09/10)

- **Calm camera** (`calm: true`): move - settle - HOLD. One key per line of narration; the camera stops and holds
  until the line and its on-screen text are readable, then moves slowly (smootherstep) to the next stop. One move per
  transition (pull back, or go round, or rise), never continuous orbiting. The first fast version made the user dizzy:
  "别要那么快，还是要把信息表达清楚".
- Use `{ pass: true, ... }` keys to bend a move round the outside of a character instead of sweeping past the face.
- Close-ups: crowd members between the lens and the subject fade out (blend, never a hard on/off threshold).
- **Look = flat v3** (`filter: false, light: false`): no split-tone grade, bloom, vignette, paper grain, sun glow,
  god rays, rim light, long cast shadows or distance haze - only small contact shadows under feet / hooves. Story
  devices stay: the grey-out on "dead", the transitions. Both flags can be set to true to bring the cinematic look back.
- Characters are flat cards: keep turns small; the card mirrors when the camera passes to the other side.

## Gotchas found the hard way

- Shadows / decals on the ground z-fight with it: offset them in depth (polygonOffset / a small lift) - the flicker the
  user saw was cast shadows vanishing for single frames.
- Never sample a texture inside a divergent GLSL branch on these cards: wrong mip level -> thin dark frames around
  cards seen at an angle. Sample unconditionally and multiply by a mask.
- Cards of one crowd group at the same distance swap draw order frame to frame: sort with a stable tie-break.
- 2D-only cheats (a huge blurred foreground rider at the lens, `depth > 1.2`) do not belong in a 3D world: skip them.
- Overlays use a wobble seed hashed from the Python layer; `export_stage.py` stores it (`seed`) - JSON alone loses it.

## Files

- `toonjs/` - the painter port (np.js, painter.js, rng.js = numpy PCG64 bit-exact, toon/costumes/poses/horse/bust,
  render.js, anim.js). Rules for changing it: `toonjs/README.md`. After changing a Python painter file, port the
  same change to its JS file and run `toonjs/test/` (make_refs.py -> run_cases.mjs -> compare.py).
- `stagejs/stage.js` (2D stage + final pass), `stage3d.js` (cut-based 3D), `onetake.js` (one take),
  `overlays.js` (all 15 overlay types; coloured spotlight and shot `apply_filter` are approximations / not ported).
- `stage.mjs` (parallel headless-Chrome render), `export_stage.py` (segment -> JSON, incl. crowd members).
