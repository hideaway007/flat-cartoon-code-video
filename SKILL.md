---
name: flat-cartoon-code-video
description: Make narrated 2D cartoon history/science explainer videos (dynasty and kingdom speed-runs, invention and discovery histories, biographies, myths, "why did X" questions) and story films where every character, costume, prop, crowd, background, map and on-screen annotation is DRAWN IN CODE (no image generation) in a flat marker-outline, white-egg-head style - script templates, vector rigs with tweened poses, code-drawn parallax sets, explainer overlays (circles, labels, maps, routes, counters), word-timed shots, segment renders joined with the narration. Two looks to choose from: style 1 (default) the marker-outline white-egg-head look; style 2 a lineless colour-block look with skin tones, palette-driven mood and a calm move-and-hold camera, drawn on a browser canvas. Default for The Rope and any new video in this style unless the user asks for AI-generated images (then use flat-cartoon-story-video).
---

# Flat cartoon video, drawn in code

**First read `LOCAL.md` next to this file if it exists** (not in the public repo): machine-specific paths (Python,
sample renders, example projects), the Google Cloud project for TTS, and audition folders.

Accepted bar (2026-11-07): the V12 code-drawn sample of The Rope (12.6 s; path in `LOCAL.md`).
The user chose this route over generated images for speed and consistency: a little less polished than the AI
version (V10), but no generation, no grey faces or drifting colours, nothing floats, ropes connect, every change
re-renders in seconds. Keep the look at least at V12 level.

`K=<this skill>/scripts`, `PY` = Python with numpy + opencv (the local venv path is in `LOCAL.md`), ffmpeg on PATH.
API details (pose fields, layer keys, helpers): [references/api.md](references/api.md).

## Two styles: pick one per video (style 2 added 2026-11-10)

| | Style 1: marker outline (default) | Style 2: lineless colour-block |
| --- | --- | --- |
| Look | white egg heads, thick outline, rubber arms, big faces | no outline, two tones per shape, skin tones, costume colour |
| Best for | gag-dense explainers, many costumes / interiors / maps, The Rope | journeys through landscape, stories that turn serious, several peoples on screen, the red-pen "grading" idea |
| Built with | everything below in this file | [references/lineless.md](references/lineless.md) + `scripts/lineless/` |

- Style 1 is the default and everything below describes it. Use style 2 only when the user asks for it ("第二种风格",
  "无描边", "色块", "lineless", "style 2") or has already chosen it for that series. For a new series that names
  neither, show the comparison above and ask once.
- One style per video; never mix them inside a film. Style 2 does not replace or change any style 1 file.
- Shared by both: script (step 0), voice (0b), word timing (2), the user's direction rules (figures at the centre of
  every shot, text readable, calm camera, no cinematic filters). For style 2, steps 1 and 3-7 are replaced by
  [references/lineless.md](references/lineless.md): `python3 $K/lineless/setup_lineless.py <project>`.

## Workflow

0. **Script** (history/science explainers): question title, 20-40 s cold open (second person / paradox / reversal),
   7-12 chapters, 1,700-2,300 words（第③版旁白实测约 178 词/分钟，约 10-13 分钟），one beat per line with visual hints, sources listed. Templates
   per format (dynasty, invention, biography, myth, "why" question) in [references/script.md](references/script.md).
   Show the script to the user and get an OK before building anything.
0b. **Voice (TTS)**：默认固定为用户于 2026-11-09 选定的**第③版「紧凑短视频叙事」**：英文，
   Google Gemini 3.8 Flash TTS，**Fenrir**，自然美式英语，紧凑节奏、鲜明动作重音、快速情绪切换、
   灵活音调与干脆笑点；不喊叫。**保留模型原生语速，不做后期变速**。试听实测约 178 词/分钟，
   仅用于时长估算，不是锁定速度。固定提示：[references/narration-compact-v3.txt](references/narration-compact-v3.txt)。
   除非用户明确更改，不切换音色、恢复旧版 165 提示或改用无提示的默认读法。
   `python3 $K/narrate.py <project> --prepare-only` 检查章节和风格，再运行
   `python3 $K/narrate.py <project>` -> `assets/audio/narration.wav`。旧项目缓存风格不同会停止，先保留旧配音
   再重新准备；不得把新旧风格混在一条成片中。详见 [references/tts.md](references/tts.md)。
   工具测试可用占位声（`say -v Daniel -r 178`），不可发布。
1. **Project**: `$PY $K/new_project.py <project>` -> library files in `production/` (engine, toon, scenery, stage,
   poses, timing) plus editable `cast.py`, `sets.py`, `segments/seg01.py`, `seg02.py` (The Rope example) and
   `STATE.md`. Narration (the user's own script/TTS + licensed music) goes in `assets/audio/`.
2. **Words**: `$PY $K/words.py <project>` -> `production/words.json` / `words.txt`. Check names and numbers in
   words.txt against the script; fix them in words.json.
3. **Cast**: start from a costume preset (`costumes.py`: knights, legionaries, samurai, Chinese officials and
   soldiers, Egyptians, vikings, inventors, kings, monks...) via `CO.design(CO.PRESET, ...)`; held props and era poses
   in poses.py; crowds via `crowds.py`. Check faces stay readable against dark robes (lighter robe than hair, little
   beard). Otherwise one design dict per character in `cast.py` (colours, proportions, hair style). New hair/hat/costume
   pieces are code in `toon.py` (`hair()`, `draw_character()`); then `$PY production/poses.py <key>` ->
   `review/poses_<key>.jpg` shows the character in every library pose. Look at that one sheet.
   F in History's teacher is the talking marble bust (`bust.py`, `B.TEACHER`: a toon layer with `rig="bust"`, no
   hands); it grades with overlays (`report_card`, `stamp`, `circle`, `counter`). Demo: `assets/examples/seg_teacher.py`.
4. **Sets**: build from the scenery kit (`scenery_kits.py`: rooms, nature, architecture, real-coastline maps with
   `proj` for `S.lonlat`; copy-ready examples in `assets/examples/sets_kit.py`). Overlays (circles, labels, maps routes,
   counters, stamps...) in `overlays.py`, examples in `assets/examples/seg_overlays.py`; costumes/crowds example in
   `seg_costumes_crowd.py`. A full 16:9 explainer example project: see `LOCAL.md`.
   Plain helpers: one function per background in `sets.py` (helpers in scenery.py: sky_grad, cloud, mountains, ground_layer,
   patch, texture, tent), `save(name, plate, ground_frac)`. `$PY production/sets.py [names]` -> PNG layers +
   `assets/bg/sets.json` + `review/sets.jpg` (green line = ground). Reuse sets across shots of one scene.
5. **Shots**: one segment file per ~1 min of narration (`segments/segNN.py`). Shot times from `W.cuts([...])`, pose
   changes on words with `W.rel(start, "word")`, poses from `poses.py` (`PO.two(prop=...)`); characters stand at
   `S.ground_y(set) + depth_px`. A segment after the first imports the previous one's `shots` and passes
   `context=PREV[-1]` so its first shot can whip/fade in.
6. **Check + stills**: `$PY production/segments/segNN.py --check` (gaps, key times, floating feet, rope indices),
   then `--stills [ids]` -> `review/stills_segNN.jpg` (3 frames per shot). Review that sheet, not single frames.
7. **Render**: `$PY $K/render_all.py <project> --jobs 3 --name <film>` (in the background) checks all segments, renders changed segments
   in parallel (unchanged ones are kept), joins them and adds the narration -> `out/<film>.mp4`. One segment alone:
   `segNN.py --render`. Open the result; report what was checked (stills, swap frames) and what was not (full
   playback, sound).

Keep `production/STATE.md` current after each step (done, user decisions, open problems, next step) and start a fresh
session per few segments: a new session reads STATE.md, `words.txt`, `cast.py`, `sets.py` and the last segment file.

## Craft rules (carried over from V9/V10 feedback)

- Every standing character on a set with a ground line; `--check` errors when feet are above it.
- 2-4 pose changes per character per shot, each on the word it illustrates, with squash/overshoot (`amp` 0.7-1.8).
  Idle breathing and head sway run underneath (different `phase` per character).
- Every shot moves: push (z 1.0 -> 1.05-1.10), pan, or tilt on a tall plate; `whip` between energetic shots, `fade`
  for time passing, `shake` on impacts.
- Backgrounds stay simple: big flat shapes, one shade side, sparse texture. Characters carry the detail.
- Explainer rhythm (measured on the reference channel): 15-31 cuts per minute, median shot 1.5-2.5 s, no static
  hold over ~1 s. Roughly every second shot carries an explainer device (circle, label, arrow, map route, counter,
  stamp, emote, title card); a new place or date gets a map or a title card.
- Facing left = the facing-right pose with `flip=True`. Turning around is an instant facing switch inside a tween;
  hide it inside a squash (amp >= 1.2).
- Every shot is built around characters. Objects, numbers and maps appear in their hands or as small accents.
- Riders: `horse.py` (`HO.mounted(rider, HO.BAY)`, gaits walk / trot / gallop through `walk=` or crowd `march=`).

## three.js renderer: faster, real 3D camera, one take (added 2026-11-10)

The same segments can be rendered on the GPU in headless Chrome: `$PY $K/threejs/setup_threejs.py <project>`, then
`threejs/export_stage.py` + `node threejs/stage.mjs ...`. 15 s in ~80 s (2D stage, same look as Python) or ~110 s
(one-take 3D), vs ~3.3 min in Python. Characters are drawn by a verified JS port of the painter. For real 3D shots
or a one-take version the camera follows the user's rule: calm move-and-hold, one stop per narration line, readable
text, flat v3 look (no cinematic grade / glow / rays / rim / long shadows). Everything else - setup, modes, direction
rules, gotchas: [references/threejs.md](references/threejs.md). A painter change in Python must be ported to its
`threejs/toonjs/` file too (then run its tests).

## Performance (measured 2026-11-07 on a fanless MacBook Air, 10 cores)

- One process: 7-15 s of render per second of film (12.6 s clip: 90 s cold; 100 s+ once the Air is hot and
  throttling). Big characters (waist-up close-ups) and several characters per shot cost the most.
- `OPENCV_NUM_THREADS=1` per process was ~13 % faster; render_all sets it.
- Parallel segments help less than the core count suggests on this Air (2 segments in parallel: 120 s for 12.6 s,
  no faster than one process). Expect roughly 1.5-2.5 h for 15 min of film; run it in the background, and re-render
  only changed segments (render_all skips the rest). `--stills` for review costs seconds.

## When code is not enough

For a rare shot that code draws badly (extreme close-up emotion, complex hand/prop contact), generate PNG poses with
the `magpie-image` skill and use an engine `char` layer in that shot (stage.py renders it); keep the rest in code.
Improving the drawing for good (new hair styles, props, expressions) belongs in toon.py / scenery.py of the skill:
edit there, then `new_project.py <project> --update-libs`.
