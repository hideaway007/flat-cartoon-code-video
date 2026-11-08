# API reference

Frame 1920x960 (2:1), 30 fps, screen px y down. Character units: Joe ~1060 tall, origin = between the feet on the
ground, y down. Colours BGR.

## Pose fields (toon.DEFAULT_POSE; numeric fields tween, the rest switch half-way)
| field | meaning |
|---|---|
| facing | `f` front, `r` three-quarter to screen-right, `b` back view (use layer `flip` for left) |
| hip, lean, head, head_dy | hip offset, torso lean deg (+ forward), head tilt deg, head raise (- up) |
| feet, lift | foot x (left, right); foot lift (walk) |
| hL, hR | hand targets relative to each shoulder, torso frame (elbows solved by IK, hang down/out) |
| handL, handR | mitt / fist / two / open / point |
| eyes | dot / wide / closed / squint / half / up / side (side-eye, direction from `look`) / roll (eye-roll) / mismatch (one big, one small) / squeeze ("> <") / spiral / stars / teary ; `look` pupil offset |
| brows | (tilt deg: + worried/raised inner, - angry, raise units) |
| mouth, mopen | smile / grin / open / shout / flat / grit / gulp / talk (talk flaps on `talk` spans) / frown / twitch / jawdrop / teeth / pout |
| sweat | 0..3 (1 = one drop, 2-3 = more drops) |
| tears, blush, pale, vein | 0..1 tear streams / cheek blush / blue-grey dread lines on the forehead / anger vein |
| gait, stride, hneck, hat_off | horse rig (horse.py): stand / walk / trot / gallop, cycle phase, neck raise, hat in hand |
| sweep | -1..1 metal-detector swing (prop `detector`) |
| prop, coil | none / coil_chest / coil_shoulder / pack ; coil_chest (dx, dy, scale) |
| crack | 0..1 crack across the forehead (bust rig; tweens, so it grows over the key's `dur`) |

Library poses (poses.py): rest, rest_side, back, explain, two, point, spread, wave, think, crossed, shrug, cheer,
shock, gulp, worried, coil_proud, coil_thrust, tie, tug, look_up_back, shade_eyes_back. Override any field:
`PO.tug(eyes="half", mouth="flat")`.
Expression presets (face fields only) in `PO.EX` / functions: smug, unimpressed, outraged, side_eye, eye_roll,
disbelief, panic, cry, dazed, starstruck, furious, cringe, sulk, dread - combine: `PO.point(**PO.EX["panic"])`.
`python production/poses.py faces` -> review/faces_sheet.jpg.

## Shot dict
`id, start, end` (absolute narration seconds, shots touch), `cam` (z0/z1 zoom, x0/x1/y0/y1 pan px, focus, ease
inout/out/linear), `tin` (kind whip with dir +-1 / fade, dur ~0.32-0.4), `shake` [dict(t, amp, decay)], `grade`,
`vignette`, `layers` back to front.

## Layers
- `S.plates(set, scale=1.08, offset=(0,0))` -> all layers of a set. Tall tilt plates: offset y negative, cam y0 < 0.
- `S.toon(D, pos, scale, keys, **kw)`: `pos` = feet on screen (`(x, S.ground_y(set, scale, offset) + depth_px)`,
  bigger depth_px = nearer), `scale` px per unit (0.4-0.6 full body, ~1.1 waist-up with `shadow=False` and pos y
  ~1270). keys `[(t_rel, pose, dict(dur=0.18, amp=1.0, deg=2.5))]`. kw: flip, phase, talk=S.talk_spans(W, st, en, st),
  walk=dict(period=0.56, ph=0 or pi), motions (engine: drift(dur, dx, dy, scale, ease), bob, jolt, punch, enter,
  tremble), idle_off, shadow, depth; blur (px, depth of field), haze (0..1 toward haze_col), tint (BGR multiply).
- `S.rope(a, b, sag=(before, after), switch=t)`: a, b = indices of two earlier toon layers (left, right).
- engine `char` layers (PNG poses) also render, for shots that need generated art.

## Depth, shot sizes, mood (stage.py)
- `S.cam_on(subject_xy, size="MS", push=0.05, dx=0, dy=0, head=0)` -> a cam dict framing a point at a shot size:
  `S.SHOT_SIZES` ECU 3.2, CU 2.3, MCU 1.75, MS 1.3, MWS 1.1, WS 1.0, EWS 0.92 (zoom); `head` lifts the focus px
  (negative = subject lower in frame, e.g. low angle / headroom). A pull-back reveal: `cam=dict(z0=3.0, z1=1.05,
  focus=...)`.
- `S.joint(D, pos, scale, pose, "head"|"handL"|"handR"|"footL"|"hip"|"horse_head"...)` -> screen px of a joint for the
  same toon placement (frame close-ups on a face or a hand, pin overlays to a hand).
- `S.fg(D, pos, scale, keys, blur=7, depth=1.5)` foreground occluder: a big blurred character at the frame edge,
  moving faster than the scene (depth > 1). Put it after the main characters. `S.fg_plate(set, blur, depth, scale,
  only=[layer names])` for a blurred plate layer in front.
- `S.mood("spotlight", t, at, r=300, soft=140, dark=0.85, cone=True, world=True)` stage light; `S.mood("rays", t, at,
  n=18, alpha=0.35, spin=6, color)` sunburst (place the layer BEFORE the toon to sit behind it); `S.mood("dim", t,
  amount=0.4)`. (overlay type "mood", param `mode`.)
- Background blur: `[dict(p, blur=4) for p in S.plates(set)]` (plates already supported `blur`).
- Riders: `horse.py` as HO: presets BAY SORREL BLACK GREY DUN, `HO.mounted(rider, HO.BAY)`, rider poses ride,
  ride_point, ride_salute, ride_wave_hat, ride_shade_eyes, ride_charge, ride_look_back (+ gait="walk"|"trot"|
  "gallop"); `S.toon(..., walk=dict(period=1.1))` drives the gait; crowds of riders with `march=`. Scale ~0.36-0.5.
  `python production/horse.py` -> review/horse_sheet.jpg.

## Scenery kit (scenery_kits.py; `from scenery_kits import *` in sets.py)
Every helper takes a layer painter `pt` first; `base` = the y the object stands on; plate px, BGR, palette `K`,
map colours `REGION_COLORS`. Examples of all helpers: 17 sets (castle_yard, great_hall, battlefield, jp_interior,
cn_palace, cn_throne, great_wall_set, rain_road, workshop_in, street_1800s, egypt, map_europe, map_eastasia,
village, japan_ext, rome, classroom) in the skill's `assets/examples/sets_kit.py`.
- Interiors: `room(gy_frac=0.68, wall_kind, floor_kind, wall_color, floor_color, wall_kw, floor_kw, ...)` ->
  `(plate, wall_pt, floor_pt, gy)`; `wall(pt, x0, y0, x1, y1, kind=brick|stone|timber|planks|shoji|palace|plaster)`,
  `floor(pt, x0, x1, gy, y1, kind=planks|flagstone|tatami|tiles|dirt)`, `ceiling_beams`, `carpet`, `skirting`;
  windows `window_gothic`, `window_lattice`, `window_round`; `door(kind=arch|pointed|square)`, `archway`;
  `device(kind=cross|saltire|chevron|bend|sun|star|tower|crescent|circle|fleur|lion)`, `banner`, `flag`, `tapestry`,
  `scroll(kind=mountains|bamboo|calligraphy|blank)`; `torch`, `candle`, `glow`; `table` (returns top y), `bench`,
  `shelf(items=mixed|books|jars|scrolls)`, `dais` (returns top y), `throne(style=euro|china)`, `folding_screen`, `desk`,
  `workbench`, `tool_rack`, small props `gear hammer saw wrench barrel crate`; `chalkboard(pt, x0, y0, w, h)` (returns
  the board rect; write on it with world overlays). Example `classroom` set (teacher's room) in sets_kit.py.
- Nature: `tree(kind=round|pine|cypress|palm|blossom|bamboo)`, `tree_row`, `treeline`, `bush`, `grass_tufts`, `rock`,
  `water`, `river(path, w_far, w_near)`, `field(crop=None|wheat|rice)`, `road(x_far, y_far, w_far, x_near, y_near,
  w_near, ruts, puddles)`, `hills(shape=round|dune)` (returns ridge points), `sun`, `rain_layer(plate, ...)`
  (rain is a plate layer: behind characters unless you move it after the toon layers in the shot).
- Architecture: `stone_wall`, `tower(roof=cone|crenel|pyramid|none)`, `castle`, `city_wall`, `eave_roof`, `jp_castle`,
  `pagoda`, `torii`, `cn_hall`, `great_wall(path, towers=...)`, `column`, `colonnade`, `temple`, `pyramid`,
  `house(kind=timber|stone|plaster, roof=thatch|tile|slate)`, `windmill`, `factory(chimneys, smoke_on)`, `smoke`,
  `townhouse`, `lamp_post`, `workshop` (blank sign for an overlay), `cobbles`.
- Maps: `map_plate(name, lon0, lat0, lon1, lat1, highlight={"FRA": colour}, regions=[(poly_lonlat, colour)], fit=True,
  borders, compass, burn, draw=fn(pt, P))` (top-left lon0/lat0, bottom-right lon1/lat1, equirectangular; `fit`
  widens one span to keep coastlines unstretched and writes the real bounds as `proj` into sets.json).
  `WARRING_STATES` has rough polygons of the seven warring states (illustrative, not scholarly). Data: Natural Earth
  1:110m land + countries in the skill's `assets/geo/` (public domain), found without copying.
  Screen points: `S.lonlat("map_eastasia", 108.7, 34.3)` (Xianyang) for overlay routes / labels.
- Depth / text: `furrows(pt, vp=(x, horizon_y), gy, h, n, color, width, spread, x_rows)` ground lines converging to
  a vanishing point (ruts, ploughed fields, a survey grid with x_rows); `fog(plate, name, depth, y0, y1, peak)` haze
  band layer; `ptext(pt, text, x, y, size, color, font, rot, anchor)` text painted on a plate (signs, notes; fonts in
  assets/fonts or absolute paths); `tipi(pt, x, base, size)` Plains lodge.
- Cost: 0.13-0.4 s per set, maps ~1 s; built once by sets.py.

## Costumes (costumes.py as `CO`; design keys read by toon.py, all optional)
Presets `CO.PRESETS` / `CO.KNIGHT` ...: knight, knight_plate, longbowman, legionary, centurion, samurai, ronin,
official (Song), official_ming, chinese_soldier, egyptian, egypt_worker, viking, inventor, inventor_b, peasant, king,
queen, monk, monk_hood, soldier_1800. Derive: `CO.design(CO.CHINESE_SOLDIER, headwear="none", style="bun", ...)`.
`python production/costumes.py` -> preset sheet (3 poses each).
- garment: puffy, zip, tunic, robe, toga, mail, plate, lamellar, segmentata, coat, uniform, kilt; colours jacket,
  jacket_dk, trim, belt, sleeve, tunic, vest, tie, strap, mail, steel; sleeves long/short/none/wide/mail/plate, skirt,
  flare, collar cross/round/v, belt_style leather/rope/sash/none, badge, hem_trim, sode, epaulettes
- cape, cape_trim ("ermine" or colour), quiver; heraldry=dict(field, device, color) on surcoat/shield/flag (device:
  cross saltire chevron pale fess bend quarterly roundel star fleur mon wings; mirrored when flip=True)
- legwear trousers/hose/bare/wraps/greaves/mail/striped/hakama; footwear boots/shoes/sandals/sabatons/bare
- style (hair) messy/beanie/short/bald/long/topknot/bun/tonsure/none; headwear none beanie nasal greathelm kettle
  kabuto galea crown tophat tricorn kasa turban hood wushamao nemes viking chinese_helm (+ hat, hat2, crest,
  crest_dir "trans", hat_wings long/short, plume, hat_dy); moustache none/walrus/handlebar/thin; beard
  none/stubble/short/long (+ beard_col); lashes
Held props (pose fields): heldL/heldR = sword gladius katana spear axe hammer mallet mace bow longbow arrow crossbow
shield_round shield_kite shield_heater scutum scroll scroll_open book torch flag banner quill lantern paper_lantern
wrench staff crook; rotL/rotR extra angle (0 = forward with a hanging forearm, -90 = up); fixL/fixR 0 follows the
forearm, 1 keeps a fixed torso-frame angle (upright spears/staffs). Joints add tipL/R, gripL/R.
Poses added (poses.py; old 21 in PO.LEGACY): hold_sword raise_sword strike_sword guard shield_up stand_spear
spear_shield thrust_spear march march_spear draw_bow aim_crossbow hammer_up hammer_down read_scroll read_book
write_quill hold_torch torch_up hold_flag hold_banner hold_lantern use_wrench hold_staff bow_greeting gongshou salute
kneel present pharaoh cheer_sword.

## Teacher bust (bust.py as `B`; F in History's narrator)
A design with `rig="bust"` is drawn by bust.py instead of the body rig, so it is a normal `S.toon` layer (keys,
`talk`, motions, idle sway, `flip`, `--check`). `B.TEACHER` is the channel's teacher; `B.design(plinth=False, ...)` for
the bust alone on a shelf/desk (origin = bottom of the chest cut, use `shadow=False`). Keys: marble, marble_dk,
plinth, plaque (colour or None), wreath laurel/none, wreath_col, curls, head_rx/ry. Pose fields used: facing
(f/r/b), head, head_dy, lean (rocks on the plinth), eyes, look, brows, mouth, mopen, sweat, crack; arms/feet/props
are ignored (no hands: grading is done with overlays). ~1240 units tall with the plinth: scale 0.5-0.6 stands it
on the ground line beside full-body characters. Joints: head, plaque (centre, for a label), top, base.
Expressions in poses.py (face fields only, work on any character): `unimpressed`, `smug`, `outraged` (crack=1).
`python production/bust.py` -> `review/bust.jpg` (every expression, facings, no-plinth). Demo segment with the
classroom set and the report card: `assets/examples/seg_teacher.py`.

## Crowds (crowds.py as `CR`)
```python
layers += CR.crowd(CO.LEGIONARY, PO.spear_shield(), n=9, rows=3, x=(150, 1770), y=gy + 120, scale=0.27,
    vary=dict(scale=0.05, colors=dict(tunic=[...]), beard=["none", "stubble"], headwear=[...]),
    keys=[(W.rel(st, "word"), PO.cheer_sword(heldL="gladius", heldR="scutum"))],
    march=None,   # or dict(dx=330, dur=en - st, period=0.56, bob=3)
    haze_step=0.18, groups=2)
```
Depth of field: `blur=` (front row, px) and `blur_step=` (added per row further back, e.g. 1.5).
Members are drawn once per pose and cached as PNGs (assets/cache/crowd/, content-hashed; delete to clear), merged per
row/idle group into engine `char` layers with bob/breathe, timed swaps and a 4-frame march + drift. Back rows smaller,
higher, hazier. ~0.14 s/frame for 27 soldiers. Also `variants()`, `walk_cycle()`, `sprite()`.
Limits: occlusion inside a row is by group not x; marching feet slide slightly; 3/4 helmets are front helmets shifted;
no sitting pose.

## Explainer overlays (overlays.py, via `S.overlay(type, t, **params)`)
Layers after the characters; `t` = start inside the shot, optional `dur`/`out` (end) + `tout=0.2` exit, `world=False`
(screen HUD px; True = scene px moving with the camera, `depth` for maps), `opacity`, `seed`. Colours BGR; constants
`S.OV().RED/INK/PAPER/WHITE/YELLOW/ORANGE/BLUE/GREEN`. Fonts: assets/fonts (Lilita One "main", Bangers "comic", OFL).
| type | required | main options (defaults) |
|---|---|---|
| circle | at+r or box | color RED, width 16, draw 0.35, turns 1.08, tilt -6, pad 18 |
| underline / arrow | pts (or span=(x0,x1,y) for underline) | bend 0.04/0.18, head, head_size 42, width 12, draw 0.4, double |
| label | text, at | box (at+(200,-170)), size 54, fill PAPER, dot True |
| title | text | sub, pos center/top/lower/(x,y), style ribbon/paper, size 96, anim pop/slide, rot |
| caption_pop | text, at | size 84, fill YELLOW, rot -6, rise 18 |
| counter | b, at | a 0, count 1.2, fmt "{:,.0f}", prefix, suffix, label, label_pos below/right, card |
| bars | items=[(label, value[, color])], at | size (520,300), max, title, grow 0.7, stagger 0.18, card True |
| route | pts | style dash/dots/solid, color RED, width 9, draw 1.5, head, marker; map points via `S.lonlat(set, lon, lat, scale, offset)` |
| spotlight | at+r or keys=[(t,(x,y),r)] | dark 0.62, soft 70, ring |
| emote | symbol, at | question/exclaim/sweat/anger/sparkle/impact/speed; size 1.0, rot, flip, dir (speed) |
| meter | at (top-left) | label "POWER", keys=[(t, 0..1)] or value, size (440,46), low 0.25, segments 10 |
| stamp | text, at | size 120, rot -12, color RED, shake 9 |
| report_card | rows=[(subject, grade[, shot t])], at | name, sub, title "REPORT CARD", final (circled big grade), final_t, remark ("See me after class."), remark_t, width 640, size 44, first 0.45, stagger 0.45, rot -3, grade_color RED, hand "comic", shake 7 |
Shot filters: `filter="sepia"` (flashback) / `"night"` or `dict(kind=..., amount=)`; applied to layers before the first
overlay, so graphics keep their colours. `--check` validates types, required params, times.

## Timing (production/timing.py)
`W = S.words()`; `W.cuts(["first word of each shot", ...], start=, end=)` touching (start, end) pairs;
`W.rel(shot_start, "word")` time inside the shot (0.05 s before the word); `W.at(phrase, after=)`; `W.text(t0, t1)`.

## Drawing code
- toon.Painter: `shape/blob/ell/stroke/line/dot` in character units; automatic soft shade on big fills (light from
  the upper-left), stable hand-drawn wobble, outer silhouette thickened by `silhouette()`.
- New character features: `draw_character()` (body, props), `face()` (eyes/brows/mouths), `hair()` (styles).
- scenery: `Plate(w, h)`, `layer(name, depth, opaque)`, `sky_grad`, `cloud`, `mountains(peaks=[(x, height, slope)])`,
  `ground_layer`, `patch`, `texture`, `tent`, `save`.
