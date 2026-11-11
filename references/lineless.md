# Style 2: lineless colour-block (Director's Cut upgrade 2026-11-11)

A rich, multiplane illustrated lineless look with studio sound design for F in History and landscape/narrative explainers.
Style 1 (marker outline, white egg heads, Python engine) is completely untouched and stays the default; style 2 is chosen
per video.

| | Style 1 (default) | Style 2 (this file) |
| --- | --- | --- |
| Figures | white egg head, thick marker outline, rubber arms | no outline, classic rounded capsule head + soft dark-pupil eyes, 1:1 scale marble bust `teacherAt`, heroic face-clearing prop IK & sculpted cuff+thumb hands |
| Space & Depth | flat 2D / three.js plates | multiplane illustrated sets, wide multi-camera classroom (`CLASS_CAM`), unified parchment topographic maps (`drawParchmentMapFrame`), twin-lens spyglass POV, foreground furniture occluders & optical bokeh (`blurPx`) |
| Acting & Lip-Sync | pose tweens | `words.json` syllable-exact lip-sync (`export_words_js.py` + `speechOpen(t)`), distance-synced horse gaits (zero moonwalking), multi-beat `act()` |
| Sound Design | dry narration | `mix_soundtrack.py`: physical-modeled stereo BGM bed + 35ms lookahead sidechain ducking (0% dead air) + frame-locked foley/SFX normalized to `-14 LUFS` |
| Renderer | Python (numpy + opencv) or three.js | browser Canvas 2D in headless Chrome, ~0.5 s per second of film |

## Setup and commands

```bash
python3 $K/lineless/setup_lineless.py <project>                           # installs/updates library in <project>/lineless/
python3 $K/lineless/export_words_js.py <project>/production/words.json <project>/lineless/src/words_data.js
cd <project>/lineless
node render.mjs stills index.html 0.8,2.6,5.6                             # review stills
python3 mix_soundtrack.py --vo ../assets/audio/narration.wav --cues sound_cues.json --out out/master_-14LUFS.wav
node render.mjs video index.html 0 49.8 30 out/ch1.mp4 out/master_-14LUFS.wav
```

## Architecture & Upgraded Modules

| File | Holds |
| --- | --- |
| `lib.js` | `W,H,g`; `clamp lerp prog tw eio eout glide back rng`; `layer(cam, depth, fn, blurPx = 0)`; `camAt(keys, t)`; **`setWords(arr)` + `speechOpen(t)`** syllable lip-sync gate; **`text()` enforcing `>= 24px` mobile-safe floor** |
| `figures.js` | `C(colour)`, `TINT`, `DEAD`, `COAT`, 22 historical `KIT`s (`custer`, `custer_dress`, `trooper`, `scout`, `lakota`, `cheyenne`, `warrior`, `bartender`, `patron`, `arch`, `clerk`, `senator`, `cadet`, `officer`, `grant`, `terry`, `crook`, `miner`, `libbie`, `reno`, `benteen`), `ik`, `EX`, `act(t, beats)` |
| `body.js` | Classic soft `eye()`, `droplet()`, `drawHandShape()`, 24 props in `drawProp()`, **Heroic Prop-Clearance IK Solver** (keeps raised sabres, spyglasses, and held papers clear of the `1.42x` head/mouth!), dark-rim sleeve contrast, `view: 'side' \| 'front'` |
| `person.js` | `standing(x, y, s, o, flip)` supporting `view: 'side' \| 'front' \| 'back'` (`standingBack()`) and full-body stances |
| `teacher.js` | **1:1 human-scale marble bust `teacher(o)` / `teacherAt(x, y, s, o, flip)`** + `drawTeacherLectern()`, matching `body.js` rounded capsule head & soft eyes, with automatic `speechOpen()` pause gating |
| `scenery.js` | 13 palettes (`DUSK`, `NOON`, `CAMP`, `SCORCHED`, `WESTPOINT`, `OUTPOST`, `CIVIL_WAR`, `WASHITA`, `BLACK_HILLS`, `GULLY`, `NIGHT`, `DAWN`, `SOLEMN`), multiplane interiors (`Saloon`, `Archive`, **`CLASS_CAM` multi-camera `Classroom` + `drawLiveChalk`**, `WestPoint`, `Congress`, `WhiteHouse`, `FortLincoln`, `Parlor`), **`drawParchmentMapFrame` + `drawMapRiver` + `drawMapRidge`**, **`drawSpyglassPOV`**, `glint`, `windGrass` |
| `mix_soundtrack.py` | Procedural stereo BGM (`dusk_hook`, `investigation`, `march_tension`, `solemn_ridge`, `verdict_finale`) + lookahead sidechain ducking + 12 foley/SFX generators + 2-pass EBU R128 `-14.0 LUFS` mastering |

## Mandatory Director & YouTube Retention Rules

1. **Physics & Skeletal Closure**: Never run `ph = t * 5` horse gaits on static ground — either scroll `bg` with `tr` or use calm breathing idle (`Math.sin(t * 2) * 0.08`, no `dust`). Always load `words_data.js` so mouths close cleanly on breath pauses.
2. **Dynamic Camera & Zero Classroom Fatigue**: Never hold a flat wide classroom shot for 15–20 s. Cut between `CLASS_CAM.board` (live chalk punch-in), `CLASS_CAM.teacher` (tight deadpan reaction MCU), and `CLASS_CAM.wide`. Keep median shot length 2.5–4.5 s; split any beat > 7 s into WS -> OTS/POV -> MCU.
3. **Unified Visual Bible & Mobile-Safe Typography**: Use `drawParchmentMapFrame` + `drawMapRiver` for all maps; keep exam sheets inside chalkboard bounds (`640..1768, 124..700`); keep all primary labels `>= 30px` and max 3–4 text elements on screen at once.
4. **Full Sound Design**: Always pair visual slashes, chalk writing, stamps, gavels, sabre draws, and rides with `mix_soundtrack.py` so zero pauses drop to `-70 dBFS` digital silence.
