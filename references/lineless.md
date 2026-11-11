# Style 2: lineless colour-block (upgraded 2026-11-11)

A rich, illustrated lineless look for F in History and landscape/narrative explainers. Style 1 (marker outline, white
egg heads, Python engine) is completely untouched and stays the default; style 2 is chosen per video.

| | Style 1 (default) | Style 2 (this file) |
| --- | --- | --- |
| Figures | white egg head, thick marker outline, rubber arms | no outline, classic rounded capsule head + soft dark-pupil eyes, tailored multi-view coats & sculpted cuff+thumb hands |
| Space & Depth | flat 2D / three.js plates | multiplane illustrated sets, warm window light shafts, foreground furniture occluders, true rear OTS (`view: 'back'`) & hardware Canvas2D optical bokeh (`blurPx`) |
| Mood | expressions and poses | time-of-day palettes, `TINT`, `DEAD` grey-out, pearlescent droplets |
| Camera | push / pan / whip, 15-31 cuts per minute | calm `glide` move then hold, shot-size alternation (WS / Rear OTS / Frontal MCU / CU) every 2.5-4.5 s |
| Renderer | Python (numpy + opencv) or three.js | browser Canvas 2D in headless Chrome, ~0.5 s per second of film |

## Setup and commands

```bash
python3 $K/lineless/setup_lineless.py <project>      # copies/updates library in <project>/lineless/ (keeps index.html & scenes*.js)
cd <project>/lineless
node render.mjs stills cast_sheet.html 0.3            # character & costume sheet -> stills/
node render.mjs stills index.html 0.8,2.6,4.3         # review frames of your scenes
node render.mjs video index.html 0 49.8 30 out/ch1.mp4 ../assets/audio/narration.wav
```

Needs Node 18+, ffmpeg, Google Chrome (`CHROME=/path` if not in `/Applications`). `render.mjs` exits non-zero on any
`PAGE ERROR:`.

## Architecture & Upgraded Modules

`src/index.html` loads the library and your `scenes*.js`. `window.renderFrame(t)` is a pure function of narration time
`t` (seconds), deterministic and seek-safe.

| File | Holds |
| --- | --- |
| `lib.js` | `W,H,g`; `clamp lerp prog tw eio eout glide back rng`; `mix grey`; `curve blob poly ell rr limb form at`; **`layer(cam, depth, fn, blurPx = 0)`** (supports clean optical bokeh!); `camAt(keys, t)` |
| `figures.js` | `C(colour)`, `TINT`, `DEAD`, `COAT`, 19 detailed historical `KIT`s (`custer`, `custer_dress`, `trooper`, `scout`, `lakota`, `cheyenne`, `warrior`, `bartender`, `patron`, `arch`, `clerk`, `senator`, `cadet`, `officer`, `grant`, `terry`, `crook`, `miner`), `ik`, `EX`, **`act(t, beats)`** |
| `body.js` | Classic soft `eye()` (warm `#fffaf0` sclera + dark `INK` pupil + skin lid — never overly bright or outlined!), `droplet()`, `drawHandShape('open'\|'point'\|'fist'\|'beckon')`, 24 props in `drawProp()`, tailored `upper()` with sleeve contact-occlusion shadow, lapels, split coat-tails, `emptyPockets`, `hatLift`, and `view: 'side' \| 'front'` |
| `person.js` | `standing(x, y, s, o, flip)` supporting **`view: 'side' \| 'front' \| 'back'`** (calls `standingBack()` for true rear-view OTS shoulders/nape/hats!) and stances `'stand' \| 'strut' \| 'lunge' \| 'kneel' \| 'crouch' \| 'recoil' \| 'leap'` |
| `rider.js`, `horse.js` | `mounted(x, y, s, o, flip)`: articulated horse + rider + reins + hoof dust (`rear`, `tired`, `blaze`, `socks`) |
| `scenery.js` | 10 outdoor palettes (`DUSK`, `NOON`, `CAMP`, `SCORCHED`, `WESTPOINT`, `OUTPOST`, `CIVIL_WAR`, `WASHITA`, `BLACK_HILLS`, `GULLY`), outdoor terrain (`sky cloud ridge ground tufts sage rock tree pine river lodges tipi marker gatling`), AND **multiplane interior sets** (`drawSaloonBack` + `drawSaloonBarFG`, `drawArchiveBack` + `drawArchiveTableFG`, `drawClassroomBack` + `drawClassroomDeskFG`, `drawWestPointBack`, `drawCongressBack` + `drawCongressDaisAndFloor` + `drawWitnessPodiumFG`) |
| `marks.js`, `teacher.js` | `RED`, `CREAM`, `blink(t)`, `wobble`, `ring`, `plate(x, y, title, sub, p, size)`, `teacher(o)` marble bust |

## Craft & Direction Rules (Mandatory for High Visual Quality)

1. **Preserve the Classic Head & Soft Eye**: Keep the rounded capsule head (`roundRect` + small button nose in side view)
   and soft warm-cream eyes (`#fffaf0` + dark `INK` pupil, no heavy black lash lines or glowing neon irises). Use
   `droplet()` for tears/sweat — never rectangular bars.
2. **True Multiplane Depth & Optical Separation**:
   - Place subjects *behind* foreground set pieces (`drawSaloonBarFG`, `drawArchiveTableFG`, `drawWitnessPodiumFG`,
     sagebrush/rocks at `depth 1.3–1.6`) rather than pasting everyone in front of flat walls.
   - Alternate shot sizes every 2.5–4.5 s: Wide establishing -> True Rear OTS (`standing(..., { view: 'back' })` at
     `depth 1.35` with `blurPx = 3.2`) -> Frontal/Side MCU (`s = 1.25–1.55`, background `blurPx = 3.5–4.5`) -> Insert.
   - Never draw fake triangular perspective roads (`poly` triangles) under side-view horses/walkers.
3. **Rich Detail & Acting Business**:
   - Every shot must dress its environment richly (trees, rocks, camp smoke, bottle shelves, sunlight shafts, furniture)
     and give characters concrete props (`detector`, `cartridge`, `note`, `bugle`, `ledger`, `feather_staff`, `mug`,
     `rag`, `spyglass`, `sabre`) and staggered multi-beat reactions via `act(t, beats)`.
   - Red (`#d8352a`) is reserved exclusively for the teacher's grading pen + Custer's neckerchief.
4. **Calm Camera**: One smooth `glide` move (`camAt`) that settles and holds so compositions and plates read cleanly.
   No high-frequency sine jitter (`Math.sin(t * 18)`) on limbs.

## Quality Gate Before Delivery

Render key stills across every shot (`node render.mjs stills index.html ...`), tile them into a single contact sheet,
and visually inspect every frame: verify classic head/eye look, zero text/plate overlaps on faces, feet grounded on
trails/floors, rich environmental detail, and clean foreground occluders before rendering full video.
