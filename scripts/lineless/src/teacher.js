// teacher.js — the marble-bust teacher, redrawn lineless. Origin = base of the plinth.
const MARBLE = { b: '#f3efe8', s: '#d6cec6', d: '#b8aea6', leaf: '#3f8f4a', leafSh: '#2c6c3a' };
// o: {mouth 0..1, look -1..1, brow 0..1 (raised right brow), lid 0..1, tilt}
function teacher(o = {}) {
  const M = MARBLE, look = o.look || 0, lid = o.lid ?? 0.32;
  form(() => g.roundRect(-128, -150, 256, 150, 6), M.b, () => { g.fillStyle = M.s; g.fillRect(40, -150, 100, 150); });
  rr(-150, -176, 300, 34, 6, M.b); rr(-150, -150, 300, 8, 0, M.d);
  form(() => curve([[-176, -172], [-196, -262], [-128, -336], [-48, -356], [48, -356], [128, -336], [196, -262], [176, -172]], true, 0.7), M.b, () => {
    poly([[-150, -350], [-70, -360], [150, -160], [40, -160]], M.s);            // toga fold
    poly([[60, -360], [120, -350], [210, -230], [200, -160], [150, -160]], M.s);
  });
  at(118, -262, 1, () => { rr(-34, -34, 68, 68, 6, '#d8352a'); rr(-27, -27, 54, 54, 3, '#f6ecd6'); text('F', 0, 3, 50, '#d8352a', 'Futura', 'center', 800); }, 0.2);
  rr(-44, -400, 88, 70, 10, M.s);
  g.save(); g.translate(0, -400); g.rotate(o.tilt || 0);
  // curls + laurel behind the face
  form(() => g.ellipse(0, -84, 116, 124, 0, 0, 7), M.b, () => ell(-124, -70, 62, 150, M.s));
  for (let i = 0; i < 9; i++) { const a = Math.PI * (1.14 + i * 0.09), x = Math.cos(a) * 106, y = -84 + Math.sin(a) * 112; ell(x, y + 5, 27, 27, M.d); ell(x, y, 27, 27, i % 2 ? M.b : '#e7e1d9'); }
  [-1, 1].forEach(sd => { for (let i = 0; i < 6; i++) {
    const a = Math.PI * 1.5 + sd * (1.5 - i * 0.235), x = Math.cos(a) * 140, y = -84 + Math.sin(a) * 138;
    ell(x, y, 34, 14, i % 2 ? M.leaf : M.leafSh, a + Math.PI / 2 + sd * (i % 2 ? 0.5 : -0.35));
  } });
  // eyes with a heavy, unimpressed lid
  [-44, 44].forEach(ex => form(() => g.ellipse(ex, -92, 23, 27, 0, 0, 7), '#ffffff', () => {
    ell(ex + look * 9, -90, 10, 12, INK); g.fillStyle = M.s; g.fillRect(ex - 30, -122, 60, 54 * lid);
  }));
  const br = o.brow || 0;
  limb(-68, -132, -22, -126, 6, 5, '#6d655f'); limb(22, -128 - br * 16, 68, -138 - br * 20, 5, 6, '#6d655f');
  ell(0, -58, 10, 7, M.s);                                                      // nose hint
  const m = o.mouth || 0;
  form(() => { g.moveTo(-34, -30); g.quadraticCurveTo(4, -22 + m * 4, 44, -40); g.quadraticCurveTo(14, -6 + m * 30, -34, -30); }, '#5b1f24',
    () => ell(4, -2 + m * 22, 26, 12, '#d9706a'));
  g.restore();
}
