// onetake_dir.js - DIRECTION of the one-take version of ch1 (0-49.8 s), rendered by onetake.js.
// One continuous camera through twelve worlds. A world = one location built from a "base" shot (its geometry is
// lifted to 3D), plus the items of other shots of the same place (time-gated), the overlays of every shot in it.
// Camera keys (absolute seconds, calm mode: every key is a stop, the move between two stops is one smootherstep):
//   pos / look = { from: anchor, front, side, up }  metres. Anchors:
//     'head' | 'feet'  the world's main character (front = the way he faces, side = towards the lens, up)
//     'column' | 'groups'  centre of the crowd on screen
//     'ref' | 'axis'  the reference camera of the 2D shot and the point it looks at (front = towards the lens, side = right)
//     any other character's name ('teacher', 'ranger') = his head; any named point of the world ('board', 'drawer'...)
//     (these use the world axes: front = towards the lens, side = to the right)
//   or { orbit: target, r, yaw, el }.
// Cuts between worlds are hidden in the move: 'dark', 'sky' / 'fog' (a wash into a colour).
const FLAT = {                                   // flat v3 look: only the fields the engine reads
  sun: { at: [1650, 140], elev: 40, color: [1, 1, 1], rays: 0, glow: 0, r: 200 },
  rim: { col: [1, 1, 1], amt: 0 },
  grade: { warm: [1, 1, 1], cool: [1, 1, 1], sat: 1, contrast: 1, bloom: 0 },
  shadows: { k: 0.2, stretch: 0.5 },
};
const INTERIOR = { hills: { wall: 'stand', props: 'stand', cabinet: 'stand', bar: 'stand' }, horizon: 470 };

export const ONETAKE = {
  worlds: {
    // ============================================================ 0 - 15 s (accepted pilot, unchanged)
    // 1-3 "Before sundown, Custer and all 210 men riding with him will be dead."
    sunset: {
      span: [0, 4.79], base: 's02', items: { s02: [0, 3.57], s03: [3.57, 99] }, fadeItems: 0.7,
      march: { from: 's02', stopAt: 3.57 },                    // the column rides on, and stops dead on "dead"
      hills: { sky: 3000, far: 420, mid: 160 },
      sun: { at: [1396, 696], elev: 5, color: [1.0, 0.66, 0.34], rays: 0.55, glow: 0.6, r: 300 },
      rim: { col: [1.0, 0.62, 0.3], amt: 0.85 },
      grade: { warm: [1.06, 0.98, 0.88], cool: [0.86, 0.92, 1.06], sat: 1.12, contrast: 1.08, bloom: 0.35 },
      shadows: { k: 0.42, stretch: 3.2 },
      cam: [
        { T: 0.00, pos: { from: 'head', front: 0.0, side: 1.6, up: -0.2 }, look: { from: 'head' }, fov: 38 },
        { T: 1.00, pos: { from: 'head', front: 0.15, side: 1.35, up: -0.15 }, look: { from: 'head' }, fov: 38 },
        { T: 2.40, pos: { from: 'column', front: 12.0, side: 7.0, up: 3.2 }, look: { from: 'column', up: -1.1, side: 1.5 }, fov: 40 },
        { T: 3.55, pos: { from: 'column', front: 12.4, side: 7.2, up: 3.4 }, look: { from: 'column', up: -1.1, side: 1.5 }, fov: 40 },
        { T: 4.45, pos: { from: 'column', front: 12.5, side: 7.0, up: 6.0 }, look: { from: 'column', up: -1.0, side: 1.5 }, fov: 40 },
      ],
    },
    // 4 "It's June 25th, 1876,"  out of the dark chalkboard: the date, the teacher; then off to the window
    class: {
      span: [4.79, 6.99], base: 's04', items: { s04: [0, 99] }, horizon: 470,
      hills: { wall: 'stand', props: 'stand' },
      sun: { at: [1751, 290], elev: 30, color: [1.0, 0.93, 0.8], rays: 0.25, glow: 0.0, r: 200 },
      rim: { col: [1.0, 0.92, 0.75], amt: 0.5 },
      grade: { warm: [1.03, 1.0, 0.95], cool: [0.95, 0.98, 1.03], sat: 1.04, contrast: 1.05, bloom: 0.2 },
      shadows: { k: 0.25, stretch: 0.9 },
      cam: [
        { T: 4.79, pos: { from: 'board', front: 5.8, side: -0.9, up: -0.2 }, look: { from: 'board', side: -0.75, up: -0.45 }, fov: 42 },
        { T: 6.05, pos: { from: 'board', front: 5.5, side: -0.85, up: -0.2 }, look: { from: 'board', side: -0.7, up: -0.45 }, fov: 42 },
        { T: 6.99, pos: { from: 'window', front: 0.9, up: 0.0 }, look: { from: 'window', front: -2 }, fov: 42 },
      ],
    },
    // 5-7 "just after noon, in southern Montana. Lt. Col. George Armstrong Custer splits his cavalry regiment into
    // four pieces"  down out of the sky, over his shoulder, round to the hero angle, then the crane up as he points
    noon: {
      span: [6.99, 13.31], base: 's07', items: { s07: [0, 99] }, hold: { s07: 11.03 },   // groups wait until s07
      hills: { sky: 3000, far: 420, mid: 170 },
      sun: { at: [1650, 140], elev: 55, color: [1.0, 0.97, 0.88], rays: 0.18, glow: 0.35, r: 260 },
      rim: { col: [1.0, 0.95, 0.8], amt: 0.45 },
      grade: { warm: [1.03, 1.0, 0.94], cool: [0.94, 0.98, 1.04], sat: 1.06, contrast: 1.06, bloom: 0.15 },
      shadows: { k: 0.3, stretch: 0.7 },
      ground: { base: [175, 152, 89], dark: [151, 125, 84], light: [196, 170, 100], line: [120, 100, 64], haze: [0.80, 0.84, 0.86], tile: 16 },
      routes: { len: 2.6, grow: [11.6, 12.9] },
      cam: [
        { T: 6.99, pos: { from: 'head', front: -2.0, side: 0.55, up: 0.45 }, look: { from: 'groups', up: 1.0 }, fov: 40 },
        { T: 8.70, pos: { from: 'head', front: -1.8, side: 0.55, up: 0.4 }, look: { from: 'groups', up: 1.0 }, fov: 40 },
        { pass: true, pos: { from: 'head', front: -0.2, side: 5.5, up: 0.2 }, look: { from: 'head', front: 3 }, fov: 42 },   // round the outside
        { T: 9.90, pos: { from: 'feet', front: 2.8, side: 3.2, up: 1.3 }, look: { from: 'head', up: -0.3 }, fov: 42 },
        { T: 10.95, pos: { from: 'feet', front: 2.7, side: 3.1, up: 1.35 }, look: { from: 'head', up: -0.3 }, fov: 42 },
        { T: 12.30, pos: { from: 'head', front: -9.0, side: 4.0, up: 12.0 }, look: { from: 'groups', front: 2 }, fov: 44 },
        { T: 13.31, pos: { from: 'head', front: -8.6, side: 4.0, up: 12.3 }, look: { from: 'groups', front: 2 }, fov: 44 },
      ],
    },
    // 8 "and sends them toward a Lakota and Cheyenne village he still hasn't seen."  out of the fog onto his
    // squinting eyes, then back out to the 2D framing: he stays at the left edge and the valley opens in front of him
    // (the first version swung round behind him and lost him at the frame edge)
    valley: {
      span: [13.31, 17.43], base: 's08', items: { s08: [0, 99] },
      hills: { sky: 3000, far: 900, valley: 320, haze: 240 },
      ...FLAT,
      cam: [
        { T: 13.31, pos: { from: 'head', front: 1.5, side: 0.9, up: 0.0 }, look: { from: 'head' }, fov: 40 },
        { T: 14.40, pos: { from: 'head', front: 1.4, side: 0.85, up: 0.0 }, look: { from: 'head' }, fov: 40 },
        { pass: true, pos: { from: 'head', front: -0.3, side: 3.4, up: 0.15 }, look: { from: 'head', front: 2.0, up: -0.25 }, fov: 40 },   // keeps him in frame
        { T: 15.90, pos: { from: 'ref', front: 0.2 }, look: { from: 'village', side: -70 }, fov: 40 },
        { T: 17.43, pos: { from: 'ref', front: -0.5 }, look: { from: 'village', side: -70 }, fov: 40 },
      ],
      points: { village: { screen: [1300, 560], on: 'valley' } },
    },

    // ============================================================ 15 - 50 s
    // 9-10 "The Lakota and Cheyenne who fought them ... Less than half an hour"  the three witnesses in their camp,
    // then in on the elder
    camp: {
      span: [17.43, 22.89], base: 's09', items: { s09: [0, 99], s10: [0, 99] }, horizon: 790,
      hills: { sky: 3000, far: 420, lodges: 42 },
      ...FLAT,
      cam: [
        { T: 17.43, pos: { from: 'ref', front: 0.7, side: -0.8 }, look: { from: 'axis', side: -0.1 }, fov: 40 },
        { T: 18.90, pos: { from: 'ref', front: 0.1, side: -0.2 }, look: { from: 'axis' }, fov: 40 },
        { T: 20.30, pos: { from: 'ref', front: 0.0, side: 0.0 }, look: { from: 'axis' }, fov: 40 },
        { T: 21.20, pos: { from: 'head', front: 0.5, side: 1.7, up: 0.0 }, look: { from: 'head', up: -0.05 }, fov: 38 },
        { T: 22.89, pos: { from: 'head', front: 0.45, side: 1.55, up: 0.0 }, look: { from: 'head', up: -0.05 }, fov: 38 },
      ],
    },
    // 11 "For a century, America mostly ignored" - the clerk shoves the folders into the drawer
    archive: {
      span: [22.89, 25.77], base: 's11', items: { s11: [0, 99] }, ...INTERIOR,
      ...FLAT,
      points: { drawer: { screen: [1250, 560], on: 'cabinet' } },
      cam: [
        { T: 22.89, pos: { from: 'ref', front: 0.4, side: -0.6 }, look: { from: 'axis', side: 0.2 }, fov: 40 },
        { T: 23.60, pos: { from: 'ref', front: 0.0, side: -0.3 }, look: { from: 'axis', side: 0.3 }, fov: 40 },
        { T: 25.77, pos: { from: 'ref', front: -0.4, side: 0.0 }, look: { from: 'axis', side: 0.3 }, fov: 40 },
      ],
    },
    // 12 "and hung a painting of a heroic last stand" - the bar, the toast, up to the painting
    saloon: {
      span: [25.77, 28.29], base: 's12', items: { s12: [0, 99] }, ...INTERIOR,
      ...FLAT,
      points: { painting: { screen: [960, 290], on: 'wall' } },
      cam: [
        { T: 25.77, pos: { from: 'ref', front: 0.9, side: 0.9, up: -0.3 }, look: { from: 'axis', up: -0.3 }, fov: 40 },
        { T: 26.70, pos: { from: 'ref', front: 0.2, side: 0.3, up: 0.0 }, look: { from: 'painting', front: 0, up: -1.2 }, fov: 40 },
        { T: 28.29, pos: { from: 'ref', front: -0.1, side: 0.0, up: 0.0 }, look: { from: 'painting', front: 0, up: -1.2 }, fov: 40 },
      ],
    },
    // 13 "in saloons across the country" - the unimpressed teacher
    class2: {
      span: [28.29, 29.95], base: 's13', items: { s13: [0, 99] }, ...INTERIOR,
      ...FLAT,
      cam: [
        // him on the left third (the label stands on the board to his right, as in the 2D shot)
        { T: 28.29, pos: { from: 'hw', front: 2.3, side: 0.35, up: 0.0 }, look: { from: 'hw', side: 0.55, up: -0.05 }, fov: 38 },
        { T: 29.95, pos: { from: 'hw', front: 1.9, side: 0.3, up: 0.0 }, look: { from: 'hw', side: 0.5, up: -0.05 }, fov: 38 },
      ],
    },
    // 14-16 "Then, in 1983, a wildfire ... and archaeologists walked in ... cartridge cases in the dirt"
    burned: {
      span: [29.95, 37.97], base: 's15', items: { s14: [0, 33.71], s15: [33.71, 99], s16: [0, 99] }, fadeItems: 0.5,
      hills: { sky: 3000, far: 500, mid: 220 },
      ovShift: { s16: [-340, 60] },                // the s16 shot stands its archaeologist at (820, 1033), s15 at (480, 1093)
      ...FLAT,
      cam: [
        // the ranger watching the smoke, held for "1983"
        { T: 29.95, pos: { from: 'ref', front: 0.6, side: -0.3 }, look: { from: 'ranger', side: 0.4, up: 0.15 }, fov: 40 },
        { T: 31.00, pos: { from: 'ref', front: 0.2, side: -0.1 }, look: { from: 'ranger', side: 0.4, up: 0.15 }, fov: 40 },
        { T: 33.00, pos: { from: 'ref', front: -0.2, side: 0.0 }, look: { from: 'ranger', side: 0.4, up: 0.15 }, fov: 40 },
        // "and archaeologists walked in" - the line sweeping away from us
        { T: 34.30, pos: { from: 'ref', front: 0.6, side: -1.2, up: 0.3 }, look: { from: 'axis', side: 0.8, up: -0.2 }, fov: 40 },
        { T: 35.60, pos: { from: 'ref', front: 0.4, side: -1.0, up: 0.3 }, look: { from: 'axis', side: 0.8, up: -0.2 }, fov: 40 },
        // "cartridge cases in the dirt" - in on the find
        { T: 36.50, pos: { from: 'head', front: 0.2, side: 2.3, up: -0.3 }, look: { from: 'head', front: 0.1, up: -0.2 }, fov: 40 },
        { T: 37.97, pos: { from: 'head', front: 0.2, side: 2.1, up: -0.3 }, look: { from: 'head', front: 0.1, up: -0.2 }, fov: 40 },
      ],
    },
    // 17 "a scribbled note carried out by a bugler" - he gallops, the camera rides alongside
    ride: {
      span: [37.97, 40.07], base: 's17', items: { s17: [0, 99] }, drive: { vx: 9 },
      hills: { sky: 3000, far: 420, mid: 170 },
      ground: { base: [175, 152, 89], dark: [151, 125, 84], light: [196, 170, 100], line: [120, 100, 64], haze: [0.80, 0.84, 0.86], tile: 16 },
      ...FLAT,
      cam: [
        { T: 37.97, pos: { from: 'head', front: -0.6, side: 6.6, up: -0.4 }, look: { from: 'head', front: 1.8, up: -0.3 }, fov: 40 },
        { T: 40.07, pos: { from: 'head', front: -0.3, side: 5.8, up: -0.4 }, look: { from: 'head', front: 1.8, up: -0.3 }, fov: 40 },
      ],
    },
    // 18 "and the Native accounts America left in a drawer" - the archivist pulls the LAKOTA folder out
    archive2: {
      span: [40.07, 43.11], base: 's18', items: { s18: [0, 99] }, ...INTERIOR,
      ...FLAT,
      points: { drawer: { screen: [1250, 560], on: 'cabinet' } },
      cam: [
        { T: 40.07, pos: { from: 'ref', front: 0.3, side: 0.4 }, look: { from: 'axis', side: 0.2 }, fov: 40 },
        { T: 41.00, pos: { from: 'ref', front: 0.0, side: 0.2 }, look: { from: 'axis', side: 0.3 }, fov: 40 },
        { T: 43.11, pos: { from: 'ref', front: -0.7, side: 0.0 }, look: { from: 'drawer', side: -0.8, up: -0.4 }, fov: 40 },
      ],
    },
    // 19-21 "Together, they're the answer key. So today, we're grading Custer's final exam. Pens down."
    // the teacher and the evidence, Custer comes into the room, then in on his face
    class3: {
      span: [43.11, 49.80], base: 's20', items: { s19: [0, 99], s20: [45.43, 99], s21: [0, 99] }, fadeItems: 0.4, ...INTERIOR,
      ...FLAT,
      points: { desk: { screen: [1260, 870], on: 'props' } },
      cam: [
        { T: 43.11, pos: { from: 'ref', front: 0.4, side: -0.2 }, look: { from: 'axis', side: 0.1 }, fov: 40 },
        { T: 44.40, pos: { from: 'ref', front: -0.1, side: 0.1 }, look: { from: 'desk', side: -0.45, up: 0.65 }, fov: 40 },
        { T: 45.43, pos: { from: 'ref', front: -0.3, side: 0.5, up: 0.0 }, look: { from: 'head', up: -0.15 }, fov: 40 },
        { T: 48.30, pos: { from: 'ref', front: -0.9, side: 0.6, up: 0.0 }, look: { from: 'head', up: -0.15 }, fov: 40 },
        { T: 49.20, pos: { from: 'head', front: 0.1, side: 1.8, up: -0.1 }, look: { from: 'head', up: -0.15 }, fov: 38 },
        { T: 49.80, pos: { from: 'head', front: 0.1, side: 1.7, up: -0.1 }, look: { from: 'head', up: -0.15 }, fov: 38 },
      ],
    },
  },
  calm: true,                                   // move - settle - hold between keys (no continuous drifting)
  filter: false,                                // user 2026-11-09: no "filter" - no split tone / sat+contrast / bloom /
                                                // vignette / paper grain
  light: false,                                 // user 2026-11-10: flat v3 light - no sun glow, god rays, rim light,
                                                // long cast shadows, haze; small contact shadows under feet only
  cuts: [
    { T: 4.79, kind: 'dark', pre: 0.4, post: 0.35 },
    { T: 6.99, kind: 'sky', pre: 0.35, post: 0.35, col: [0.74, 0.86, 0.95] },
    { T: 13.31, kind: 'fog', pre: 0.35, post: 0.35, col: [0.9, 0.92, 0.92] },
    { T: 17.43, kind: 'fog', pre: 0.35, post: 0.35, col: [0.9, 0.92, 0.92] },       // the fog lifts on the village
    { T: 22.89, kind: 'fog', pre: 0.3, post: 0.3, col: [0.93, 0.89, 0.8] },          // a century later: paper
    { T: 25.77, kind: 'dark', pre: 0.3, post: 0.3 },
    { T: 28.29, kind: 'dark', pre: 0.3, post: 0.3 },
    { T: 29.95, kind: 'sky', pre: 0.35, post: 0.35, col: [0.74, 0.86, 0.95] },       // out of the window
    { T: 37.97, kind: 'fog', pre: 0.3, post: 0.3, col: [0.9, 0.9, 0.88] },
    { T: 40.07, kind: 'dark', pre: 0.3, post: 0.3 },
    { T: 43.11, kind: 'dark', pre: 0.3, post: 0.3 },
  ],
  points: { board: { screen: [915, 300], on: 'wall' }, window: { screen: [1751, 290], on: 'wall' } },
};
