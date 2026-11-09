// shots3d.js - the DIRECTION of the shots that are restaged in real 3D (stage.js: render3D).
// Geometry is lifted automatically from the 2D shot (camera projection: the reference camera sees exactly the old
// 2D frame); what is set here is what the 2D version could not do: a real camera path, lens, light and extras.
//   cam: keys [{u, target: 'head' (subject's head) | 'column' / 'groups' (centre of the crowd), r = distance as a
//              multiple of the reference camera's distance to the target, yaw (deg, + = camera swings to the right),
//              el = elevation (deg, + = looking down; 'ref' = as the reference camera), fov (deg)}]
//   subject: index of the toon layer the camera works on (default: the biggest toon)
//   focus: 'subject' (depth of field on it) ; coc: blur px at 1 m^-1 of defocus
//   hills: card distances (m) for the set plates by their name suffix
//   glow: additive sun / light glow at a reference-screen point; routes: ground arrows for crowd groups
export const SHOTS3D = {
  // 1 "Before sundown,"  the camera slides round Custer's face against the low sun: the sun clears his hat brim
  s01: {
    hills: { sky: 3000, far: 420, mid: 160 },
    cam: [{ u: 0, target: 'head', r: 0.46, yaw: -18, el: -9, fov: 40 },
          { u: 1, target: 'head', r: 0.38, yaw: 10, el: -5, fov: 40 }],
    ease: 'out', focus: 'subject', coc: 34,
    glow: { at: [1396, 696], r: 260, color: [1.0, 0.72, 0.38], strength: 0.55, flare: true },
  },
  // 2 "Custer and all 210 men riding with him"  low tracking shot along the moving column: rows slide past each other
  s02: {
    hills: { sky: 3000, far: 420, mid: 160 },
    cam: [{ u: 0, target: 'column', r: 1.0, yaw: -20, el: 'ref', fov: 40 },
          { u: 1, target: 'column', r: 0.9, yaw: 12, el: 'ref', fov: 40 }],
    ease: 'inout', focus: 'subject', coc: 26,
    glow: { at: [1396, 696], r: 300, color: [1.0, 0.72, 0.38], strength: 0.35 },
  },
  // 7 "splits his cavalry regiment into four pieces"  crane up from behind Custer's pointing arm to a high view:
  // the four groups peel off along four routes drawn on the ground
  s07: {
    hills: { sky: 3000, far: 420, mid: 170 },
    cam: [{ u: 0, target: 'scene', r: 1.0, yaw: 0, el: 'ref', fov: 40 },
          { u: 1, target: 'scene', r: 1.25, yaw: -14, el: 19, fov: 40 }],
    ground: { base: [175, 152, 89], dark: [151, 125, 84], light: [196, 170, 100], line: [120, 100, 64], haze: [0.80, 0.84, 0.86], tile: 16 },
    ease: 'inout', focus: 'groups', coc: 10,
    routes: { from: 0.0, len: 2.6, grow: [0.55, 1.0] },
  },
};
