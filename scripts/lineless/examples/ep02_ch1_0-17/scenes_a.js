// scenes_a.js — episode cast + shot A (dusk column) + shot B (teacher and the date)
// walk phase that eases to a halt on "dead"
const PH = t => 5 * (t < 3.9 ? t : 3.9 + (1 - Math.pow(1 - prog(t, 3.9, 4.5), 2)) * 0.3);
const CUS = { kit: 'custer', coat: 'chestnut', curls: 1, stache: 1, blaze: 1, socks: 1 };
const TRO = ['bay', 'buck', 'chestnut', 'grey', 'bay', 'chestnut'];
function trooper(x, y, s, i, ph, extra = {}) {
  const beard = i % 4 === 2;
  mounted(x, y, s, { kit: 'trooper', coat: TRO[i % 6], ph: ph + i * 1.7, blanket: '#2c456e', beard, stache: !beard && i % 3 !== 1,
    skin: i % 4, hair: (i * 3) % 4, hat: i % 5 === 3 ? 'kepi' : 'slouch', socks: i % 2, blaze: i % 3 === 0, ...extra });
}

// ---- A · 0.0–4.7 · "Before sundown, Custer and all 210 men riding with him will be dead."
function shotA(t) {
  DEAD = tw(t, 4.05, 4.5);
  const cam = camAt([[0, 330, -150, 1.55], [0.95, -100, -20, 1.0, 1.15]], t);
  const ph = PH(t), tr = ph * 14, bg = { x: cam.x + tr, y: cam.y, z: cam.z };
  sky(DUSK);
  layer(cam, 0.04, () => ell(1640, 650, 125, 125, C(DUSK.sun)));
  layer(bg, 0.1, () => { cloud(260, 210, 1.7, DUSK.cloud); cloud(1480, 150, 1.2, DUSK.cloud); cloud(2350, 250, 1.6, DUSK.cloud); });
  layer(bg, 0.25, () => ridge(690, 130, 4, DUSK.far));
  let my; layer(bg, 0.5, () => { my = ridge(770, 70, 9, DUSK.mid); });
  layer(cam, 0.5, () => {                                   // far half of the column, on the next ridge
    TINT = ['#4a2148', 0.62];
    for (let i = 11; i >= 0; i--) { const x = 1280 - i * 128; trooper(x, my(x + tr * 0.5) + 8, 0.3, i + 3, ph); }
  });
  let gy; layer(bg, 1, () => { gy = ground(DUSK, 850); });
  layer(cam, 1, () => {
    TINT = ['#57224c', 0.34];
    for (let i = 7; i >= 1; i--) { const x = 1250 - i * 236 - (i % 2) * 30; trooper(x, gy(x + tr) + 26 + (i % 2) * 22, 0.6, i, ph, { eyes: DEAD > 0.5 ? 'shut' : 'open', dust: '#6a3560' }); }
    TINT = ['#57224c', 0.2];
    mounted(1250, gy(1250 + tr) + 30, 0.86, { ...CUS, ph, blanket: '#2c456e', brow: 0.5,
      tilt: -0.06, eyes: DEAD > 0.5 ? 'shut' : blink(t), lid: 0.25, mouth: DEAD > 0.5 ? 'frown' : 'smile', dust: '#6a3560' });
    TINT = null;
  });
  layer(bg, 1.7, () => { [[240, 1150, 2.6], [1150, 1190, 2.2], [1900, 1150, 3], [2700, 1170, 2.5]].forEach(q => sage(q[0], q[1], q[2], '#2a1230', '#1f0d26')); });
  // counter + the red pen
  const p = tw(t, 1.82, 2.15, back);
  if (p > 0) {
    g.save(); g.translate(470, 250); g.scale(p, p);
    text('210', 0, 0, 230, CREAM, 'Rockwell'); g.restore();
    g.globalAlpha = tw(t, 2.4, 2.7); text('MEN RIDING WITH HIM', 470, 388, 50, CREAM, 'Rockwell'); g.globalAlpha = 1;
    pen(wobble(250, 268, 700, 236, 10, 18, 3), tw(t, 4.12, 4.4, eout), 16);
  }
}

// ---- B · 4.7–6.9 · "It's June 25th, 1876,"
function shotB(t) {
  DEAD = 0;
  const z = lerp(1.0, 1.05, tw(t, 4.7, 5.7, eout));
  g.save(); g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-W / 2, -H / 2);
  g.fillStyle = '#ead7b2'; g.fillRect(-100, -100, W + 200, H + 200);
  g.fillStyle = '#d9bf90'; g.fillRect(-100, 860, W + 200, 400); rr(-100, 846, W + 200, 22, 0, '#b98f5c');
  rr(640, 96, 1190, 660, 14, '#8a5a36'); form(() => g.roundRect(664, 120, 1142, 612, 6), '#2f5d4c', () => poly([[1500, 120], [1900, 120], [1900, 740], [1260, 740]], '#2a5445'));
  rr(664, 744, 1142, 20, 4, '#6f4528'); rr(1560, 730, 70, 14, 4, '#f3efe8'); rr(1650, 730, 40, 14, 4, '#f0c8c0');
  const l1 = 'June 25,', n1 = Math.round(l1.length * tw(t, 5.24, 6.0, x => x));
  text(l1.slice(0, n1), 760, 330, 150, '#f3efe8', 'Chalkduster', 'left', 400);
  const p2 = tw(t, 6.1, 6.4, back);
  if (p2 > 0) { g.save(); g.translate(1235, 545); g.scale(p2, p2); text('1876', 0, 0, 250, '#f3efe8', 'Chalkduster', 'center', 400); g.restore(); }
  rr(1080, 930, 900, 200, 10, '#a8713f'); rr(1080, 930, 900, 26, 6, '#c08a52');
  at(1420, 990, 1, () => { rr(-150, -40, 300, 150, 4, '#fbf6ea'); for (let i = 0; i < 3; i++) rr(-120, -14 + i * 26, 170, 8, 4, '#d9d2c4'); pen(ring(96, 8, 34, 30), 1, 7); text('F', 96, 12, 44, RED, 'Bradley Hand'); }, -0.08);
  limb(1640, 1012, 1790, 970, 9, 9, RED); limb(1790, 970, 1814, 963, 9, 2, INK);
  g.restore();
  pen(wobble(900, 700, 1590, 688, 10, 18, 7), tw(t, 6.45, 6.8, eout), 14);
  const talk = t > 4.84 && t < 6.78 && !(t > 5.98 && t < 6.12);
  at(340 - 40 * (1 - tw(t, 4.7, 5.3, eout)), 1330, 1.72, () => teacher({ mouth: talk ? 0.25 + 0.75 * Math.abs(Math.sin(t * 17)) : 0.1,
    look: tw(t, 5.2, 5.6), brow: tw(t, 6.1, 6.35, back), lid: 0.34 - 0.2 * tw(t, 6.1, 6.3), tilt: 0.05 * tw(t, 5.2, 5.7) }));
}
