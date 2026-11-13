# Styles 3 and 4: the film styles (added 2026-11-13)

Two looks for a set of channels where every subject has its own style:
**style 3 CUTAWAY** for engineering, maritime and aviation disasters, and **style 4 LOW SUN** for expeditions, polar
journeys and voyages that go wrong slowly. Both are built the same way, as a film: a list of shots with hard cuts on
a beat, every shot with its own composition, lens and light, one read-out that runs through all of them, marks taken
from the primary record, and sound synthesised in code. Styles 1 and 2 are untouched; one style per video.

| | Style 3: CUTAWAY | Style 4: LOW SUN |
| --- | --- | --- |
| Subject | a machine or a structure fails, minute by minute: ships, aircraft, plants, bridges, mines | people against a landscape for days or weeks: polar journeys, voyages, mountains, deserts |
| Picture | night-blue slabs, amber instrument light, alarm red; the ship or building is sliced open like a technical drawing, hatched amber where it is cut | huge soft layers of snow and sky, a low sun with its halo, figures lit from behind (warm rim, cold shadow side), long shadows thrown toward the camera |
| Figures | blocky, 3.4 heads tall, square heads, thick limbs (`blk`, `head3`); they stay upright while the room rolls | bundled and heavy, 4 heads tall, small faces inside fur hoods (`man4`); the landscape is the lead actor |
| The record | the recorder: voice recorder, log, transcript, inquiry report | the journal: diary, log book, letters |
| Read-out on every shot | `hud3`: REC light, source, level meter, a countdown (`T-00:32:51`) | `hud4`: a slip of the page with the date, a slip with a tally (`21`, struck out, `15½`, struck out, `11 miles`) |
| Marks | numbered amber callouts `dot3`, name tags `tag3`, a lower third that types a quote with its time `cap3` | handwriting that writes itself `ink4`, small capitals `caps4`, pencil lines `pencil4` |
| The explaining shot | the cross-section | the sketch map on the journal page |
| Beat | 0.5 s: the alarm lamp and its beep | 0.75 s: one ski stride (`STEP4`) |
| Fonts | Barlow Condensed, B612 Mono | IM Fell English, Caveat |
| Worked example | `examples/elfaro_0706/`: El Faro, 2015 (15 s, 8 shots) | `examples/eleven_miles/`: Scott's last march, 1912 (15 s, 8 shots) |

A new subject area gets a new style file next to `cutaway.js` and `lowsun.js` (palette, figures, read-out, marks) on
the same kit; it does not bend one of these two.

## Setup and commands

```bash
node $K/film/setup_film.mjs <project>      # copies the kit to <project>/film/ and runs npm install. Node 18+, Chrome; no Python
cd <project>/film
node sheet.mjs examples/eleven_miles/index.html 0.6,2.9,5.6,6.7,9.3,10.4,12.3,14.8 4 480   # -> stills/_sheet_eleven_miles.jpg
node examples/eleven_miles/audio.mjs                                                      # -> out/eleven_miles.wav
node render.mjs video examples/eleven_miles/index.html 0 15 30 out/eleven_miles.mp4 out/eleven_miles.wav
```

ffmpeg: `FFMPEG=/path`, or on PATH; if there is none, setup installs the `ffmpeg-static` package into the project and
the tools find it. Run setup again to update the library from the skill: `src/`, the tools and `examples/` are
overwritten, `films/` is never touched.

A new film: copy the example of its style to `films/<name>/` (the same depth, so the paths inside keep working) and
rewrite it shot by shot. Keep the example open; it shows every device of the style in use.

## Files

| File | Holds |
| --- | --- |
| `render.mjs` | headless Chrome renderer: `stills <page> t1,t2` -> `stills/<name>_<t>.png`; `video <page> t0 t1 fps out.mp4 [audio.wav]`. `<name>` = the film's folder |
| `sheet.mjs` | contact sheet: `<page> t1,t2,... [cols] [cellWidth]` -> `stills/_sheet_<name>.jpg` |
| `sfx.mjs` | sound in code: `mixer({ dur, seed, cuts, kinds })` -> seeded `white pink brown`, `filt` (biquad lp/hp/bp, fixed or moving), `synth`, `put` (a cue), `bed` (a layer whose level is set per kind of shot), `master`, `report`, `save` |
| `mix.mjs` | narration over a bed: the voice is set to -16 LUFS, the bed turned down and ducked under it, the result set to -14 LUFS |
| `ffmpeg.mjs` | where ffmpeg is |
| `src/lib.js` | the canvas basics, the same file as style 2: `W H g cv`, `clamp lerp prog tw eio eout back`, `rng`, `mix`, `blob poly ell rr limb form at` |
| `src/kit.js` | what every film shot needs: `LG RG A rect glow clipIn stroke pline`, `ik2 limb2`, camera `camSet camOff shotCam`, `blink typed pop wig stepT L2`, `grain vignette tx`, rim light `lit(fn, rims)`, `shadowed`, depth of field `blurBack(px, dim, col)`, and `film(cuts, shots, post)` |
| `src/cutaway.js` | style 3: palette `C3`, the rolled set `TH3 RP hatch`, `alarm3 shake3 flashes3`, figures `head3 blk`, marks `dot3 tag3 cap3`, read-out `hud3` |
| `src/lowsun.js` | style 4: palette `C4`, the stride `STEP4 CYC4 V4 foot4 pole4`, figures `man4 boot4 ski4 sledge4 tent4 shadow4 breath4`, the land `land4 drift4 ridge4 storm4`, journal marks `ink4 caps4 pencil4 slip4`, read-out `hud4` |
| `src/fonts.css`, `src/fonts/` | the four families (latin subsets) with their licence texts |
| `examples/elfaro_0706/` | `index.html`, `parts.js` (the ship, the sea, the bridge set), `shots.js` (eight shots + the cut), `audio.mjs` |
| `examples/eleven_miles/` | `index.html`, `shots.js` (eight shots + the cut), `audio.mjs` |

A page is `index.html` (loads `fonts.css`, `lib.js`, `kit.js`, one style file, then the film's own files) and ends
with one call:

```js
film([0, 1.5, 3.75, 6.0, 7.5, 9.75, 11.25, 12.75],                       // when each shot starts: every time is on the beat grid
     [sh_ski, sh_wide, sh_three, sh_face, sh_map, sh_tent, sh_write, sh_last],   // each draws a whole frame: sh(t), t = film time
     (t, i) => { vignette(0.3, '#1a2848', 0.6); hud4(t, { /* date, tally */ }); grain(0.07, 'overlay'); });   // on top of every shot
```

## How a film is built (replaces steps 1 and 3-7 of SKILL.md)

1. **The record first.** Find the primary source (transcript, log, diary, inquiry report) and copy out, with their
   times or dates, the lines the film will quote and the numbers the read-out will count. No record, no film in
   these styles: the read-out and the quotes are what they are made of.
2. **Beat and storyboard.** Pick the beat from something in the story that repeats (an alarm, a stride, an engine, a
   pump, a clock). Lay the shots on that grid as a table: start time, scale (insert / wide / group / close /
   diagram / card), what moves, the one thing to read, what the read-out shows. Order for a cold open or a chapter:
   insert that asks a question -> wide that says where, with the title -> who is who -> close-up -> the explaining
   shot -> the turn -> the card.
3. **Shots.** One function per shot. Its first lines set the camera (`camSet`, one slow move per shot); then the far
   layers, `blurBack(...)` when the subject should stand in front of a soft background, then the subject inside
   `lit(...)` when there is a light behind it. Build one shot, look at it at three times, then the next.
4. **Marks.** Everything written on the picture comes from the record and uses the style's marks; times and dates
   are the record's own.
5. **Sound.** Copy the example's `audio.mjs`: the same cut list, a kind of space per shot (`'int'`, `'ext'`...),
   beds per kind, then one cue per visible event at the time it happens on screen. The beat must be audible.
6. **Check.** `sheet.mjs` with one or two frames per shot; then the frames either side of every cut
   (`1.47,1.5,3.72,3.75,...`); then a dense run through anything that moves (every 0.2 s through one cycle). Fix what
   the sheet shows before going on. Read `report()`: a shot far below its neighbours is a hole unless it is meant.
7. **Render**, then open the MP4, confirm duration and both streams, and say what was checked (stills, cuts, levels)
   and what was not (playback in motion, the sound by ear).

## Rules

**Pace**

- The first 1.5 s is an insert: one object, close, moving, that raises the question (the list indicator, a ski and a
  stick). No title, no wide shot, no logo before it.
- Cuts on the beat grid; only the turn of the story may leave it (El Faro's recording stops between two beeps).
  Shots of 1 to 2.5 s, up to 3 s for the explaining shot and the last card. Never two shots of the same scale in a
  row.
- One thing to read per shot besides the read-out. A written line is complete at least 0.5 s before its shot ends;
  a shot that needs more reading gets another beat, not smaller type.
- Every shot moves twice: something in it (a stride, a swell, a flame, a pen) and the camera (one slow push or
  drift, 3 to 8 % over the shot). The cut is hard; no fades, no whips. A flash or an impact may sit on a cut.
- The read-out changes on a cut or on a beat, and it counts toward the end: the last card shows where it stopped.
- The turn of the story gets a break in the rhythm: the beat doubles (the alarm at 0.25 s, a day every quarter of a
  stride) or stops dead (the recording ends, the lamp goes out).

**Picture**

- Each shot is composed on its own: a different horizon, scale and light from the one before. Check the sheet as a
  row of thumbnails: every cell must read as a different picture.
- Three depths in a picture shot: far (blurred or pale), the subject (sharp, rim-lit), near (a ridge, drift, rain,
  a console edge) that slides faster than the rest.
- The subject stays clear of the two corners the read-out uses (top left, bottom right) and of the bottom strip
  where a quote is written.
- Type: quotes 60-130 px, labels at least 30 px; on a picture shot at most one quote and three labels.
- The explaining shot (cross-section, map) is flat and clear, without depth of field, and may carry more writing
  because it is drawn in the order it is read.

**Truth**

- Quoted lines are the record's words, spelling included (`depôt`, `to-day`), and carry its time or date. A line
  that is not in the record is not put in quote marks.
- What the record does not show (who stands where, a face, the inside of the tent) is staging. Keep it plausible,
  check objects against the sources (they hauled on ski; the tent was green), and say in the handover which shots
  are dramatization.

## Style 3: CUTAWAY

- **Palette** `C3`: amber `#ffb000` (instruments, callouts, the cut edge), red `#ee4630` (alarm, loss), cream
  `#f2ecdc` (type), slab `#0c141d`, wall `#27394b`. Skies and seas are near-black blues; warm light only comes from
  instruments and lamps.
- **The set rolls, the people do not.** A shot sets `TH3` (the list, in radians) and draws the room through `RP`;
  figures stand upright with their feet placed on the sloping deck (`blk` takes foot positions). Loose things slide.
- **The cross-section** is the style's signature: the hull or building cut open, the cut hatched in amber
  (`hatch`), water or smoke rising inside, and the numbered callouts (`dot3`) appearing in the order the record
  names them, each with its line in the lower third (`cap3`).
- **Read-out** `hud3(t, { src: 'BRIDGE AUDIO · 07:06', label: 'TIME LEFT', left: seconds, end })`: the film is a
  recording. On the last card pass `end: true`: the meter goes flat and `REC` becomes `END`.
- **Light**: `flashes3([times])` for lightning (put the flashes on cuts), `alarm3(t)` for the lamp, `shake3` on the
  camera in rough shots.
- **Sound** (`examples/elfaro_0706/audio.mjs`): interiors muffled (storm through steel, hull, rain on glass),
  exteriors open (wind, sea, rain); the alarm beep is the metronome on the 0.5 s grid; a pop for every callout, ticks
  for every typed line; a low drone that swells; when the recording stops everything is cut to an empty room, then a
  bell with each line of the card.

## Style 4: LOW SUN

- **Palette** `C4`: rim `#ffd6a2` (the sun on an edge), ink `#2a2b44` (handwriting, type), parchment `#efe3c6`,
  sepia `#7b5a3c`, red `#b3402e` (the pencil that strikes out and rings). The land is cold blues and violets with one
  warm band at the horizon.
- **The land is the lead.** `land4(t, { hz, sun, k, dim, scr, mo, mh })` draws sky, sun, halo, sun dogs, two ranges
  and the surface; each shot chooses its own horizon and sun. The range is low where the sun stands.
- **Backlight.** Figures go inside `lit(() => ..., [[-8 * s, 4 * s, C4.rim, 1], [0, -5 * s, '#dfe8fa', 0.4]])` and
  throw `shadow4` toward the camera. The sun sits behind them or just out of frame.
- **The stride is the clock.** `man4({ ph: t / CYC4 + offset })`: a planted ski never slips, because the snow
  scrolls at `V4 * scale` (`scr` in `land4`). Men in a team are out of step (offsets 0, 0.35, 0.7).
- **Weather is the antagonist.** `drift4` in every exterior, `storm4(t, wo, veil)` when it closes in; a storm shot
  keeps one warm thing (the lamp in the tent) and lets it go down.
- **The journal** is the read-out, the caption and the explaining shot: `hud4(t, { place, date, dp, label, unit,
  tally, ring, bare })` on every shot (`bare: true` on a page shot, where the slips would be paper on paper);
  `ink4(text, x, y, size, p)` writes a quote over the picture; the sketch map is drawn on the page with `pencil4`
  while a pencil follows the line; the last card is the page itself.
- **Sound** (`examples/eleven_miles/audio.mjs`): the stride is the beat (ski, weight, stick); open shots are wind,
  drift and the sledge runners under a few held notes; the journal is written inside the tent, so page shots are
  muffled and the pencil is close; the blizzard is the loudest thing in the film; when the lamp goes out only the
  wind is left.

## With a narration

The two examples have no voice. For a narrated film the shared steps of SKILL.md still come first: script (0),
voice (0b), word times (2).

- Take the times from `production/words.txt`. A sequence (one scene, 10-30 s) starts its beat grid on the first
  word of its first sentence; each cut goes on the grid point nearest to the start of the sentence it illustrates.
  The grid restarts with every sequence.
- A quote is written on the picture while the narrator says it, not before.
- Chapters: one folder per chapter under `films/`, each with its own page and `audio.mjs`, times starting at 0.
  `node mix.mjs out/ch2_bed.wav ../assets/audio/narration.wav out/ch2.wav --at -63.2` puts the narration from
  63.2 s on over the bed of chapter 2 (`--at 0` for the first; `--bed` and `--lufs` change the balance and the
  target). Render each chapter with its mixed WAV, then join:
  `ffmpeg -f concat -safe 0 -i list.txt -c copy out/film.mp4` (`list.txt`: one `file 'ch1.mp4'` line per chapter).
- Under a voice the sound design is thinner: keep the beat, the cut accents and one event per shot.

## Verified, and not

- Verified (2026-11-13, Windows 10, Node 24, Chrome, no ffmpeg on PATH): setup into an empty project; both examples
  render from the installed copy; stills checked shot by shot and across every cut; the MP4s are 15.00 s,
  1920x1080, 30 fps, AAC 48 kHz stereo (El Faro -15.6 LUFS, true peak -0.6 dBFS; Eleven Miles -15.2 LUFS, -1.5 dBFS).
  The El Faro example is the film the user accepted: the same WAV bytes, and 449 of 450 frames bit-identical to it
  (the other differs by at most 3 levels in 223 bytes: Chrome does that between two renders of one frame).
  `sfx.mjs` writes the same bytes on every run. `film()` resets the canvas state for every frame, so a still
  rendered alone is the frame the video will have.
- Not verified: nobody has listened to the sound or watched the motion at speed inside the agent session; a person
  must. `mix.mjs` was tested with a tone in place of a voice (the bed drops about 8 dB under it) and the chapter
  join with the two example films, never with a real narration; no narrated film has been made in these styles yet.
- Not built: vertical 9:16 (the canvas is 1920x1080; a vertical film needs its own compositions), lip-sync (the
  figures act, a narrator speaks), fonts for Chinese on-screen text (the four families are Latin; add a CJK family
  to `fonts.css` and to the `document.fonts.load` list in `kit.js` before writing Chinese on the picture).
