# Style 2: lineless colour-block (added 2026-11-10)

A second look for the same kind of video. Style 1 (marker outline, white egg heads, Python engine) is unchanged and
stays the default; style 2 is chosen per video. Accepted bar: the 17.5 s Little Bighorn sample (path in `LOCAL.md`);
the user's verdict on 2026-11-10 was "the effect is okay, keep polishing" - keep new work at least at that level.

| | Style 1 (default) | Style 2 (this file) |
| --- | --- | --- |
| Figures | white egg head, thick marker outline, rubber arms | no outline, two tones per shape, skin tones, costume colour |
| Mood | expressions and poses | palette: one colour set per time of day, `TINT`, `DEAD` grey-out |
| Camera | push / pan / whip, 15-31 cuts per minute | one calm move then hold per shot, 2-5 s shots |
| Renderer | Python (numpy + opencv) or three.js | browser Canvas 2D in headless Chrome, ~0.5 s per second of film |
| Library | costumes, crowds, poses, set kits, maps, overlays | riders, people on foot, teacher bust, two outdoor sets, plates, red pen |

## Which videos it fits

Good fit:
- Journeys through landscape: marches, expeditions, campaigns, migrations, voyages. Layered hills, rivers and skies
  are what this look does best, and riders / walkers are ready.
- Stories that turn serious: battles, disasters, last days. The mood changes through colour (dusk palette, grey-out)
  instead of funny faces, so a tragic chapter does not look like a gag. F in History chapter 7 type material.
- Films with several peoples on screen. Figures have skin tones and their own clothes, so nobody is a white egg;
  respectful depiction is easier.
- The "teacher grades history" idea: red is kept for the teacher's pen, so every red mark reads as a grade.
- Slower, documentary-toned narration and one-take chapters; long videos (10 min renders in about 5 minutes).

Poor fit (use style 1):
- Dense roast comedy that lives on big faces and 2-3 expression changes per shot. Faces here are smaller and calmer.
- Episodes that need many costumes, interiors, crowds, held props or maps right away (dynasty speed-runs with 20
  characters, invention histories with mechanisms). Style 1 has those kits; here each one must be drawn first.
- Talky two-person scenes with a lot of hand acting.
- The Rope and any series already published in style 1. Do not mix the two styles inside one video.

## Setup and commands

```bash
python3 $K/lineless/setup_lineless.py <project>      # copies the library to <project>/lineless/, npm install
cd <project>/lineless
node render.mjs stills cast_sheet.html 0.3            # every figure type once -> stills/
node render.mjs stills index.html 0.8,2.6,4.3         # review frames of your scenes
node render.mjs video index.html 0 17.5 30 out/ch1.mp4 ../assets/audio/narration.wav
node render.mjs video examples/ep02_ch1_0-17/index.html 0 17.5 30 out/example.mp4   # the accepted sample
```

Needs Node 18+, ffmpeg, Google Chrome (`CHROME=/path` if not in the usual place). The script, voice and word-timing
steps of SKILL.md (0, 0b, 2) are shared; steps 3-7 are replaced by this file. `render.mjs` exits with an error when
the page throws; a video written after `PAGE ERROR:` is not valid.

## How a film is built

`src/index.html` loads the library and your `scenes*.js`. A page defines `window.renderFrame(t)`; every shot is a
pure function of `t` (seconds of narration), no state, so any frame draws on its own. One scenes file per chapter,
under ~100 lines each; shot header comment = time range + the narration line it covers.

| File | Holds |
| --- | --- |
| `lib.js` | `W,H,g`; `clamp lerp prog tw(t,a,b,ease) eio eout back rng`; `mix grey`; shapes `curve blob poly ell rr limb`; `form(path, base, shadeFn)` = two-tone shape; `at(x,y,s,fn,rot,flip)`; `layer(cam, depth, fn)`; `camAt(keys, t)`; `text` |
| `figures.js` | `C(colour)` (every colour goes through it), `TINT=[colour, amount]`, `DEAD=0..1`, `COAT` horse colours, `KIT` costumes, `ik` |
| `body.js` | `SKINS`, `HAIRS`, `eye`, `fringe`, `upper()` = torso + head + arms shared by all figures |
| `person.js` | `standing(x, y, s, o, flip)`: on foot; `o.walk` 0..1, `o.ph` step phase, `o.hand` / `o.hand2` targets |
| `rider.js`, `horse.js` | `mounted(x, y, s, o, flip)`: horse + rider + reins; `o.coat blanket blaze socks dust` |
| `scenery.js` | palettes `DUSK`, `NOON`; `sky cloud ridge ground tufts sage tree river lodges`; `pen(pts, p)` red stroke |
| `marks.js` | `RED CREAM`, `blink(t)`, `wobble` / `ring` pen paths, `plate(x, y, title, sub, p, size)` |
| `teacher.js` | `teacher({mouth, look, brow, lid, tilt})`: the marble bust |

Face fields for every figure: `eyes: 'open'|'shut'|'wide'`, `look` -1..1, `lid` 0..1, `brow` -1..1,
`mouth: 'smile'|'frown'|'open'`, `stache`, `beard`, `curls`, `hat: 'slouch'|'kepi'|'none'`, `skin` 0-3, `hair` 0-3.
New character = a kit: `KIT.name = { ...KIT.plain, coat, coatSh, pants, hat, hatSh, scarf }`; vary a crowd with
`skin`, `hair`, `hat`, beard and horse coat by index (see `trooper()` in the example). New costume pieces, hats and
props are code in `body.js`; new sets are functions in `scenery.js` plus a palette object.

## Look rules

- No outlines. A shape is a base colour plus one shade, clipped inside it with `form()`. No gradients except the sky.
- One palette per time of day; all layers take their colours from it. Light is a palette choice or `TINT`, never a
  post filter: no bloom, glow, rays, rim light, long cast shadows, vignette, grain or paper texture. Only a small
  contact shadow under feet and hooves.
- Red belongs to the teacher's pen (strike-through, ring, question mark, underline, the F) plus at most one costume
  accent on the lead. Nothing else is red.
- The figure is the centre of every shot. Numbers, plates and maps are accents beside it. Text is 40 px or larger and
  stays inside the frame; plates sit in screen space, not on the camera.
- Figures are never blurred. Depth comes from parallax, size and paler colours with distance.
- Feet stand on the trail: `gy(x) + 26..90` where `gy = ground(...)`. Sort figures by y so nearer ones are drawn
  last; a figure passing the lead goes behind the lead.
- A solemn beat: stop the walk phase, raise `DEAD` to 1 over ~0.4 s, let the pen make its mark, no face gags.

## Camera rules

- `camAt([[t0, x, y, z], [t1, x, y, z, dur]], t)`: one eased move, then hold. One stop per narration line.
- Start a shot close on the lead, pull back to show the group; or hold wide and push to one face. No whip, no shake,
  no motion blur. Cuts land on sentence starts.
- `layer(cam, depth, fn)`: depth 0 sky, 0.1-0.45 clouds and far hills, 1 subject plane, 1.7 foreground brush.
  A marching shot scrolls the background layers with an extra x offset while the figures hold their screen place.

## Review before showing the user

Render 9-12 stills across the cut points, tile them into one sheet and look at it: plates inside the frame and not
on faces, feet on the trail, nobody crossing in front of the lead, red only where the pen is, text sizes. Then render
the video. Report what was checked (stills) and what was not (full playback, sound).

## Not built yet

Costume presets per era, crowd helper, interiors, held props, maps and routes, counters, a `--check` pass for gaps
and floating feet, parallel chapter renders. Add them to this folder when a film needs them, then re-run
`setup_lineless.py` in the project to update its copy.
