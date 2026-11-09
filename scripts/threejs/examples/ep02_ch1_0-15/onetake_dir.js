// onetake_dir.js - DIRECTION of the one-take version of ch1 0-15 s (rendered by onetake.js).
// One continuous camera through four worlds. A world = one location built from a "base" shot (its geometry is
// lifted to 3D), plus the items of other shots of the same place (time-gated), the overlays of every shot in it.
// Camera keys (absolute seconds): pos/look as expressions, spline-interpolated (continuous velocity through keys):
//   { from: 'head' | 'feet' | 'groups' | 'column' | 'board' ..., front, side, up }   metres, relative to the
//   subject's facing (front = the way he faces, side = his right... see onetake.js), or
//   { orbit: target, r (x ref distance), yaw (deg), el (deg) }.
// Cuts between worlds are hidden in the move: 'dark' (dusk -> the dark chalkboard), 'sky' (through the window),
// 'fog' (into the fog bank).
export const ONETAKE = {
  worlds: {
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
        // "Before sundown," - his face against the sun, held (a slow push only)
        { T: 0.00, pos: { from: 'head', front: 0.0, side: 1.6, up: -0.2 }, look: { from: 'head' }, fov: 38 },
        { T: 1.00, pos: { from: 'head', front: 0.15, side: 1.35, up: -0.15 }, look: { from: 'head' }, fov: 38 },
        // "Custer and all 210 men riding with him" - one slow pull back to the whole column, then hold on it
        { T: 2.40, pos: { from: 'column', front: 12.0, side: 7.0, up: 3.2 }, look: { from: 'column', up: -1.1, side: 1.5 }, fov: 40 },
        { T: 3.55, pos: { from: 'column', front: 12.4, side: 7.2, up: 3.4 }, look: { from: 'column', up: -1.1, side: 1.5 }, fov: 40 },
        // "will be dead." - they stop and grey out; the camera only rises a little and holds
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
        // "It's June 25th, 1876," - out of the dark onto the board and the teacher, held while the date pops
        { T: 4.79, pos: { from: 'board', front: 5.8, side: -0.9, up: -0.2 }, look: { from: 'board', side: -0.75, up: -0.45 }, fov: 42 },
        { T: 6.05, pos: { from: 'board', front: 5.5, side: -0.85, up: -0.2 }, look: { from: 'board', side: -0.7, up: -0.45 }, fov: 42 },
        // then a calm turn and walk to the window (the way out)
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
        // "just after noon, in southern Montana." - over his shoulder to the riders, held
        { T: 6.99, pos: { from: 'head', front: -2.0, side: 0.55, up: 0.45 }, look: { from: 'groups', up: 1.0 }, fov: 40 },
        { T: 8.70, pos: { from: 'head', front: -1.8, side: 0.55, up: 0.4 }, look: { from: 'groups', up: 1.0 }, fov: 40 },
        // "Lieutenant Colonel George Armstrong Custer" - a slow move round to the low hero angle, held for the title
        { pass: true, pos: { from: 'head', front: -0.2, side: 5.5, up: 0.2 }, look: { from: 'head', front: 3 }, fov: 42 },   // round the outside
        { T: 9.90, pos: { from: 'feet', front: 2.8, side: 3.2, up: 1.3 }, look: { from: 'head', up: -0.3 }, fov: 42 },
        { T: 10.95, pos: { from: 'feet', front: 2.7, side: 3.1, up: 1.35 }, look: { from: 'head', up: -0.3 }, fov: 42 },
        // "splits his cavalry regiment into four pieces" - one slow rise behind him, then hold on the four routes
        { T: 12.30, pos: { from: 'head', front: -9.0, side: 4.0, up: 12.0 }, look: { from: 'groups', front: 2 }, fov: 44 },
        { T: 13.31, pos: { from: 'head', front: -8.6, side: 4.0, up: 12.3 }, look: { from: 'groups', front: 2 }, fov: 44 },
      ],
    },
    // 8 "and sends them toward a Lakota and Cheyenne village he still hasn't seen."  out of the fog onto his
    // squinting eyes, round behind him to the valley he can't see
    valley: {
      span: [13.31, 99], base: 's08', items: { s08: [0, 99] },
      hills: { sky: 3000, far: 900, valley: 320, haze: 240 },
      sun: { at: [1650, 140], elev: 40, color: [0.95, 0.97, 1.0], rays: 0.1, glow: 0.2, r: 300 },
      rim: { col: [0.95, 0.97, 1.0], amt: 0.35 },
      grade: { warm: [1.0, 1.0, 0.98], cool: [0.92, 0.97, 1.05], sat: 0.95, contrast: 1.04, bloom: 0.15 },
      shadows: { k: 0.15, stretch: 0.6 },
      cam: [
        // "and sends them toward a village he still hasn't seen." - out of the fog on him, then a slow turn to the valley
        { T: 13.31, pos: { from: 'head', front: 1.5, side: 0.9, up: 0.0 }, look: { from: 'head' }, fov: 40 },
        { T: 14.00, pos: { from: 'head', front: 1.4, side: 0.85, up: 0.0 }, look: { from: 'head' }, fov: 40 },
        { T: 15.20, pos: { from: 'head', front: -2.2, side: 1.4, up: 0.3 }, look: { from: 'head', front: 20, side: -3, up: -1.6 }, fov: 40 },
      ],
      points: { village: { screen: [1300, 560], on: 'valley' } },
    },
  },
  calm: true,                                   // move - settle - hold between keys (no continuous drifting)
  filter: false,                                // user 2026-11-09: no "filter" - no split tone / sat+contrast / bloom /
                                                // vignette / paper grain (light, rays, haze, s03 drain, cuts stay)
  light: false,                                 // user 2026-11-10 "全部去掉": flat v3 light - no sun glow, god rays, rim
                                                // light, long cast shadows, haze; small contact shadows under feet only
  cuts: [
    { T: 4.79, kind: 'dark', pre: 0.4, post: 0.35 },
    { T: 6.99, kind: 'sky', pre: 0.35, post: 0.35, col: [0.74, 0.86, 0.95] },
    { T: 13.31, kind: 'fog', pre: 0.35, post: 0.35, col: [0.9, 0.92, 0.92] },
  ],
  points: { board: { screen: [915, 300], on: 'wall' }, window: { screen: [1751, 290], on: 'wall' } },
};
