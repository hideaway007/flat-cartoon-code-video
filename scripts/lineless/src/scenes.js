// scenes.js — starter chapter (replace it). One file per chapter; each shot is a pure function of t (seconds of
// narration), so any frame can be drawn on its own. Cut and act on word times from production/words.json:
// paste them here as numbers. Shared look: lib.js (drawing + camera), figures/body/person/rider/horse.js (cast),
// scenery.js (sets), marks.js (plates + red pen), teacher.js.
KIT.scout = { ...KIT.plain, coat: '#7a8a5c', coatSh: '#5c6b43', pants: '#4a4652', scarf: '#d8352a' };   // one kit per character
const HERO = { kit: 'scout', hat: 'slouch', stache: 1 };

// the set: everything behind the subject plane. Depth 0 = sky, 1 = subject plane, > 1 = foreground.
function valley(cam) {
  sky(NOON);
  layer(cam, 0.04, () => ell(1600, 170, 74, 74, C(NOON.sun)));
  layer(cam, 0.1, () => { cloud(330, 230, 1.6, NOON.cloud); cloud(1180, 330, 1.1, NOON.cloud); });
  layer(cam, 0.22, () => ridge(590, 130, 11, NOON.far));
  layer(cam, 0.45, () => { ridge(680, 60, 23, NOON.mid); river(742, 36, NOON.river, NOON.riverSh); [200, 620, 1500, 1840].forEach((x, i) => tree(x, 742, 0.5 + (i % 3) * 0.12)); });
  let gy; layer(cam, 1, () => { gy = ground(NOON, 860); });
  return gy;                                               // y(x) of the trail edge: feet go at gy(x) + 26..90
}

// ---- A · 0.0–6.0 · "<the narration line this shot covers>"
function shotA(t) {
  const cam = camAt([[0, -220, 30, 1.5], [1.4, 0, 0, 1.0, 1.5]], t);          // start close on the hero, one pull-back, hold
  const gy = valley(cam), ph = t * 5, stop = tw(t, 2.6, 3.2), say = t > 3.4 && t < 5.2;
  layer(cam, 1, () => {
    mounted(1380, gy(1380) + 36, 0.8, { kit: 'trooper', coat: 'bay', ph: 2, blanket: '#2c456e', eyes: blink(t + 1), look: -1 }, true);
    standing(lerp(420, 760, eout(prog(t, 0, 3.2))), gy(700) + 60, 1.0, { ...HERO, ph, walk: 1 - stop, eyes: blink(t), brow: say ? 0.6 : 0,
      mouth: say ? 'open' : 'smile', hand: say ? [110, -330] : null });          // points on the word at 3.4 s
  });
  layer(cam, 1.7, () => { sage(180, 1160, 2.6); sage(2050, 1160, 3); });
  plate(120, 120, 'PLACE NAME', 'time of day', tw(t, 0.9, 1.35, x => x), 62);  // screen space; all text >= 40 px
  pen(ring(1380, 560, 170, 120), tw(t, 4.2, 4.8), 9, RED);                     // the teacher's red pen: the only red on screen
}

window.renderFrame = t => {
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; TINT = null; DEAD = 0;
  shotA(t);                                                // more shots: (t < 6 ? shotA : t < 9.5 ? shotB : shotC)(t)
};
